/* FomeBoa founder-only moderation. All operations authorized by server-side RLS. */
(function(root){
'use strict';
const $=id=>document.getElementById(id),auth=()=>root.FomeBoaAuth?.identity?.(),db=()=>root.FomeBoaAuth?.getClient?.();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lang=()=>root.FomeBoaI18n?.lang||'es';
const words={
es:{title:'Panel de administrador',button:'Administración',close:'Cerrar',support:'Soporte',menu:'Menús',photos:'Fotos',reports:'Ubicaciones',pending:'Pendiente',in_progress:'En revisión',resolved:'Resuelta',approved:'Aprobado',accepted:'Aceptado',rejected:'Rechazado',load:'Cargando…',empty:'No hay aportes aquí.',error:'No se pudo cargar o guardar.',saved:'Cambios guardados.',verify:'Revisá la evidencia antes de aprobar cualquier aporte.',reply:'Respuesta al usuario',save:'Guardar cambios',view:'Ver foto',confirm:'¿Confirmás que querés guardar este cambio?',evidence:'Ver evidencia'},
pt:{title:'Painel administrativo',button:'Administração',close:'Fechar',support:'Suporte',menu:'Cardápios',photos:'Fotos',reports:'Localizações',pending:'Pendente',in_progress:'Em análise',resolved:'Resolvida',approved:'Aprovado',accepted:'Aceito',rejected:'Rejeitado',load:'Carregando…',empty:'Nenhuma contribuição.',error:'Não foi possível carregar ou salvar.',saved:'Alterações salvas.',verify:'Confira as evidências antes de aprovar.',reply:'Resposta ao usuário',save:'Salvar',view:'Ver foto',confirm:'Confirmar esta alteração?',evidence:'Ver evidência'},
en:{title:'Admin dashboard',button:'Administration',close:'Close',support:'Support',menu:'Menus',photos:'Photos',reports:'Locations',pending:'Pending',in_progress:'In review',resolved:'Resolved',approved:'Approved',accepted:'Accepted',rejected:'Rejected',load:'Loading…',empty:'No contributions here.',error:'Could not load or save.',saved:'Changes saved.',verify:'Review the evidence before approving anything.',reply:'Reply to user',save:'Save changes',view:'View photo',confirm:'Confirm this change?',evidence:'View evidence'}};
const T=k=>(words[lang()]||words.es)[k]||k;
const css=document.createElement('style');
css.textContent='#fbAdminOpen{background:#e6ce76;color:#183c2b;border:1px solid #dec56e;border-radius:9px;padding:7px 10px;font-size:12px;font-weight:800;cursor:pointer}#fbAdminDialog{box-sizing:border-box;padding:0;width:min(880px,calc(100vw - 24px));max-width:880px;max-height:89dvh;background:#123c2b;color:#f4f8ef;border:1px solid #7ca988;border-radius:16px;overflow:hidden}#fbAdminDialog::backdrop{background:#001b11cf}#fbAdminDialog header{padding:13px 16px;background:#1c5036;display:flex;align-items:center;justify-content:space-between}#fbAdminDialog h2{font-size:20px;margin:0}#fbAdminDialog header button{background:transparent;color:white;border:1px solid #8faf96;border-radius:8px;padding:8px;cursor:pointer}#fbAdminBody{padding:14px;max-height:calc(89dvh - 65px);overflow-y:auto}#fbAdminTabs{display:flex;gap:6px;flex-wrap:wrap}#fbAdminTabs button{padding:9px 12px;border-radius:9px;border:1px solid #80a38a;background:#174530;color:white;cursor:pointer}#fbAdminTabs button[aria-pressed=true]{background:#efd471;color:#123d2b;font-weight:800}.fb-admin-entry{border:1px solid #548467;border-radius:11px;padding:12px;margin:10px 0;background:#174532}.fb-admin-entry h3{font-size:15px;margin:0 0 5px}.fb-admin-entry p{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}.fb-admin-entry small{color:#c3d9cb}.fb-admin-entry textarea{display:block;width:100%;box-sizing:border-box;padding:10px;background:#0c3224;color:white;border:1px solid #659c75;border-radius:9px;min-height:80px;font:inherit}.fb-admin-entry select{background:#0c3224;color:white;padding:8px;border-radius:8px;border:1px solid #659c75}.fb-admin-entry button{background:#efd471;color:#17422c;padding:8px 12px;border-radius:8px;border:0;font-weight:800;cursor:pointer;margin:7px 0}.fb-admin-entry img{display:block;max-width:100%;max-height:350px;object-fit:contain;margin:8px 0;border-radius:8px}.fb-admin-entry a{color:#ffe59c}#fbAdminMessage{color:#f9e6a1;font-size:13px;min-height:20px}';
document.head.appendChild(css);
const launch=document.createElement('button');launch.id='fbAdminOpen';launch.type='button';launch.hidden=true;
const dialog=document.createElement('dialog');dialog.id='fbAdminDialog';
dialog.innerHTML='<header><h2 id="fbAdminTitle"></h2><button type="button" id="fbAdminClose"></button></header><div id="fbAdminBody"><nav id="fbAdminTabs"></nav><p id="fbAdminMessage" role="status"></p><section id="fbAdminItems"></section></div>';
document.body.append(launch,dialog);
const dataSets=[
 {key:'support',table:'fomeboa_support_tickets',select:'id,subject,message,category,status,staff_reply,created_at',statuses:['pending','in_progress','resolved']},
 {key:'menu',table:'fomeboa_menu_items',select:'id,venue_id,dish_name,description,price_cents,evidence_url,status,created_at',statuses:['pending','approved','rejected']},
 {key:'photos',table:'fomeboa_review_photos',select:'user_id,venue_id,object_path,moderation_status,created_at',statuses:['pending','approved','rejected']},
 {key:'reports',table:'fomeboa_reports',select:'id,venue_id,kind,detail,evidence_url,status,created_at',statuses:['pending','accepted','rejected']}
];
let permitted=false,token=0,tab=0,rows=[],loading=false;
function message(s){$('fbAdminMessage').textContent=s||'';}
const idOf=r=>dataSets[tab].key==='photos'?r.user_id+'|'+r.venue_id:r.id;
function link(x){try{const u=new URL(x);return u.protocol==='https:'?u.href:'';}catch(_){return '';}}
function cards(){
 const key=dataSets[tab].key;
 return rows.map(r=>{
  const id=esc(idOf(r)),status=key==='photos'?r.moderation_status:r.status;
  let body='';
  if(key==='support')body='<h3>'+esc(r.subject)+'</h3><small>'+esc(r.category)+'</small><p>'+esc(r.message)+'</p><label>'+esc(T('reply'))+'<textarea maxlength="2000" data-admin-reply>'+esc(r.staff_reply||'')+'</textarea></label>';
  if(key==='menu')body='<h3>'+esc(r.dish_name)+'</h3><small>'+esc(r.venue_id)+' · R$ '+(r.price_cents/100).toFixed(2)+'</small><p>'+esc(r.description||'')+'</p>';
  if(key==='photos')body='<h3>'+esc(r.venue_id)+'</h3><button data-photo="'+id+'" type="button">'+esc(T('view'))+'</button><div data-photo-preview></div>';
  if(key==='reports')body='<h3>'+esc(r.venue_id)+'</h3><small>'+esc(r.kind)+'</small><p>'+esc(r.detail)+'</p>';
  const href=link(r.evidence_url||'');if(href)body+='<p><a target="_blank" rel="noopener noreferrer" href="'+esc(href)+'">'+esc(T('evidence'))+'</a></p>';
  return '<article class="fb-admin-entry" data-row="'+id+'">'+body+'<p><select data-admin-status>'+dataSets[tab].statuses.map(s=>'<option value="'+s+'"'+(s===status?' selected':'')+'>'+esc(T(s))+'</option>').join('')+'</select></p><button data-admin-save="'+id+'" type="button">'+esc(T('save'))+'</button></article>';
 }).join('');
}
function render(){
 if(!permitted)return;
 launch.textContent='⚙ '+T('button');$('fbAdminTitle').textContent=T('title');$('fbAdminClose').textContent=T('close');
 $('fbAdminTabs').innerHTML=dataSets.map((d,i)=>'<button type="button" data-admin-tab="'+i+'" aria-pressed="'+(tab===i)+'">'+esc(T(d.key))+'</button>').join('');
 $('fbAdminItems').innerHTML=loading?'<p>'+esc(T('load'))+'</p>':rows.length?cards():'<p>'+esc(T('empty'))+'</p>';
}
async function check(){
 const stamp=++token;permitted=false;launch.hidden=true;
 if(!auth()||!db())return;
 try{const r=await db().rpc('fomeboa_is_admin');if(stamp!==token)return;permitted=!r.error&&r.data===true;}
 catch(_){permitted=false;}
 launch.hidden=!permitted;if(permitted)render();else if(dialog.open)dialog.close();
}
async function load(){
 if(!permitted||!auth()||!db())return;
 const stamp=token,d=dataSets[tab];loading=true;render();message(T('load'));
 try{
  const r=await db().from(d.table).select(d.select).order('created_at',{ascending:false}).limit(80);
  if(r.error)throw r.error;if(stamp!==token)return;
  rows=r.data||[];message(T('verify'));
 }catch(e){rows=[];message(T('error'));console.warn('Admin fetch',e?.code||'unknown');}
 finally{if(stamp===token){loading=false;render();}}
}
async function save(id){
 if(!permitted||!auth())return;
 const d=dataSets[tab],row=rows.find(x=>idOf(x)===id);
 const card=[...dialog.querySelectorAll('[data-row]')].find(x=>x.dataset.row===id);
 if(!row||!card)return;
 const status=card.querySelector('[data-admin-status]').value;if(!d.statuses.includes(status))return;
 const reply=card.querySelector('[data-admin-reply]')?.value?.trim()||'';
 if(reply.length>2000||!root.confirm(T('confirm')))return;
 const btn=card.querySelector('[data-admin-save]');btn.disabled=true;
 try{
  let patch={};let q=db().from(d.table);
  if(d.key==='support'){patch={status,staff_reply:reply||null,answered_at:reply?new Date().toISOString():null};q=q.update(patch).eq('id',row.id);}
  if(d.key==='menu'){patch={status,reviewed_at:status==='pending'?null:new Date().toISOString()};q=q.update(patch).eq('id',row.id);}
  if(d.key==='reports'){patch={status,reviewed_at:status==='pending'?null:new Date().toISOString()};q=q.update(patch).eq('id',row.id);}
  if(d.key==='photos'){patch={moderation_status:status};q=q.update(patch).eq('user_id',row.user_id).eq('venue_id',row.venue_id);}
  const result=await q.select('status');if(result.error)throw result.error;
  if(result.data?.length!==1)throw Error('Permission denied');
  await load();message(T('saved'));
 }catch(e){message(T('error'));btn.disabled=false;console.warn('Admin save',e?.code||'unknown');}
}
async function photo(id){
 if(!permitted||!auth())return;
 const row=rows.find(x=>idOf(x)===id),card=[...dialog.querySelectorAll('[data-row]')].find(x=>x.dataset.row===id);
 if(!row||!card)return;
 const r=await db().storage.from('fomeboa-review-photos').createSignedUrl(row.object_path,180);
 if(r.error||!r.data?.signedUrl){message(T('error'));return;}
 const container=card.querySelector('[data-photo-preview]');
 container.innerHTML='<img loading="lazy" alt="Foto pendiente de moderación" src="'+esc(r.data.signedUrl)+'">';
}
dialog.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.adminTab!==undefined){const n=Number(b.dataset.adminTab);if(Number.isInteger(n)&&n>=0&&n<dataSets.length){tab=n;load();}return;}
 if(b.dataset.adminSave!==undefined)return save(b.dataset.adminSave);
 if(b.dataset.photo!==undefined)return photo(b.dataset.photo);
});
launch.onclick=()=>{if(!permitted)return;dialog.showModal();load();};
$('fbAdminClose').onclick=()=>dialog.close();
root.addEventListener('fomeboa:auth',()=>{token++;permitted=false;launch.hidden=true;if(dialog.open)dialog.close();queueMicrotask(check);});
root.addEventListener('fomeboa:language',()=>{if(permitted)render();});
queueMicrotask(check);
})(window);
