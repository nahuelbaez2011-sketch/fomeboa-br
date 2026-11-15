/* FomeBoa SP support: FAQ and private, authenticated requests; not a live chat. */
(function(root){
'use strict';
const $=id=>document.getElementById(id);
const lang=()=>root.FomeBoaI18n?.lang||'es';
const words={
 es:{title:'Ayuda y soporte',intro:'¿En qué podemos ayudarte?',faq:'Preguntas frecuentes',question:'Enviar una consulta',history:'Mis consultas',subject:'Asunto',topic:'Tema',message:'Contanos tu duda',send:'Enviar',sending:'Enviando...',done:'Tu consulta se guardó como pendiente.',error:'No se pudo enviar.',limit:'Máximo 5 consultas en 24 horas.',login:'Ingresá con tu cuenta para enviar consultas.',empty:'Aún no enviaste consultas.',close:'Cerrar',pending:'Pendiente',in_progress:'En revisión',resolved:'Resuelta',reply:'Respuesta',note:'No es un chat en vivo ni usa inteligencia artificial. Las consultas quedan pendientes de revisión.',topics:['Cuenta','Ubicaciones','Reseñas','Menús y precios','Otro'],questions:[['¿Cómo informo un local cerrado?','Desde la ficha del restaurante tocá Reportar un problema.'],['¿Los precios están actualizados?','Mostramos precios revisados, pero pueden cambiar; confirmá con el restaurante.'],['¿Cómo edito una reseña?','Entrá a Mi perfil, abrí Mis reseñas y tocá Editar.'],['¿Cómo consigo insignias?','Entrá a Mi perfil e Insignias para conocer las condiciones.']]},
 pt:{title:'Ajuda e suporte',intro:'Como podemos ajudar?',faq:'Perguntas frequentes',question:'Enviar solicitação',history:'Minhas solicitações',subject:'Assunto',topic:'Tema',message:'Conte sua dúvida',send:'Enviar',sending:'Enviando...',done:'Sua solicitação foi registrada como pendente.',error:'Não foi possível enviar.',limit:'Até 5 solicitações por 24 horas.',login:'Entre na sua conta para enviar solicitações.',empty:'Você ainda não enviou solicitações.',close:'Fechar',pending:'Pendente',in_progress:'Em análise',resolved:'Resolvida',reply:'Resposta',note:'Não é um chat ao vivo nem usa inteligência artificial. Solicitações aguardam análise.',topics:['Conta','Localizações','Avaliações','Cardápios e preços','Outro'],questions:[['Como informo um local fechado?','Na ficha do restaurante, toque em Informar problema.'],['Os preços estão atualizados?','Os preços são revisados, mas podem mudar. Confirme com o restaurante.'],['Como edito uma avaliação?','Abra Meu perfil, Minhas avaliações e Editar.'],['Como ganho conquistas?','Veja os requisitos em Meu perfil e Conquistas.']]},
 en:{title:'Help and support',intro:'How can we help?',faq:'Frequently asked questions',question:'Contact support',history:'My requests',subject:'Subject',topic:'Topic',message:'Describe your question',send:'Send',sending:'Sending...',done:'Your request has been saved as pending.',error:'Could not send request.',limit:'Maximum 5 requests per 24 hours.',login:'Sign in to send support requests.',empty:'No requests yet.',close:'Close',pending:'Pending',in_progress:'Under review',resolved:'Resolved',reply:'Reply',note:'This is not a live chat or an AI bot. Requests are stored for review.',topics:['Account','Locations','Reviews','Menus and prices','Other'],questions:[['How do I report a closed place?','Tap Report an issue on the restaurant card.'],['Are menu prices current?','Prices are reviewed but may change; confirm with the restaurant.'],['How do I edit a review?','Open My profile, My reviews and Edit.'],['How can I earn badges?','Open My profile and Badges to see the requirements.']]}
};
const T=k=>(words[lang()]||words.es)[k]??k;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const auth=()=>root.FomeBoaAuth?.identity?.();
const db=()=>root.FomeBoaAuth?.getClient?.();
const css=document.createElement('style');
css.textContent='#fbHelpBubble{position:fixed;z-index:4500;right:max(15px,env(safe-area-inset-right));bottom:max(17px,env(safe-area-inset-bottom));width:56px;height:56px;border-radius:18px;background:#17452e;color:#f3dc7b;border:2px solid #e9cb64;display:grid;place-items:center;box-shadow:0 8px 30px #001c19bf;cursor:pointer}#fbHelpBubble svg{width:30px;height:30px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}#fbHelpBubble:focus-visible{outline:3px solid #fff;outline-offset:2px}#fbHelpPanel{position:fixed;z-index:4500;right:15px;bottom:86px;width:min(390px,calc(100vw - 30px));height:min(600px,calc(100dvh - 110px));border-radius:16px;border:1px solid #81aa8c;background:#133c2b;color:#f0f5f0;box-shadow:0 16px 50px #001911d9;box-sizing:border-box;overflow:hidden;display:flex;flex-direction:column}#fbHelpPanel[hidden]{display:none!important}#fbHelpPanel header{display:flex;justify-content:space-between;align-items:center;padding:12px 15px;background:#1c5037}#fbHelpPanel h2{font-size:17px;margin:0;color:white}#fbHelpPanel header button{cursor:pointer;background:#143c2b;color:#fff;border:1px solid #729e83;border-radius:8px;width:32px;height:32px}#fbHelpBody{overflow-y:auto;flex:1;padding:14px;font-size:13px;line-height:1.5}#fbHelpBody h3{margin:13px 0 6px;font-size:15px}#fbHelpBody details{margin:7px 0;padding:10px;border-radius:9px;border:1px solid #52846b}#fbHelpBody summary{cursor:pointer;font-weight:700}#fbHelpBody label{display:grid;gap:5px;margin:9px 0}#fbHelpBody input,#fbHelpBody textarea,#fbHelpBody select{width:100%;box-sizing:border-box;background:#0f382b;color:white;border:1px solid #659478;border-radius:8px;padding:9px;font:inherit}#fbHelpBody textarea{min-height:85px;resize:vertical}#fbHelpBody form button{background:#efd36c;color:#143526;padding:10px 15px;border:0;border-radius:9px;font-weight:800;cursor:pointer}#fbHelpBody form button:disabled{opacity:.55}.fb-help-subtle{font-size:11px;color:#c3d9cc}.fb-help-entry{padding:10px;margin:7px 0;border:1px solid #52816a;border-radius:9px}.fb-help-entry p{overflow-wrap:anywhere;white-space:pre-wrap}.fb-help-status{font-size:12px;color:#f4e09f;min-height:18px}@media(max-width:480px){#fbHelpPanel{right:10px;bottom:calc(max(12px,env(safe-area-inset-bottom)) + 64px);width:calc(100vw - 20px);height:min(580px,calc(100dvh - 102px))}#fbHelpBubble{right:13px;bottom:max(12px,env(safe-area-inset-bottom));width:54px;height:54px}}';
document.head.appendChild(css);
const button=document.createElement('button');button.id='fbHelpBubble';button.type='button';button.setAttribute('aria-expanded','false');
button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8 8.5 8.5 0 0 1-3.5-.75L4 20l1.2-4.1A8 8 0 1 1 20 11.5Z"/><path d="M8 12h8M8 9h5"/></svg>';
const panel=document.createElement('section');panel.id='fbHelpPanel';panel.hidden=true;
panel.innerHTML='<header><h2 id="fbHelpTitle"></h2><button type="button" id="fbHelpClose">×</button></header><div id="fbHelpBody"></div>';
document.body.append(button,panel);
let visible=false,items=[],loading=false,generation=0;
function render(){
 button.setAttribute('aria-label',T('title'));button.title=T('title');$('fbHelpTitle').textContent=T('title');$('fbHelpClose').setAttribute('aria-label',T('close'));
 const faq=T('questions').map(([q,a])=>'<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join('');
 const signed=Boolean(auth());
 const categories=['account','location','review','menu','other'];
 const fields=signed?'<h3>'+esc(T('question'))+'</h3><form id="fbHelpForm"><label>'+esc(T('topic'))+'<select name="category">'+categories.map((c,i)=>'<option value="'+c+'">'+esc(T('topics')[i])+'</option>').join('')+'</select></label><label>'+esc(T('subject'))+'<input name="subject" required minlength="5" maxlength="100"></label><label>'+esc(T('message'))+'<textarea name="message" required minlength="15" maxlength="2000"></textarea></label><button type="submit">'+esc(T('send'))+'</button><p id="fbHelpStatus" class="fb-help-status" role="status"></p></form>':'<p>'+esc(T('login'))+'</p>';
 const history=signed?'<h3>'+esc(T('history'))+'</h3>'+(loading?'<p>'+esc(T('sending'))+'</p>':items.length?items.map(x=>'<article class="fb-help-entry"><strong>'+esc(x.subject)+'</strong> · <small>'+esc(T(x.status))+'</small><p>'+esc(x.message)+'</p>'+(x.staff_reply?'<p><strong>'+esc(T('reply'))+':</strong> '+esc(x.staff_reply)+'</p>':'')+'</article>').join(''):'<p>'+esc(T('empty'))+'</p>'):'';
 $('fbHelpBody').innerHTML='<p>'+esc(T('intro'))+'</p><h3>'+esc(T('faq'))+'</h3>'+faq+fields+history+'<p class="fb-help-subtle">'+esc(T('note'))+'</p>';
 const form=$('fbHelpForm');if(form)form.onsubmit=submit;
}
async function loadTickets(){
 const me=auth(),client=db(),ticket=++generation;if(!me||!client){items=[];loading=false;render();return;}
 loading=true;render();
 try{const r=await client.from('fomeboa_support_tickets').select('subject,message,status,staff_reply,created_at').eq('user_id',me.id).order('created_at',{ascending:false}).limit(20);
  if(ticket!==generation||auth()?.id!==me.id)return;
  if(r.error)throw r.error;items=r.data||[];
 }catch(e){items=[];}finally{if(ticket===generation){loading=false;render();}}
}
async function submit(ev){
 ev.preventDefault();
 const form=ev.currentTarget,me=auth(),client=db(),btn=form.querySelector('button[type=submit]'),info=$('fbHelpStatus');
 if(!client||!me){info.textContent=T('login');return;}
 const fd=new FormData(form),subject=String(fd.get('subject')||'').trim(),message=String(fd.get('message')||'').trim();
 if(subject.length<5||message.length<15){info.textContent=T('error');return;}
 btn.disabled=true;info.textContent=T('sending');
 try{
  const result=await client.from('fomeboa_support_tickets').insert({user_id:me.id,subject,message,category:String(fd.get('category'))});
  if(result.error)throw result.error;
  await loadTickets();
  const notice=document.createElement('p');notice.className='fb-help-status';notice.setAttribute('role','status');notice.textContent=T('done');
  $('fbHelpBody').prepend(notice);
 }catch(e){info.textContent=/SUPPORT_LIMIT_24H/.test(e?.message||'')?T('limit'):T('error');}finally{btn.disabled=false;}
}
function setOpen(next){visible=!!next;panel.hidden=!visible;button.setAttribute('aria-expanded',String(visible));render();if(visible){$('fbHelpClose').focus();loadTickets();}else button.focus();}
button.onclick=()=>setOpen(!visible);$('fbHelpClose').onclick=()=>setOpen(false);
document.addEventListener('keydown',e=>{if(visible&&e.key==='Escape'&&!document.querySelector('dialog[open]'))setOpen(false);});
root.addEventListener('fomeboa:language',render);
root.addEventListener('fomeboa:auth',()=>{generation++;items=[];if(visible)loadTickets();});
render();
})(window);
