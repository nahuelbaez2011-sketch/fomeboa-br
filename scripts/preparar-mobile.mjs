/* Prepare local web assets that Capacitor bundles for Android and iOS. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const web=path.join(root,'www');
const files=['index.html','catalogo.js','catalogo-quality.js','google-maps-links.js','gluten-info.js','auth.js','auth-config.js','i18n.js','community.js','extras.js','community-locale.js','community.css','distritos-sp.geojson'];
fs.rmSync(web,{recursive:true,force:true});
fs.mkdirSync(web,{recursive:true});
for(const file of files){
 const origin=path.join(root,file);
 if(!fs.existsSync(origin))throw new Error('Missing web asset: '+file);
 fs.copyFileSync(origin,path.join(web,file));
}
fs.cpSync(path.join(root,'catalogo'),path.join(web,'catalogo'),{recursive:true});
const html=fs.readFileSync(path.join(web,'index.html'),'utf8');
if(!html.includes('<head>')||!html.includes('</head>')||!html.includes('auth.js?v=community1'))throw new Error('Mobile web bundle missing required HTML/head/auth');
if(!fs.existsSync(path.join(web,'catalogo','manifest.json')))throw new Error('Shared catalog missing');
console.log('Prepared FomeBoa SP mobile web bundle in www/. Native platforms can now be synced.');
