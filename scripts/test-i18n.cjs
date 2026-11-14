/* Standalone JS smoke tests for FomeBoa's three-language UI and login guard. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const selectors=new Map();
function input(){return{value:'es',textContent:'',dataset:{},listeners:{},addEventListener(event,fn){this.listeners[event]=fn}}}
selectors.set('fomeboaLanguage',input());selectors.set('fomeboaGateLanguage',input());
const saved=new Map();
const context={
 document:{
  documentElement:{lang:'es'},readyState:'complete',
  getElementById:id=>selectors.get(id)||null,
  querySelector:()=>null,querySelectorAll:()=>[],
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
}
assert.equal(context.FomeBoaI18n.t('authMsgLocked'),'Ingresá o creá una cuenta para continuar.');
const index=fs.readFileSync('index.html','utf8');
const auth=fs.readFileSync('auth.js','utf8');
const catalog=fs.readFileSync('catalogo.js','utf8');
assert(index.includes('id="fomeboaLanguage"'));
assert(index.includes('i18n.js?v=1'));
assert(index.includes('auth.js?v=2'));
assert(auth.includes('client.auth.getUser()'),'Do not unlock on unvalidated stored sessions');
assert(auth.includes("document.documentElement.classList.add('fomeboa-auth-locked')"));
assert(auth.includes('fomeboaGateSignup'));
assert(catalog.includes('window.FomeBoaI18n?.translate?.()'));
assert(catalog.includes('data-type='));
console.log('PASS: three locales, mobile language selection, persisted preference, login gate wiring');
