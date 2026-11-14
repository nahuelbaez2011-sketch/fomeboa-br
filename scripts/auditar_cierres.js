/* Audit every published venue for source closure signals and verification gaps.
 * This is NOT a Google Maps / Places verification. No scraping or invented closures.
 * Run on-demand or when the directory changes.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const Q=require(path.join(root,'catalogo-quality.js'));
const rows=read('catalogo/todos.json');
const manifest=read('catalogo/manifest.json');
const previous=read('catalogo/control-calidad.json');
const statuses={},sources={},issues={};
const flagged=[],closedUnexpected=[],temporary=[];
const result={};
function inc(obj,key){obj[key]=(obj[key]||0)+1}
function dateFromSource(v){
 const dates=(v.sourceRecords||[]).map(s=>s.update_time).filter(s=>typeof s==='string'&&/^\d{4}-\d\d-\d\d/.test(s)).sort();
 return dates.at(-1)||null;
}
function inspect(v){
 const raw=String(v.operatingStatus??v.operating_status??v.businessStatus??v.business_status??'unknown').trim().toLowerCase().replace(/[\s-]/g,'_');
 const status=raw||'unknown';
 inc(statuses,status);
 inc(sources,String(v.source||'unspecified'));
 const exclusion=Q.exclusion(v);
 if(exclusion){closedUnexpected.push({id:v.id,name:v.name,reason:exclusion.key});return}
 if(status==='temporarily_closed'||status==='closed_temporarily')temporary.push({id:v.id,name:v.name,zone:v.zones?.[0],source:v.source});
 const reasons=[];
 if(v.unnamed||/nombre sin registrar|sem nome cadastrado/i.test(v.name||''))reasons.push('missing_business_name');
 if(!String(v.address||'').trim())reasons.push('missing_address');
 if(v.confidence!=null&&Number(v.confidence)<.60)reasons.push('low_source_confidence_not_closure');
 const updated=dateFromSource(v);
 if(updated && new Date(updated).getTime()<Date.UTC(2025,10,14))reasons.push('source_update_older_than_one_year');
 if(status==='unknown')reasons.push('operating_status_not_reported');
 for(const reason of reasons)inc(issues,reason);
 // Prioritize actionable corrections, not merely unknown status.
 const high=reasons.filter(x=>x!=='operating_status_not_reported');
 if(high.length)flagged.push({id:v.id,name:v.name,zone:v.zones?.[0]||'',address:v.address||'',source:v.source||'',confidence:v.confidence??null,lastSourceUpdate:updated,reasons:high});
}
assert(Array.isArray(rows));assert(rows.length===manifest.total);
const ids=new Set();
for(const v of rows){assert(v.id&&!ids.has(v.id),'missing or duplicate venue identifier');ids.add(v.id);inspect(v)}
assert.equal(closedUnexpected.length,0,'Source-closed entries must be hidden by quality rules');
flagged.sort((a,b)=>{
 const score=v=>v.reasons.reduce((n,x)=>n+({missing_business_name:3,missing_address:2,low_source_confidence_not_closure:2,source_update_older_than_one_year:1}[x]||0),0);
 return score(b)-score(a)||String(a.name).localeCompare(String(b.name),'pt-BR');
});
result.schemaVersion=1;
result.auditDate=new Date().toISOString().slice(0,10);
result.catalogTotal=rows.length;
result.catalogQuality='Not an independent proof of open businesses';
result.method='Full local source-field scan, no Google Maps scraping and no paid Places API calls';
result.googlePlaceRecordsChecked=0;
result.closedConfirmedFromGoogle=0;
result.sourceClosedStillPublic=closedUnexpected.length;
result.ownerReportedExclusions=(previous.rules||[]).filter(r=>r.status==='reported_permanently_closed').length;
result.archivedExcludedIds=(previous.excluded||[]).length;
result.operatingStatusCounts=statuses;
result.catalogSourceCounts=sources;
result.missingOrUncertainFields=issues;
result.reviewCandidatesCount=flagged.length;
result.reviewCandidatesSample=flagged.slice(0,100);
result.temporarilyClosedRecords=temporary.slice(0,100);
result.notice='Review candidates are NOT proven closed. A missing status, low confidence, or old data alone cannot justify permanent closure.';
result.userAction='Request reliable business listing, owner confirmation, or documented OSM correction before marking a new closure.';
const out=path.join(root,'catalogo','auditoria-cierres.json');
fs.writeFileSync(out,JSON.stringify(result));
console.log(JSON.stringify({total:result.catalogTotal,sourceClosedStillPublic:result.sourceClosedStillPublic,ownerReportedExclusions:result.ownerReportedExclusions,statuses:result.operatingStatusCounts,issues:result.missingOrUncertainFields,candidates:result.reviewCandidatesCount,candidatesSample:result.reviewCandidatesSample.slice(0,3)},null,2));
if(process.env.GITHUB_STEP_SUMMARY){
 fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'### Auditoría del catálogo\n\n'+result.catalogTotal+' registros revisados a nivel de fuente.\n\nNuevos cierres confirmados con Google: **0** (sin acceso a Places).\n\nCierres explícitos que seguían publicados: '+closedUnexpected.length+'.\n\nCandidatos para revisión (no son cierres confirmados): '+flagged.length+'.\n');
}
