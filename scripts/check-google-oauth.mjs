// Public-provider readiness check. Never prints API keys or OAuth client IDs.
import fs from 'node:fs';
import vm from 'node:vm';
const cfgSource=fs.readFileSync(new URL('../auth-config.js',import.meta.url),'utf8');
const sandbox={window:{}};
vm.runInNewContext(cfgSource,sandbox);
const cfg=sandbox.window.FOMEBOA_AUTH_CONFIG;
if(!cfg?.url||!cfg?.publishableKey||!cfg?.webRedirectUrl)throw Error('FOMEBOA_AUTH_CONFIG_INCOMPLETE');
const endpoint=cfg.url.replace(/\/$/,'');
const headers={apikey:cfg.publishableKey};
const res=await fetch(endpoint+'/auth/v1/settings',{headers,redirect:'manual'});
if(!res.ok)throw Error('SUPABASE_AUTH_SETTINGS_HTTP_'+res.status);
const settings=await res.json();
if(settings.external?.google!==true)throw Error('GOOGLE_PROVIDER_DISABLED: enable Google in Supabase Authentication > Providers');
const auth=new URL(endpoint+'/auth/v1/authorize');
auth.searchParams.set('provider','google');
auth.searchParams.set('redirect_to',cfg.webRedirectUrl);
const response=await fetch(auth,{headers,redirect:'manual'});
const next=response.headers.get('location')||'';
let origin;
try{origin=new URL(next).hostname;}catch(_){origin='';}
if(![302,303,307,308].includes(response.status)||origin!=='accounts.google.com'){
 const t=await response.text();
 throw Error('GOOGLE_OAUTH_NOT_READY: HTTP '+response.status+' '+t.slice(0,200).replace(/https?:\/\/\S+/g,'[url]'));
}
console.log('PASS: Supabase Google provider is enabled and OAuth redirects to Google. No user account has been created by this check.');
