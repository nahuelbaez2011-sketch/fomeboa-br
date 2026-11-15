/* Catalog quality rules. Owner reports are not independent Google verification. */
(function(root){
  'use strict';
  const RULES = Object.freeze([Object.freeze({
    key: 'reported-closure-padaria-portuguesa-cafe-246',
    ids: ['overture/9d6590bb-3f5d-4239-92d7-4ccf30ad41ca'],
    name: 'A Padaria Portuguesa',
    address: 'Avenida do Café, 246, São Paulo',
    zone: 'Jabaquara',
    status: 'reported_permanently_closed',
    reportedAt: '2026-11-14',
    basis: 'Site owner reported permanent closure in conversation',
    independentlyVerified: false,
    action: 'hide_from_public_catalog'
  })]);
  // LOCATION_REVIEW_BEGIN
  const REVIEWED_EXCLUSIONS = Object.freeze({"overture/032fde0d-6316-456a-8cc8-3b5c191b67b5":{"key":"published_closure_at_address","status":"published_closure_at_address","independentlyVerified":false,"verifiedViaGoogle":false,"sourceUrls":["https://vejasp.abril.com.br/estabelecimento/tujuina/","https://vejasp.abril.com.br/coluna/arnaldo-lorencato/comer-beber-2022-restaurantes-fechados/"]},"node/4528876498":{"key":"published_closure_at_address","status":"published_closure_at_address","independentlyVerified":false,"verifiedViaGoogle":false,"sourceUrls":["https://vejasp.abril.com.br/estabelecimento/attimo/"]},"overture/54f34a0a-b725-4bce-a6e6-b8fa1879c7a1":{"key":"published_closure_at_address","status":"published_closure_at_address","independentlyVerified":false,"verifiedViaGoogle":false,"sourceUrls":["https://vejasp.abril.com.br/estabelecimento/chef-tobias-linguicaria/","https://vejasp.abril.com.br/coluna/arnaldo-lorencato/chef-tobias-linguicaria-fechou/"]},"overture/fb7f2248-8ebe-482e-a2b4-3c292c6dbe5e":{"key":"published_closure_at_address","status":"published_closure_at_address","independentlyVerified":false,"verifiedViaGoogle":false,"sourceUrls":["https://vejasp.abril.com.br/estabelecimento/fattoria-rascal/"]},"overture/c13f972e-3622-4780-9d63-c2a92603d833":{"key":"published_closure_at_address","status":"published_closure_at_address","independentlyVerified":false,"verifiedViaGoogle":false,"sourceUrls":["https://vejasp.abril.com.br/estabelecimento/casa-tucupi/"]},"node/3540192293":{"key":"obsolete_location_after_move","status":"obsolete_location_after_move","independentlyVerified":false,"verifiedViaGoogle":false,"sourceUrls":["https://vejasp.abril.com.br/coluna/arnaldo-lorencato/comer-e-beber-arturito-paola-carosella-mudanca/","https://receitas.globo.com/blog/curiosidades-e-gastronomia/o-que-comer-no-arturito-restaurante-da-paola-carosella-veja-o-que-provamos.ghtml"]},"node/2541351283":{"key":"source_annotation_needs_review","status":"source_annotation_needs_review","independentlyVerified":false,"verifiedViaGoogle":false,"sourceUrls":["https://www.openstreetmap.org/node/2541351283"]},"overture/71e78bf0-a4c1-43c2-a204-97b5862ffaa2":{"key":"temporary_closure_annotation_needs_review","status":"temporary_closure_annotation_needs_review","independentlyVerified":false,"verifiedViaGoogle":false,"sourceUrls":["https://explore.overturemaps.org/"]}});
  // LOCATION_REVIEW_END
  const fold = value => String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const compact = value => fold(value).replace(/[^a-z0-9]/g,'');
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function exclusion(venue){
    if (!venue || typeof venue !== 'object') return {key:'invalid-record'};
    if (REVIEWED_EXCLUSIONS[String(venue.id||'')]) return REVIEWED_EXCLUSIONS[String(venue.id||'')];
    if(venue.unnamed===true || !String(venue.name||'').trim()) return {key:'missing-business-name',status:'pending_identity_review',independentlyVerified:false};
    for (const rule of RULES){
      if (rule.ids.includes(String(venue.id || ''))) return rule;
      const names = [compact(rule.name), 'padariaportuguesa'];
      const address = fold(venue.address).replace(/[^a-z0-9]+/g,' ').trim();
      const zones = Array.isArray(venue.zones) ? venue.zones : [venue.zone];
      if (names.includes(compact(venue.name)) && zones.some(z => fold(z) === fold(rule.zone)) && /\b(?:avenida|av) do cafe 246\b/.test(address)) return rule;
    }
    const values = [venue.operatingStatus,venue.operating_status,venue.businessStatus,venue.business_status,venue.status];
    const closed = new Set(['closed','permanently_closed','closed_permanently','permanent_closure','reported_permanently_closed','cerrado_permanentemente']);
    if(values.some(v => closed.has(fold(v).replace(/[\s-]+/g,'_')))) return {key:'source-reported-closure',status:'source_reported_closed',independentlyVerified:false};
    return null;
  }
  function filter(rows){return (Array.isArray(rows) ? rows : []).filter(v => !exclusion(v));}
  function unique(rows){
    const byId = new Map();
    for(const v of filter(rows)){
      const key = v.id || [fold(v.name),fold(v.address),JSON.stringify(v.zones || [])].join('|');
      if(!byId.has(key)) byId.set(key,v);
    }
    return [...byId.values()];
  }
  const CATEGORIES = Object.freeze([
    ['restaurant','Restaurantes'],['pastry','Pastelerías'],['bakery','Panaderías'],
    ['cafe','Cafeterías'],['bar','Bares'],['pub','Pubs'],['fast_food','Comida rápida'],
    ['ice_cream','Heladerías'],['confectionery','Confiterías'],['biergarten','Cervecerías'],
    ['food_court','Patios de comidas'],['coffee','Tiendas de café'],['deli','Delicatessen']
  ]);
  function counts(rows){
    const list = unique(rows), byType = {};
    for(const v of list){const key = String(v.type || 'other'); byType[key]=(byType[key]||0)+1;}
    return {total:list.length,byType};
  }
  function countsHTML(rows, context){
    context=context||{};
    const selected=Array.isArray(context.selectedZones)?context.selectedZones:[];
    const loaded=Array.isArray(context.loadedZones)?context.loadedZones:[];
    if(!selected.length) return '<p class="mini-note">Seleccioná una o varias zonas para ver cantidades por categoría.</p>';
    if(!loaded.length) return '<p class="mini-note">Recuento pendiente de cargar. No se interpreta como cero locales.</p>';
    const stats=counts(rows), known=new Set(CATEGORIES.map(c=>c[0]));
    const display=CATEGORIES.filter((c,i)=>i<5||(stats.byType[c[0]]||0)>0);
    const others=Object.entries(stats.byType).reduce((n,[key,value])=>n+(known.has(key)?0:value),0);
    if(others)display.push(['other','Otros locales']);
    const partial=loaded.length<selected.length;
    const number=n=>Number(n).toLocaleString('es-ES');
    return '<p class="mini-note">'+(partial?'Recuento parcial de las zonas cargadas.':'Recuento de las zonas seleccionadas.')+'</p><dl class="venue-count-list">'+display.map(([type,label])=>'<div><dt>'+escape(label)+'</dt><dd>'+number(type==='other'?others:stats.byType[type]||0)+'</dd></div>').join('')+'</dl><p class="venue-count-total"><span>Total de registros visibles</span><strong>'+number(stats.total)+'</strong></p><p class="mini-note">Sin locales destacados. Los cierres conocidos o reportados se excluyen; la apertura actual de los demás puede no estar confirmada.</p>';
  }
  const api=Object.freeze({rules:RULES,exclusion,filter,unique,counts,countsHTML});
  root.FomeBoaCatalogQuality=api;
  if(typeof module!=='undefined' && module.exports)module.exports=api;
  if(typeof document!=='undefined' && document.head && !document.getElementById('catalog-quality-style')){
    const style=document.createElement('style');style.id='catalog-quality-style';
    style.textContent='.venue-count-list{margin:10px 0}.venue-count-list>div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #38694e}.venue-count-list dt{font-size:14px;color:#deeee5}.venue-count-list dd{margin:0;font-size:16px;font-weight:800;font-variant-numeric:tabular-nums;color:#ffe175}.venue-count-total{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:12px 0;padding:11px 0;border-top:1px solid #619075;font-size:13px}.venue-count-total strong{font-size:18px;color:#ffe175;font-variant-numeric:tabular-nums}.zone-restaurants h2{font-size:17px}';
    document.head.appendChild(style);
  }
})(typeof globalThis!=='undefined'?globalThis:this);
