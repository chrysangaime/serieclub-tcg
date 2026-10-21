/**
 * Synchronisation serveur des interprètes TMDB pour les séries vérifiées en France.
 * Aucun jeton dans le navigateur ; uniquement le nom, le rôle et le portrait
 * public des artistes, mis en cache dans le dépôt après validation.
 */
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {tmdbRequest} from './tmdb-auth.mjs';

const SOURCE='data/watch-fr.json';
const OUTPUT='data/cast-fr.json';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const n=v=>Number.isSafeInteger(Number(v))&&Number(v)>0?Number(v):null;
const max=(v,fallback)=>Math.min(250,Math.max(1,Number(v)||fallback));

/** Les rôles TMDB sont multiples : préserver seulement un rôle clair par acteur. */
export function normalizeCredits(response={}){
 const seen=new Set(),people=[];
 const cast=Array.isArray(response.cast)?response.cast:[];
 for(const person of cast){
  const id=n(person?.id);
  const name=typeof person?.name==='string'?person.name.trim().slice(0,100):'';
  if(!id||!name||seen.has(id))continue;
  seen.add(id);
  const character=person.roles?.map(x=>x?.character).find(v=>typeof v==='string'&&v.trim())||
    person.character||'';
  const photo=person.profile_path;
  people.push({id,name,character:String(character).trim().slice(0,100),
   profile_path:/^\/[a-zA-Z0-9_-]+\.(?:png|jpe?g|webp)$/.test(photo||'')?photo:null,
   episodes:Number.isFinite(person.total_episode_count)?person.total_episode_count:0});
 }
 return people.sort((a,b)=>b.episodes-a.episodes).slice(0,20)
  .map(({episodes,...person})=>person);
}

async function read(path,fallback){return JSON.parse(await fs.readFile(path,'utf8').catch(()=>fallback))}
async function credits(tmdbID,token){
 const auth=tmdbRequest('/tv/'+tmdbID+'/aggregate_credits',token);
 for(let tries=0;tries<3;tries++){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
  try{
   const r=await fetch(auth.url,{headers:{Accept:'application/json',...auth.headers},signal:abort.signal});
   if(r.ok)return normalizeCredits(await r.json());
   if(r.status===404)return null;
   if(![429,500,502,503,504].includes(r.status))throw Error('TMDB '+r.status);
  }catch(e){if(/^TMDB 4/.test(e.message))throw e}
  finally{clearTimeout(timer)}
  await pause(1100*(tries+1));
 }
 throw Error('TMDB indisponible après plusieurs tentatives');
}

export async function run(){
 const token=process.env.TMDB_READ_ACCESS_TOKEN;
 if(!token)throw Error('TMDB_READ_ACCESS_TOKEN manquant');
 const watch=await read(SOURCE,'{"titles":{}}');
 if(watch.region!=='FR'||!watch.titles)throw Error('Catalogue FR manquant');
 const previous=await read(OUTPUT,'{"schema":1,"shows":{}}');
 const archive=previous.shows||{};
 const now=new Date().toISOString(),cutoff=Date.now()-28*86400000;
 const entries=Object.entries(watch.titles)
  .filter(([tvmazeID,r])=>n(tvmazeID)&&n(r?.tmdb_id)&&r.country==='FR');
 const priority=new Set(['2993']); // Stranger Things : fiche très consultée
 const candidates=entries.filter(([id,r])=>
   !archive[id]||archive[id].tmdb_id!==r.tmdb_id||
   Date.parse(archive[id].checked_at||'')<cutoff);
 candidates.sort((a,b)=>Number(priority.has(b[0]))-Number(priority.has(a[0])) ||
  Number(a[0])-Number(b[0]));
 const budget=max(process.env.MAX_CAST_TITLES,90);
 let updated=0,failed=0;
 for(const [id,item] of candidates.slice(0,budget)){
  try{
   const cast=await credits(item.tmdb_id,token);
   if(cast===null)continue;
   archive[id]={tmdb_id:item.tmdb_id,checked_at:now,cast};
   updated++;
  }catch(error){failed++;console.warn('Distribution',id,':',error.message)}
  await pause(250);
 }
 if(updated||!previous.shows){
  await fs.writeFile(OUTPUT,JSON.stringify({
   schema:1,region:'FR',source:'TMDB',updated_at:now,shows:archive
  })+'\n');
 }
 console.log('Casting France :',updated,'fiches actualisées,',failed,
  'échecs,',Object.keys(archive).length,'séries en cache,',
  Math.max(0,candidates.length-Math.min(budget,candidates.length)),'à traiter.');
 if(failed>=budget&&updated===0)throw Error('Impossible de joindre TMDB pour le casting.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
 run().catch(e=>{console.error(e.message);process.exitCode=1});
