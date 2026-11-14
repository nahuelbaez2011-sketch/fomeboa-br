"""Build a shared, source-labelled food directory; never claim exhaustive coverage."""
import argparse
import csv
import hashlib
import json
import math
import os
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'catalogo'
BBOX = (-23.80, -46.90, -23.35, -46.36)
KINDS = {
    'restaurant': ('Restaurante', '\U0001f37d\ufe0f'), 'cafe': ('Cafeter\u00eda', '\u2615'),
    'bar': ('Bar', '\U0001f379'), 'pub': ('Pub', '\U0001f37a'),
    'fast_food': ('Comida r\u00e1pida', '\U0001f354'), 'food_court': ('Patio de comidas', '\U0001f37d\ufe0f'),
    'bakery': ('Panader\u00eda', '\U0001f950'), 'pastry': ('Pasteler\u00eda', '\U0001f370'),
    'coffee': ('Tienda de caf\u00e9', '\u2615'), 'ice_cream': ('Helader\u00eda', '\U0001f366'),
    'biergarten': ('Cervecer\u00eda', '\U0001f37b'), 'confectionery': ('Confiter\u00eda', '\U0001f370'),
    'deli': ('Delicatessen', '\U0001f96a')
}
ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']


def fold(value):
    return ''.join(c for c in unicodedata.normalize('NFD', str(value)) if not unicodedata.combining(c)).casefold().strip()


def inside_ring(lon, lat, ring):
    inside = False
    previous = ring[-1]
    for point in ring:
        x, y = point[:2]
        px, py = previous[:2]
        if (y > lat) != (py > lat) and lon < (px - x) * (lat - y) / (py - y) + x:
            inside = not inside
        previous = point
    return inside


def inside(geometry, lat, lon):
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    return any(poly and inside_ring(lon, lat, poly[0]) and not any(inside_ring(lon, lat, hole) for hole in poly[1:]) for poly in polygons)


def bounds(geometry):
    def pairs(value):
        if len(value) >= 2 and isinstance(value[0], (int, float)):
            yield value
        else:
            for item in value:
                yield from pairs(item)
    pts = list(pairs(geometry['coordinates']))
    return min(p[1] for p in pts), min(p[0] for p in pts), max(p[1] for p in pts), max(p[0] for p in pts)


def in_box(lat, lon, box=BBOX):
    return box[0] <= lat <= box[2] and box[1] <= lon <= box[3]


def http_query(guarulhos=False):
    box = ','.join(map(str, BBOX))
    area = 'area["boundary"="administrative"]["admin_level"="8"]["name"="Guarulhos"]->.g;' if guarulhos else ''
    region = '(area.g)' if guarulhos else ''
    food = 'restaurant|cafe|bar|pub|fast_food|food_court|ice_cream|biergarten'
    shops = 'bakery|pastry|coffee|ice_cream|confectionery|deli'
    query = '[out:json][timeout:80][maxsize:134217728];' + area + '(nwr["amenity"~"^(' + food + ')$"]' + region + '(' + box + ');nwr["shop"~"^(' + shops + ')$"]' + region + '(' + box + '););out center;'
    errors = []
    for endpoint in ENDPOINTS:
        try:
            req = Request(endpoint, data=urlencode({'data': query}).encode(), headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'FomeBoaSP-Catalog/1.0 (+https://github.com/nahuelbaez2011-sketch/fomeboa-br)'
            })
            with urlopen(req, timeout=100) as response:
                raw = response.read(30_000_001)
            if len(raw) > 30_000_000:
                raise ValueError('Response exceeds safety limit')
            data = json.loads(raw)
            if data.get('remark') or not isinstance(data.get('elements'), list):
                raise ValueError('Incomplete Overpass response: ' + str(data.get('remark', 'invalid data')))
            return data['elements'], data.get('osm3s', {}).get('timestamp_osm_base')
        except Exception as exc:
            errors.append(endpoint + ': ' + str(exc))
    raise RuntimeError('; '.join(errors))


def osm_venue(element, zone):
    t = element.get('tags', {})
    kind = t.get('amenity') if t.get('amenity') in KINDS else t.get('shop')
    center = element.get('center', element)
    lat, lon = center.get('lat'), center.get('lon')
    if kind not in KINDS or not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)) or not in_box(lat, lon):
        return None
    if t.get('disused') == 'yes' or t.get('abandoned') == 'yes' or t.get('disused:amenity'):
        return None
    label, emoji = KINDS[kind]
    name = str(t.get('name') or t.get('name:pt') or t.get('brand') or (label + ' (nombre sin registrar)'))[:180]
    address = ' '.join(str(t.get(k, '')).strip() for k in ['addr:street', 'addr:housenumber']).strip()
    address = ', '.join(x for x in [address, str(t.get('addr:suburb', '')).strip()] if x)
    ident = str(element['type']) + '/' + str(element['id'])
    return dict(id=ident, osmType=element['type'], osmId=element['id'], name=name,
                type=kind, typeLabel=label, emoji=emoji, lat=lat, lon=lon, address=address[:300],
                cuisine=str(t.get('cuisine', '')).replace(';', ', ')[:150], zones=[zone],
                source='OpenStreetMap', sourceUrl='https://www.openstreetmap.org/' + ident,
                status='source-listed', unnamed=not bool(t.get('name') or t.get('name:pt') or t.get('brand')))


def duplicate_key(row):
    # Never merge branches of a chain merely because they share a name.
    address = fold(row.get('address', ''))
    if address and not row.get('unnamed'):
        return (fold(row['name']), address, tuple(sorted(row['zones'])))
    return ('id', row['id'])


def validate_manual(row, district_names):
    required = ['name', 'type', 'zone', 'address', 'sourceUrl']
    if any(not str(row.get(k, '')).strip() for k in required):
        raise ValueError('Manual entry missing required fields: ' + ', '.join(required))
    if row['type'] not in KINDS or row['zone'] not in district_names:
        raise ValueError('Unknown type or district in manual entry')
    if urlparse(row['sourceUrl']).scheme not in ('http', 'https') or not urlparse(row['sourceUrl']).netloc:
        raise ValueError('sourceUrl must be an http(s) source')
    row = {k: str(row.get(k, '')).strip()[:500] for k in ['name', 'type', 'zone', 'address', 'sourceUrl', 'cuisine', 'reviewedAt', 'status']}
    return row


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    temp.replace(path)


def import_file(path, names):
    with path.open(encoding='utf-8-sig', newline='') as f:
        rows = list(csv.DictReader(f)) if path.suffix.lower() == '.csv' else json.load(f)
    if isinstance(rows, dict):
        rows = rows.get('venues', [])
    if not isinstance(rows, list) or len(rows) > 50000:
        raise ValueError('Expected at most 50000 entries')
    valid = [validate_manual(r, names) for r in rows]
    target = OUT / 'curados.json'
    old = json.loads(target.read_text(encoding='utf-8')) if target.exists() else []
    seen = {(fold(r['name']), fold(r['address']), r['zone']) for r in old}
    added = 0
    for row in valid:
        key = (fold(row['name']), fold(row['address']), row['zone'])
        if key not in seen:
            row['status'] = 'pending-review'
            row['reviewedAt'] = ''
            old.append(row)
            seen.add(key)
            added += 1
    write_json(target, old)
    print('Imported pending review:', added, '; duplicates skipped:', len(valid) - added)


def install_frontend():
    path = ROOT / 'index.html'
    html = path.read_text(encoding='utf-8')
    tag = '<script src="catalogo.js?v=13"></script>'
    if tag not in html:
        if '</html>' not in html:
            raise ValueError('Expected HTML end tag')
        html = html.replace('</html>', tag + '</html>', 1)
        path.write_text(html, encoding='utf-8')


def build():
    source = json.loads((ROOT / 'distritos-sp.geojson').read_text(encoding='utf-8'))
    district_list = [(f['properties']['distrito'], f['geometry'], bounds(f['geometry'])) for f in source['features']]
    names = {name for name, _, _ in district_list} | {'Guarulhos'}
    elements, timestamp = http_query()
    if not elements:
        raise ValueError('Empty city response; retaining the existing catalog')
    rows, outside = [], 0
    for element in elements:
        p = element.get('center', element)
        lat, lon = p.get('lat'), p.get('lon')
        if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
            continue
        name = next((n for n, g, b in district_list if in_box(lat, lon, b) and inside(g, lat, lon)), None)
        if name:
            venue = osm_venue(element, name)
            if venue:
                rows.append(venue)
        else:
            outside += 1
    notes = []
    guarulhos_ok = False
    try:
        g_elements, _ = http_query(True)
        if not g_elements:
            raise ValueError('Guarulhos query returned no entries')
        for element in g_elements:
            venue = osm_venue(element, 'Guarulhos')
            if venue:
                rows.append(venue)
        guarulhos_ok = True
    except Exception as exc:
        notes.append('Guarulhos no se actualizo: ' + str(exc)[:250])
        previous = OUT / 'todos.json'
        if previous.exists():
            rows.extend(r for r in json.loads(previous.read_text(encoding='utf-8')) if 'Guarulhos' in r.get('zones', []))
    manual_path = OUT / 'curados.json'
    manual_rows = json.loads(manual_path.read_text(encoding='utf-8')) if manual_path.exists() else []
    for proposal in manual_rows:
        if proposal.get('status') != 'approved' or not proposal.get('reviewedAt'):
            continue
        entry = validate_manual(proposal, names)
        label, emoji = KINDS[entry['type']]
        identity = hashlib.sha256((fold(entry['name']) + '|' + fold(entry['address']) + '|' + entry['zone']).encode()).hexdigest()[:20]
        rows.append(dict(id='manual/' + identity, name=entry['name'], type=entry['type'],
                         typeLabel=label, emoji=emoji, zones=[entry['zone']], address=entry['address'],
                         source='Ficha revisada de FomeBoa SP', sourceUrl=entry['sourceUrl'],
                         status='reviewed', reviewedAt=entry['reviewedAt'], cuisine=entry['cuisine']))
    unique, keys, duplicates = {}, {}, 0
    for row in rows:
        key = duplicate_key(row)
        existing = row['id'] if row['id'] in unique else keys.get(key)
        if existing:
            unique[existing]['zones'] = sorted(set(unique[existing]['zones'] + row['zones']))
            duplicates += 1
        else:
            unique[row['id']] = row
            keys[key] = row['id']
    rows = sorted(unique.values(), key=lambda r: fold(r['name']))
    if not rows:
        raise ValueError('No valid venues; retaining previous catalog')
    grouped = {name: [] for name in names}
    for row in rows:
        for name in row['zones']:
            grouped[name].append(row)
    manifest = {'schemaVersion': 1, 'generatedAt': datetime.now(timezone.utc).isoformat(),
                'osmBaseTimestamp': timestamp, 'total': len(rows), 'duplicatesRemoved': duplicates,
                'unnamed': sum(bool(r.get('unnamed')) for r in rows), 'bbox': list(BBOX),
                'completeGoogleMaps': False, 'guarulhosUpdated': guarulhos_ok,
                'coverage': 'Locales registrados en OSM dentro del area urbana definida; no es un censo completo ni un catalogo de Google Maps.',
                'license': 'OpenStreetMap data: ODbL 1.0', 'attribution': 'OpenStreetMap contributors',
                'notes': notes, 'zones': {}}
    for name, venues in sorted(grouped.items()):
        slug = re.sub(r'[^a-z0-9]+', '-', fold(name)).strip('-')
        file = 'zonas/' + slug + '.json'
        write_json(OUT / file, venues)
        manifest['zones'][name] = {'count': len(venues), 'file': file}
    write_json(OUT / 'todos.json', rows)
    write_json(OUT / 'manifest.json', manifest)
    print(json.dumps({'total': len(rows), 'districtsWithData': sum(bool(x) for x in grouped.values()),
                      'duplicatesRemoved': duplicates, 'guarulhosUpdated': guarulhos_ok}, ensure_ascii=False))
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
            f.write('## Catalogo FomeBoa SP\n\n' + str(len(rows)) + ' locales de fuentes abiertas guardados. No representa todos los negocios de Google Maps.\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--install', action='store_true')
    parser.add_argument('--import-file', type=Path)
    args = parser.parse_args()
    if args.install:
        install_frontend()
    elif args.import_file:
        geo = json.loads((ROOT / 'distritos-sp.geojson').read_text(encoding='utf-8'))
        import_file(args.import_file, {f['properties']['distrito'] for f in geo['features']} | {'Guarulhos'})
    else:
        build()
