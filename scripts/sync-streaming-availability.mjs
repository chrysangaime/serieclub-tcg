/**
 * Import Streaming Availability API v4 -> cache FR privé Supabase.
 * Aucune clé, donnée d'acteur, affiche ou métadonnée TMDB n'est publiée.
 * Exécution manuelle, avec quota; les cartes des joueurs restent intactes.
 */
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const API='https://api.movieofthenight.com/v4';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const allowed={
 netflix:['netflix.com'],prime:['primevideo.com','amazon.fr'],
 disney:['disneyplus.com'],hbo:['max.com','hbomax.com'],
 apple:['tv.apple.com'],paramount:['paramountplus.com'],
 mubi:['mubi.com'],crunchyroll:['crunchyroll.com'],plutotv:['pluto.tv']
};
const kinds={subscription:'flatrate',free:'free',buy:'buy',rent:'rent',addon:'addon'};
export function sanitizedOffers(apiShow){
 const source=apiShow?.streamingOptions?.fr;
 if(!Array.isArray(source))return [];
 const result=[],seen=new Set();
 for(const item of source){
  const id=String(item?.service?.id||'').toLowerCase(),type=kinds[item?.type];
  if(!Object.hasOwn(allowed,id)||!type)continue;
  try{
   const u=new URL(String(item.link||''));
   if(u.protocol!=='https:'||u.username||u.password||
    !allowed[id].some(host=>u.hostname===host||u.hostname.endsWith('.'+host)))continue;
   const key=id+'|'+type;
   if(seen.has(key))continue;
   seen.add(key);result.push({id,name:id,type,url:u.href});
  }catch{}
  if(result.length===20)break;
 }
 return result;
}
export function tvmazeImdb(value){
 const id=String(value||'');
 return /^tt[0-9]{7,10}$/.test(id)?id:null;
}
async function readJSON(url,headers={}){
 const res=await fetch(url,{headers,signal:AbortSignal.timeout(13000)});
 if(res.status===404)return null;
 if(!res.ok)throw Error(new URL(url).hostname+' HTTP '+res.status);
 return await res.json();
}
export async function main(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const token=process.env.STREAMING_AVAILABILITY_API_KEY;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base||'')||!key)
  throw Error('Clés Supabase serveur absentes');
 if(!token)throw Error('STREAMING_AVAILABILITY_API_KEY non configurée : créer un compte gratuit chez Movie of the Night');
 const max=Math.max(1,Math.min(200,Number(process.env.MAX_TITLES)||30));
 const offset=Math.max(0,Math.floor(Number(process.env.START_AT)||0));
 const headers={apikey:key,Authorization:'Bearer '+key};
 const q=new URL(base+'/rest/v1/series');
 q.searchParams.set('select','id,name');
 q.searchParams.set('fr_verified','eq.true');
 q.searchParams.set('rarity_source','neq.pending');
 q.searchParams.set('order','id.asc');
 q.searchParams.set('limit',String(max));
 q.searchParams.set('offset',String(offset));
 const rows=await readJSON(q,headers);
 let hits=0,misses=0,failed=0;
 for(const row of rows||[]){
  try{
   const show=await readJSON('https://api.tvmaze.com/shows/'+Number(row.id));
   const imdb=tvmazeImdb(show?.externals?.imdb);
   if(!imdb){misses++;continue}
   const url=new URL(API+'/shows/'+imdb);
   url.searchParams.set('country','fr');
   const response=await readJSON(url,{'X-API-Key':token});
   if(response?.showType!=='series'){misses++;continue}
   const offers=sanitizedOffers(response);
   const now=new Date(),expire=new Date(now.getTime()+24*3600000);
   const body={
    series_id:Number(row.id),country:'FR',imdb_id:imdb,
    source:'movieofthenight',checked_at:now.toISOString(),
    expires_at:expire.toISOString(),offers,
    updated_at:now.toISOString()
   };
   const target=new URL(base+'/rest/v1/fr_streaming_cache');
   target.searchParams.set('on_conflict','series_id');
   const r=await fetch(target,{method:'POST',headers:{...headers,
     'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify(body),signal:AbortSignal.timeout(13000)});
   if(!r.ok)throw Error('Enregistrement Supabase HTTP '+r.status);
   if(offers.length)hits++;else misses++;
  }catch(e){failed++;console.error('Échec série '+Number(row.id)+' : '+String(e.message).slice(0,100));}
  await pause(180);
 }
 const report='Synchronisation France Movie of the Night : '+(rows||[]).length+
   ' examinées, '+hits+' avec offres, '+misses+' sans correspondance/offre, '+failed+
   ' erreurs, aucune donnée joueur modifiée.\n';
 console.log(report);
 if(process.env.GITHUB_STEP_SUMMARY){
  const fs=await import('node:fs/promises');
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,report);
 }
 if(failed>Math.max(4,Math.ceil((rows||[]).length*0.25)))throw Error('Trop d’échecs, vérifier le quota API');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
 main().catch(e=>{console.error(e.message);process.exitCode=1});
