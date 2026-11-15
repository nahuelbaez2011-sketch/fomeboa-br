/* Real account history and server-calculated achievements. RLS is the security boundary. */
(function(root){
'use strict';
const $=id=>document.getElementById(id), T=k=>root.FomeBoaCommunityText.t(k);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const identity=()=>root.FomeBoaAuth?.identity?.()||null;
const db=()=>root.FomeBoaAuth?.getClient?.()||null;
const date=s=>new Date(s).toLocaleDateString(root.FomeBoaI18n?.lang==='pt'?'pt-BR':root.FomeBoaI18n?.lang==='en'?'en-US':'es-UY');
const venueType=v=>root.FomeBoaI18n?.category?.(v.category||v.type,true)||v.category||v.type||'';
const thresholds=[0,50,150,400,800,1500];
let owner=null,epoch=0,tab='reviews',profile=null,progress=null,earned=[],history=[],historyMore=false,historyOffset=0,saved=[],reports=[],reportsMore=false,reportsOffset=0;
let profileLoading=false,profileError=false,tabLoading=false,requestId=0,profilePromise=null;
const venues=new Map(), totals=new Map(), inFlightFavorites=new Set(), historyPhotos=new Map();
const profileRoot=document.createElement('div');profileRoot.id='fomeboaProfileContent';
const signed=$('fomeboaSignedIn');if(!signed)return;
signed.insertBefore(profileRoot,$('fomeboaLogout'));
const toast=document.createElement('div');toast.className='fb-toast';toast.hidden=true;toast.setAttribute('role','status');document.body.appendChild(toast);
let toastTimer;
function notify(text){clearTimeout(toastTimer);toast.textContent=text;toast.hidden=false;toastTimer=setTimeout(()=>toast.hidden=true,5500);}
function errorText(e){const m=String(e?.message||e?.code||'');if(/AUTH_REQUIRED|SESSION_EXPIRED|JWT|not authenticated/i.test(m))return T('auth');if(/LIMIT_24H/.test(m))return T('limit');if(/REVIEW_TOO_FAST/.test(m))return T('tooFast');if(/VENUE_NOT|UNKNOWN_ZONE|INVALID_VENUE/.test(m))return T('noVenue');if(e?.code==='23505')return T('alreadyReport');return T('error');}
function must(result){if(result?.error)throw result.error;return result?.data;}
function remember(v){if(!v?.id)return;venues.set(v.id,{...v,zone:v.zone||v.zones?.[0]||'',category:v.category||v.type||'',address:v.address||''});}
function getVenue(id){return venues.get(id);}
async function ensureVenue(v){
 const c=db(),me=identity();if(!c||!me)throw Error('AUTH_REQUIRED');
 const result=await c.functions.invoke('fomeboa-venue',{body:{venue_id:v.id,zone:v.zone||v.zones?.[0]||''}});
 const data=must(result);if(!data?.venue||data.venue.active!==true)throw Error('VENUE_NOT_IN_CATALOG');remember(data.venue);return data.venue;
}
function updateLocalFavorites(){
 if(typeof favorites!=='undefined'){favorites.clear();saved.forEach(s=>favorites.add(s.venue_id));}
 if(typeof render==='function')render();
}
function normalizeJoined(row){const v=Array.isArray(row.fomeboa_venues)?row.fomeboa_venues[0]:row.fomeboa_venues;if(v)remember(v);return {...row,venue:v||getVenue(row.venue_id)||{id:row.venue_id,name:row.venue_id,zone:'',category:''}};}
async function loadFavorites(){
 const c=db(),me=identity(),ticket=epoch;if(!c||!me)return;
 const rows=must(await c.from('fomeboa_favorites').select('venue_id,created_at,fomeboa_venues(id,name,category,zone,address,active)').eq('user_id',me.id).order('created_at',{ascending:false}).limit(500))||[];
 if(ticket!==epoch)return;saved=rows.map(normalizeJoined);updateLocalFavorites();
}
async function loadHistory(reset=true){
 const c=db(),me=identity(),ticket=epoch;if(!c||!me)return;
 const offset=reset?0:historyOffset;
 const rows=must(await c.from('fomeboa_reviews').select('venue_id,rating,body,status,created_at,updated_at,fomeboa_venues(id,name,category,zone,address)').eq('user_id',me.id).order('updated_at',{ascending:false}).range(offset,offset+29))||[];
 if(ticket!==epoch)return;
 history=reset?rows.map(normalizeJoined):history.concat(rows.map(normalizeJoined));historyOffset=offset+rows.length;historyMore=rows.length===30;
 if(reset)historyPhotos.clear();
 if(rows.length){
  const photoResult=await c.from('fomeboa_review_photos').select('venue_id,object_path,moderation_status').eq('user_id',me.id).in('venue_id',rows.map(r=>r.venue_id));
  if(photoResult.error)throw photoResult.error;
  await Promise.all((photoResult.data||[]).map(async p=>{
   const result=await c.storage.from('fomeboa-review-photos').createSignedUrl(p.object_path,600);
   if(!result.error&&ticket===epoch)historyPhotos.set(p.venue_id,{url:result.data.signedUrl,status:p.moderation_status});
  }));
 }
}
async function loadReports(reset=true){
 const c=db(),me=identity(),ticket=epoch;if(!c||!me)return;
 const offset=reset?0:reportsOffset;
 const rows=must(await c.from('fomeboa_reports').select('id,venue_id,kind,detail,status,created_at,fomeboa_venues(id,name,category,zone,address)').eq('user_id',me.id).order('created_at',{ascending:false}).range(offset,offset+29))||[];
 if(ticket!==epoch)return;reports=reset?rows.map(normalizeJoined):reports.concat(rows.map(normalizeJoined));reportsOffset=offset+rows.length;reportsMore=rows.length===30;
}
async function refreshProfile(){
 if(!identity()||!db())return;
 if(profilePromise)return profilePromise;
 const ticket=epoch,me=identity(),c=db();profileLoading=true;profileError=false;drawProfile();
 profilePromise=(async()=>{
  try{
   const results=await Promise.all([
    c.from('fomeboa_profiles').select('id,display_name,xp,level,created_at').eq('id',me.id).single(),
    c.rpc('fomeboa_my_progress'),
    c.from('fomeboa_user_badges').select('code,earned_at').eq('user_id',me.id)
   ]);
   const values=results.map(must);if(ticket!==epoch)return;
   profile=values[0];progress=values[1]||{};earned=values[2]||[];
   if(tab==='reviews')await loadHistory();else if(tab==='favorites')await loadFavorites();else if(tab==='reports')await loadReports();
  }catch(e){if(ticket===epoch){profileError=true;console.warn('Profile could not be loaded',e?.code||'request');}}
  finally{if(ticket===epoch){profileLoading=false;profilePromise=null;drawProfile();}}
 })();return profilePromise;
}
function metric(code){if(code==='member')return 1;if(['reviews','zones','photos','menus','location_fixes'].includes(code))return Number(progress?.[code]||0);return Number(progress?.categories?.[code]||0);}
function badgeMarkup(){return '<div class="fb-badges">'+root.FomeBoaCommunityText.badges().map(b=>{
 const receipt=earned.find(e=>e.code===b.code),n=Math.min(metric(b.metric),b.target);
 return '<article class="fb-badge '+(receipt?'earned':'')+'"><span class="fb-badge-icon" aria-hidden="true">'+esc(b.icon)+'</span><h4>'+esc(b.name)+'</h4><p>'+esc(b.description)+'</p><span class="fb-badge-state">'+(receipt?esc(T('earned'))+' \u00b7 '+esc(date(receipt.earned_at)):n+' / '+b.target+' \u00b7 '+esc(T('locked')))+'</span><progress class="fb-progress" value="'+n+'" max="'+b.target+'" aria-label="'+esc(b.name)+'"></progress></article>';
 }).join('')+'</div><p class="fb-subtle">'+esc(T('badgeNote'))+'</p>';}
function historyMarkup(){if(!history.length)return '<p class="fb-empty">'+esc(T('emptyReviews'))+'</p>';
 return '<ul class="fb-history">'+history.map(r=>'<li><h4>'+esc(r.venue.name)+'</h4><div class="fb-meta">'+esc(venueType(r.venue))+' \u00b7 '+esc(r.venue.zone)+' \u00b7 '+esc(date(r.updated_at))+'</div><p class="fb-stars" aria-label="'+r.rating+' / 5">'+'\u2605'.repeat(r.rating)+'\u2606'.repeat(5-r.rating)+'</p>'+(r.status==='hidden'?'<p class="fb-subtle">'+esc(T('hidden'))+'</p>':'')+(r.body?'<p>'+esc(r.body)+'</p>':'')+(historyPhotos.get(r.venue_id)?'<figure class="fb-review-photo"><img loading="lazy" alt="'+esc(T('photoAlt'))+'" src="'+esc(historyPhotos.get(r.venue_id).url)+'"><figcaption>'+esc(T('privatePhoto'))+'</figcaption></figure>':'')+'<div class="fb-history-actions"><button type="button" data-fb-edit="'+esc(r.venue_id)+'">'+esc(T('edit'))+'</button><button type="button" data-fb-delete="'+esc(r.venue_id)+'">'+esc(T('remove'))+'</button></div></li>').join('')+'</ul>'+(historyMore?'<button class="fb-load-more" data-fb-more="reviews">'+esc(T('more'))+'</button>':'');}
function savedMarkup(){if(!saved.length)return '<p class="fb-empty">'+esc(T('emptySaved'))+'</p>';return '<ul class="fb-history">'+saved.map(r=>'<li><h4>'+esc(r.venue.name)+'</h4><p class="fb-meta">'+esc(venueType(r.venue))+' \u00b7 '+esc(r.venue.zone)+'</p><div class="fb-history-actions"><button data-fb-rate="'+esc(r.venue_id)+'" type="button">'+esc(T('rate'))+'</button><button data-fb-unsave="'+esc(r.venue_id)+'" type="button">'+esc(T('remove'))+'</button></div></li>').join('')+'</ul>';}
function reportsMarkup(){if(!reports.length)return '<p class="fb-empty">'+esc(T('emptyReports'))+'</p>';return '<ul class="fb-history">'+reports.map(r=>'<li><h4>'+esc(r.venue.name)+'</h4><div class="fb-meta">'+esc(date(r.created_at))+' \u00b7 '+esc(T(r.kind))+'</div><p>'+esc(r.detail)+'</p><p class="fb-badge-state">'+esc(T(r.status))+'</p></li>').join('')+'</ul>'+(reportsMore?'<button class="fb-load-more" data-fb-more="reports">'+esc(T('more'))+'</button>':'');}
function drawProfile(){
 if(!identity()){profileRoot.innerHTML='';return;}
 if(profileError){profileRoot.innerHTML='<p class="fb-empty" role="alert">'+esc(T('error'))+'</p><button type="button" class="fb-load-more" data-fb-retry>'+esc(T('retry'))+'</button>';return;}
 if(!profile){profileRoot.innerHTML='<p class="fb-empty" role="status">'+esc(T('loading'))+'</p>';return;}
 const xp=Number(profile.xp)||0,level=Math.max(1,Math.min(6,Number(profile.level)||1)),next=thresholds[level],start=thresholds[level-1],name=profile.display_name;
 const head='<div class="fb-profile-hero"><span class="fb-avatar" aria-hidden="true">'+esc(name.slice(0,1).toUpperCase())+'</span><div><h3 class="fb-profile-name">'+esc(name)+'</h3><span class="fb-subtle">'+esc(T('member'))+' '+esc(date(profile.created_at))+'</span></div></div><div class="fb-level-line"><strong>'+esc(T('level'))+' '+level+' \u00b7 '+esc(root.FomeBoaCommunityText.level(level))+'</strong><span>'+xp+' XP</span></div><progress class="fb-progress" aria-label="'+esc(T('points'))+'" value="'+(next?xp-start:1)+'" max="'+(next?next-start:1)+'"></progress><p class="fb-subtle">'+(next?(next-xp)+' XP '+esc(T('next')):esc(T('max')))+'</p><div class="fb-stats"><div><strong>'+Number(progress?.reviews||0)+'</strong><span>'+esc(T('reviews'))+'</span></div><div><strong>'+earned.length+'</strong><span>'+esc(T('badges'))+'</span></div><div><strong>'+Number(progress?.favorites||0)+'</strong><span>'+esc(T('favorites'))+'</span></div></div>';
 const tabs='<nav class="fb-tabs" aria-label="'+esc(T('profile'))+'">'+['reviews','badges','favorites','reports'].map(t=>'<button type="button" data-fb-tab="'+t+'" aria-pressed="'+(tab===t)+'">'+esc(T(t))+'</button>').join('')+'</nav>';
 const body=tabLoading?'<p class="fb-empty" role="status">'+esc(T('loading'))+'</p>':tab==='badges'?badgeMarkup():tab==='favorites'?savedMarkup():tab==='reports'?reportsMarkup():historyMarkup();
 profileRoot.innerHTML=head+tabs+'<section class="fb-profile-panel" aria-live="polite">'+body+'</section>'+(tab==='badges'?'<details><summary class="fb-subtle">XP</summary><p class="fb-subtle">'+esc(T('reward'))+'</p></details>':'');
}
async function chooseTab(next){tab=next;const ticket=epoch;tabLoading=true;drawProfile();try{if(tab==='reviews')await loadHistory();else if(tab==='favorites')await loadFavorites();else if(tab==='reports')await loadReports();}catch(e){notify(errorText(e));}finally{if(ticket===epoch){tabLoading=false;drawProfile();}}}
async function prepareReviewPhoto(file){
 if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>8*1024*1024)throw Error('INVALID_IMAGE');
 const url=URL.createObjectURL(file),img=new Image();
 try{
  img.src=url;
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;});
  const scale=Math.min(1,1024/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('INVALID_IMAGE');
  context.drawImage(img,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.72));
  if(!blob||blob.size>950000)throw Error('IMAGE_TOO_LARGE');
  // Drawing to a canvas drops GPS and camera EXIF metadata from the uploaded file.
  return blob;
 }finally{URL.revokeObjectURL(url);}
}
const reviewDialog=document.createElement('dialog');reviewDialog.className='fb-dialog';reviewDialog.id='fomeboaReviewDialog';reviewDialog.setAttribute('aria-labelledby','fbReviewTitle');document.body.appendChild(reviewDialog);
const reportDialog=document.createElement('dialog');reportDialog.className='fb-dialog';reportDialog.id='fomeboaReportDialog';reportDialog.setAttribute('aria-labelledby','fbReportTitle');document.body.appendChild(reportDialog);
async function openReview(v){
 if(!identity()){root.FomeBoaAuth.open();return;}
 if(!v)return;const ticket=epoch;reviewDialog.innerHTML='<p class="fb-empty">'+esc(T('loading'))+'</p>';if(!reviewDialog.open)reviewDialog.showModal();
 try{
 const [reviewQuery,photoQuery]=await Promise.all([
  db().from('fomeboa_reviews').select('rating,body,status').eq('user_id',identity().id).eq('venue_id',v.id).maybeSingle(),
  db().from('fomeboa_review_photos').select('object_path,moderation_status').eq('user_id',identity().id).eq('venue_id',v.id).maybeSingle()
 ]);
 const row=must(reviewQuery),existingPhoto=must(photoQuery);
 if(ticket!==epoch)return;
 reviewDialog.innerHTML='<h2 id="fbReviewTitle">'+esc(T('writeReview'))+'</h2><h3>'+esc(v.name)+'</h3><form id="fbReviewForm"><fieldset class="fb-rating-input"><legend>'+esc(T('stars'))+'</legend><div class="fb-star-options">'+[1,2,3,4,5].map(n=>'<label><input name="rating" type="radio" value="'+n+'" required '+(row?.rating===n?'checked':'')+'><span aria-label="'+n+' / 5">'+n+'\u2605</span></label>').join('')+'</div></fieldset><label>'+esc(T('comment'))+'<textarea name="body" maxlength="2000" placeholder="'+esc(T('commentHint'))+'">'+esc(row?.body||'')+'</textarea></label><label class="fb-photo-label">'+esc(T('addPhoto'))+(existingPhoto?'<small>'+esc(T('photoAlready'))+'</small>':'<input name="photo" type="file" accept="image/jpeg,image/png,image/webp"><small>'+esc(T('photoHint'))+'</small>')+'</label><label class="fb-visited"><input name="visited" type="checkbox" required><span>'+esc(T('visited'))+'</span></label><p class="fb-subtle">'+esc(T('privacy'))+'</p><details><summary class="fb-subtle">XP</summary><p class="fb-subtle">'+esc(T('reward'))+'</p></details><p id="fbReviewFeedback" class="fb-feedback" role="status"></p><div class="fb-dialog-actions"><button type="button" data-fb-cancel>'+esc(T('cancel'))+'</button><button type="submit">'+esc(T('saveReview'))+'</button></div></form>';
 reviewDialog.querySelector('[data-fb-cancel]').onclick=()=>reviewDialog.close();
 $('fbReviewForm').onsubmit=async e=>{
 e.preventDefault();const form=e.currentTarget,button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;const fd=new FormData(form);$('fbReviewFeedback').textContent=T('saving');
 let reviewSaved=false;
 try{
  const record=await ensureVenue(v);
  if(ticket!==epoch)throw Error('AUTH_REQUIRED');
  must(await db().rpc('fomeboa_save_review',{p_venue_id:record.id,p_rating:Number(fd.get('rating')),p_body:String(fd.get('body')||''),p_visited:fd.get('visited')==='on'}));
  reviewSaved=true;
  const file=fd.get('photo');
  if(file instanceof File&&file.size){
   const jpg=await prepareReviewPhoto(file);
   const me=identity();if(!me||ticket!==epoch)throw Error('AUTH_REQUIRED');
   const path=me.id+'/'+crypto.randomUUID()+'.jpg';
   must(await db().storage.from('fomeboa-review-photos').upload(path,jpg,{contentType:'image/jpeg',upsert:false,cacheControl:'3600'}));
   try{must(await db().from('fomeboa_review_photos').insert({user_id:me.id,venue_id:record.id,object_path:path}));}
   catch(e){await db().storage.from('fomeboa-review-photos').remove([path]);throw e;}
  }
  if(ticket!==epoch)return;
  reviewDialog.close();totals.delete(record.id);notify(T('saved'));historyPhotos.delete(record.id);
  await refreshProfile();await refreshRatings([record.id]);
 }catch(error){if(ticket===epoch)$('fbReviewFeedback').textContent=reviewSaved?T('photoFailedSaved'):errorText(error);}
 finally{button.disabled=false;}
 };
 }catch(e){reviewDialog.innerHTML='<p class="fb-empty">'+esc(errorText(e))+'</p><button type="button" data-fb-cancel>'+esc(T('close'))+'</button>';reviewDialog.querySelector('button').onclick=()=>reviewDialog.close();}
}
function openReport(v){
 if(!identity()){root.FomeBoaAuth.open();return;}if(!v)return;
 const ticket=epoch;
 reportDialog.innerHTML='<h2 id="fbReportTitle">'+esc(T('report'))+'</h2><h3>'+esc(v.name)+'</h3><form id="fbReportForm"><label>'+esc(T('reason'))+'<select name="kind" required>'+['closed','moved','location','duplicate','other'].map(k=>'<option value="'+k+'">'+esc(T(k))+'</option>').join('')+'</select></label><label>'+esc(T('detail'))+'<textarea name="detail" minlength="10" maxlength="1200" required></textarea></label><label>'+esc(T('evidence'))+'<input name="evidence" type="url" maxlength="1000" pattern="https://.*" placeholder="https://"></label><p id="fbReportFeedback" class="fb-feedback" role="status"></p><div class="fb-dialog-actions"><button type="button" data-fb-cancel>'+esc(T('cancel'))+'</button><button type="submit">'+esc(T('send'))+'</button></div></form>';
 reportDialog.querySelector('[data-fb-cancel]').onclick=()=>reportDialog.close();reportDialog.showModal();
 $('fbReportForm').onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;const fd=new FormData(form);$('fbReportFeedback').textContent=T('saving');
 try{await ensureVenue(v);if(ticket!==epoch)throw Error('AUTH_REQUIRED');must(await db().from('fomeboa_reports').insert({user_id:identity().id,venue_id:v.id,kind:String(fd.get('kind')),detail:String(fd.get('detail')||'').trim(),evidence_url:String(fd.get('evidence')||'').trim()}));if(ticket!==epoch)return;reportDialog.close();notify(T('reportSent'));await refreshProfile();}
 catch(error){if(ticket===epoch)$('fbReportFeedback').textContent=errorText(error);}finally{button.disabled=false;}};
}
async function toggleFavorite(v){
 if(!identity()){root.FomeBoaAuth.open();return;}if(!v||inFlightFavorites.has(v.id))return;
 inFlightFavorites.add(v.id);const ticket=epoch,me=identity();
 try{if(saved.some(s=>s.venue_id===v.id)){must(await db().from('fomeboa_favorites').delete().eq('user_id',me.id).eq('venue_id',v.id));}else{await ensureVenue(v);if(ticket!==epoch)throw Error('AUTH_REQUIRED');must(await db().from('fomeboa_favorites').insert({user_id:me.id,venue_id:v.id}));}
 if(ticket!==epoch)return;await loadFavorites();if(progress)progress.favorites=saved.length;drawProfile();}
 catch(e){notify(errorText(e));}finally{inFlightFavorites.delete(v.id);}
}
function ratingText(id){const d=totals.get(id);if(d===undefined)return T('loading');if(d===null)return T('ratingPending');return d.review_count?'<strong>\u2605 '+(d.rating_sum/d.review_count).toLocaleString(root.FomeBoaI18n?.lang||'es',{minimumFractionDigits:1,maximumFractionDigits:1})+'</strong> \u00b7 '+d.review_count+' '+esc(T('reviewCount')):esc(T('noRating'));}
function paintRatings(){document.querySelectorAll('[data-fb-summary]').forEach(n=>{n.innerHTML=ratingText(n.dataset.fbSummary);});}
async function refreshRatings(ids){
 const c=db();if(!c||!ids.length)return;const ticket=epoch;
 const unknown=[...new Set(ids)].filter(id=>!totals.has(id));
 for(let i=0;i<unknown.length;i+=60){const batch=unknown.slice(i,i+60);try{
 const result=must(await c.from('fomeboa_review_totals').select('venue_id,review_count,rating_sum').in('venue_id',batch))||[];
 if(ticket!==epoch)return;batch.forEach(id=>totals.set(id,{review_count:0,rating_sum:0}));result.forEach(r=>totals.set(r.venue_id,r));
 }catch(_){if(ticket===epoch)batch.forEach(id=>totals.set(id,null));}}
 if(ticket===epoch)paintRatings();
}
let ratingTimer;
function decorate(rows){
 rows.forEach(remember);const cards=[...document.querySelectorAll('#cards article[data-venue-id]')];
 cards.forEach(card=>{
 const id=card.dataset.venueId;if(!card.querySelector('.fb-rating-row')){const row=document.createElement('div');row.className='fb-rating-row';row.innerHTML='<span class="fb-rating-summary" data-fb-summary="'+esc(id)+'">'+ratingText(id)+'</span><button class="fb-rate" type="button" data-fb-rate="'+esc(id)+'">'+esc(T('rate'))+'</button>';card.querySelector('.compact-actions')?.before(row);}
 const oldReport=card.querySelector('.catalog-report');if(oldReport){const button=document.createElement('button');button.type='button';button.className='fb-report-btn';button.dataset.fbReport=id;button.textContent=T('report');oldReport.replaceWith(button);}
 });
 root.FomeBoaExtras?.decorate?.(rows);
 clearTimeout(ratingTimer);ratingTimer=setTimeout(()=>refreshRatings(cards.map(c=>c.dataset.venueId)),150);
}
async function authChanged(){
 const me=identity();if(owner===(me?.id||null))return;
 owner=me?.id||null;epoch++;profilePromise=null;profile=null;progress=null;earned=[];history=[];saved=[];reports=[];totals.clear();historyPhotos.clear();profileError=false;profileLoading=false;
 if(reviewDialog.open)reviewDialog.close();if(reportDialog.open)reportDialog.close();toast.hidden=true;
 updateLocalFavorites();drawProfile();
 if(me){try{await loadFavorites();await refreshProfile();}catch(e){notify(errorText(e));}}
}
profileRoot.addEventListener('click',async e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.fbTab)return chooseTab(b.dataset.fbTab);
 if(b.hasAttribute('data-fb-retry'))return refreshProfile();
 if(b.dataset.fbMore){b.disabled=true;try{if(b.dataset.fbMore==='reviews')await loadHistory(false);else await loadReports(false);drawProfile();}catch(error){notify(errorText(error));b.disabled=false;}return;}
 if(b.dataset.fbDelete){if(!root.confirm(T('confirmDelete')))return;b.disabled=true;const id=b.dataset.fbDelete,ticket=epoch;try{must(await db().from('fomeboa_reviews').delete().eq('user_id',identity().id).eq('venue_id',id));if(ticket!==epoch)return;totals.delete(id);await refreshProfile();await refreshRatings([id]);}catch(error){notify(errorText(error));b.disabled=false;}}
});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-fb-rate],[data-fb-edit],[data-fb-report],[data-fb-unsave]');if(!b)return;
 const id=b.dataset.fbRate||b.dataset.fbEdit||b.dataset.fbReport||b.dataset.fbUnsave,v=getVenue(id);
 if(b.hasAttribute('data-fb-report'))openReport(v);else if(b.hasAttribute('data-fb-unsave'))toggleFavorite(v);else openReview(v);
});
root.addEventListener('fomeboa:auth',authChanged);
root.addEventListener('fomeboa:profile-open',()=>refreshProfile());
root.addEventListener('fomeboa:language',()=>{drawProfile();paintRatings();document.querySelectorAll('.fb-rate').forEach(b=>b.textContent=T('rate'));document.querySelectorAll('.fb-report-btn').forEach(b=>b.textContent=T('report'));});
root.FomeBoaCommunity=Object.freeze({decorate,toggleFavorite,refreshProfile,openReview,openReport,ensureVenue});
authChanged();
if(typeof visibleVenues==='function')decorate(visibleVenues().slice(0,typeof visibleLimit!=='undefined'?visibleLimit:60));
})(window);
