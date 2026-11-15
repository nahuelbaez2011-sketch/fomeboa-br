/* Shared catalog + proposals. No browser write credentials and no automatic publication. */
(() => {
  'use strict';
  if (typeof render !== 'function' || typeof loadZonePOIs !== 'function') return;
  const oldRender = render, oldVisible = visibleVenues, oldLoad = loadZonePOIs, oldToggle = toggle;
  let manifest = null, allRows = null, showAll = false, busyAll = false, message = '';
  const hydration = new Map(), hydrated = new Set(), draftKey = 'fomeboa-propuestas-v1';
  let drafts = [];
  try { const saved = JSON.parse(localStorage.getItem(draftKey) || '[]'); if (Array.isArray(saved)) drafts = saved.slice(0,2000); } catch (_) {}
  const safeURL = value => { try { const u = new URL(value); return ['http:','https:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } };
  const keyOf = v => fold(v.name) + '|' + fold(v.address) + '|' + (v.zone || (v.zones || []).join(','));
  const normalize = input => {
    const names = new Set([...zones.map(z => z[0]), ...Object.keys(manifest?.zones || {})]);
    const row = Object.fromEntries(['name','type','zone','address','sourceUrl','cuisine'].map(k => [k,String(input[k] || '').trim()]));
    if (row.name.length < 2 || row.name.length > 180 || row.address.length < 4 || row.address.length > 300) throw Error('Nombre o direcci\u00f3n incompletos.');
    if (!kindInfo[row.type] || !names.has(row.zone)) throw Error('Tipo o distrito desconocido.');
    row.sourceUrl = safeURL(row.sourceUrl);
    if (!row.sourceUrl || row.sourceUrl.length > 500) throw Error('Agreg\u00e1 una fuente verificable con direcci\u00f3n https://.');
    row.cuisine = row.cuisine.slice(0,150);
    row.status = 'pending-review';
    return row;
  };
  const style = document.createElement('style');
  style.textContent = '#catalogTools{background:#123f2e;border:1px solid #467f5b;border-radius:14px;padding:14px;margin:0 0 15px}.catalog-buttons{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.catalog-buttons button,.catalog-buttons a{font:inherit;font-size:13px;padding:9px 12px;border-radius:9px;cursor:pointer}.catalog-buttons .strong{background:#f4d856;color:#183b24;font-weight:800}.catalog-message{font-size:12px;line-height:1.5;color:#c5dfcd;margin:9px 0 0}#catalogDialog{width:min(620px,calc(100vw - 32px));max-height:88vh;box-sizing:border-box;border:1px solid #5f9875;border-radius:16px;background:#123c2d;color:#eff8f0;padding:22px}#catalogDialog::backdrop{background:#001b19b8}#catalogDialog h2{margin-top:0}#catalogDialog label{display:block;font-size:13px;margin:12px 0 5px}#catalogDialog input,#catalogDialog select{width:100%;box-sizing:border-box;margin:4px 0;min-width:0}#catalogDialog p{line-height:1.5;font-size:13px}#catalogDialog .catalog-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}#catalogDialog a{color:#ffe77f}.catalog-close{float:right;font-size:14px}#proposalResult{white-space:pre-wrap;color:#ffe898}#catalogFile{display:none}.catalog-source{font-size:12px!important;color:#c4d8c8}#catalogTools{margin:38px 0 0!important;background:#082d24!important;border:1px solid #32664f!important;padding:0!important}#catalogTools>summary{padding:15px 18px;cursor:pointer;color:#c2d9cd;font-size:14px;font-weight:750}#catalogTools>.catalog-buttons,#catalogTools>.catalog-message{margin-left:16px;margin-right:16px}#catalogTools>.catalog-buttons{padding-top:4px;padding-bottom:5px}#catalogTools .catalog-buttons strong{display:none}#catalogTools>.catalog-message:last-child{padding-bottom:14px}#catalogTools .catalog-buttons button{font-size:12px}';
  document.head.appendChild(style);
  const box = document.createElement('details');
  box.id = 'catalogTools';
  box.innerHTML = '<summary>Herramientas del catálogo</summary><div class="catalog-buttons"><button id="catalogAll" class="strong">Explorar catálogo completo</button><button id="catalogAdd">Sugerir un local que falta</button><button id="catalogImport">Importar lista de locales</button><button id="catalogExport">Descargar propuestas pendientes</button><input id="catalogFile" type="file" accept=".json,.csv,application/json,text/csv"></div><p id="catalogInfo" class="catalog-message" role="status">Consultando el cat\u00e1logo compartido...</p><p id="catalogDrafts" class="catalog-message"></p>';
  document.querySelector('main').append(box);
  const dialog = document.createElement('dialog');
  dialog.id = 'catalogDialog';
  dialog.innerHTML = '<button type="button" class="catalog-close" id="catalogClose">Cerrar</button><h2>Agregar un local</h2><p>Pod\u00e9s proponer restaurantes, caf\u00e9s y bares aunque no aparezcan en OpenStreetMap. La propuesta no se publica hasta ser revisada.</p><form id="catalogForm"><label>Nombre comercial<input name="name" required minlength="2" maxlength="180"></label><label>Tipo de local<select name="type"></select></label><label>Distrito o municipio<select name="zone" required></select></label><label>Direcci\u00f3n completa<input name="address" required minlength="4" maxlength="300" placeholder="Calle, n\u00famero y ciudad"></label><label>Web oficial o fuente de los datos<input name="sourceUrl" type="url" required maxlength="500" placeholder="https://..."></label><label>Gastronom\u00eda (opcional)<input name="cuisine" maxlength="150"></label><p>No incluyas datos personales ni copies rese\u00f1as o fotograf\u00edas de otras plataformas. La fuente y la direcci\u00f3n se revisar\u00e1n antes de publicar.</p><div class="catalog-actions"><button type="submit">Guardar propuesta local</button><a id="catalogIssue" target="_blank" rel="noopener noreferrer" hidden>Enviar a revisi\u00f3n en GitHub</a></div><p id="proposalResult" role="status"></p><p>Guardar aqu\u00ed crea un borrador en este navegador. Para enviarlo a revisi\u00f3n, us\u00e1 el enlace de GitHub (requiere cuenta y la propuesta ser\u00e1 p\u00fablica) o export\u00e1 el archivo para entregarlo al administrador.</p></form>';
  document.body.appendChild(dialog);
  const $ = id => document.getElementById(id);
  const draftText = () => { $('catalogDrafts').textContent = drafts.length ? drafts.length + ' propuestas locales pendientes. No est\u00e1n publicadas ni enviadas. Exportalas o envialas a revisi\u00f3n.' : 'Falta de datos no significa falta de restaurantes. Pod\u00e9s proponer los que falten; no se publican autom\u00e1ticamente.'; };
  function saveDrafts() { try { localStorage.setItem(draftKey,JSON.stringify(drafts)); } catch (_) { message = 'No se pudieron guardar los borradores en este navegador. Exportalos antes de cerrar.'; } draftText(); }
  function isDuplicate(row) {
    const needle = keyOf(row);
    if (drafts.some(v => keyOf(v) === needle)) return true;
    const known = allRows || [...poiByZone.values()].flat();
    return known.some(v => fold(v.name) === fold(row.name) && fold(v.address) === fold(row.address) && (v.zones || []).includes(row.zone));
  }
  function fillSelects() {
    const form = $('catalogForm');
    form.elements.type.innerHTML = Object.entries(kindInfo).map(([k,v]) => '<option value="'+esc(k)+'">'+esc(v[0])+'</option>').join('');
    const names = [...new Set([...zones.map(z=>z[0]),...Object.keys(manifest?.zones||{})])].sort((a,b)=>a.localeCompare(b,'pt-BR'));
    form.elements.zone.innerHTML = '<option value="">Eleg\u00ed una zona</option>' + names.map(n=>'<option>'+esc(n)+'</option>').join('');
    if(chosen.size===1) form.elements.zone.value=[...chosen][0];
  }
  $('catalogAdd').onclick = () => { fillSelects(); $('proposalResult').textContent=''; $('catalogIssue').hidden=true; dialog.showModal(); };
  $('catalogClose').onclick = () => dialog.close();
  $('catalogForm').onsubmit = event => {
    event.preventDefault();
    try {
      const row = normalize(Object.fromEntries(new FormData(event.target)));
      if (drafts.length>=2000) throw Error('Export\u00e1 las propuestas antes de seguir cargando. L\u00edmite local: 2000.');
      if (isDuplicate(row)) throw Error('Este nombre y direcci\u00f3n ya aparecen en las propuestas o locales cargados.');
      drafts.push(row); saveDrafts();
      const body = 'Propuesta de alta para revisar. No publicar sin verificar la fuente.\n\n```json\n' + JSON.stringify(row,null,2) + '\n```';
      $('catalogIssue').href = 'https://github.com/nahuelbaez2011-sketch/fomeboa-br/issues/new?' + new URLSearchParams({title:'Propuesta de local: '+row.name,body});
      $('catalogIssue').hidden=false;
      $('proposalResult').textContent='Propuesta guardada solamente en este navegador. Todav\u00eda no se public\u00f3. Pod\u00e9s enviarla a revisi\u00f3n con el enlace o exportarla.';
    } catch(error) { $('proposalResult').textContent=error.message; }
  };
  $('catalogExport').onclick = () => {
    if(!drafts.length){message='No hay propuestas locales para exportar.';render();return}
    const blob=new Blob([JSON.stringify({schemaVersion:1,venues:drafts},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='fomeboa-propuestas.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  function parseCSV(text) {
    const first = text.split(/\r?\n/)[0], sep = first.includes(';')&&!first.includes(',')?';':',';
    const rows=[]; let row=[],field='',quoted=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}
      else if(c===sep&&!quoted){row.push(field);field=''}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(Boolean))rows.push(row);row=[];field=''}
      else field+=c;
    }
    if(quoted)throw Error('CSV con comillas sin cerrar.');
    row.push(field);if(row.some(Boolean))rows.push(row);
    const headers=(rows.shift()||[]).map(x=>x.trim().replace(/^\uFEFF/,''));
    return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])));
  }
  $('catalogImport').onclick=()=>{$('catalogFile').click()};
  $('catalogFile').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      if(file.size>2_000_000)throw Error('El archivo supera 2 MB. Dividilo en lotes menores.');
      const text=await file.text(),parsed=file.name.toLowerCase().endsWith('.csv')?parseCSV(text):JSON.parse(text);
      const rows=Array.isArray(parsed)?parsed:parsed.venues;
      if(!Array.isArray(rows)||rows.length>2000)throw Error('Se admiten hasta 2000 locales por lote.');
      let added=0,duplicates=0,invalid=0;const errors=[];
      for(let i=0;i<rows.length;i++){
        try{const row=normalize(rows[i]);if(isDuplicate(row)){duplicates++;continue}if(drafts.length>=2000)throw Error('L\u00edmite de borradores alcanzado');drafts.push(row);added++}
        catch(error){invalid++;if(errors.length<3)errors.push('Fila '+(i+2)+': '+error.message)}
      }
      saveDrafts();message=added+' propuestas guardadas localmente; '+duplicates+' duplicados omitidos; '+invalid+' filas rechazadas. No se publicaron. '+errors.join(' ');
    }catch(error){message='Importaci\u00f3n: '+error.message}
    finally{event.target.value='';render()}
  };
  const manifestReady=fetch('./catalogo/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Sin cat\u00e1logo guardado');return r.json()}).then(data=>{
    if(data.schemaVersion!==1||!data.zones||!Number.isInteger(data.total))throw Error('Cat\u00e1logo inv\u00e1lido');
    manifest=data;render();return data;
  }).catch(()=>{message='El cat\u00e1logo guardado todav\u00eda no est\u00e1 disponible. La consulta de locales por zona sigue funcionando.';render();return null});
  async function hydrate(name){
    if(hydrated.has(name))return true;
    if(hydration.has(name))return hydration.get(name);
    const promise=(async()=>{
      const m=await manifestReady,info=m?.zones[name];
      if(!info)return false;
      try{
        if(!/^zonas\/[a-z0-9-]+\.json$/.test(info.file))return false;
        const r=await fetch('./catalogo/'+info.file+'?v=locations2');if(!r.ok)throw Error('No disponible');const rows=await r.json();
        if(!Array.isArray(rows)||rows.some(v=>!v.id||!v.name||!Array.isArray(v.zones)||!v.zones.includes(name)))throw Error('Datos inv\u00e1lidos');
        poiByZone.set(name,FomeBoaCatalogQuality.filter(rows));hydrated.add(name);failedZones.delete(name);render();return true;
      }catch(_){return false}
    })();
    hydration.set(name,promise);
    return promise;
  }
  loadZonePOIs=async function(name,force=false){
    if(await hydrate(name))return;
    return oldLoad(name,force);
  };
  toggle=function(name){const outcome=oldToggle(name);if(chosen.has(name))hydrate(name);return outcome};
  visibleVenues=function(){
    if(!showAll||chosen.size)return FomeBoaCatalogQuality.filter(oldVisible());
    const q=fold(el('search').value),type=el('category').value,order=el('order').value;
    const rows=FomeBoaCatalogQuality.filter(allRows||[]).filter(v=>(!onlyFavorites||favorites.has(v.id))&&(!el('glutenOnly').checked||FomeBoaGluten.matches(v))&&(!type||type===v.type)&&(!q||fold([v.name,v.typeLabel,v.address,v.cuisine,...v.zones].join(' ')).includes(q)));
    return rows.sort((a,b)=>order==='type'?a.typeLabel.localeCompare(b.typeLabel,'pt-BR')||a.name.localeCompare(b.name,'pt-BR'):a.name.localeCompare(b.name,'pt-BR'));
  };
  function closureReportLink(venue){
    const details=[
      'Solicitud de revisión de un establecimiento en FomeBoa SP.',
      '',
      'Nombre: '+String(venue.name||''),
      'Dirección registrada: '+String(venue.address||''),
      'Zona: '+(venue.zones||[]).join(', '),
      'ID de catálogo: '+String(venue.id||''),
      '',
      'Qué ocurrió: [cerrado permanentemente / trasladado / dirección incorrecta / otro]',
      'Enlace de Google Maps o evidencia reciente: [pegá aquí el enlace]',
      'Fecha aproximada de la observación: [día/mes/año]',
      '',
      'No quitar sin revisión individual; otros locales con nombres iguales podrían seguir abiertos.'
    ];
    const qs=new URLSearchParams({title:'Revisar estado de local: '+String(venue.name||''),body:details.join('\n')});
    return '<a class="catalog-report" target="_blank" rel="noopener noreferrer" href="https://github.com/nahuelbaez2011-sketch/fomeboa-br/issues/new?'+qs.toString().replace(/&/g,'&amp;')+'" title="Informar un posible cierre o un error de ubicación. Necesita revisión antes de retirar la ficha.">Reportar cierre o error</a>';
  }
  const venueInitials = Object.freeze({
    restaurant:'R',cafe:'C',bar:'B',bakery:'P',pastry:'T',
    pub:'B',fast_food:'L',food_court:'F',ice_cream:'H',
    biergarten:'B',confectionery:'D',coffee:'C',deli:'D'
  });
  function cards(rows){
    el('cards').innerHTML=rows.slice(0,visibleLimit).map(v=>{
      const source=safeURL(v.sourceUrl||(v.osmType?'https://www.openstreetmap.org/'+v.osmType+'/'+v.osmId:''));
      const maps=FomeBoaGoogleMaps.resolve(v);
      const url=maps.href?safeURL(maps.href):'';
      const mapLink=url
        ?'<a class="compact-google" data-verified="'+String(maps.kind==='verified')+'" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(maps.note)+'">📍 Ver ubicación en Google Maps ↗</a>'
        :'<span class="compact-no-map">Ubicación sin verificar</span>';
      const alternative=maps.kind==='search'&&v.address?FomeBoaGoogleMaps.resolve(v,{nameOnly:true}):null;
      const alternativeLink=alternative&&alternative.href?safeURL(alternative.href):'';
      const saved=favorites.has(v.id);
      const address=String(v.address||'Dirección sin registrar');
      return '<article class="card compact-card" data-type="'+esc(v.type)+'">'
        +'<div class="compact-top"><h3 title="'+esc(v.name)+'"><span class="venue-kind-icon venue-initial" aria-hidden="true">'+esc(venueInitials[v.type]||'G')+'</span><span class="venue-name">'+esc(v.name)+'</span></h3><button type="button" class="catalog-fav compact-fav" data-id="'+esc(v.id)+'" aria-label="'+(saved?'Quitar de favoritos':'Guardar en favoritos')+'" aria-pressed="'+String(saved)+'" title="'+(saved?'Quitar de favoritos':'Guardar en favoritos')+'">'+(saved?'♥':'♡')+'</button></div>'
        +'<p class="tag compact-subtitle">'+esc(v.typeLabel)+' · '+esc((v.zones||[]).join(' + '))+'</p>'
        +FomeBoaGluten.badge(v)
        +'<p class="compact-address" title="'+esc(address)+'">'+esc(address)+'</p>'
        +'<div class="compact-actions">'+mapLink+'</div>'
        +'<small class="location-review-note" data-location-review="'+(v.locationAudit?.issues?.includes('same_identity_address_conflicting_coordinates')?'conflict':maps.kind==='verified'?'verified':'unverified')+'">'+(maps.kind==='verified'?'Ficha enlazada; apertura sin comprobar':v.locationAudit?.issues?.includes('same_identity_address_conflicting_coordinates')?'Ubicaci\u00f3n inconsistente: en revisi\u00f3n':'Ubicaci\u00f3n pendiente de verificar')+'</small>'
        +'<details class="compact-details"><summary>Más información</summary><div class="compact-extra">'
        +(v.cuisine?'<p>'+esc(v.cuisine)+'</p>':'')
        +'<p>Fuente: '+esc(v.source||'OpenStreetMap')+'. Estado de apertura no verificado.</p>'
        +(alternativeLink?'<a target="_blank" rel="noopener noreferrer" href="'+esc(alternativeLink)+'">Buscar solo por nombre en Google Maps</a>':'')
        +(source?'<a target="_blank" rel="noopener noreferrer" href="'+esc(source)+'">Ver fuente</a>':'')
        +FomeBoaGluten.detail(v)+closureReportLink(v)
        +'</div></details></article>';
    }).join('');
    document.querySelectorAll('.catalog-fav').forEach(b=>b.onclick=()=>{
      const id=b.dataset.id;
      if(favorites.has(id))favorites.delete(id);else favorites.add(id);
      try{localStorage.setItem('fomeboa-favorites',JSON.stringify([...favorites]))}catch(_){}
      render();
    });
  }
  render=function(){
    if(chosen.size)showAll=false;
    oldRender();
    const rows=visibleVenues();if(rows.length)cards(rows);
    if(showAll){el('total').textContent='('+rows.length+' locales del cat\u00e1logo guardado)';if(!rows.length)el('cards').innerHTML='<p>No hay locales guardados que coincidan con estos filtros.</p>';}
    $('catalogAll').disabled=busyAll||!manifest;
    $('catalogInfo').textContent=message||(manifest?manifest.total+' locales guardados en el \u00e1rea urbana. Fuentes: OpenStreetMap, Overture Maps y fichas revisadas. Actualizaci\u00f3n: '+new Date(manifest.generatedAt).toLocaleDateString('es-ES')+'. No representa todos los negocios de Google Maps.':'Consultando el cat\u00e1logo compartido...');
    draftText();
    window.FomeBoaI18n?.translate?.();
  };
  $('catalogAll').onclick=async()=>{
    busyAll=true;message='Abriendo el cat\u00e1logo guardado...';render();
    try{
      if(!allRows){const r=await fetch('./catalogo/todos.json?v=locations2');if(!r.ok)throw Error('No disponible');allRows=await r.json();if(!Array.isArray(allRows))throw Error('Datos inv\u00e1lidos')}
      chosen.clear();showAll=true;visibleLimit=60;syncZoneLabels();message='Cat\u00e1logo completo de los datos cargados. Pod\u00e9s filtrar por tipo o nombre; no es un censo completo de la ciudad.';
      el('restaurantes').scrollIntoView({behavior:'smooth'});
    }catch(_){message='No se pudo abrir el cat\u00e1logo guardado. Prob\u00e1 la consulta por zona.'}
    finally{busyAll=false;render()}
  };
  render();
})();
