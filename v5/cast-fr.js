/**
 * Distribution française : cache public de crédits TMDB certifiés côté serveur.
 * Aucune requête TMDB authentifiée n'est envoyée par le navigateur.
 */
const castCache={promise:null};
const validId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?String(v):null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const cleanName=v=>typeof v==='string'?v.trim().slice(0,100):'';
export function normalizePublicCast(cast){
 if(!Array.isArray(cast))return [];
 const seen=new Set();
 return cast.filter(x=>{
  const id=validId(x?.id),name=cleanName(x?.name);
  if(!id||!name||seen.has(id))return false;
  seen.add(id);return true;
 }).slice(0,24).map(p=>({
  id:Number(p.id),name:cleanName(p.name),
  character:cleanName(p.character),
  image:/^\/[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp)$/.test(p.profile_path||'')
   ?'https://image.tmdb.org/t/p/w185'+p.profile_path:null
 }));
}
export function castFallbackHTML(record){
 const people=normalizePublicCast(record?.cast);
 return people.map(p=>
  '<a class="sc5-cast-row" target="_blank" rel="noopener noreferrer" '+
  'href="https://www.themoviedb.org/person/'+p.id+'" aria-label="Découvrir '+esc(p.name)+'">'+
  (p.image?'<img class="sc5-cast-thumb" src="'+esc(p.image)+'" loading="lazy" alt="Portrait de '+esc(p.name)+'">':
    '<span class="sc5-photo-fallback sc5-cast-thumb" aria-hidden="true">✧</span>')+
  '<b>'+esc(p.name)+'</b>'+
  (p.character?'<small>'+esc(p.character)+'</small>':'')+
  '<span class="sc5-row-arrow" aria-hidden="true">↗</span></a>'
 ).join('');
}
export async function getFrenchCastByShow(id){
 const key=validId(id);if(!key)return null;
 if(!castCache.promise){
  const url=new URL('../data/cast-fr.json',import.meta.url);
  url.searchParams.set('day',new Date().toISOString().slice(0,10));
  castCache.promise=fetch(url,{headers:{Accept:'application/json'}})
   .then(async r=>{if(!r.ok)throw Error('Cache indisponible');return r.json()})
   .catch(()=>({shows:{}}));
 }
 const result=await castCache.promise;
 const record=result?.shows?.[key];
 return record&&Array.isArray(record.cast)?record:null;
}
