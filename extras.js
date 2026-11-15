/* FomeBoa: consent-based position + verified-menu workflow. No paid maps API. */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>root.FomeBoaI18n?.lang||'es';
const words={
 es:{locate:'📍 Mi ubicación',locating:'Buscando tu ubicación…',outside:'Estás fuera del área de São Paulo y Guarulhos. La ubicación no se envió a FomeBoa.',denied:'No pudimos acceder a tu ubicación. Revisá los permisos del navegador.',locGood:'Tu posición aproximada en el mapa (no se guarda en tu cuenta).',near:'Cerca de mí',nearEmpty:'Seleccioná una zona para descubrir locales cercanos. Las ubicaciones de los negocios no están todas verificadas.',distance:'km aprox.',menu:'🍽️ Menú y precios',menuEmpty:'Todavía no hay platos con precios revisados para este local.',menuHint:'Precios aportados y revisados; pueden cambiar. Confirmá con el restaurante.',addMenu:'Proponer un plato y precio',name:'Nombre del plato',description:'Descripción (opcional)',price:'Precio en reales (R$)',source:'Enlace de la carta o evidencia de precio (https://)',submit:'Enviar para revisión',sending:'Enviando…',pending:'Propuesta guardada. Solo aparecerá públicamente después de revisarla.',already:'Esta propuesta ya está registrada.',fail:'No pudimos guardar la propuesta. Verificá el enlace y probá de nuevo.',close:'Cerrar',mapWarning:'No todos los locales tienen ubicación comprobada.'},
 pt:{locate:'📍 Minha localização',locating:'Procurando sua localização…',outside:'Você está fora da área de São Paulo e Guarulhos. Sua localização não foi enviada ao FomeBoa.',denied:'Não foi possível acessar sua localização. Verifique as permissões.',locGood:'Sua posição aproximada no mapa (não salva na sua conta).',near:'Perto de mim',nearEmpty:'Selecione uma região para descobrir locais próximos. Nem todas as posições foram verificadas.',distance:'km aprox.',menu:'🍽️ Cardápio e preços',menuEmpty:'Ainda não há pratos com preços revisados neste estabelecimento.',menuHint:'Preços enviados e revisados; podem mudar. Confirme com o restaurante.',addMenu:'Sugerir prato e preço',name:'Nome do prato',description:'Descrição (opcional)',price:'Preço em reais (R$)',source:'Link do cardápio ou comprovante (https://)',submit:'Enviar para análise',sending:'Enviando…',pending:'Sugestão salva. Só aparece publicamente após análise.',already:'Esta sugestão já foi registrada.',fail:'Não foi possível salvar. Verifique o link e tente novamente.',close:'Fechar',mapWarning:'Nem todos os locais têm posição verificada.'},
 en:{locate:'📍 My location',locating:'Finding your location…',outside:'You are outside the São Paulo and Guarulhos coverage area. Your location was not sent to FomeBoa.',denied:'Could not access your location. Check browser permissions.',locGood:'Your approximate position on the map (not saved to your account).',near:'Near me',nearEmpty:'Choose an area to discover nearby places. Not all locations are verified.',distance:'approx. km',menu:'🍽️ Menu and prices',menuEmpty:'No reviewed dish prices are available for this place yet.',menuHint:'Contributed, reviewed prices may change. Confirm with the restaurant.',addMenu:'Suggest a dish and price',name:'Dish name',description:'Description (optional)',price:'Price in Brazilian reais (R$)',source:'Menu or price evidence link (https://)',submit:'Send for review',sending:'Sending…',pending:'Suggestion saved. It will only appear publicly after review.',already:'This suggestion was already submitted.',fail:'Could not save the suggestion. Check the link and try again.',close:'Close',mapWarning:'Not every business location has been verified.'}
};
const t=k=>(words[lang()]||words.es)[k]||k;
const db=()=>root.FomeBoaAuth?.getClient?.();
const identity=()=>root.FomeBoaAuth?.identity?.();
const venues=new Map();
const mapControls=document.querySelector('.map-controls');
const style=document.createElement('style');style.textContent='.fb-geo-status{font-size:12px;color:#e6dfbc;margin:6px 0;line-height:1.4}.fb-nearby{margin-top:8px;font-size:13px}.fb-nearby li{margin:6px 0}.fb-menu-button{border:1px solid #bdad66;background:#153b2d;color:#ffe08c;padding:7px 9px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer}.fb-menu-modal{border:1px solid #75a88a;border-radius:16px;padding:18px;background:#123c2c;color:#f4f7f0;width:min(550px,calc(100vw - 30px));max-height:85vh;overflow-y:auto;box-sizing:border-box}.fb-menu-modal::backdrop{background:#001c15b8}.fb-menu-modal h2{font-size:21px;margin:0 0 7px}.fb-menu-modal label{display:grid;gap:5px;margin:10px 0;font-size:13px}.fb-menu-modal input,.fb-menu-modal textarea{width:100%;box-sizing:border-box;padding:10px;border-radius:8px;background:#10412f;color:white;border:1px solid #579779;font:inherit}.fb-menu-modal .fb-menu-submit{background:#ebd16c;color:#173b27;font-weight:800;border-radius:8px;padding:10px 14px}.fb-menu-modal .fb-menu-list{padding-left:18px}.fb-menu-modal .fb-menu-list li{margin:8px 0}.fb-menu-modal button{cursor:pointer}.fb-menu-modal .fb-menu-disclaimer{font-size:12px;color:#c7dccf}.fb-menu-modal .fb-menu-error{color:#ffe8a0;font-size:12px}.map-controls .fb-geolocate{background:#154936;color:#f7e2a5;font-weight:700;border:1px solid #88a988;border-radius:8px;padding:7px 10px}@media(max-width:560px){.map-controls .fb-geolocate{font-size:12px;padding:7px}}';document.head.appendChild(style);
const geoStatus=document.createElement('p');geoStatus.className='fb-geo-status';geoStatus.setAttribute('role','status');
let geoMarker=null,geoCircle=null,myLocation=null;
function nearest(){
 if(!myLocation||typeof visibleVenues!=='function')return '';
 const rows=(visibleVenues()||[]).filter(v=>Number.isFinite(Number(v.lat))&&Number.isFinite(Number(v.lon))).map(v=>{
 const lat=Number(v.lat)*Math.PI/180,lat0=myLocation[0]*Math.PI/180,dlat=lat-lat0,dlon=(Number(v.lon)-myLocation[1])*Math.PI/180;
 const a=Math.sin(dlat/2)**2+Math.cos(lat)*Math.cos(lat0)*Math.sin(dlon/2)**2;
 return {v,km:12742*Math.asin(Math.min(1,Math.sqrt(a)))};
 }).filter(x=>x.km<=20).sort((a,b)=>a.km-b.km).slice(0,5);
 if(!rows.length)return '<p>'+esc(t('nearEmpty'))+'</p>';
 return '<strong>'+esc(t('near'))+'</strong><ul>'+rows.map(x=>'<li>'+esc(x.v.name)+' · '+x.km.toFixed(1)+' '+esc(t('distance'))+'</li>').join('')+'</ul><small>'+esc(t('mapWarning'))+'</small>';
}
const nearby=document.createElement('div');nearby.className='fb-nearby';
if(mapControls){
 const button=document.createElement('button');button.type='button';button.className='fb-geolocate';
 button.textContent=t('locate');mapControls.appendChild(button);
 mapControls.after(geoStatus,nearby);
 button.onclick=()=>{
  if(!navigator.geolocation||typeof map==='undefined'||!map||typeof L==='undefined'){geoStatus.textContent=t('denied');return;}
  geoStatus.textContent=t('locating');button.disabled=true;
  navigator.geolocation.getCurrentPosition(position=>{
   button.disabled=false;
   const {latitude,longitude,accuracy}=position.coords;
   // Map is intentionally limited to the São Paulo metro coverage zone.
   const bounds=L.latLngBounds([[-23.83,-46.96],[-23.31,-46.30]]);
   if(!bounds.contains([latitude,longitude])){geoStatus.textContent=t('outside');return;}
   myLocation=[latitude,longitude];
   if(geoMarker)map.removeLayer(geoMarker);if(geoCircle)map.removeLayer(geoCircle);
   geoCircle=L.circle([latitude,longitude],{radius:Math.max(10,Math.min(accuracy,1200)),color:'#f2d56b',fillOpacity:.11}).addTo(map);
   geoMarker=L.circleMarker([latitude,longitude],{radius:9,color:'#fff',fillColor:'#347df4',fillOpacity:1,weight:3}).addTo(map);
   map.setView([latitude,longitude],14);
   geoStatus.textContent=t('locGood');nearby.innerHTML=nearest();
  },()=>{button.disabled=false;geoStatus.textContent=t('denied');},
  {enableHighAccuracy:false,maximumAge:60000,timeout:15000});
 };
 root.addEventListener('fomeboa:language',()=>{button.textContent=t('locate');if(myLocation){geoStatus.textContent=t('locGood');nearby.innerHTML=nearest();}});
}
const modal=document.createElement('dialog');modal.className='fb-menu-modal';document.body.appendChild(modal);
function hide(){if(modal.open)modal.close();}
async function openMenu(v){
 if(!db()||!identity()){root.FomeBoaAuth?.open?.();return;}
 modal.innerHTML='<h2>'+esc(t('menu'))+'</h2><p>'+esc(v.name)+'</p><p role="status">'+esc(t('sending'))+'</p>';
 if(!modal.open)modal.showModal();
 try{
  const r=await db().from('fomeboa_menu_items').select('dish_name,description,price_cents,currency,status').eq('venue_id',v.id).eq('status','approved').order('dish_name').limit(80);
  if(r.error)throw r.error;
  const rows=r.data||[];
  modal.innerHTML='<h2>'+esc(t('menu'))+'</h2><strong>'+esc(v.name)+'</strong>'
   +(rows.length?'<ul class="fb-menu-list">'+rows.map(x=>'<li><strong>'+esc(x.dish_name)+'</strong> · R$ '+(x.price_cents/100).toLocaleString(lang()==='pt'?'pt-BR':lang()==='en'?'en-US':'es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+(x.description?'<p>'+esc(x.description)+'</p>':'')+'</li>').join('')+'</ul>':'<p>'+esc(t('menuEmpty'))+'</p>')
   +'<p class="fb-menu-disclaimer">'+esc(t('menuHint'))+'</p><details><summary>'+esc(t('addMenu'))+'</summary>'
   +'<form id="fbMenuForm"><label>'+esc(t('name'))+'<input name="dish" minlength="3" maxlength="100" required></label><label>'+esc(t('description'))+'<textarea name="description" maxlength="250"></textarea></label><label>'+esc(t('price'))+'<input name="price" type="number" min="1" max="5000" step="0.01" inputmode="decimal" required></label><label>'+esc(t('source'))+'<input name="source" type="url" pattern="https://.*" maxlength="800" required></label><p class="fb-menu-error" id="fbMenuStatus" role="status"></p><button type="submit" class="fb-menu-submit">'+esc(t('submit'))+'</button></form></details>'
   +'<p><button type="button" id="fbMenuClose">'+esc(t('close'))+'</button></p>';
  $('fbMenuClose').onclick=hide;
  $('fbMenuForm').onsubmit=async e=>{
   e.preventDefault();const f=e.currentTarget,fd=new FormData(f),btn=f.querySelector('[type=submit]'),status=$('fbMenuStatus');
   if(btn.disabled)return;
   btn.disabled=true;status.textContent=t('sending');
   try{
    const price=Number(fd.get('price')),cents=Math.round(price*100);
    if(!Number.isFinite(price)||cents<100||cents>500000)throw Error('Invalid price');
    const evidence=String(fd.get('source')||'').trim();
    if(!/^https:\/\//i.test(evidence))throw Error('Invalid link');
    const registered=await root.FomeBoaCommunity.ensureVenue(v);
    const r=await db().from('fomeboa_menu_items').insert({venue_id:registered.id,submitted_by:identity().id,dish_name:String(fd.get('dish')||'').trim(),description:String(fd.get('description')||'').trim(),price_cents:cents,evidence_url:evidence});
    if(r.error)throw r.error;
    f.reset();status.textContent=t('pending');
   }catch(error){status.textContent=error.code==='23505'?t('already'):t('fail');}finally{btn.disabled=false;}
  };
 }catch(_){modal.innerHTML='<p>'+esc(t('fail'))+'</p><button type="button" id="fbMenuClose">'+esc(t('close'))+'</button>';$('fbMenuClose').onclick=hide;}
}
function decorate(rows){
 rows.forEach(v=>venues.set(v.id,v));
 document.querySelectorAll('#cards article[data-venue-id]').forEach(card=>{
  const id=card.dataset.venueId;
  if(card.querySelector('.fb-menu-button'))return;
  const button=document.createElement('button');button.type='button';button.className='fb-menu-button';button.dataset.fbMenu=id;button.textContent=t('menu');
  card.querySelector('.compact-actions')?.appendChild(button);
 });
}
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-fb-menu]');if(!button)return;
 const venue=venues.get(button.dataset.fbMenu);if(venue)openMenu(venue);
});
root.addEventListener('fomeboa:language',()=>document.querySelectorAll('.fb-menu-button').forEach(button=>button.textContent=t('menu')));
root.FomeBoaExtras=Object.freeze({decorate,openMenu});
})(window);
