/**
 * SérieClub — disponibilité légale en France, au premier plan de la fiche.
 * Source : cache public TMDB / JustWatch ou relevé éditorial daté JustWatch FR.
 * Ne suppose jamais une offre sur la seule base de la diffusion historique.
 */
const ROOT='https://www.justwatch.com/fr';
const cache={promise:null};
const ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>ESC[c]);
const asId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?String(v):null;
const ALLOWED=new Set(['flatrate','free','ads','rent','buy']);

export function getFrenchOriginChannel(show={}){
 const channels=[show.network,show.webChannel];
 const matching=channels.filter(ch=>ch?.country?.code==='FR'&&typeof ch?.name==='string');
 return [...new Set(matching.map(ch=>ch.name.trim()).filter(Boolean))];
}
function safeTMDBLogo(path){
 return typeof path==='string'&&/^\/[A-Za-z0-9_-]+\.(?:png|jpg|webp)$/i.test(path)
  ?'https://image.tmdb.org/t/p/w92'+path:null;
}
function safeWatchLink(value){
 try{
  const url=new URL(String(value||''));
  if(url.protocol!=='https:')return null;
  if(['www.themoviedb.org','themoviedb.org'].includes(url.hostname)
   && /^\/tv\/\d+\/watch\/?$/.test(url.pathname))return url.href;
  if(url.hostname==='www.justwatch.com'&&
   /^\/fr\/serie\/[a-z0-9-]+(?:\/saison-\d+)?\/?$/.test(url.pathname))return url.href;
 }catch{/* Drop unexpected links. */}
 return null;
}
function safeProviderLink(raw,name){
 try{
  const u=new URL(String(raw||''));
  if(u.protocol!=='https:')return null;
  if(name==='Disney+'&&u.hostname==='www.disneyplus.com'
      &&/^\/fr-fr\/browse\/entity-[a-f0-9-]{30,50}\/?$/.test(u.pathname))return u.href;
  if(name==='Netflix'&&['www.netflix.com','netflix.com'].includes(u.hostname)
      &&/^\/fr\/title\/\d+\/?$/.test(u.pathname))return u.href;
  if(name==='Amazon Prime Video'&&u.hostname==='www.primevideo.com'
      &&/^\/-\/fr\/detail\/[a-zA-Z0-9]+\/?$/.test(u.pathname))return u.href;
 }catch{/* Whitelisted providers only. */}
 return null;
}
function slug(name){
 const n=String(name||'').toLowerCase();
 if(n.includes('disney'))return 'disney';
 if(n.includes('netflix'))return 'netflix';
 if(n.includes('prime'))return 'prime';
 if(n.includes('apple'))return 'apple';
 if(n.includes('amazon'))return 'amazon';
 if(n.includes('max'))return 'max';
 if(n.includes('canal'))return 'canal';
 if(n.includes('m6'))return 'm6';
 return 'other';
}
export function normalizeFranceOffers(record){
 if(!record||record.country!=='FR'||!Array.isArray(record.offers))return null;
 const timestamp=Date.parse(record.checked_at);
 if(!Number.isFinite(timestamp)||timestamp>Date.now()+86400000)return null;
 const age=Math.max(0,Date.now()-timestamp);
 const editorial=record.source==='justwatch_fr_editorial';
 // Historic offers remain credited to JustWatch, but MUST carry an age warning.
 if(age>45*86400000&&!editorial)return null;
 const offers=record.offers.filter(o=>ALLOWED.has(o.type)&&
    typeof o.name==='string'&&o.name.length>0&&o.name.length<=65)
  .slice(0,30).map(o=>({
    type:o.type,name:o.name,logo:safeTMDBLogo(o.logo_path),
    id:Number(o.provider_id)||0,url:safeProviderLink(o.provider_url,o.name)
  }));
 return {
  offers,checked_at:record.checked_at,stale:age>14*86400000,
  historical:age>45*86400000,source:editorial?'justwatch_fr_editorial':'tmdb',
  url:safeWatchLink(record.url),tmdb_id:Number(record.tmdb_id)||null
 };
}
function offersList(offers,link,modifier=''){
 return '<span class="sc56-providers">'+offers.map(p=>{
  const target=p.url||link||ROOT;
  const extra=modifier==='mode'?(p.type==='ads'?' · avec publicité':p.type==='free'?' · gratuit':''):'';
  const title=p.url?'Ouvrir '+p.name+' directement':'Vérifier '+p.name+' sur JustWatch France';
  return '<a class="sc56-provider sc56-brand-'+slug(p.name)+'" href="'+esc(target)+'" '+
   'target="_blank" rel="noopener noreferrer" title="'+esc(title)+'">'+
   (p.logo?'<img src="'+esc(p.logo)+'" loading="lazy" alt="">':'')+
   '<span>'+esc(p.name)+extra+'</span><span class="sc56-provider-arrow" aria-hidden="true">↗</span></a>';
 }).join('')+'</span>';
}
/** Compact, fully sourced service badges, suitable directly under the rarity. */
export function renderFranceAvailability(record=null,show={}){
 const data=normalizeFranceOffers(record);
 const origin=getFrenchOriginChannel(show);
 const link=data?.url||ROOT;
 const subscription=data?.offers.filter(o=>['flatrate','free','ads'].includes(o.type))||[];
 const buying=data?.offers.filter(o=>o.type==='buy')||[];
 const renting=data?.offers.filter(o=>o.type==='rent')||[];
 const date=data?new Date(data.checked_at).toLocaleDateString('fr-FR'):'';
 const proof=show?.fr_verified===true;
 const announced=proof&&origin.length>0&&/^\d{4}-\d{2}-\d{2}$/.test(show?.premiered||'')&&Date.parse(show.premiered+'T00:00:00Z')>Date.now();
 let intro,content;
 if(subscription.length){
  intro='Disponible sur';
  content=offersList(subscription,link,'mode');
 }else if(buying.length||renting.length){
  intro='Disponible à l’achat ou à la location sur';
  content=offersList([...buying,...renting],link);
 }else{
  intro=announced?'Diffusion annoncée en France':'Où regarder en France ?';
  content='<span class="sc56-no-offers">Plateformes françaises non encore renseignées'+
    (proof?(announced?' · diffusion française annoncée':' · diffusion française attestée'):'')+'</span>';
 }
 const secondary=subscription.length&&(
   buying.length||renting.length)
  ?'<div class="sc56-secondary">'+
    (buying.length?'<span>Achat :</span>'+offersList(buying,link):'')+
    (renting.length?'<span>Location :</span>'+offersList(renting,link):'')+
    '</div>':'';
 const editorial=data?.source==='justwatch_fr_editorial';
 const warning=data?.historical?' · relevé ancien : offres pas confirmées aujourd’hui, à vérifier avant de souscrire':
  data?.stale?' · offres à revérifier':'';
 const source=data?'France · '+(editorial?'JustWatch':'TMDB / JustWatch')+
  ' · relevé du '+date+warning:
  (proof?(announced?'France · diffusion annoncée, plateformes à venir':'France · diffusion attestée, plateformes à vérifier'):'France · diffusion à vérifier');
 const direct=data?.url&&editorial?'Ouvrir la fiche JustWatch France ↗':
  data?.url?'Vérifier sur TMDB France ↗':'Chercher sur JustWatch France ↗';
 const note=origin.length?'<span class="sc56-origin">'+(announced?'Chaîne prévue en France : ':'Diffusion en France : ')+origin.map(esc).join(', ')+'</span>':'';
 const evidenceUrl=safeWatchLink(show.fr_evidence_url)||
  safeProviderLink(show.fr_evidence_url,'Disney+')||
  safeProviderLink(show.fr_evidence_url,'Netflix');
 const evidence=!data?.offers.length&&proof&&evidenceUrl
  ?'<a href="'+esc(evidenceUrl)+
    '" target="_blank" rel="noopener noreferrer">Source de diffusion française ↗</a>':'';
 return '<section class="sc56-where" aria-label="Disponibilité en streaming en France">'+
  '<div class="sc56-main"><strong class="sc56-label">'+intro+'</strong>'+content+'</div>'+
  secondary+
  '<div class="sc56-foot"><span>'+esc(source)+'</span>'+
   '<a href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">'+direct+'</a>'+
   evidence+note+'</div>'+
  '</section>';
}
export async function getFrenchOffersByShow(id){
 const key=asId(id);
 if(!key)return null;
 if(!cache.promise){
  const url=new URL('../data/watch-fr.json?v=5.6.1',import.meta.url);
  cache.promise=fetch(url,{headers:{Accept:'application/json'}})
   .then(async r=>{if(!r.ok)throw Error('Offres FR indisponibles');return r.json()})
   .catch(()=>({titles:{}}));
 }
 const data=await cache.promise;
 return data?.titles?.[key]||null;
}
export function justwatchFranceUrl(){return ROOT}
