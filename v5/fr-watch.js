/**
 * V1 — Disponibilités en France à partir d'un relevé privé Movie of the Night.
 * Aucun appel fournisseur, aucune clé/API TMDB et aucune reproduction d'image.
 * Les données expirées / hors FR sont invisibles ; repli JustWatch France.
 */
const ROOT='https://www.justwatch.com/fr';
const GATEWAY='https://anjfidksqbqlaggttdop.supabase.co/functions/v1/fr-streaming';
export const platformLogoUsageApproved=false;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const cache=new Map();
const providers=Object.freeze({
 netflix:['Netflix',['netflix.com']],prime:['Prime Video',['primevideo.com','amazon.fr']],
 disney:['Disney+',['disneyplus.com']],hbo:['HBO Max',['hbomax.com','max.com']],
 apple:['Apple TV',['tv.apple.com']],paramount:['Paramount+',['paramountplus.com']],
 mubi:['MUBI',['mubi.com']],crunchyroll:['Crunchyroll',['crunchyroll.com']],
 plutotv:['Pluto TV',['pluto.tv']]
});
const names=Object.freeze(Object.fromEntries(Object.entries(providers).map(([id,v])=>[id,v[0]])));
export function getFrenchOriginChannel(show={}){
 const channels=[show.network,show.webChannel];
 return [...new Set(channels.filter(c=>c?.country?.code==='FR'&&typeof c.name==='string')
  .map(c=>c.name.trim()).filter(Boolean))];
}
function safeOfferURL(value,id){
 try{
  const url=new URL(String(value||''));
  const hosts=providers[id]?.[1]||[];
  if(url.protocol!=='https:'||url.username||url.password||!hosts.some(h=>
   url.hostname===h||url.hostname.endsWith('.'+h)))return null;
  return url.href;
 }catch{return null}
}
export function normalizeFranceOffers(record){
 if(record?.source!=='movieofthenight'||record.country!=='FR'||!Array.isArray(record.offers))return null;
 const time=Date.parse(record.checked_at),expiry=Date.parse(record.expires_at);
 if(!Number.isFinite(time)||!Number.isFinite(expiry)||time>Date.now()+3600000||
    expiry<=Date.now()||Date.now()-time>21*86400000)return null;
 const seen=new Set(),offers=[];
 for(const o of record.offers.slice(0,35)){
  const id=String(o?.id||'').toLowerCase(),type=String(o?.type||'');
  if(!providers[id]||!['flatrate','free','buy','rent','addon'].includes(type))continue;
  const url=safeOfferURL(o.url,id),key=id+'-'+type;
  if(!url||seen.has(key))continue;
  seen.add(key);
  offers.push({id,name:names[id],type,url,logo:null});
 }
 return offers.length?{country:'FR',source:'movieofthenight',
  checked_at:record.checked_at,offers}:null;
}
/* Une seule requête par série et par visite, jamais de clé fournisseur. */
export async function getFrenchOffersByShow(tvmazeId){
 const id=Number(tvmazeId);
 if(!Number.isSafeInteger(id)||id<1||id>99999999)return null;
 if(!cache.has(id)){
  const u=new URL(GATEWAY);
  u.searchParams.set('series_id',String(id));
  const p=fetch(u,{headers:{Accept:'application/json'}})
   .then(async r=>r.ok?await r.json():null)
   .then(r=>normalizeFranceOffers(r)?r:null)
   .catch(()=>null);
  cache.set(id,p);
  if(cache.size>120)cache.delete(cache.keys().next().value);
 }
 return await cache.get(id);
}
const serviceLink=o=>
 '<a class="sc56-provider sc56-brand-'+esc(o.id)+'" href="'+esc(o.url)+'"'+
 ' target="_blank" rel="noopener noreferrer" title="Voir sur '+esc(o.name)+'">'+
 '<span>'+esc(o.name)+'</span><span class="sc56-provider-arrow" aria-hidden="true">↗</span></a>';
const offerList=arr=>'<span class="sc56-providers">'+arr.map(serviceLink).join('')+'</span>';
export function renderFranceAvailability(record=null,show={}){
 const data=normalizeFranceOffers(record),all=data?.offers||[];
 const included=all.filter(o=>o.type==='flatrate'||o.type==='free');
 const purchase=all.filter(o=>o.type==='buy'||o.type==='rent');
 const addons=all.filter(o=>o.type==='addon');
 const origin=getFrenchOriginChannel(show);
 const tvmazeVerified=show.fr_verification_method==='tvmaze_fr_origin'||origin.length>0;
 const announced=tvmazeVerified&&origin.length>0&&
  /^\d{4}-\d{2}-\d{2}$/.test(show.premiered||'')&&
  Date.parse(show.premiered+'T00:00:00Z')>Date.now();
 const originNote=origin.length
  ?'<span class="sc56-origin">'+(announced?'Chaîne française annoncée : ':'Diffuseur d’origine en France : ')+
   origin.map(esc).join(', ')+'</span>':'';
 let label='Où regarder en France ?',main='<span class="sc56-no-offers">Offres de streaming non confirmées</span>';
 if(included.length){label='Disponible sur';main=offerList(included);}
 else if(purchase.length){label='Disponible à l’achat ou à la location sur';main=offerList(purchase);}
 else if(addons.length){label='Disponible avec une option supplémentaire sur';main=offerList(addons);}
 const secondaries=(included.length&&purchase.length
  ?'<div class="sc56-secondary"><span>Achat / location :</span>'+offerList(purchase)+'</div>':'')+
  ((included.length||purchase.length)&&addons.length
   ?'<div class="sc56-secondary"><span>Avec supplément :</span>'+offerList(addons)+'</div>':'');
 const proof=data?'France · relevé du '+new Date(data.checked_at).toLocaleDateString('fr-FR')+
  ' · Source : Streaming Availability API par Movie of the Night':
  tvmazeVerified?'Origine française documentée par TVmaze · offres actuelles non vérifiées':
  'Les offres actuelles ne sont pas renseignées par le jeu';
 return '<section class="sc56-where" aria-label="Consulter les offres en France">'+
  '<div class="sc56-main"><strong class="sc56-label">'+label+'</strong>'+main+'</div>'+
  secondaries+'<div class="sc56-foot"><span>'+esc(proof)+'</span>'+
  '<a href="'+ROOT+'" target="_blank" rel="noopener noreferrer">Vérifier sur JustWatch France ↗</a>'+
  originNote+'</div></section>';
}
export function justwatchFranceUrl(){return ROOT;}
