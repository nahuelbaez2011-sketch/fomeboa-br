"""Expand FomeBoa with openly licensed places, without claiming complete coverage.

Run on demand, never on a visitor's browser. Preserve the previous catalogue on
network failure. Per-source identities, licences and quality flags are retained.
"""
import argparse
import copy
import json
import math
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'catalogo'
BBOX = (-23.80, -46.90, -23.35, -46.36)
FALLBACK_RELEASE = '2026-10-21.0'
KINDS = {
    'restaurant': ('Restaurante', '\U0001f37d\ufe0f'),
    'cafe': ('Cafeter\u00eda', '\u2615'), 'bar': ('Bar', '\U0001f379'),
    'pub': ('Pub', '\U0001f37a'), 'fast_food': ('Comida r\u00e1pida', '\U0001f354'),
    'food_court': ('Patio de comidas', '\U0001f37d\ufe0f'),
    'bakery': ('Panader\u00eda', '\U0001f950'), 'pastry': ('Pasteler\u00eda', '\U0001f370'),
    'coffee': ('Tienda de caf\u00e9', '\u2615'), 'ice_cream': ('Helader\u00eda', '\U0001f366'),
    'biergarten': ('Cervecer\u00eda', '\U0001f37b'), 'confectionery': ('Confiter\u00eda', '\U0001f370'),
    'deli': ('Delicatessen', '\U0001f96a')
}
ALIASES = {
    'coffee_shop': 'cafe', 'coffeehouse': 'cafe', 'tea_house': 'cafe',
    'tea_room': 'cafe', 'bubble_tea_shop': 'cafe', 'juice_bar': 'cafe',
    'coffee_and_tea': 'cafe', 'cafeteria': 'cafe', 'cafe': 'cafe',
    'fast_food_restaurant': 'fast_food', 'sandwich_shop': 'fast_food',
    'snack_bar': 'fast_food', 'food_stand': 'fast_food',
    'ice_cream_shop': 'ice_cream', 'gelato_shop': 'ice_cream',
    'dessert_shop': 'pastry', 'cake_shop': 'pastry', 'cupcake_shop': 'pastry',
    'pastry_shop': 'pastry', 'donut_shop': 'pastry', 'chocolate_shop': 'confectionery',
    'candy_store': 'confectionery', 'bakery_shop': 'bakery', 'bakery': 'bakery',
    'beer_garden': 'biergarten', 'brewpub': 'pub', 'beer_bar': 'bar',
    'wine_bar': 'bar', 'cocktail_bar': 'bar', 'sports_bar': 'bar',
    'dive_bar': 'bar', 'irish_pub': 'pub', 'tapas_bar': 'restaurant',
    'diner': 'restaurant', 'bistro': 'restaurant', 'pizzeria': 'restaurant',
    'deli': 'deli', 'delicatessen': 'deli', 'food_court': 'food_court'
}


def fold(value):
    text = ''.join(c for c in unicodedata.normalize('NFD', str(value or '')) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', text.casefold()).strip()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    temp.replace(path)


def get_json(url, limit=8_000_000):
    req = Request(url, headers={'User-Agent': 'FomeBoaSP-Catalog/2.0 (+https://github.com/nahuelbaez2011-sketch/fomeboa-br)'})
    with urlopen(req, timeout=40) as response:
        raw = response.read(limit + 1)
    if len(raw) > limit:
        raise ValueError('Remote metadata exceeds size limit')
    return json.loads(raw)


def release_name():
    try:
        stac = get_json('https://stac.overturemaps.org/catalog.json')
        latest = str(stac.get('latest', ''))
        match = re.search(r'20\d{2}-\d{2}-\d{2}\.\d+', latest)
        if match:
            return match.group()
    except Exception as error:
        print('STAC fallback:', str(error)[:160], flush=True)
    return FALLBACK_RELEASE


def category_kind(basic, taxonomy):
    if not isinstance(taxonomy, dict):
        taxonomy = {}
    values = [taxonomy.get('primary'), basic]
    hierarchy = taxonomy.get('hierarchy') or []
    if isinstance(hierarchy, list):
        values.extend(reversed(hierarchy))
    for raw in values:
        if not isinstance(raw, str):
            continue
        value = raw.lower()
        if value in ALIASES:
            return ALIASES[value]
        if value in KINDS:
            return value
        if value.endswith('_restaurant'):
            return 'restaurant'
        if value.endswith('_cafe') or value.endswith('_coffee_shop'):
            return 'cafe'
    return None


def download_places(release):
    import duckdb
    db = duckdb.connect()
    db.execute("SET memory_limit='2GB'")
    db.execute('SET threads=4')
    db.execute('INSTALL httpfs; LOAD httpfs;')
    db.execute("SET s3_region='us-west-2'")
    db.execute('SET http_timeout=60')
    try:
        db.execute('SET enable_geoparquet_conversion=false')
    except Exception:
        pass
    location = 's3://overturemaps-us-west-2/release/' + release + '/theme=places/type=place/*'
    description = db.execute('DESCRIBE SELECT * FROM read_parquet(?)', [location]).fetchall()
    columns = {x[0] for x in description}
    print('Overture release:', release, 'DuckDB:', duckdb.__version__, 'columns:', sorted(columns), flush=True)
    required = {'id', 'names', 'bbox', 'confidence', 'addresses', 'sources'}
    if not required.issubset(columns):
        raise ValueError('Unsupported Overture schema: missing ' + str(required - columns))
    category = 'basic_category' if 'basic_category' in columns else "NULL::VARCHAR"
    taxonomy = 'to_json(taxonomy)' if 'taxonomy' in columns else 'to_json(categories)'
    status = 'operating_status' if 'operating_status' in columns else "NULL::VARCHAR"
    sql = '''SELECT id,names.primary AS name,bbox.ymin AS lat,bbox.xmin AS lon,
             confidence,to_json(addresses) AS addresses,to_json(sources) AS sources,
             ''' + category + ''' AS basic_category,''' + taxonomy + ''' AS taxonomy,
             ''' + status + ''' AS operating_status
             FROM read_parquet(?)
             WHERE bbox.xmin BETWEEN ? AND ? AND bbox.ymin BETWEEN ? AND ?'''
    cursor = db.execute(sql, [location, BBOX[1], BBOX[3], BBOX[0], BBOX[2]])
    fields = [x[0] for x in cursor.description]
    results = []
    while True:
        batch = cursor.fetchmany(4000)
        if not batch:
            break
        for values in batch:
            row = dict(zip(fields, values))
            for key in ('addresses', 'sources', 'taxonomy'):
                row[key] = json.loads(row[key]) if row[key] else ([] if key != 'taxonomy' else {})
            if category_kind(row.get('basic_category'), row['taxonomy']):
                results.append(row)
    db.close()
    print('Food-category records inside bounding box:', len(results), flush=True)
    if not results:
        raise ValueError('No food venues returned; keep previous catalogue')
    return results


def zone_lookup():
    from shapely.geometry import shape, Point
    from shapely.strtree import STRtree
    geo = json.loads((ROOT / 'distritos-sp.geojson').read_text(encoding='utf-8'))
    shapes, names = [], []
    for feature in geo['features']:
        polygon = shape(feature['geometry'])
        if not polygon.is_valid:
            polygon = polygon.buffer(0)
        shapes.append(polygon)
        names.append(feature['properties']['distrito'])
    target = OUT / 'fuentes/guarulhos-ibge.geojson'
    try:
        g = get_json('https://servicodados.ibge.gov.br/api/v3/malhas/municipios/3518800?formato=application/vnd.geo%2Bjson&qualidade=minima')
        if g.get('type') != 'FeatureCollection' or not g.get('features'):
            raise ValueError('Unexpected IBGE boundary')
        write_json(target, g)
    except Exception as error:
        if not target.exists():
            print('No new Guarulhos boundary; existing Guarulhos venues preserved:', str(error)[:150], flush=True)
            g = None
        else:
            g = json.loads(target.read_text(encoding='utf-8'))
    if g:
        for feature in g['features']:
            polygon = shape(feature['geometry'])
            if not polygon.is_valid:
                polygon = polygon.buffer(0)
            shapes.append(polygon)
            names.append('Guarulhos')
    tree = STRtree(shapes)
    def lookup(lat, lon):
        point = Point(lon, lat)
        for index in tree.query(point):
            if shapes[index].covers(point):
                return names[index]
        return None
    return lookup


def convert(raw, lookup, release):
    rows, rejected = [], Counter()
    for record in raw:
        kind = category_kind(record.get('basic_category'), record.get('taxonomy'))
        if not kind:
            rejected['non_food'] += 1
            continue
        confidence = record.get('confidence')
        if confidence is not None and confidence < .5:
            rejected['low_confidence'] += 1
            continue
        status = str(record.get('operating_status') or '').lower()
        if status in ('permanently_closed', 'closed', 'closed_permanently'):
            rejected['closed'] += 1
            continue
        if not record.get('name') or not isinstance(record.get('lat'), (int,float)) or not isinstance(record.get('lon'), (int,float)):
            rejected['missing_identity'] += 1
            continue
        zone = lookup(record['lat'], record['lon'])
        if not zone:
            rejected['outside_target_municipalities'] += 1
            continue
        address = next((a for a in record.get('addresses', []) if a.get('country') in ('BR',None)), {})
        freeform = str(address.get('freeform') or '').strip()
        locality = str(address.get('locality') or '').strip()
        text = ', '.join(x for x in (freeform, locality) if x)
        sources = record.get('sources') or []
        licences = sorted({str(x.get('license')) for x in sources if x.get('license')})
        provider_names = sorted({str(x.get('dataset')) for x in sources if x.get('dataset')})
        label, emoji = KINDS[kind]
        tax = record.get('taxonomy') or {}
        ident = str(record['id'])
        rows.append(dict(id='overture/' + ident, overtureId=ident,
                         name=str(record['name'])[:180], type=kind, typeLabel=label, emoji=emoji,
                         lat=record['lat'], lon=record['lon'], address=text[:300], zones=[zone],
                         cuisine='', source='Overture Maps', sourceUrl='https://explore.overturemaps.org/',
                         sourceRelease=release, sourceDatasets=provider_names,
                         sourceLicenses=licences, sourceRecords=sources,
                         status='source-listed', operatingStatus=status or 'unknown',
                         confidence=confidence, unnamed=False, categoryOriginal=tax.get('primary') or record.get('basic_category')))
    return rows, dict(rejected)


def distance(a,b):
    if not all(isinstance(v.get(k),(int,float)) for v in (a,b) for k in ('lat','lon')):
        return math.inf
    dy=(a['lat']-b['lat'])*111320
    dx=(a['lon']-b['lon'])*111320*math.cos(math.radians((a['lat']+b['lat'])/2))
    return math.hypot(dx,dy)


def matches(a,b):
    if a.get('unnamed') or b.get('unnamed') or not set(a['zones']).intersection(b['zones']):
        return False
    na,nb=fold(a['name']),fold(b['name'])
    if len(na)<5 or len(nb)<5 or na in ('restaurante','bar e lanchonete','lanchonete','bar','cafe'):
        return False
    d=distance(a,b)
    if d>65:
        return False
    def number(value):
        found=re.search(r'(?:,|\s)(\d{1,5})(?:\s|,|$)',str(value))
        return found.group(1) if found else None
    aa,bb=number(a.get('address')),number(b.get('address'))
    if aa and bb and aa!=bb:
        return False
    if na==nb:
        return d<=45 or (fold(a.get('address')) and fold(a.get('address'))==fold(b.get('address')))
    return d<=25 and SequenceMatcher(None,na,nb).ratio()>=.93


def merge(existing, incoming):
    rows=[copy.deepcopy(x) for x in existing]
    by_id={row['id']:i for i,row in enumerate(rows)}
    grid=defaultdict(list)
    def cell(row):
        if not isinstance(row.get('lat'),(int,float)) or not isinstance(row.get('lon'),(int,float)):
            return None
        return int(math.floor(row['lat']*1000)),int(math.floor(row['lon']*1000))
    for i,row in enumerate(rows):
        if cell(row):
            grid[cell(row)].append(i)
    added, duplicates = 0, 0
    for row in incoming:
        if row['id'] in by_id:
            duplicates+=1
            continue
        p=cell(row)
        candidates=[i for dy in (-1,0,1) for dx in (-1,0,1) for i in grid.get((p[0]+dy,p[1]+dx),[])]
        duplicate=next((i for i in candidates if matches(rows[i],row)),None)
        if duplicate is not None:
            target=rows[duplicate]
            refs=target.setdefault('additionalSources',[])
            if not any(x.get('id')==row['id'] for x in refs):
                refs.append({k:row[k] for k in ('id','source','sourceUrl','sourceRelease','sourceDatasets','sourceLicenses','sourceRecords')})
            if target.get('source')=='OpenStreetMap':
                target['source']='OpenStreetMap + Overture Maps'
            if not target.get('address') and row.get('address'):
                target['address']=row['address']
                target['addressSource']='Overture Maps'
            duplicates+=1
            continue
        by_id[row['id']]=len(rows)
        grid[p].append(len(rows))
        rows.append(row)
        added+=1
    return sorted(rows,key=lambda r:fold(r['name'])),added,duplicates


def license_files():
    folder=OUT/'licencias'
    folder.mkdir(parents=True,exist_ok=True)
    urls={
      'CDLA-Permissive-2.0.html':'https://cdla.dev/permissive-2-0/',
      'Apache-2.0.txt':'https://www.apache.org/licenses/LICENSE-2.0.txt',
      'Foursquare-NOTICE.txt':'https://opensource.foursquare.com/places/NOTICE.txt'
    }
    for name,url in urls.items():
        if (folder/name).exists():
            continue
        req=Request(url,headers={'User-Agent':'FomeBoaSP-Catalog/2.0'})
        try:
            with urlopen(req,timeout=25) as response:
                data=response.read(200000)
            (folder/name).write_bytes(data)
        except Exception as error:
            if name!='Foursquare-NOTICE.txt':
                raise RuntimeError('License text download failed: '+name) from error
            (folder/name).write_text('Copyright 2024 Foursquare Labs, Inc. Data transformed to the Overture schema. Apache License 2.0. Source notice: '+url+'\n',encoding='utf-8')
    (folder/'README.md').write_text('''# Sources and licences

OpenStreetMap contributors: https://www.openstreetmap.org/copyright (ODbL 1.0).
Overture Maps Foundation: https://docs.overturemaps.org/attribution/ .
Places from Meta, Microsoft and other providers: CDLA Permissive 2.0.
Foursquare places: Copyright 2024 Foursquare Labs, Inc.; Apache License 2.0.
AllThePlaces: CC0 1.0. Per-record provider/ licence metadata is retained.
IBGE municipal outline: https://servicodados.ibge.gov.br/api/docs/malhas .
This merged, geographically assigned catalogue is offered under ODbL 1.0,
with the original permissive terms and notices retained for contributing records.
Names, types and addresses were normalized and assigned to the site's districts.
These records are not Google Maps listings, consumer reviews or verified opening hours.
''',encoding='utf-8')


def publish(incoming, release, rejected, raw_count):
    existing=json.loads((OUT/'todos.json').read_text(encoding='utf-8'))
    old_manifest=json.loads((OUT/'manifest.json').read_text(encoding='utf-8'))
    rows,added,duplicates=merge(existing,incoming)
    if len(rows)<len(existing) or len({r['id'] for r in rows})!=len(rows):
        raise ValueError('Catalogue preservation check failed')
    names=set(old_manifest['zones'])
    grouped={name:[] for name in names}
    for row in rows:
        if not row.get('name') or row.get('type') not in KINDS:
            raise ValueError('Invalid merged venue')
        for zone in row['zones']:
            if zone not in grouped:
                raise ValueError('Unknown district: '+zone)
            grouped[zone].append(row)
    licence_set=sorted({v for r in incoming for v in r.get('sourceLicenses',[])})
    manifest=copy.deepcopy(old_manifest)
    manifest.update(generatedAt=datetime.now(timezone.utc).isoformat(), total=len(rows),
                    unnamed=sum(bool(r.get('unnamed')) for r in rows),
                    completeGoogleMaps=False,
                    coverage='Locales de OpenStreetMap y Overture Maps en el area urbana de Sao Paulo y Guarulhos. No es un censo completo ni una copia de Google Maps.',
                    attribution='OpenStreetMap contributors; Overture Maps Foundation and original providers',
                    license='Merged catalogue: ODbL 1.0; Overture source records retain CDLA-Permissive-2.0 / Apache-2.0 / CC0 notices',
                    expansion={'previousTotal':len(existing),'added':added,'duplicatesMatched':duplicates,
                               'source':'Overture Maps','release':release,'foodRecordsInBoundingBox':raw_count,
                               'acceptedSourceRecords':len(incoming),'rejected':rejected,
                               'licenses':licence_set,'minimumConfidence':.5},
                    countsByType=dict(Counter(r['type'] for r in rows)))
    license_files()
    write_json(OUT/'fuentes/overture.json',incoming)
    for zone,venues in sorted(grouped.items()):
        relative=old_manifest['zones'][zone]['file']
        if not re.fullmatch(r'zonas/[a-z0-9-]+\.json',relative):
            raise ValueError('Unsafe district file')
        write_json(OUT/relative,venues)
        manifest['zones'][zone]={'count':len(venues),'file':relative}
    write_json(OUT/'todos.json',rows)
    write_json(OUT/'manifest.json',manifest)
    write_json(OUT/'ampliacion.json',manifest['expansion'])
    print(json.dumps({'previous':len(existing),'total':len(rows),'added':added,'duplicatesMatched':duplicates,'rejected':rejected,'types':manifest['countsByType']},ensure_ascii=False),flush=True)
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'],'a',encoding='utf-8') as f:
            f.write('## Expanded catalogue\n\n'+str(added)+' new records. Total: '+str(len(rows))+'. '+str(duplicates)+' source duplicates matched. Not exhaustive.\n')


def self_test():
    assert category_kind('restaurant',{'primary':'pizza_restaurant'})=='restaurant'
    assert category_kind('cafe',{'primary':'coffee_shop'})=='cafe'
    assert category_kind('bank',{'primary':'bank','hierarchy':['financial_service','bank']}) is None
    a={'id':'node/1','name':'Cafe Exemplo','type':'cafe','zones':['Cambuci'],'lat':-23.56,'lon':-46.62,'address':'Rua Um 100'}
    b=dict(a,id='overture/2',source='Overture Maps',sourceUrl='https://example.org',sourceRelease='test',sourceDatasets=[],sourceLicenses=[],sourceRecords=[])
    assert matches(a,b)
    assert not matches(a,dict(b,lat=-23.58))
    assert not matches(a,dict(b,address='Rua Um 102'))
    assert not matches(a,dict(b,name='Cafe Outro'))
    rows,added,dups=merge([a],[b,dict(b,id='overture/3',lat=-23.58)])
    assert len(rows)==2 and added==1 and dups==1
    assert 'confidence' not in KINDS
    print('Classification, distinct branches and deduplication tests passed.',flush=True)


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--test',action='store_true')
    args=parser.parse_args()
    self_test()
    if not args.test:
        release=release_name()
        raw=download_places(release)
        lookup=zone_lookup()
        incoming,rejected=convert(raw,lookup,release)
        if not incoming:
            raise ValueError('No eligible new venues; preserving catalogue')
        publish(incoming,release,rejected,len(raw))
