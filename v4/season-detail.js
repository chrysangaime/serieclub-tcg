/**
 * V1 : portrait éditorial distinct pour chaque saison TVmaze.
 * Indépendant des cartes / inventaires Supabase. Aucun média ni crédit TMDB.
 * La distribution TVmaze des séries est générale : ne pas la présenter
 * comme un casting vérifié pour chaque saison.
 */
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const positive=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
const year=value=>/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))?String(value).slice(0,4):'';
function image(value){
 try{
  const u=new URL(String(value||''));
  return u.protocol==='https:'&&u.hostname==='static.tvmaze.com'&&
   /^\/uploads\/images\//.test(u.pathname)?u.href:null;
 }catch{return null}
}
function extractSummary(value){
 return String(value||'').replace(/<\s*br\s*\/?>/gi,' ')
  .replace(/<\/p>/gi,' ').replace(/<[^>]*>/g,' ')
  .replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&')
  .replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/\s+/g,' ').trim().slice(0,1200);
}
export function normalizeSeasonList(raw){
 const seen=new Set();
 return (Array.isArray(raw)?raw:[]).filter(x=>{
  const n=positive(x?.number);
  if(!n||!positive(x?.id)||seen.has(n))return false;
  seen.add(n);return true;
 }).sort((a,b)=>Number(a.number)-Number(b.number)).slice(0,36).map(s=>({
  id:Number(s.id),number:Number(s.number),name:String(s.name||'').trim().slice(0,110),
  year:year(s.premiereDate),endYear:year(s.endDate),
  episodes:positive(s.episodeOrder),
  poster:image(s.image?.medium)||image(s.image?.original),
  summary:extractSummary(s.summary),
  network:s.network?.name&&s.network?.country?.code==='FR'
   ?String(s.network.name).trim().slice(0,80):''
 }));
}
export function seasonGalleryHTML(seasons){
 const rows=normalizeSeasonList(seasons);
 if(!rows.length)return '';
 return '<section class="sc-season-gallery" aria-label="Explorer les saisons">'+
  '<div class="sc-season-gallery-head"><h3>Explorer les saisons</h3>'+
  '<p>Chaque saison possède son histoire et son visuel quand il est disponible sur TVmaze.</p></div>'+
  '<div class="sc-season-grid">'+rows.map(s=>
   '<details class="sc-season-item" data-season-number="'+s.number+'">'+
   '<summary aria-label="Découvrir la saison '+s.number+'">'+
   (s.poster?'<img src="'+html(s.poster)+'" alt="Affiche de la saison '+s.number+'" loading="lazy">':
    '<span class="sc-season-no-poster" aria-hidden="true"><b>'+s.number+'</b><small>SAISON</small></span>')+
   '<span class="sc-season-caption"><strong>Saison '+s.number+'</strong>'+
    (s.name&&!/^season\s*\d+$/i.test(s.name)?'<small>'+html(s.name)+'</small>':'')+
    (s.year?'<small>'+s.year+'</small>':'')+'</span>'+
   '</summary>'+
   '<div class="sc-season-body">'+
   (s.name&&!/^season\s*\d+$/i.test(s.name)?'<strong>'+html(s.name)+'</strong>':'')+
   (s.summary?'<p>'+html(s.summary)+'</p>':
    '<p>Synopsis propre à cette saison non renseigné sur TVmaze.</p>')+
   (s.episodes?'<small>'+s.episodes+' épisodes annoncés ou répertoriés</small>':'')+
   (s.network?'<small>Diffusion d’origine : '+html(s.network)+'</small>':'')+
   '</div></details>'
  ).join('')+'</div>'+
  '<p class="sc-season-credit">Affiches et renseignements des saisons : <a href="https://www.tvmaze.com/api" target="_blank" rel="noopener noreferrer">TVmaze (CC BY-SA) ↗</a>. La distribution générale de la série ne vaut pas casting vérifié pour chaque saison.</p>'+
  '</section>';
}
