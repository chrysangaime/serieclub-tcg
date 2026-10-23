/**
 * V1: serveur seul, Movie of the Night (v4) -> Supabase privé.
 * Ne JAMAIS envoyer la clé dans le navigateur, un log ou un fichier public.
 * Par défaut : 6 appels par jour, 180 par mois. Aucun coût automatique.
 */
import {fileURLToPath} from 'node:url';
const BASE='https://api.movieofthenight.com/v4';
const SERVICES=Object.freeze({
 netflix:['Netflix',['netflix.com']],prime:['Prime Video',['primevideo.com','amazon.fr']],
 disney:['Disney+',['disneyplus.com']],hbo:['HBO Max',['hbomax.com','max.com']],
 apple:['Apple TV',['tv.apple.com']],paramount:['Paramount+',['paramountplus.com']],
 mubi:['MUBI',['mubi.com']],crunchyroll:['Crunchyroll',['crunchyroll.com']],
 plutotv:['Pluto TV',['pluto.tv']]
});
const modes=Object.freeze({subscription:'flatrate',free:'free',buy:'buy',rent:'rent',addon:'addon'});
const safeLink=(url,id)=>{
 try{
  const u=new URL(String(url||'')),list=SERVICES[id]?.[1]||[];
  return u.protocol==='https:'&&!u.username&&!u.password&&list.some(host=>
   u.hostname===host||u.hostname.endsWith('.'+host))?u.href:null;
 }catch{return null}
};
export function normalizeMovieOfTheNight(show,expectedIMDb){
 if(show?.showType!=='series'||show.imdbId!==expectedIMDb||
  !/^tt\d{5,12}$/.test(expectedIMDb))return null;
 const fr=show.streamingOptions?.fr;
 if(!Array.isArray(fr))return null;
 const seen=new Set(),out=[];
 for(const item of fr){
  const id=String(item?.service?.id||'').toLowerCase(),type=modes[item?.type],link=safeLink(item?.link,id);
  if(!SERVICES[id]||!type||!link)continue;
  const key=id+':'+type;
  if(seen.has(key))continue;
  seen.add(key);
  out.push({id,type,name:SERVICES[id][0],url:link});
  if(out.length>=20)break;
 }
 return out;
}
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const today=()=>new Date().toISOString().slice(0,10),month=()=>today().slice(0,7);
async function jsonFetch(url,{method='GET',headers={},body}={}){
 const r=await fetch(url,{method,headers,body,signal:AbortSignal.timeout(19000)});
 if(!r.ok){const err=new Error('HTTP '+r.status+' from '+new URL(url).hostname);err.status=r.status;throw err}
 return r.status===204?null:await r.json();
}
export async function main(){
 const key=String(process.env.STREAMING_AVAILABILITY_API_KEY||'').trim();
 // Explicitly fail-closed; workflow success must not imply real API integration.
 if(!key){console.log('Streaming Availability API non configurée : aucun appel ni coût.');return}
 const supa=String(process.env.SUPABASE_URL||'');
 const role=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supa)||!role)
   throw new Error('Secrets Supabase indisponibles : aucune synchronisation');
 const maxDay=Math.max(1,Math.min(10,Number(process.env.DAILY_LIMIT)||6));
 const maxMonth=Math.max(1,Math.min(180,Number(process.env.MONTHLY_LIMIT)||180));
 const headers={apikey:role,Authorization:'Bearer '+role};
 async function get(table,params={}){
  const u=new URL(supa+'/rest/v1/'+table);
  for(const [k,v] of Object.entries(params))u.searchParams.set(k,String(v));
  return await jsonFetch(u.href,{headers});
 }
 async function write(table,row,onConflict){
  const u=new URL(supa+'/rest/v1/'+table);
  if(onConflict)u.searchParams.set('on_conflict',onConflict);
  return await jsonFetch(u.href,{method:'POST',headers:{...headers,
   'Content-Type':'application/json',
   Prefer:onConflict?'resolution=merge-duplicates,return=representation':'return=representation'},
   body:JSON.stringify(row)});
 }
 const usage=await get('fr_streaming_api_usage',{select:'id,request_day',
  request_month:'eq.'+month(),limit:1000});
 const used=(usage||[]).length,usedDay=(usage||[]).filter(row=>row.request_day===today()).length;
 const budget=Math.max(0,Math.min(maxDay-usedDay,maxMonth-used));
 if(!budget){console.log('Budget interne atteint : 0 nouvel appel fournisseur.');return}
 // Ne jamais lire ni publier email, pseudo ou identifiant de joueur.
 const owned=await get('player_cards',{select:'series_id',limit:1000});
 const ownedIds=new Set((owned||[]).map(row=>Number(row.series_id)));
 const series=[];
 for(let start=0;start<4000;start+=1000){
  const batch=await get('series',{select:'id,name,fr_verification_method',
   fr_verified:'eq.true',order:'id.asc',limit:1000,offset:start});
  series.push(...(batch||[]));
  if(!batch||batch.length<1000)break;
 }
 const old=[];
 for(let start=0;start<4000;start+=1000){
  const batch=await get('fr_streaming_cache',{select:'series_id,expires_at',
   order:'series_id.asc',limit:1000,offset:start});
  old.push(...(batch||[]));
  if(!batch||batch.length<1000)break;
 }
 const cache=new Map(old.map(row=>[Number(row.series_id),Date.parse(row.expires_at)]));
 const order=series.filter(x=>(cache.get(Number(x.id))||0)<Date.now())
  .sort((a,b)=>Number(ownedIds.has(Number(b.id)))-Number(ownedIds.has(Number(a.id)))||
   Number(b.fr_verification_method==='tmdb_fr_offer')-
   Number(a.fr_verification_method==='tmdb_fr_offer')||Number(a.id)-Number(b.id));
 let calls=0,matched=0,qualified=0,notFound=0,skipped=0;
 for(const s of order){
  if(calls>=budget)break;
  const id=Number(s.id);
  try{
   const tv=await jsonFetch('https://api.tvmaze.com/shows/'+id);
   const imdb=String(tv?.externals?.imdb||'');
   if(Number(tv?.id)!==id||!/^tt\d{5,12}$/.test(imdb)){skipped++;continue;}
   // Persist the reservation BEFORE calling provider to limit retry costs.
   const reserved=await write('fr_streaming_api_usage',{
    series_id:id,status:'reserved',request_day:today(),request_month:month()});
   const logId=reserved?.[0]?.id;
   calls++;
   let result,code='success',offers=[];
   try{
    const api=new URL(BASE+'/shows/'+imdb);
    api.searchParams.set('country','fr');
    api.searchParams.set('output_language','fr');
    result=await jsonFetch(api.href,{headers:{'X-API-Key':key}});
    offers=normalizeMovieOfTheNight(result,imdb);
    if(offers===null)throw new Error('Réponse incompatible ou identité IMDb différente');
   }catch(error){
    code=error.status===404?'not_found':'error';
    if(error.status===429||error.status===401||error.status===403){
     console.warn('Service indisponible / quota / autorisation : arrêt des appels.');
    }
   }
   if(logId){
    try{await jsonFetch(supa+'/rest/v1/fr_streaming_api_usage?id=eq.'+logId,{
      method:'PATCH',headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({status:code})
    })}catch{console.warn('Statut du compteur non confirmé.')}
   }
   if(code==='error'){console.warn('Échec du contrôle fournisseur pour une série : pas de preuve ajoutée.');break;}
   const stamp=new Date(),expiration=new Date(stamp.getTime()+(offers.length?7:14)*86400000);
   await write('fr_streaming_cache',{
    series_id:id,country:'FR',imdb_id:imdb,source:'movieofthenight',
    checked_at:stamp.toISOString(),expires_at:expiration.toISOString(),
    offers,updated_at:stamp.toISOString()
   },'series_id');
   if(offers.length){
    matched++;
    if(s.fr_verification_method==='tmdb_fr_offer'){
     const evidence=offers.find(o=>['flatrate','free'].includes(o.type))||offers[0];
     await jsonFetch(supa+'/rest/v1/series?id=eq.'+id+
      '&fr_verification_method=eq.tmdb_fr_offer',{
      method:'PATCH',headers:{...headers,'Content-Type':'application/json',Prefer:'return=minimal'},
      body:JSON.stringify({fr_verified:true,fr_verification_method:'streaming_availability_fr',
       fr_evidence_url:evidence.url,fr_verified_at:stamp.toISOString()})
     });
     qualified++;
    }
   }else notFound++;
   console.log('Série '+id+' : '+(offers.length?'offres FR vérifiées':'pas d’offre FR'));
  }catch(error){skipped++;console.warn('Contrôle incomplet pour une série : '+String(error.message).slice(0,110));}
  await pause(550);
 }
 console.log('Bilan budget : '+calls+' appels ; '+matched+' offres FR ; '+qualified+
   ' anciennes preuves TMDB remplacées ; '+notFound+' sans offre ; '+skipped+' sans ID/réponse.');
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)
 main().catch(e=>{console.error(e.message);process.exitCode=1});
