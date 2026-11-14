/* Idempotent catalog/UI correction. Keeps excluded source records in an audit archive. */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const Q=require(path.join(root,'catalogo-quality.js'));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));
function write(p,text){const dest=path.join(root,p);if(fs.existsSync(dest)&&fs.readFileSync(dest,'utf8')===text)return;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest+'.tmp',text);fs.renameSync(dest+'.tmp',dest);}
function writeJSON(p,data){write(p,JSON.stringify(data));}
function swap(text,from,to,label){if(text.includes(to))return text;const i=text.indexOf(from);if(i<0)throw Error('Missing patch anchor: '+label);return text.slice(0,i)+to+text.slice(i+from.length);}
function tests(){
  const bad={id:Q.rules[0].ids[0],name:Q.rules[0].name,address:Q.rules[0].address,zones:['Jabaquara'],type:'bakery'};
  const branch={...bad,id:'test/other-branch',address:'Avenida do Café, 900, São Paulo'};
  const renamedSource={...bad,id:'test/new-source',name:'APadaria Portuguesa',address:'Av. do Cafe, 246, Sao Paulo'};
  assert(Q.exclusion(bad));assert(Q.exclusion(renamedSource));assert.equal(Q.exclusion(branch),null);
  assert.equal(Q.exclusion({...branch,operatingStatus:'unknown'}),null);
  assert.equal(Q.exclusion({...branch,operatingStatus:'temporarily_closed'}),null);
  assert(Q.exclusion({...branch,business_status:'CLOSED_PERMANENTLY'}));
  const a={id:'test/a',type:'restaurant',name:'BUSINESS_NAME_MUST_NOT_APPEAR',zones:['Jabaquara']};
  const b={id:'test/b',type:'cafe',name:'SECOND_PRIVATE_NAME',zones:['Ipiranga']};
  assert.deepEqual(Q.counts([a,a,b,bad]),{total:2,byType:{restaurant:1,cafe:1}});
  const html=Q.countsHTML([a,a,b,bad],{selectedZones:['Jabaquara','Ipiranga'],loadedZones:['Jabaquara','Ipiranga']});
  assert(html.includes('Restaurantes'));assert(html.includes('Cafeterías'));assert(html.includes('Panaderías'));
  assert(!html.includes(a.name));assert(!html.includes(b.name));assert(!html.includes(bad.name));
  assert(!html.includes('<a'));assert(html.includes('<strong>2</strong>'));
  assert(Q.countsHTML([],{}).includes('Seleccioná'));
  assert(Q.countsHTML([],{selectedZones:['Jabaquara'],loadedZones:[]}).includes('pendiente'));
  assert(Q.countsHTML([a],{selectedZones:['Jabaquara','Ipiranga'],loadedZones:['Jabaquara']}).includes('parcial'));
  return {a,b,bad};
}
function patchUI(){
  let html=read('index.html');
  const tag='<script src="catalogo-quality.js?v=1"></script>';
  if(!html.includes(tag))html=swap(html,'<script>\nconst zones=',tag+'<script>\nconst zones=','quality dependency');
  html=swap(html,'const rows=[...byId.values()].filter(v=>','const rows=FomeBoaCatalogQuality.filter([...byId.values()]).filter(v=>','fallback visible filter');
  const sidebar=" el('nearbyPreview').innerHTML=FomeBoaCatalogQuality.countsHTML([...chosen].flatMap(name=>poiByZone.get(name)||[]),{selectedZones:[...chosen],loadedZones:loaded})+note+failures;";
  const line=/^ el\('nearbyPreview'\)\.innerHTML=.*;$/m;
  if(!line.test(html))throw Error('Missing sidebar render');
  html=html.replace(line,sidebar);
  html=html.replace(/(<div class="zone-restaurants"><h2>)[\s\S]*?(<\/h2>)/,'$1Locales por categoría$2');
  html=html.replace('Seleccioná una zona para ver los restaurantes.','Seleccioná una zona para ver cantidades.');
  html=html.replace("+' locales reales'","+' registros visibles'");
  const base=html.match(/<script>([\s\S]*?)<\/script>/);
  assert(base);new vm.Script(base[1]);
  let catalog=read('catalogo.js');
  catalog=swap(catalog,'if(!showAll||chosen.size)return oldVisible();','if(!showAll||chosen.size)return FomeBoaCatalogQuality.filter(oldVisible());','catalog scoped filter');
  catalog=swap(catalog,'const rows=(allRows||[]).filter(v=>','const rows=FomeBoaCatalogQuality.filter(allRows||[]).filter(v=>','catalog all filter');
  catalog=swap(catalog,'poiByZone.set(name,rows);hydrated.add(name);','poiByZone.set(name,FomeBoaCatalogQuality.filter(rows));hydrated.add(name);','cache/hydration filter');
  new vm.Script(catalog);
  // Load the corrected script rather than a stale browser-cached copy.
  html=html.replace(/<script src="catalogo\.js(?:\?[^\"]*)?"><\/script>/g,'<script src="catalogo.js?v=quality1"></script>');
  assert(html.indexOf(tag)<html.indexOf('const zones='));
  assert(!html.match(/el\('nearbyPreview'\)\.innerHTML=.*mini-rest/));
  assert(!html.includes('data-mapstyle="terrain"'));
  assert(html.includes("color:'#f4c400'"));
  const {a,b,bad}=tests();
  const nodes=new Map(),el=id=>{if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',textContent:'',classList:{add(){},remove(){}}});return nodes.get(id)};
  const start=base[1].indexOf('function render(){'),end=base[1].indexOf('const metroBounds=',start);
  assert(start>=0&&end>start);
  const sample=[a,b,bad];
  const context={el,renderAds(){},renderGoogleDirectory(){},fold:s=>String(s||'').toLowerCase(),esc:s=>String(s||''),zones:[['Jabaquara'],['Ipiranga']],chosen:new Set(['Jabaquara','Ipiranga']),poiByZone:new Map([['Jabaquara',[a,bad]],['Ipiranga',[a,b]]]),loadingZones:new Set(),failedZones:new Map(),visibleVenues:()=>Q.filter(sample),visibleLimit:60,favorites:new Set(),document:{querySelectorAll:()=>[]},FomeBoaCatalogQuality:Q,FomeBoaGoogleMaps:{linkHTML:()=>'<a>Google Maps</a>'}};
  vm.runInNewContext(base[1].slice(start,end)+'\nrender();',context);
  assert(!el('nearbyPreview').innerHTML.includes(a.name));
  assert(!el('nearbyPreview').innerHTML.includes(bad.name));
  assert(el('nearbyPreview').innerHTML.includes('<strong>2</strong>'));
  assert(el('cards').innerHTML.includes(a.name)); // Organic catalog remains below the map.
  write('index.html',html);write('catalogo.js',catalog);
}
function cleanCatalog(){
  const original=json('catalogo/todos.json');
  const priorPath='catalogo/excluidos-auditoria.json';
  const prior=fs.existsSync(path.join(root,priorPath))?json(priorPath):[];
  const archive=new Map(prior.map(v=>[v.venue.id,v]));
  const removed=original.filter(v=>Q.exclusion(v));
  for(const venue of removed){
    if(!archive.has(venue.id))archive.set(venue.id,{venue,exclusion:Q.exclusion(venue),excludedAt:new Date().toISOString()});
  }
  const rows=Q.filter(original);
  assert.equal(rows.length+removed.length,original.length);
  assert(rows.length>0);
  assert.equal(new Set(rows.map(v=>v.id)).size,rows.length);
  writeJSON('catalogo/todos.json',rows);
  writeJSON(priorPath,[...archive.values()]);
  const manifest=json('catalogo/manifest.json');
  const ids=new Set(rows.map(v=>v.id)),union=new Set();
  for(const [zone,info] of Object.entries(manifest.zones)){
    assert(/^zonas\/[a-z0-9-]+\.json$/.test(info.file));
    const file='catalogo/'+info.file;
    const values=Q.filter(json(file));
    for(const v of values){assert(ids.has(v.id));assert(v.zones.includes(zone));union.add(v.id)}
    assert.equal(new Set(values.map(v=>v.id)).size,values.length);
    info.count=values.length;writeJSON(file,values);
  }
  assert.equal(union.size,rows.length);
  manifest.total=rows.length;
  manifest.unnamed=rows.filter(v=>v.unnamed).length;
  manifest.countsByType=Q.counts(rows).byType;
  manifest.quality={revision:'1',excludedFromPublic:archive.size,ownerReports:Q.rules.length,independentlyVerifiedReports:0,note:'Reported closures and explicit source-closed records excluded. Other records are not guaranteed open.'};
  if(removed.length)manifest.qualityUpdatedAt=new Date().toISOString();
  writeJSON('catalogo/manifest.json',manifest);
  writeJSON('catalogo/control-calidad.json',{revision:1,visibleTotal:rows.length,excluded:[...archive.keys()],sidebar:'category-counts-only',rules:Q.rules,testsPassed:true});
  assert(!rows.some(v=>v.id===Q.rules[0].ids[0]));
  return {before:original.length,after:rows.length,newlyExcluded:removed.length,totalExcluded:archive.size,jabaquara:manifest.zones.Jabaquara.count};
}
tests();
if(process.argv.includes('--test')){console.log('PASS: branch-specific exclusions, source closure, neutral counts, deduplication and loading states');}
else{patchUI();const result=cleanCatalog();console.log(JSON.stringify({result,tests:'passed',sidebar:'counts-only'}));if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Catalog quality\n\n'+JSON.stringify(result)+'\n\nSidebar: category counts only; reported closure excluded, not independently verified. Tests passed.\n');}
