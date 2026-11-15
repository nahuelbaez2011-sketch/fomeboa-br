// Resolve only existing catalog venues. Client data never defines a name or awards XP.
const ORIGINS=new Set(['https://nahuelbaez2011-sketch.github.io','http://localhost:4173','http://127.0.0.1:4173']);
const BASE='https://raw.githubusercontent.com/nahuelbaez2011-sketch/fomeboa-br/ea95752c22c812d6a8dc0f0b723e2530e151445e/catalogo/';
const cache=new Map<string,{at:number,rows:Map<string,any>}>();
let manifest:any=null;
async function readJSON(url:string){const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('CATALOG_UNAVAILABLE');const s=await r.text();if(s.length>9000000)throw Error('CATALOG_TOO_LARGE');return JSON.parse(s);}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin')||'';
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
 if(ORIGINS.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const answer=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(origin&&!ORIGINS.has(origin))return answer({error:'ORIGIN_NOT_ALLOWED'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return answer({error:'METHOD_NOT_ALLOWED'},405);
 try{
  const authorization=req.headers.get('authorization')||'';
  if(!/^Bearer [A-Za-z0-9_.-]+$/.test(authorization)||authorization.length>8000)return answer({error:'AUTH_REQUIRED'},401);
  const url=Deno.env.get('SUPABASE_URL')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const userResponse=await fetch(url+'/auth/v1/user',{headers:{apikey:secret,authorization},signal:AbortSignal.timeout(10000)});
  if(!userResponse.ok)return answer({error:'AUTH_REQUIRED'},401);
  const user=await userResponse.json();
  if(!user.id||user.is_anonymous)return answer({error:'AUTH_REQUIRED'},401);
  const raw=await req.text();if(raw.length>2048)return answer({error:'INVALID_REQUEST'},400);
  const input=JSON.parse(raw),id=String(input.venue_id||''),zone=String(input.zone||'');
  if(!/^(?:node|way|relation)\/[0-9]+$|^overture\/[a-fA-F0-9-]{36}$/.test(id)||zone.length>80)return answer({error:'INVALID_VENUE'},400);
  const restHeaders={apikey:secret,Authorization:'Bearer '+secret,'Content-Type':'application/json'};
  const existing=await fetch(url+'/rest/v1/fomeboa_venues?id=eq.'+encodeURIComponent(id)+'&select=id,name,category,zone,address,active',{headers:restHeaders});
  if(!existing.ok)throw Error('REGISTRY_UNAVAILABLE');
  const known=await existing.json();if(known.length)return answer({venue:known[0]});
  if(!manifest)manifest=await readJSON(BASE+'manifest.json');
  const file=manifest.zones?.[zone]?.file;
  if(typeof file!=='string'||!/^zonas\/[a-z0-9-]+\.json$/.test(file))return answer({error:'UNKNOWN_ZONE'},400);
  let entry=cache.get(file);
  if(!entry||Date.now()-entry.at>600000){
   const rows=await readJSON(BASE+file);if(!Array.isArray(rows))throw Error('CATALOG_UNAVAILABLE');
   entry={at:Date.now(),rows:new Map(rows.map((v:any)=>[v.id,v]))};
   if(cache.size>=4)cache.delete(cache.keys().next().value!);
   cache.set(file,entry);
  }
  const venue=entry.rows.get(id);
  if(!venue||venue.unnamed||!venue.name||!venue.zones?.includes(zone))return answer({error:'VENUE_NOT_IN_CATALOG'},404);
  const record={id,name:String(venue.name).slice(0,200),category:String(venue.type),zone:String(venue.zones[0]),address:String(venue.address||'').slice(0,400),active:true,catalog_checked_at:new Date().toISOString()};
  const saved=await fetch(url+'/rest/v1/fomeboa_venues?on_conflict=id',{method:'POST',headers:{...restHeaders,Prefer:'resolution=ignore-duplicates,return=representation'},body:JSON.stringify(record)});
  if(!saved.ok)throw Error('REGISTRY_UNAVAILABLE');
  return answer({venue:record});
 }catch(error){
  const code=error instanceof SyntaxError?'INVALID_REQUEST':error instanceof Error&&['CATALOG_UNAVAILABLE','CATALOG_TOO_LARGE','REGISTRY_UNAVAILABLE'].includes(error.message)?error.message:'TEMPORARY_ERROR';
  return answer({error:code},code==='INVALID_REQUEST'?400:503);
 }
});
