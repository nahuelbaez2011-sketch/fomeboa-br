/* Full catalog integrity audit + evidence-based, branch-specific corrections.
 * Does NOT claim Google Maps matching or live opening verification.
 * All source rows removed from the public catalog are archived, never discarded.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const json=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>{const dest=path.join(root,p);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,s);};
const save=(p,v)=>write(p,JSON.stringify(v));
const date='2026-11-14';
const registry=json('catalogo/revisiones-ubicaciones.json');
const manifest=json('catalogo/manifest.json');
const publicInput=json('catalogo/todos.json');
const oldArchivePath=path.join(root,'catalogo/cuarentena-ubicaciones.json');
const oldArchive=fs.existsSync(oldArchivePath)?json('catalogo/cuarentena-ubicaciones.json'):[];
const input=[...new Map([...publicInput,...oldArchive.map(x=>x.venue)].map(v=>[v.id,v])).values()];
const byId=new Map(input.map(v=>[v.id,v]));
assert.equal(byId.size,input.length);
for(const review of registry.records){assert(byId.has(review.id),'Missing reviewed id '+review.id);assert.equal(byId.get(review.id).name,review.name);assert.equal(byId.get(review.id).address,review.address);}
const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const key=s=>norm(s).replace(/[^\p{L}\p{N}]/gu,'');
function distance(a,b){const rad=x=>x*Math.PI/180;const dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon);const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;return 6371000*2*Math.asin(Math.min(1,Math.sqrt(h)));}
const duplicateMap=new Map();
for(const v of input){
 if(v.unnamed||!v.name||!v.address||!/[0-9]/.test(v.address))continue;
 const k=key(v.name)+'|'+key(v.address);if(!duplicateMap.has(k))duplicateMap.set(k,[]);duplicateMap.get(k).push(v);
}
const conflicts=new Set(),duplicateGroups=[];
for(const rows of duplicateMap.values()){
 if(rows.length<2)continue;
 const maxMeters=Math.round(Math.max(...rows.slice(1).map(v=>distance(rows[0],v))));
 duplicateGroups.push({ids:rows.map(v=>v.id),name:rows[0].name,address:rows[0].address,maxDistanceMeters:maxMeters,decision:'review_only_no_automatic_merge'});
 if(maxMeters>250)rows.forEach(v=>conflicts.add(v.id));
}
const report={schemaVersion:1,reviewDate:date,scope:'Full local catalog audit plus manually sourced branch corrections, NOT a full Google Maps verification',inputRecords:input.length,googleMapsListingsVerified:0,googleMapsClosedStatusesRead:0,googleMapsLookupAccess:'Public Google Maps pages could not be read reliably; no paid Places API was enabled.',manualRecordsReviewed:registry.records.length,sourceStatusCounts:{},issues:{},exclusionsByReason:{},duplicateGroups:duplicateGroups.length,coordinateConflictGroups:duplicateGroups.filter(x=>x.maxDistanceMeters>250).length,coordinateConflictRecords:conflicts.size,checks:{}};
const inc=(o,k)=>o[k]=(o[k]||0)+1;
const reviewById=new Map(registry.records.map(r=>[r.id,r]));
const archive=[],output=[],audit=[];
for(const v of input){
 const issues=[];
 const status=String(v.operatingStatus||'unknown');inc(report.sourceStatusCounts,status);
 const hasName=!!String(v.name||'').trim()&&!v.unnamed&&!/nombre sin registrar|sem nome cadastrado/i.test(v.name);
 if(!hasName)issues.push('missing_business_name');
 if(!String(v.address||'').trim())issues.push('missing_address');
 if(['sao paulo','sao paulo sp','guarulhos','guarulhos sp'].includes(norm(v.address).trim()))issues.push('city_only_address');
 if(!Number.isFinite(v.lat)||!Number.isFinite(v.lon)||v.lat < -23.8||v.lat > -23.35||v.lon < -46.9||v.lon > -46.36)issues.push('outside_configured_coordinate_bounds');
 if(conflicts.has(v.id))issues.push('same_identity_address_conflicting_coordinates');
 if(v.confidence!=null&&Number(v.confidence)<0.6)issues.push('low_source_confidence_not_closure');
 if(status==='unknown')issues.push('operating_status_unknown');
 if(!v.googlePlaceId&&!v.googleMaps?.placeId&&!v.googleMaps?.url&&!v.googleMapsUrl)issues.push('no_exact_google_listing');
 issues.forEach(x=>inc(report.issues,x));
 const review=reviewById.get(v.id);
 const reason=review?.excludeFromPublic?review.status:!hasName?'missing_business_name':issues.includes('outside_configured_coordinate_bounds')?'outside_configured_coordinate_bounds':null;
 // Never infer closure from a missing Maps result, unknown status, or confidence.
 if(reason){archive.push({reason,reviewedOn:date,review:review||null,venue:v});inc(report.exclusionsByReason,reason);}
 else{
  v.locationAudit={checkedOn:date,method:'source-integrity-not-google',googleListingVerified:false,coordinatesVerified:false,issues:issues.filter(x=>!['operating_status_unknown','no_exact_google_listing'].includes(x))};
  if(review)v.manualReview=review;
  output.push(v);
 }
 audit.push({id:v.id,name:v.name,address:v.address,zones:v.zones,lat:v.lat,lon:v.lon,source:v.source,sourceOperatingStatus:status,googlePlaceId:null,googleMatch:'unverified',issues,public:!reason,exclusionReason:reason,manualReviewStatus:review?.status||null});
}
report.publicRecords=output.length;report.suspendedRecords=archive.length;
report.publicRecordsNotIndividuallyVerifiedInGoogle=output.length;
report.note='Unknown is not open or closed. Suspension for missing names or source closure annotations is not a confirmed permanent closure. Coordinate conflicts are review candidates, not proof of closure. Business-name search links are not verified place IDs.';
const hidden=Object.fromEntries(registry.records.filter(r=>r.excludeFromPublic).map(r=>[r.id,{key:r.status,status:r.status,independentlyVerified:false,verifiedViaGoogle:false,sourceUrls:r.evidence.map(e=>e.url)}]));
let quality=read('catalogo-quality.js');
const start='  // LOCATION_REVIEW_BEGIN',end='  // LOCATION_REVIEW_END';
const block=start+'\n  const REVIEWED_EXCLUSIONS = Object.freeze('+JSON.stringify(hidden)+');\n'+end+'\n';
if(quality.includes(start)){const a=quality.indexOf(start),b=quality.indexOf(end,a)+end.length;quality=quality.slice(0,a)+block.trimEnd()+quality.slice(b);}else quality=quality.replace('  const fold =',block+'  const fold =');
const anchor="    if (!venue || typeof venue !== 'object') return {key:'invalid-record'};";
const checks="\n    if (REVIEWED_EXCLUSIONS[String(venue.id||'')]) return REVIEWED_EXCLUSIONS[String(venue.id||'')];\n    if(venue.unnamed===true || !String(venue.name||'').trim()) return {key:'missing-business-name',status:'pending_identity_review',independentlyVerified:false};";
assert(quality.includes(anchor));if(!quality.includes('if (REVIEWED_EXCLUSIONS[String(venue.id'))quality=quality.replace(anchor,anchor+checks);
new vm.Script(quality);write('catalogo-quality.js',quality);
delete require.cache[require.resolve(path.join(root,'catalogo-quality.js'))];const Q=require(path.join(root,'catalogo-quality.js'));
assert.equal(Q.filter(output).length,output.length,'Public records unexpectedly excluded');
for(const row of registry.records.filter(r=>r.excludeFromPublic))assert(Q.exclusion(byId.get(row.id)));
assert(!Q.exclusion(byId.get('overture/7c447a19-0b0a-4d9e-988a-108e569be333')),'Do not close the reopened Percussi location');
assert(!Q.exclusion(byId.get('overture/ac8917ac-5901-4815-96e5-9ca6f452436e')),'Do not close Arturito current location');
assert(!Q.exclusion({id:'test/fechado',name:'Fechado Bar',type:'bar'}),'A bar may be named Fechado; do not keyword-delete');
assert(!Q.exclusion({id:'test/unknown',name:'Real name',operatingStatus:'unknown',confidence:0.3}),'Unknown or low confidence is not closure');
save('catalogo/todos.json',output);save('catalogo/cuarentena-ubicaciones.json',archive);
for(const [zone,info] of Object.entries(manifest.zones)){
 assert(/^zonas\/[a-z0-9-]+\.json$/.test(info.file));
 const subset=output.filter(v=>v.zones.includes(zone));info.count=subset.length;save('catalogo/'+info.file,subset);
}
manifest.total=output.length;manifest.unnamed=output.filter(v=>v.unnamed).length;manifest.countsByType={};output.forEach(v=>inc(manifest.countsByType,v.type));
manifest.quality={...manifest.quality,revision:'locations2',locationAuditDate:date,locationAuditSuspensions:archive.length,googleMapsIndividuallyVerified:0,note:'Evidence-based branch closures and incomplete names suspended. Remaining records are NOT guaranteed open or mapped to exact Google listings.'};
manifest.qualityUpdatedAt=new Date().toISOString();save('catalogo/manifest.json',manifest);
const control=json('catalogo/control-calidad.json');control.revision=2;control.visibleTotal=output.length;control.locationReviewArchive='cuarentena-ubicaciones.json';control.excluded=[...new Set([...control.excluded,...archive.map(x=>x.venue.id)])];save('catalogo/control-calidad.json',control);
save('catalogo/duplicados-ubicacion.json',duplicateGroups);
save('catalogo/auditoria-ubicaciones-detalle.json',audit);
let html=read('index.html'),catalog=read('catalogo.js'),i18n=read('i18n.js');
const hook="        +'<div class=\"compact-actions\">'+mapLink+'</div>'";
const withNote=hook+"\n        +'<small class=\"location-review-note\" data-location-review=\"'+(v.locationAudit?.issues?.includes('same_identity_address_conflicting_coordinates')?'conflict':maps.kind==='verified'?'verified':'unverified')+'\">'+(maps.kind==='verified'?'Ficha enlazada; apertura sin comprobar':v.locationAudit?.issues?.includes('same_identity_address_conflicting_coordinates')?'Ubicaci\\u00f3n inconsistente: en revisi\\u00f3n':'Ubicaci\\u00f3n pendiente de verificar')+'</small>'";
if(!catalog.includes('location-review-note')){assert(catalog.includes(hook),'Missing card actions');catalog=catalog.replace(hook,withNote);}
// Cache-version district files to avoid resurfacing already-suspended rows.
catalog=catalog.replace("fetch('./catalogo/'+info.file)","fetch('./catalogo/'+info.file+'?v=locations2')");
catalog=catalog.replace("fetch('./catalogo/todos.json')","fetch('./catalogo/todos.json?v=locations2')");
catalog=catalog.replace("fetch('./catalogo/manifest.json')","fetch('./catalogo/manifest.json?v=locations2')");
const style='/* LOCATION_REVIEW_STYLE */#cards .location-review-note{font-size:10px;line-height:1.35;color:#c9d4cc;margin:0}#cards .location-review-note[data-location-review="conflict"]{color:#f3d790}';
if(!html.includes('/* LOCATION_REVIEW_STYLE */'))html=html.replace('</style>',style+'</style>');
for(const file of ['catalogo-quality.js','catalogo.js','i18n.js'])html=html.replace(new RegExp('src="'+file.replace('.', '\\.')+'\\?v=[^"]+"','g'),'src="'+file+'?v=locations2"');
const localize="const detail=card.querySelector('.compact-details>summary');put(detail,L('details'));";
if(!i18n.includes('data-location-review')){
 assert(i18n.includes(localize));
 const extra="\nconst locationNote=card.querySelector('[data-location-review]');if(locationNote){const state=locationNote.dataset.locationReview;put(locationNote,state==='conflict'?(lang==='en'?'Conflicting location: under review':lang==='pt'?'Localiza\\u00e7\\u00e3o inconsistente: em revis\\u00e3o':'Ubicaci\\u00f3n inconsistente: en revisi\\u00f3n'):state==='verified'?(lang==='en'?'Linked listing; opening status unverified':lang==='pt'?'Ficha vinculada; funcionamento n\\u00e3o confirmado':'Ficha enlazada; apertura sin comprobar'):(lang==='en'?'Location not yet verified':lang==='pt'?'Localiza\\u00e7\\u00e3o ainda n\\u00e3o verificada':'Ubicaci\\u00f3n pendiente de verificar'));}\n";
 i18n=i18n.replace(localize,localize+extra);
}
// Escapes in generated JS must be single JS Unicode escapes, not literal backslash text.
catalog=catalog.replace(/\\\\u([0-9a-f]{4})/g,'\\u$1');i18n=i18n.replace(/\\\\u([0-9a-f]{4})/g,'\\u$1');
new vm.Script(catalog);new vm.Script(i18n);new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
write('catalogo.js',catalog);write('i18n.js',i18n);write('index.html',html);
const testFile='scripts/test-i18n.cjs';let test=read(testFile);
test=test.replace(/i18n\.js\?v=[a-zA-Z0-9-]+/g,'i18n.js?v=locations2').replace(/catalogo\.js\?v=[a-zA-Z0-9-]+/g,'catalogo.js?v=locations2');write(testFile,test);
const maps=require(path.join(root,'google-maps-links.js'));
for(const v of output){const m=maps.resolve(v);assert(m.href,'Public business must have a usable search URL');if(m.kind==='verified')throw Error('Unexpected verified Google record: audit must inspect evidence first');}
report.checks={allRecordsAudited:true,archivedNotDeleted:true,manualClosuresAbsent:true,newArturitoRetained:true,reopenedPercussiRetained:true,fechadoBarNamePreserved:true,allPublicGoogleSearchLinksValid:true,googleSearchIsNotVerification:true};
save('catalogo/auditoria-ubicaciones.json',report);
console.log(JSON.stringify(report,null,2));
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Catalog location review\n'+input.length+' records audited; '+output.length+' published; '+archive.length+' suspended with retained source rows.\nGoogle listings individually verified: **0**. No paid API enabled.\n');
