/* Standalone JS smoke tests for FomeBoa's three-language UI and login guard. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const selectors=new Map();
function input(){return{value:'es',textContent:'',dataset:{},listeners:{},addEventListener(event,fn){this.listeners[event]=fn}}}
selectors.set('fomeboaLanguage',input());selectors.set('fomeboaGateLanguage',input());
// Regression: filtering must not overwrite a venue article's children.
function venue(kind,name){
 const title={textContent:name};
 const subtitle={textContent:kind==='restaurant'?'Restaurante · Jabaquara':'Bar · Jabaquara'};
 const map={textContent:'📍 Ver ubicación en Google Maps ↗',dataset:{verified:'false'}};
 const details={textContent:'Más información'};
 let overwritten=false;
 const card={
   dataset:{type:kind},
   get textContent(){return title.textContent},
   set textContent(v){overwritten=true;title.textContent=v},
   get overwritten(){return overwritten},
   querySelector(selector){return({
     '.tag':subtitle,
     '.compact-details>summary':details,
     '.compact-google':map
   })[selector]||null},
   querySelectorAll(){return []}
 };
 return {card,title,subtitle,map};
}
const demoVenues=[
 venue('restaurant','A casa do Frango Assado'),
 venue('bar','Açaí Bar & Lanches da Gorete')
];
const categoryButtons=[
 {dataset:{type:''},textContent:'Todos'},
 {dataset:{type:'restaurant'},textContent:'Restaurantes'}
];
const saved=new Map();
const context={
 document:{
  documentElement:{lang:'es'},readyState:'complete',
  getElementById:id=>selectors.get(id)||null,
  querySelector:()=>null,
  querySelectorAll:selector=>{
   if(selector==='#cards .compact-card')return demoVenues.map(v=>v.card);
   if(selector==='.type-pill[data-type]')return categoryButtons;
   if(selector==='[data-type]')return [...categoryButtons,...demoVenues.map(v=>v.card)]; // deliberately dangerous old selector
   return [];
  },
 },
 localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},
 window:{}
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('i18n.js','utf8'),context,{filename:'i18n.js'});
assert.equal(context.FomeBoaI18n.lang,'es');
assert.equal(context.FomeBoaI18n.t('places'),'Locales gastronómicos');
const langs=[
 ['pt','pt-BR','Estabelecimentos gastronômicos','Padarias'],
 ['en','en','Food & drink places','Bakeries'],
 ['es','es','Locales gastronómicos','Panaderías']
];
for(const [lng,htmlLang,name,category] of langs){
 context.FomeBoaI18n.setLang(lng);
 assert.equal(context.FomeBoaI18n.lang,lng);
 assert.equal(context.document.documentElement.lang,htmlLang);
 assert.equal(selectors.get('fomeboaLanguage').value,lng);
 assert.equal(selectors.get('fomeboaGateLanguage').value,lng);
 assert.equal(context.FomeBoaI18n.t('places'),name);
 assert.equal(context.FomeBoaI18n.category('bakery'),category);
 assert.equal(saved.get('fomeboa-language'),lng);
 for(const v of demoVenues){
  assert.equal(v.card.overwritten,false,'Locale must never replace an entire venue card');
  assert.equal(v.title.textContent, v.card.dataset.type==='restaurant'?'A casa do Frango Assado':'Açaí Bar & Lanches da Gorete');
  assert(v.subtitle.textContent.includes(' · Jabaquara'),'Venue district must survive localization');
  const expected=lng==='es'?'Ver ubicación en Google Maps':lng==='pt'?'Ver localização no Google Maps':'View location on Google Maps';
  assert(v.map.textContent.includes(expected),'Google Maps button must describe location, not reviews');
 }
 assert.equal(categoryButtons[0].textContent, lng==='en'?'All':'Todos');
}
assert.equal(context.FomeBoaI18n.t('authMsgLocked'),'Ingresá o creá una cuenta para continuar.');
const index=fs.readFileSync('index.html','utf8');
const auth=fs.readFileSync('auth.js','utf8');
const catalog=fs.readFileSync('catalogo.js','utf8');
assert(index.includes('id="fomeboaLanguage"'));
assert(index.includes('i18n.js?v=google-first1'));
assert(index.includes('catalogo.js?v=nombres-ubicacion1'));
assert(index.includes('google-maps-links.js?v=nombres-ubicacion1'));
assert(index.includes('auth.js?v=google-first1'));
assert(auth.includes('client.auth.getUser()'),'Do not unlock on unvalidated stored sessions');
assert(auth.includes("document.documentElement.classList.add('fomeboa-auth-locked')"));
assert(auth.includes('fomeboaGateSignup'));
assert(auth.includes("signInWithOAuth({provider:'google'"),'Google provider sign-in must exist');
assert(auth.includes("googleReady=settings.external?.google===true"),'Google readiness must be verified');
assert(auth.includes('fomeboaGateGoogle'),'Google button must be on the gate');
assert(auth.includes('redirectUrl'),'Redirect must have canonical URL');
assert(catalog.includes('window.FomeBoaI18n?.translate?.()'));
assert(catalog.includes('data-type='));
assert(catalog.includes('venue-initial'),'The card must show an initial');
assert(catalog.includes('venue-name'),'The card must show the real business name');
assert(catalog.includes('Ver ubicación en Google Maps'),'Link text must describe location');
assert(index.includes(".type-pill[data-type]"),'Only filter buttons should be selected');
assert(!/Ver puntuación en Google Maps|Buscar puntuación en Google Maps/.test(catalog));
assert(!/Ver puntuación en Google Maps|Buscar puntuación en Google Maps/.test(fs.readFileSync('i18n.js','utf8')));
const maps=require('../google-maps-links.js');
const resolved=maps.resolve({name:'A casa do Frango Assado',address:'Rua Teste, 2',zones:['Jabaquara']});
assert.equal(resolved.kind,'search');
assert.equal(new URL(resolved.href).searchParams.get('api'),'1');
assert(new URL(resolved.href).searchParams.get('query').includes('A casa do Frango Assado'));
assert(new URL(resolved.href).searchParams.get('query').includes('Rua Teste, 2'));
assert(resolved.href.startsWith('https://www.google.com/maps/search/'));
assert.equal(resolved.label,'Ver ubicación en Google Maps');
console.log('PASS: 3 locales, venue names preserved, initial badges, Google Maps location URLs, guarded login');
