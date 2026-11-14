/* FomeBoa SP: gluten information must never be confused with coeliac certification.
 * The AOECS Crossed Grain Trademark is NOT used here.
 */
(function(root){
 'use strict';
 const htmlEscape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const safeUrl=url=>{try{const u=new URL(url);return /^https?:$/.test(u.protocol)?u.href:''}catch(_){return''}};
 function classify(venue){
  const d=venue?.glutenFree;if(!d||typeof d!=='object')return null;
  const source=safeUrl(d.sourceUrl||'');
  if(d.status==='verified_for_coeliacs'&&d.documentVerified===true&&source&&d.lastVerifiedAt&&d.crossContactControlled===true){
   return {type:'verified',source,label:'Sin gluten verificado',note:'Documentación específica de este local revisada. Consultá la vigencia y las prácticas actuales antes de consumir.'};
  }
  if(d.status==='options_reported'&&['yes','only','limited'].includes(d.value)&&source){
   const detail=d.value==='only'?'El establecimiento está registrado como dedicado a opciones sin gluten.':d.value==='limited'?'Se registraron algunas opciones sin gluten.':'El establecimiento figura con opciones sin gluten.';
   return {type:'reported',source,label:d.value==='limited'?'Opciones SG limitadas':'Opciones sin gluten',note:detail+' Dato declarado en una fuente externa; NO confirma cocina apta para celíacos ni ausencia de contaminación cruzada.'};
  }
  return null;
 }
 function badge(venue){
  const info=classify(venue);if(!info)return '';
  const icon=info.type==='verified'?'✓':'🚫🌾';
  return '<a class="gluten-mark gluten-mark-'+info.type+'" href="'+htmlEscape(info.source)+'" target="_blank" rel="noopener noreferrer" aria-label="'+htmlEscape(info.label+'. '+info.note)+'" title="'+htmlEscape(info.note)+'"><span aria-hidden="true">'+icon+'</span><span>'+htmlEscape(info.label)+(info.type==='reported'?' · no verificado':'')+'</span></a>';
 }
 function detail(venue){
  const info=classify(venue);if(!info)return '';
  return '<p class="gluten-detail">'+htmlEscape(info.note)+' <a target="_blank" rel="noopener noreferrer" href="'+htmlEscape(info.source)+'">Ver fuente</a></p>';
 }
 const api=Object.freeze({classify,badge,detail,matches:v=>!!classify(v)});
 root.FomeBoaGluten=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(typeof document!=='undefined'&&document.head&&!document.getElementById('fomeboa-gluten-css')){
  const s=document.createElement('style');s.id='fomeboa-gluten-css';
  s.textContent='.gluten-mark{display:inline-flex;max-width:100%;gap:5px;align-items:center;align-self:flex-start;border:1px solid #8aba91;background:#164832;color:#d5f4d6!important;border-radius:8px;font-size:10px;font-weight:750;line-height:1.3;padding:4px 7px;text-decoration:none!important;white-space:normal}.gluten-mark-reported{background:#204632;border-color:#679f77;color:#def4d9!important}.gluten-mark-verified{background:#06522d;border-color:#a7e5b5;color:white!important}.gluten-mark:focus-visible{outline:3px solid #ffda5e;outline-offset:2px}.gluten-detail{font-size:11px;line-height:1.45;color:#e0eade}.gluten-detail a{color:#ffdc75}#glutenOnly{accent-color:#f5d647}.gluten-filter{font-size:12px;display:flex;align-items:center;gap:7px;color:#e4f5e6;border:1px solid #548e73;background:#103f30;padding:7px 10px;border-radius:9px;cursor:pointer}.gluten-filter input{width:auto;margin:0;flex:0 0 auto}.gluten-disclaimer{font-size:11px;color:#c1d9c7;margin:5px 0 11px;line-height:1.4}';
  document.head.appendChild(s);
 }
})(typeof globalThis!=='undefined'?globalThis:this);
