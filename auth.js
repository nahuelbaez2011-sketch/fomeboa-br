/* FomeBoa SP authentication: Google OAuth first on web, Android planned. */
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
  let user=null,mode='signup',busy=false,validationToken=0,googleReady=null,googleChecked=false;
  const redirectUrl=String(config.webRedirectUrl||'https://nahuelbaez2011-sketch.github.io/fomeboa-br/');
  const trigger=document.createElement('button');
  trigger.type='button';trigger.id='fomeboaAccountButton';trigger.textContent='Crear cuenta';
  trigger.setAttribute('aria-haspopup','dialog');nav.appendChild(trigger);
  const dlg=document.createElement('dialog');dlg.id='fomeboaAuthDialog';
  dlg.setAttribute('aria-labelledby','fomeboaAuthTitle');
  dlg.innerHTML=[
    '<div class="fomeboa-auth-head"><h2 id="fomeboaAuthTitle">Mi cuenta FomeBoa</h2><button type="button" id="fomeboaClose" aria-label="Cerrar">×</button></div>',
    '<p id="fomeboaAuthNote" role="status" aria-live="polite"></p>',
    '<button id="fomeboaGoogleSignIn" type="button" class="fomeboa-google-button"><span class="fomeboa-google-g" aria-hidden="true">G</span><span class="fomeboa-google-label">Continuar con Google</span></button>',
    '<p id="fomeboaGoogleStatus" class="fomeboa-auth-small" role="status" aria-live="polite"></p>',
    '<p id="fomeboaEmailSeparator" class="fomeboa-email-separator">o usá correo electrónico</p>',
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
    '<section id="fomeboaSignedIn" hidden><p id="fomeboaWelcome"></p><p id="fomeboaLevel"></p><p class="fomeboa-auth-small">Tu perfil funcionará en la web y, más adelante, Android.</p><button id="fomeboaLogout" type="button">Cerrar sesión</button></section>'
  ].join('');
  document.body.appendChild(dlg);
  // When a real Supabase project is configured, all app UI requires an authenticated session.
  // This is a UI gate only: static GitHub Pages files remain public until served by a protected backend.
  const gate=document.createElement('section');gate.id='fomeboaGate';
  gate.setAttribute('aria-labelledby','fomeboaGateTitle');
  gate.innerHTML=[
    '<div class="fomeboa-gate-card">',
    '<div class="fomeboa-gate-top"><strong>🍴 FomeBoa SP</strong><label>🌐 <select id="fomeboaGateLanguage" aria-label="Language / Idioma"><option value="es">Español</option><option value="pt">Português</option><option value="en">English</option></select></label></div>',
    '<h1 id="fomeboaGateTitle">Bienvenido a FomeBoa SP</h1>',
    '<p id="fomeboaGateText">Registrate o iniciá sesión para descubrir la gastronomía de São Paulo.</p>',
    '<button type="button" id="fomeboaGateGoogle" class="fomeboa-google-button"><span class="fomeboa-google-g" aria-hidden="true">G</span><span class="fomeboa-google-label">Continuar con Google</span></button>',
    '<div class="fomeboa-gate-actions"><button id="fomeboaGateSignup" type="button">Registrarme con correo</button><button id="fomeboaGateLogin" type="button">Entrar con correo</button></div>',
    '<p id="fomeboaGateStatus" role="status" aria-live="polite">Verificando tu sesión...</p>',
    '<p id="fomeboaGateHelp">Tu perfil reúne tus valoraciones, niveles y aportes. No compartimos listas de correos con anunciantes.</p>',
    '</div>'
  ].join('');
  gate.hidden=!client;document.body.appendChild(gate);
  if(client)document.documentElement.classList.add('fomeboa-auth-locked');
  byId('fomeboaGateSignup').onclick=()=>{mode='signup';notice('');render();dlg.showModal()};
  byId('fomeboaGateLogin').onclick=()=>{mode='login';notice('');render();dlg.showModal()};
  const css=document.createElement('style');
  css.textContent='#fomeboaAccountButton{padding:8px 13px;font-weight:800;font-size:13px;background:#ebd16c;color:#153c26;border-color:#e6cb53;border-radius:10px;margin-left:auto}#fomeboaAuthDialog{box-sizing:border-box;background:#173b2e;color:#f3f8f1;border:1px solid #56846b;border-radius:17px;padding:20px;width:min(430px,calc(100vw - 24px));max-height:90vh;overflow:auto}#fomeboaAuthDialog::backdrop{background:#071c18bd}.fomeboa-auth-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.fomeboa-auth-head h2{margin:0;font-size:22px}.fomeboa-auth-head button{font-size:24px;background:transparent;border:0;padding:2px 8px}#fomeboaAuthDialog label{display:block;font-size:13px;font-weight:700;margin:12px 0}#fomeboaAuthDialog label input{margin-top:5px}#fomeboaAuthDialog button[type=submit]{width:100%;background:#f0d35f;color:#183c29;font-weight:800}#fomeboaAuthModes[hidden]{display:none!important}#fomeboaAuthModes{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}#fomeboaAuthModes button{font-size:12px;color:#f4d879;border:0;background:transparent;text-decoration:underline;padding:6px}#fomeboaAuthNote{font-size:13px;color:#f5dc87;line-height:1.45}#fomeboaLevel{color:#f2db73;font-weight:800}.fomeboa-auth-small{font-size:12px;color:#c4dace}@media(max-width:550px){#fomeboaAccountButton{margin-left:0}}';
  css.textContent+='#fomeboaGate{position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at top,#1d5140,#0b211a 73%);padding:18px;overflow:auto;box-sizing:border-box}#fomeboaGate[hidden]{display:none!important}.fomeboa-gate-card{max-width:480px;width:100%;padding:25px;background:#153b2d;border:1px solid #54856a;box-shadow:0 12px 60px #0008;border-radius:20px;box-sizing:border-box}.fomeboa-gate-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.fomeboa-gate-top strong{font-size:18px;color:#f5d67d}.fomeboa-gate-top select{width:auto;margin:0;padding:6px;font-size:12px}.fomeboa-gate-card h1{font-size:clamp(23px,5vw,33px);line-height:1.2;margin:25px 0 8px}.fomeboa-gate-card>p{color:#d6e5d7;line-height:1.55}.fomeboa-gate-actions{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}.fomeboa-gate-actions button{flex:1;min-width:150px;font-size:14px;font-weight:800}.fomeboa-gate-actions button:first-child{background:#f2d565;color:#143322}.fomeboa-gate-card #fomeboaGateStatus{font-size:12px;color:#ffde8d}.fomeboa-gate-card #fomeboaGateHelp{font-size:12px;color:#b5d1c2}';
  css.textContent+='#fomeboaGate .fomeboa-google-button,#fomeboaAuthDialog .fomeboa-google-button{display:flex;align-items:center;justify-content:center;gap:12px;box-sizing:border-box;width:100%;min-height:47px;background:#fff;color:#26362e;border:1px solid #d7e1d9;border-radius:12px;margin:12px 0 7px;font-size:15px;font-weight:800;padding:10px 16px;cursor:pointer}#fomeboaGate .fomeboa-google-button:disabled,#fomeboaAuthDialog .fomeboa-google-button:disabled{opacity:.6;cursor:not-allowed}#fomeboaGate .fomeboa-google-button:focus-visible,#fomeboaAuthDialog .fomeboa-google-button:focus-visible{outline:3px solid #f2d565;outline-offset:3px}.fomeboa-google-g{font:900 22px Arial,sans-serif;color:#4285f4}#fomeboaAuthDialog .fomeboa-email-separator{text-align:center;font-size:12px;color:#c6dad0;margin:10px 0 4px}#fomeboaGate .fomeboa-gate-actions button{background:#154d39!important;color:#f8e3a7!important;border:1px solid #4a8969!important;font-size:12px;min-width:130px}#fomeboaGoogleStatus{line-height:1.45;color:#f4db8e;margin:0 0 7px}';
  document.head.appendChild(css);
  function notice(s){byId('fomeboaAuthNote').textContent=s||''}
  function render(){
    const enabled=!!client;
    byId('fomeboaNotReady').hidden=enabled;
    byId('fomeboaAuthForm').hidden=!enabled||!!user||mode==='change';
    dlg.classList.toggle('is-profile',!!user&&mode!=='change');
    byId('fomeboaGoogleStatus').hidden=!enabled||!!user||mode==='change';
    byId('fomeboaGoogleSignIn').hidden=!enabled||!!user||mode==='change';
    byId('fomeboaEmailSeparator').hidden=!enabled||!!user||mode==='change';
    const canGoogle=enabled&&googleReady!==false;
    byId('fomeboaGoogleSignIn').disabled=!canGoogle||busy;
    byId('fomeboaGateGoogle').disabled=!canGoogle||busy;
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
    if(client){gate.hidden=!!user;document.documentElement.classList.toggle('fomeboa-auth-locked',!user);}
    window.FomeBoaI18n?.localizeAuth?.();
    if(!enabled)notice(window.FomeBoaI18n?.t?.('authReady')||'El registro real se habilitará cuando conectemos Supabase.');
  }
  function open(){mode=user?'profile':'signup';notice('');render();if(!dlg.open)dlg.showModal();if(user)window.dispatchEvent(new CustomEvent('fomeboa:profile-open'));}
  trigger.onclick=open;
  byId('fomeboaClose').onclick=()=>dlg.close();
  document.querySelectorAll('#fomeboaAuthModes [data-auth-mode]').forEach(x=>x.onclick=()=>{mode=x.dataset.authMode;notice('');render()});
  function setUser(next){
    const previousId=user?.id||null;
    user=next||null;
    if(user)byId('fomeboaWelcome').textContent='Hola, '+String(user.user_metadata?.display_name||user.user_metadata?.full_name||user.user_metadata?.name||'Explorador').slice(0,40)+'.';
    mode=user?'profile':'login';render();
    if(previousId!==(user?.id||null))window.dispatchEvent(new CustomEvent('fomeboa:auth',{detail:{userId:user?.id||null}}));
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
    if(/Invalid login credentials/i.test(s))return window.FomeBoaI18n?.t?.('authErrorInvalid')||'Correo o contraseña incorrectos.';
    if(/Email not confirmed/i.test(s))return window.FomeBoaI18n?.t?.('authErrorEmail')||'Confirmá tu correo antes de ingresar.';
    if(/rate limit/i.test(s))return window.FomeBoaI18n?.t?.('authErrorRate')||'Demasiados intentos. Intentá más adelante.';
    if(/provider is not enabled|unsupported provider/i.test(s))return window.FomeBoaI18n?.t?.('googleDisabled')||'Google todavía no está habilitado.';
    if(/redirect.*not allowed|invalid redirect/i.test(s))return 'Falta autorizar el regreso a FomeBoa en Supabase.';
    return s.slice(0,200);
  }
  byId('fomeboaAuthForm').onsubmit=async event=>{
    event.preventDefault();if(!client||busy)return;
    const email=byId('fomeboaEmail').value.trim().toLowerCase();
    const password=byId('fomeboaPassword').value;
    const name=byId('fomeboaName').value.trim();
    if(mode==='signup'&&(name.length<2||name.length>40)){notice(window.FomeBoaI18n?.t?.('authMsgName')||'Ingresá un nombre de 2 a 40 caracteres.');return}
    busy=true;byId('fomeboaAuthSubmit').disabled=true;notice(window.FomeBoaI18n?.t?.('authMsgProcessing')||'Procesando...');
    try{
      const redirect=redirectUrl;
      let result;
      if(mode==='signup')result=await client.auth.signUp({email,password,options:{emailRedirectTo:redirect,data:{display_name:name,preferred_language:window.FomeBoaI18n?.lang||'es'}}});
      else if(mode==='reset')result=await client.auth.resetPasswordForEmail(email,{redirectTo:redirect});
      else result=await client.auth.signInWithPassword({email,password});
      if(result.error)throw result.error;
      byId('fomeboaPassword').value='';
      if(mode==='reset'){notice(window.FomeBoaI18n?.t?.('authMsgReset')||'Si existe una cuenta con ese correo, recibirás un enlace.');return}
      if(mode==='signup'&&!result.data?.session){mode='login';render();notice(window.FomeBoaI18n?.t?.('authMsgConfirm')||'Revisá tu correo y confirmá la cuenta para poder ingresar.');return}
      if(result.data?.user){await verifyUser(result.data.user.id);if(user){await loadProfile();notice(window.FomeBoaI18n?.t?.('authMsgLogging')||'Sesión iniciada.');dlg.close();}else notice(window.FomeBoaI18n?.t?.('authMsgSession')||'No se pudo confirmar la sesión. Volvé a ingresar.');}
    }catch(error){notice(messageFor(error))}
    finally{busy=false;byId('fomeboaAuthSubmit').disabled=false}
  };
  function googleStatusText(){
    if(googleReady===false)return window.FomeBoaI18n?.t?.('googleDisabled')||'Google todavía no está habilitado.';
    if(googleReady===null)return googleChecked
      ?(window.FomeBoaI18n?.t?.('googleUnknown')||'No pudimos comprobar Google. Probá de nuevo o usá el correo.')
      :(window.FomeBoaI18n?.t?.('googleChecking')||'Comprobando el inicio de sesión con Google...');
    return '';
  }
  function showGoogleStatus(){
    const s=googleStatusText();
    byId('fomeboaGoogleStatus').textContent=s;
    if(client&&!user&&googleReady===false)byId('fomeboaGateStatus').textContent=s;
    render();
  }
  async function checkGoogleProvider(){
    if(!client)return;
    try{
      const response=await fetch(url+'/auth/v1/settings',{headers:{apikey:key},cache:'no-store'});
      if(!response.ok)throw Error('Google auth settings unavailable');
      const settings=await response.json();
      googleReady=settings.external?.google===true;
    }catch(_){googleReady=null;}
    googleChecked=true;
    showGoogleStatus();
  }
  async function signInWithGoogle(){
    if(!client||busy)return;
    if(googleReady===false){notice(googleStatusText());return;}
    if(typeof window.Capacitor?.isNativePlatform==='function'&&window.Capacitor.isNativePlatform()){
      notice(window.FomeBoaI18n?.t?.('googleNativePending')||'Google está disponible desde la web; Android nativo requiere configurar un regreso seguro.');
      return;
    }
    busy=true;render();
    notice(window.FomeBoaI18n?.t?.('googleRedirect')||'Abriendo el acceso seguro de Google...');
    try{
      const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirectUrl,queryParams:{prompt:'select_account'}}});
      if(error)throw error;
    }catch(error){notice(messageFor(error));busy=false;render();}
  }
  byId('fomeboaGateGoogle').onclick=signInWithGoogle;
  byId('fomeboaGoogleSignIn').onclick=signInWithGoogle;
  byId('fomeboaNewPasswordForm').onsubmit=async event=>{
    event.preventDefault();if(!client||busy)return;busy=true;
    try{
      const result=await client.auth.updateUser({password:byId('fomeboaNewPassword').value});
      if(result.error)throw result.error;
      byId('fomeboaNewPassword').value='';setUser(result.data.user||user);notice(window.FomeBoaI18n?.t?.('authMsgPassword')||'Contraseña actualizada.');
    }catch(error){notice(messageFor(error))}finally{busy=false}
  };
  byId('fomeboaLogout').onclick=async ()=>{
    if(!client)return;
    try{const r=await client.auth.signOut();if(r.error)throw r.error;setUser(null);notice(window.FomeBoaI18n?.t?.('authMsgSignedOut')||'Sesión cerrada.')}
    catch(error){notice(messageFor(error))}
  };
  async function verifyUser(expectedId){
    if(!client)return;
    const ticket=++validationToken;
    try{
      const result=await client.auth.getUser();
      if(ticket!==validationToken)return;
      const found=!result.error&&result.data?.user&&(!expectedId||result.data.user.id===expectedId)?result.data.user:null;
      setUser(found||null);
      if(found)await loadProfile();
      else byId('fomeboaGateStatus').textContent=window.FomeBoaI18n?.t?.('authMsgLocked')||'Ingresá o creá una cuenta para continuar.';
    }catch(_){
      if(ticket!==validationToken)return;
      setUser(null);
      byId('fomeboaGateStatus').textContent=window.FomeBoaI18n?.t?.('authMsgFail')||'No se pudo verificar la sesión. Probá nuevamente.';
    }
  }
  if(client)client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'){
      validationToken++;
      setUser(null);
      byId('fomeboaGateStatus').textContent='';
      return;
    }
    if(event==='PASSWORD_RECOVERY'){
      setTimeout(async()=>{await verifyUser(session?.user?.id);if(user){mode='change';render();if(!dlg.open)dlg.showModal();notice(window.FomeBoaI18n?.t?.('authMsgPasswordNew')||'Ingresá una contraseña nueva.');}},0);
      return;
    }
    if(['INITIAL_SESSION','SIGNED_IN','TOKEN_REFRESHED','USER_UPDATED'].includes(event)){
      if(!session?.user){validationToken++;setUser(null);return;}
      setTimeout(()=>verifyUser(session.user.id),0);
    }
  });
  render();
  if(client)queueMicrotask(checkGoogleProvider);
  window.FomeBoaAuth=Object.freeze({enabled:!!client,open,isSignedIn:()=>!!user,identity:()=>user?({id:user.id}):null,getClient:()=>user?client:null,refresh:()=>{render();window.FomeBoaI18n?.localizeAuth?.();}});

})();
