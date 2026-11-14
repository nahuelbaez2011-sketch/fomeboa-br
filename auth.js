/* FomeBoa SP registration: one account across web, Android and iOS. */
(function(){
  'use strict';
  const config=window.FOMEBOA_AUTH_CONFIG||{};
  const url=String(config.url||'').trim();
  const key=String(config.publishableKey||'').trim();
  const valid=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) &&
    (key.startsWith('sb_publishable_')||/^eyJ[A-Za-z0-9_.-]{50,}$/.test(key));
  const client=valid&&window.supabase?.createClient
    ?window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
  const byId=id=>document.getElementById(id);
  const nav=document.querySelector('header .nav');
  if(!nav)return;
  let user=null,mode='signup',busy=false;
  const trigger=document.createElement('button');
  trigger.type='button';trigger.id='fomeboaAccountButton';trigger.textContent='Crear cuenta';
  trigger.setAttribute('aria-haspopup','dialog');nav.appendChild(trigger);
  const dlg=document.createElement('dialog');dlg.id='fomeboaAuthDialog';
  dlg.setAttribute('aria-labelledby','fomeboaAuthTitle');
  dlg.innerHTML=[
    '<div class="fomeboa-auth-head"><h2 id="fomeboaAuthTitle">Mi cuenta FomeBoa</h2><button type="button" id="fomeboaClose" aria-label="Cerrar">×</button></div>',
    '<p id="fomeboaAuthNote" role="status" aria-live="polite"></p>',
    '<section id="fomeboaNotReady" hidden><p>Estamos preparando el registro. Falta conectar la base de datos segura.</p><p>Podés seguir explorando locales sin crear una cuenta.</p></section>',
    '<form id="fomeboaAuthForm" hidden>',
      '<label id="fomeboaNameLabel">Nombre público<input id="fomeboaName" autocomplete="nickname" minlength="2" maxlength="40" placeholder="Tu nombre en FomeBoa"></label>',
      '<label>Correo electrónico<input id="fomeboaEmail" autocomplete="email" type="email" required maxlength="254" placeholder="tu@email.com"></label>',
      '<label id="fomeboaPassLabel">Contraseña<input id="fomeboaPassword" autocomplete="new-password" type="password" minlength="8" required placeholder="Mínimo 8 caracteres"></label>',
      '<button id="fomeboaAuthSubmit" type="submit">Crear cuenta</button>',
    '</form>',
    '<div id="fomeboaAuthModes" hidden>',
      '<button type="button" data-auth-mode="signup">Registrarme</button>',
      '<button type="button" data-auth-mode="login">Iniciar sesión</button>',
      '<button type="button" data-auth-mode="reset">Olvidé mi contraseña</button>',
    '</div>',
    '<form id="fomeboaNewPasswordForm" hidden><label>Nueva contraseña<input id="fomeboaNewPassword" type="password" autocomplete="new-password" minlength="8" required></label><button type="submit">Cambiar contraseña</button></form>',
    '<section id="fomeboaSignedIn" hidden><p id="fomeboaWelcome"></p><p id="fomeboaLevel"></p><p class="fomeboa-auth-small">Tu perfil será el mismo en web, Android e iPhone.</p><button id="fomeboaLogout" type="button">Cerrar sesión</button></section>'
  ].join('');
  document.body.appendChild(dlg);
  const css=document.createElement('style');
  css.textContent='#fomeboaAccountButton{padding:8px 13px;font-weight:800;font-size:13px;background:#ebd16c;color:#153c26;border-color:#e6cb53;border-radius:10px;margin-left:auto}#fomeboaAuthDialog{box-sizing:border-box;background:#173b2e;color:#f3f8f1;border:1px solid #56846b;border-radius:17px;padding:20px;width:min(430px,calc(100vw - 24px));max-height:90vh;overflow:auto}#fomeboaAuthDialog::backdrop{background:#071c18bd}.fomeboa-auth-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.fomeboa-auth-head h2{margin:0;font-size:22px}.fomeboa-auth-head button{font-size:24px;background:transparent;border:0;padding:2px 8px}#fomeboaAuthDialog label{display:block;font-size:13px;font-weight:700;margin:12px 0}#fomeboaAuthDialog label input{margin-top:5px}#fomeboaAuthDialog button[type=submit]{width:100%;background:#f0d35f;color:#183c29;font-weight:800}#fomeboaAuthModes[hidden]{display:none!important}#fomeboaAuthModes{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}#fomeboaAuthModes button{font-size:12px;color:#f4d879;border:0;background:transparent;text-decoration:underline;padding:6px}#fomeboaAuthNote{font-size:13px;color:#f5dc87;line-height:1.45}#fomeboaLevel{color:#f2db73;font-weight:800}.fomeboa-auth-small{font-size:12px;color:#c4dace}@media(max-width:550px){#fomeboaAccountButton{margin-left:0}}';
  document.head.appendChild(css);
  function notice(s){byId('fomeboaAuthNote').textContent=s||''}
  function render(){
    const enabled=!!client;
    byId('fomeboaNotReady').hidden=enabled;
    byId('fomeboaAuthForm').hidden=!enabled||!!user||mode==='change';
    byId('fomeboaAuthModes').hidden=!enabled||!!user||mode==='change';
    byId('fomeboaSignedIn').hidden=!enabled||!user||mode==='change';
    byId('fomeboaNewPasswordForm').hidden=!enabled||mode!=='change';
    byId('fomeboaNameLabel').hidden=mode!=='signup';
    byId('fomeboaName').required=mode==='signup';
    byId('fomeboaPassLabel').hidden=mode==='reset';
    byId('fomeboaPassword').required=mode!=='reset';
    byId('fomeboaPassword').autocomplete=mode==='signup'?'new-password':'current-password';
    byId('fomeboaAuthSubmit').textContent=mode==='signup'?'Crear cuenta':mode==='reset'?'Recuperar contraseña':'Iniciar sesión';
    byId('fomeboaAuthTitle').textContent=mode==='change'?'Cambiar contraseña':user?'Mi perfil FomeBoa':mode==='signup'?'Crear cuenta':mode==='reset'?'Recuperar acceso':'Iniciar sesión';
    trigger.textContent=user?'Mi perfil':client?'Crear cuenta':'Cuenta · próximamente';
    if(!enabled)notice('El registro real se habilitará cuando conectemos Supabase.');
  }
  function open(){mode=user?'profile':'signup';notice('');render();dlg.showModal()}
  trigger.onclick=open;
  byId('fomeboaClose').onclick=()=>dlg.close();
  document.querySelectorAll('#fomeboaAuthModes [data-auth-mode]').forEach(x=>x.onclick=()=>{mode=x.dataset.authMode;notice('');render()});
  function setUser(next){
    user=next||null;
    if(user)byId('fomeboaWelcome').textContent='Hola, '+String(user.user_metadata?.display_name||'Explorador').slice(0,40)+'.';
    mode=user?'profile':'login';render();
  }
  async function loadProfile(){
    if(!client||!user)return;
    try{
      const result=await client.from('fomeboa_profiles').select('display_name,level,xp').eq('id',user.id).maybeSingle();
      if(result.data&&user){
        byId('fomeboaWelcome').textContent='Hola, '+String(result.data.display_name||'Explorador').slice(0,40)+'.';
        byId('fomeboaLevel').textContent='🌱 Nivel '+(Number(result.data.level)||1)+' · '+(Number(result.data.xp)||0)+' XP';
      }
    }catch(_){}
  }
  function messageFor(error){
    const s=String(error?.message||'Error de conexión');
    if(/Invalid login credentials/i.test(s))return 'Correo o contraseña incorrectos.';
    if(/Email not confirmed/i.test(s))return 'Confirmá tu correo antes de ingresar.';
    if(/rate limit/i.test(s))return 'Demasiados intentos. Intentá más adelante.';
    return s.slice(0,200);
  }
  byId('fomeboaAuthForm').onsubmit=async event=>{
    event.preventDefault();if(!client||busy)return;
    const email=byId('fomeboaEmail').value.trim().toLowerCase();
    const password=byId('fomeboaPassword').value;
    const name=byId('fomeboaName').value.trim();
    if(mode==='signup'&&(name.length<2||name.length>40)){notice('Ingresá un nombre de 2 a 40 caracteres.');return}
    busy=true;byId('fomeboaAuthSubmit').disabled=true;notice('Procesando...');
    try{
      const redirect=location.origin+location.pathname;
      let result;
      if(mode==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect,data:{display_name:name}}});
      else if(mode==='reset')result=await client.auth.resetPasswordForEmail(email,{redirectTo:redirect});
      else result=await client.auth.signInWithPassword({email,password});
      if(result.error)throw result.error;
      byId('fomeboaPassword').value='';
      if(mode==='reset'){notice('Si existe una cuenta con ese correo, recibirás un enlace.');return}
      if(mode==='signup'&&!result.data?.session){mode='login';render();notice('Revisá tu correo y confirmá la cuenta para poder ingresar.');return}
      if(result.data?.user){setUser(result.data.user);await loadProfile();notice('Sesión iniciada.')}
    }catch(error){notice(messageFor(error))}
    finally{busy=false;byId('fomeboaAuthSubmit').disabled=false}
  };
  byId('fomeboaNewPasswordForm').onsubmit=async event=>{
    event.preventDefault();if(!client||busy)return;busy=true;
    try{
      const result=await client.auth.updateUser({password:byId('fomeboaNewPassword').value});
      if(result.error)throw result.error;
      byId('fomeboaNewPassword').value='';setUser(result.data.user||user);notice('Contraseña actualizada.');
    }catch(error){notice(messageFor(error))}finally{busy=false}
  };
  byId('fomeboaLogout').onclick=async ()=>{
    if(!client)return;
    try{const r=await client.auth.signOut();if(r.error)throw r.error;setUser(null);notice('Sesión cerrada.')}
    catch(error){notice(messageFor(error))}
  };
  if(client)client.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){setUser(session?.user);mode='change';render();dlg.showModal();notice('Ingresá una contraseña nueva.');return}
    if(['INITIAL_SESSION','SIGNED_IN','SIGNED_OUT'].includes(event)){setUser(session?.user);if(session?.user)queueMicrotask(loadProfile)}
  });
  render();
  window.FomeBoaAuth=Object.freeze({enabled:!!client,open,isSignedIn:()=>!!user});
})();
