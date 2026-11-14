"""Replace coordinate-only links in both renderers, with regression tests."""
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / 'index.html'
CATALOG = ROOT / 'catalogo.js'
original_index = INDEX.read_text(encoding='utf-8')
original_catalog = CATALOG.read_text(encoding='utf-8')
anchor_start = '<a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/search/?api=1&amp;query='


def patch_anchor(text, expected):
    if 'FomeBoaGoogleMaps.linkHTML(v)' in text:
        return text
    start = text.find(anchor_start)
    # District-wide Google search links do not use this exact anchor prefix.
    while start >= 0:
        end = text.find('</a>', start)
        if end < 0:
            raise ValueError('Unclosed Maps anchor')
        end += len('</a>')
        old = text[start:end]
        if expected in old:
            return text[:start] + "'+FomeBoaGoogleMaps.linkHTML(v)+'" + text[end:]
        start = text.find(anchor_start, end)
    raise ValueError('Expected venue Maps link not found; refusing a broad replacement')


index = patch_anchor(original_index, "encodeURIComponent(v.lat+','+v.lon)")
catalog = patch_anchor(original_catalog, 'encodeURIComponent(query)')
catalog = re.sub(r'(?m)^\s*const query=Number\.isFinite\(v\.lat\)[^\n]*;\n', '\n', catalog)
loader = '<script src="google-maps-links.js?v=business1"></script>'
if loader not in index:
    first_script = index.find('<script')
    if first_script < 0:
        raise ValueError('Missing script anchor')
    index = index[:first_script] + loader + index[first_script:]
if "encodeURIComponent(v.lat+','+v.lon)" in index or "Number.isFinite(v.lat)&&Number.isFinite(v.lon)?v.lat+','+v.lon" in catalog:
    raise ValueError('A coordinate-only card link remains')
if index.count(loader) != 1 or index.index(loader) > index.index('<script>'):
    raise ValueError('Maps helper must load exactly once before renderers')
for source in (index, catalog):
    if 'FomeBoaGoogleMaps.linkHTML(v)' not in source:
        raise ValueError('Both renderers must use the shared business link helper')

# Write only the two UI files; imported venue records are not touched.
INDEX.write_text(index, encoding='utf-8')
CATALOG.write_text(catalog, encoding='utf-8')
try:
    subprocess.run(['node', '--check', 'google-maps-links.js'], cwd=ROOT, check=True)
    subprocess.run(['node', '--check', 'catalogo.js'], cwd=ROOT, check=True)
    test = r'''
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const api=require('./google-maps-links.js');
let n=0;const ok=(v,m)=>{assert.ok(v,m);n++};
const html=fs.readFileSync('index.html','utf8');
for(const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
const samples=[
 ['A casa do Frango Assado','Rua Itaguara, 300, S\u00e3o Paulo'],
 ['A Casa Encantada','R. Arnoldo Baldino Welter, 95, Sao Paulo'],
 ['A Padaria Portuguesa','Avenida do Caf\u00e9, 246, S\u00e3o Paulo'],
 ['Abraza - Assados','Avenida Cupec\u00ea, 1403, S\u00e3o Paulo'],
 ['A\u00e7a\u00ed Bar & Lanches da Gorete','Rua Ant\u00f4nio Alves Teixeira, 373, Sao Paulo'],
 ['A\u00e7a\u00ed Campestre Hamburgueria','Av. Jo\u00e3o Maria de Almeida, 211, Sao Paulo']
];
for(const [name,address] of samples){
 const v={name,address,lat:-23.6,lon:-46.65,zones:['Jabaquara']};
 const r=api.resolve(v),u=new URL(r.href),q=u.searchParams.get('query');
 ok(q.includes(name),'Name retained');ok(q.includes(address),'Branch address retained');
 ok(!q.includes('-23.6')&&!q.includes('-46.65'),'No raw coordinate pin');
 ok(r.kind==='search'&&!u.searchParams.has('query_place_id'),'No invented place ID');
 const other=new URL(api.resolve(v,{nameOnly:true}).href).searchParams.get('query');
 ok(other.includes(name)&&!other.includes(address),'Name-only recovery when address is wrong');
}
const base={name:'Test cafe',address:'Rua A, 12',zones:['Guarulhos']};
ok(new URL(api.resolve(base).href).searchParams.get('query').includes('Guarulhos'),'Municipality');
ok(api.resolve({name:'Restaurante (nombre sin registrar)',unnamed:true}).href==='','Unnamed safe');
const id='ChIJ123456789Example';
ok(!new URL(api.resolve({...base,googlePlaceId:id}).href).searchParams.has('query_place_id'),'Unreviewed ID ignored');
ok(new URL(api.resolve({...base,googlePlaceId:id,googleMapsVerified:true}).href).searchParams.get('query_place_id')===id,'Reviewed ID used');
ok(api.resolve({...base,googleMaps:{verified:true,url:'https://maps.app.goo.gl/ABCdef123456'}}).kind==='verified','Reviewed shared link');
ok(api.resolve({...base,googleMaps:{verified:true,url:'https://evil.example/maps/xyz'}}).kind==='search','Unsafe URL rejected');
ok(api.resolve({...base,googleMaps:{verified:true,url:'https://www.google.com/maps/search/?api=1&query=-23,-46'}}).kind==='search','Coordinate URL not a business listing');
ok(api.safeListingURL('https://www.google.com.evil.example/maps?cid=123456')==='','Spoof rejected');
ok(api.safeListingURL('javascript:alert(1)')==='','Script URL rejected');
ok(!api.linkHTML({name:'Cafe <script>oops</script>',address:'Rua A'}).includes('<script>oops'),'HTML escaped');
ok(html.includes('distritos-sp.geojson')&&html.includes('data-mapstyle="satellite"'),'Map unchanged');
ok(html.includes('catalogo.js?v=13'),'Catalog loader preserved');
console.log('PASS '+n+' regression checks; named business searches, exact reviewed links, URL safety, both renderers and map preservation.');
'''
    subprocess.run(['node', '-e', test], cwd=ROOT, check=True)
except Exception:
    INDEX.write_text(original_index, encoding='utf-8')
    CATALOG.write_text(original_catalog, encoding='utf-8')
    raise
print('Patched index.html and catalogo.js. No coordinates or venue addresses were rewritten.')
