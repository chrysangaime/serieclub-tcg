/**
 * SérieClub – disponibilité légale FR exclusivement.
 * Les relevés TMDB utilisent l'API officielle /watch/providers (source JustWatch).
 * Aucune plateforme n'est déduite du diffuseur d'origine de TVmaze.
 * Les secrets TMDB n'entrent JAMAIS dans le site ou ses fichiers JSON.
 */
const ROOT='https://www.justwatch.com/fr';
const cache={promise:null};
const HTML_ESC={ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>HTML_ESC[c]);
const asId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?String(v):null;
const ALLOWED=new Set(['flatrate','free','ads','rent','buy']);

export function getFrenchOriginChannel(show={}){
 const channels=[show.network,show.webChannel];
 const matching=channels.filter(ch=>ch?.country?.code==='FR'&&typeof ch?.name==='string');
 return [...new Set(matching.map(x=>x.name.trim()).filter(Boolean))];
}
function safeTMDBLogo(path){
 return typeof path==='string'&&/^\/[A-Za-z0-9_-]+\.(?:jpg|png|webp)$/i.test(path)
  ?'https://image.tmdb.org/t/p/w92'+path:null;
}
function safeWatchLink(url){
 try{
  const u=new URL(String(url||''));
  if(u.protocol!=='https:')return null;
  if(['www.themoviedb.org','themoviedb.org'].includes(u.hostname)&&
     /^\/tv\/\d+\/watch\/?$/.test(u.pathname))return u.href;
  if(u.hostname==='www.justwatch.com'&&
     /^\/fr\/serie\/[a-z0-9-]+(?:\/saison-\d+)?\/?$/.test(u.pathname))return u.href;
  return null;
 }catch{return null}
}
export function normalizeFranceOffers(record){
 if(!record||record.country!=='FR'||!Array.isArray(record.offers))return null;
 const date=Date.parse(record.checked_at);
 if(!Number.isFinite(date))return null;
 const age=Math.max(0,Date.now()-date);
 // A historical JustWatch record remains evidence of French distribution.
 // After 45 days its platforms are clearly labeled "last observed", never live.
 if(age>45*86400000&&record.source!=='justwatch_fr_editorial')return null;
 const offers=record.offers
  .filter(p=>ALLOWED.has(p.type)&&typeof p.name==='string'&&p.name.length<=65)
  .slice(0,30).map(p=>({
   type:p.type,name:p.name,logo:safeTMDBLogo(p.logo_path),id:Number(p.provider_id)||0
  }));
 return {offers,checked_at:record.checked_at,stale:age>14*86400000,
  historical:age>45*86400000,source:record.source==='justwatch_fr_editorial'?'justwatch_fr_editorial':'tmdb',
  url:safeWatchLink(record.url),tmdb_id:Number(record.tmdb_id)||null};
}
export function renderFranceAvailability(record=null,show={}){
 const data=normalizeFranceOffers(record),origin=getFrenchOriginChannel(show);
 const entry=data?.source==='justwatch_fr_editorial'&&data?.url?data.url:ROOT;
 const direct='<a class="btn sc53-jw-btn" href="'+esc(entry)+'" target="_blank" rel="noopener noreferrer">'+
  (entry===ROOT?'Rechercher sur JustWatch France ↗':'Ouvrir la fiche JustWatch France ↗')+'</a>';
 const country='<div class="sc53-broadcast"><strong>🇫🇷 Diffusion en France</strong>'+
  (origin.length?'<p>Chaîne ou service français d’origine : '+origin.map(esc).join(', ')+'.</p>':
  '<p>Aucune chaîne de diffusion française renseignée dans TVmaze. Les diffuseurs étrangers sont volontairement masqués.</p>')+'</div>';
 if(!data||!data.offers.length){
  return '<section class="sc53-fr-watch" aria-label="Streaming et diffusion France"><div class="sc53-watch-title"><b>Où regarder en France ?</b><small>🇫🇷 Offres françaises uniquement</small></div>'+
   '<p class="sc53-watch-note">Aucune disponibilité française vérifiée n’est encore enregistrée pour cette série. Cela ne signifie pas qu’elle est indisponible.</p>'+
   '<div class="sc53-watch-actions">'+direct+'</div>'+country+'</section>';
 }
 const types=[['flatrate','Avec abonnement'],['free','Gratuit'],['ads','Avec publicité'],['rent','Location'],['buy','Achat']];
 const blocks=types.map(([type,label])=>{
  const offers=data.offers.filter(p=>p.type===type);
  if(!offers.length)return '';
  return '<div class="sc53-offer-group"><strong>'+label+'</strong><div class="sc53-offers">'+offers.map(p=>
   '<span class="sc53-provider" title="'+esc(p.name)+'">'+
   (p.logo?'<img src="'+esc(p.logo)+'" alt="" loading="lazy">':'')+
   '<span>'+esc(p.name)+'</span></span>').join('')+'</div></div>';
 }).join('');
 const updated=new Date(data.checked_at).toLocaleDateString('fr-FR');
 const attribution='<p class="sc53-watch-attribution">Source : '+
  (data.source==='justwatch_fr_editorial'?'JustWatch France (relevé éditorial ponctuel)':'TMDB / JustWatch')+
  ' · dernière observation du '+esc(updated)+
  (data.historical?' · <b>relevé ancien : ces offres ne sont pas confirmées aujourd’hui</b>':
   data.stale?' · informations à revérifier':' · offres susceptibles de changer')+
  '. Les saisons peuvent avoir des disponibilités différentes. Aucun partenariat avec les plateformes.</p>';
 const link=data.url&&data.source!=='justwatch_fr_editorial'?
  '<a class="btn subtle" href="'+esc(data.url)+'" target="_blank" rel="noopener noreferrer">Vérifier sur TMDB France ↗</a>':'';
 return '<section class="sc53-fr-watch" aria-label="Streaming et diffusion France"><div class="sc53-watch-title"><b>Où regarder en France ?</b><small>🇫🇷 '+(data.source==='justwatch_fr_editorial'?'Relevé JustWatch France':'Source JustWatch via TMDB')+'</small></div>'+
  (data.historical?'<p class="sc53-watch-outdated">Offres précédemment recensées en France, à vérifier avant de souscrire.</p>':'')+
  blocks+'<div class="sc53-watch-actions">'+link+direct+'</div>'+attribution+country+'</section>';
}
export async function getFrenchOffersByShow(id){
 const key=asId(id);
 if(!key)return null;
 if(!cache.promise){
  const url=new URL('../data/watch-fr.json?v=5.5.0',import.meta.url);
  cache.promise=fetch(url,{headers:{Accept:'application/json'}}).then(async r=>{
   if(!r.ok)throw Error('Cache des offres FR non disponible');
   return r.json();
  }).catch(()=>({titles:{}}));
 }
 const data=await cache.promise;
 return data?.titles?.[key]||null;
}
export function justwatchFranceUrl(){return ROOT}
