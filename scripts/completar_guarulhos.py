"""Complete the Guarulhos portion without changing the map or dropping existing venues."""
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from shapely.geometry import Point, shape
import ampliar_catalogo as base


def municipal_boundary():
    target=base.OUT/'fuentes/guarulhos-osm.geojson'
    if target.exists():
        collection=json.loads(target.read_text(encoding='utf-8'))
        return shape(collection['features'][0]['geometry'])
    query=urlencode({'q':'Guarulhos, Sao Paulo, Brasil','format':'geojson','polygon_geojson':1,'addressdetails':1,'countrycodes':'br','limit':5})
    collection=base.get_json('https://nominatim.openstreetmap.org/search?'+query)
    for feature in collection.get('features',[]):
        if feature.get('geometry',{}).get('type') not in ('Polygon','MultiPolygon'):
            continue
        props=feature.get('properties',{})
        if 'guarulhos' not in base.fold(props.get('display_name') or props.get('name')):
            continue
        if props.get('type') not in ('administrative','city','municipality') and props.get('addresstype') not in ('city','municipality'):
            continue
        polygon=shape(feature['geometry'])
        if not polygon.is_valid:
            polygon=polygon.buffer(0)
        west,south,east,north=polygon.bounds
        if not polygon.covers(Point(-46.533,-23.454)) or east-west>.8 or north-south>.8:
            continue
        base.write_json(target,{'type':'FeatureCollection','source':'OpenStreetMap / Nominatim','license':'ODbL 1.0','features':[feature]})
        return polygon
    raise ValueError('No validated Guarulhos municipal boundary; existing catalogue preserved')


class VisibleText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts=[]
        self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in ('script','style'):
            self.skip+=1
    def handle_endtag(self,tag):
        if tag in ('script','style') and self.skip:
            self.skip-=1
    def handle_data(self,data):
        if not self.skip and data.strip():
            self.parts.append(data.strip())


def complete_notices():
    url='https://opensource.foursquare.com/places-notice-txt/'
    with urlopen(Request(url,headers={'User-Agent':'FomeBoaSP-Catalog/2.0'}),timeout=35) as response:
        html=response.read(500000).decode('utf-8')
    parser=VisibleText();parser.feed(html)
    text='\n'.join(parser.parts)
    if 'NOTICE.txt' not in text or 'Apache' not in text:
        raise ValueError('Incomplete Foursquare source notice')
    folder=base.OUT/'licencias'
    folder.mkdir(exist_ok=True)
    (folder/'Foursquare-NOTICE.txt').write_text(text+'\n\nFomeBoa SP changes: selected food venues in the project area, normalized fields, assigned districts and merged duplicate source records. Original notice: '+url+'\n',encoding='utf-8')
    path=base.ROOT/'catalogo.js'
    js=path.read_text(encoding='utf-8')
    js=js.replace('Fuente: OpenStreetMap y fichas revisadas.','Fuentes: OpenStreetMap, Overture Maps y fichas revisadas.')
    path.write_text(js,encoding='utf-8')
    path=base.ROOT/'index.html'
    html=path.read_text(encoding='utf-8')
    html=html.replace('Datos de lugares: \u00a9 colaboradores de OpenStreetMap (ODbL)','Datos de lugares: OpenStreetMap y Overture Maps')
    if 'id="catalogLicenseLink"' not in html:
        html=html.replace('</footer>',' <a id="catalogLicenseLink" href="https://github.com/nahuelbaez2011-sketch/fomeboa-br/blob/main/catalogo/licencias/README.md" target="_blank" rel="noopener noreferrer" style="color:#ffe16c">Fuentes y licencias</a></footer>',1)
    path.write_text(html,encoding='utf-8')


def main():
    complete_notices()
    previous=json.loads((base.OUT/'manifest.json').read_text(encoding='utf-8'))
    polygon=municipal_boundary()
    west,south,east,north=polygon.bounds
    original=base.BBOX
    base.BBOX=(max(original[0],south),max(original[1],west),min(original[2],north),min(original[3],east))
    release=base.release_name()
    raw=base.download_places(release)
    incoming,rejected=base.convert(raw,lambda lat,lon:'Guarulhos' if polygon.covers(Point(lon,lat)) else None,release)
    if not incoming:
        raise ValueError('No new source records for Guarulhos')
    saved=json.loads((base.OUT/'fuentes/overture.json').read_text(encoding='utf-8'))
    combined={row['id']:row for row in saved}
    combined.update({row['id']:row for row in incoming})
    base.publish(list(combined.values()),release,rejected,len(raw))
    path=base.OUT/'manifest.json'
    manifest=json.loads(path.read_text(encoding='utf-8'))
    previous_report=previous.get('expansion',{})
    initial=previous.get('initialCatalogTotal') or previous_report.get('previousTotal') or previous['total']
    # Keep a durable account of the two passes rather than counting a reloaded record as new.
    report={'initialTotal':initial,'total':manifest['total'],'addedTotal':manifest['total']-initial,
            'saoPauloPass':previous_report,'guarulhosPass':manifest['expansion'],
            'guarulhosTotal':manifest['zones']['Guarulhos']['count'],
            'guarulhosSourceRecords':len(incoming),'guarulhosRejected':rejected,
            'coverageComplete':False,'minimumConfidence':.5}
    manifest['initialCatalogTotal']=initial
    manifest['guarulhosExpanded']=True
    manifest['expansionSummary']={'initialTotal':initial,'addedTotal':report['addedTotal'],'total':manifest['total']}
    base.write_json(path,manifest)
    base.write_json(base.OUT/'ampliacion-resumen.json',report)
    print(json.dumps(report,ensure_ascii=False),flush=True)
    assert manifest['total']>=previous['total']


if __name__=='__main__':
    main()
