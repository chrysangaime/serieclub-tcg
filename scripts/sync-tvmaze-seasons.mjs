/**
 * V1 · catalogue de SAISONS TVmaze, indépendant des photos / données TMDB.
 * N'affecte pas les utilisateurs. Découpage de travail en lots bornés pour CI.
 */
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function cleanTVmazeSeason(s,seriesId){
 const id=Number(s?.id),number=Number(s?.number),parent=Number(seriesId);
 if(!Number.isSafeInteger(parent)||parent<1||!Number.isSafeInteger(id)||id<1||
   !Number.isInteger(number)||number<1||number>100)return null;
 const asDate=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:null;
 const art=(s?.image?.medium||s?.image?.original);
 const poster=typeof art==='string'&&
  /^https:\/\/static\.tvmaze\.com\/uploads\/images\/[a-z_]+\/[0-9]+\/[0-9]+\.(?:jpg|jpeg|png|webp)(?:\?.*)?$/i.test(art)?art:null;
 const cleanText=v=>typeof v==='string'?v.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,1800):null;
 return {series_id:parent,season_number:number,tvmaze_season_id:id,
  season_name:cleanText(s?.name)?.slice(0,120)||null,
  premiered:asDate(s?.premiereDate),ended:asDate(s?.endDate),
  episode_count:Number.isInteger(s?.episodeOrder)&&s.episodeOrder>=0?s.episodeOrder:null,
  image_url:poster,summary:cleanText(s?.summary),
  verified_source:'tvmaze',updated_at:new Date().toISOString()};
}
async function getJSON(url,headers={}){
 for(let i=0;i<4;i++){
  let r;
  try{r=await fetch(url,{headers,signal:AbortSignal.timeout(19000)});}
  catch(e){if(i===3)throw e;await new Promise(ok=>setTimeout(ok,(i+1)*1800));continue}
  if(r.status===404)return null;
  if((r.status===429||r.status>=500)&&i<3){
   await new Promise(ok=>setTimeout(ok,(i+1)*3000));continue;
  }
  if(!r.ok)throw Error(new URL(url).hostname+' HTTP '+r.status);
  return await r.json();
 }
}
export async function main(){
 const base=process.env.SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base||'')||!secret)
  throw Error('Clés Supabase serveur absentes');
 const max=Math.min(600,Math.max(1,Number(process.env.MAX_SERIES)||450));
 const offset=Math.max(0,Math.floor(Number(process.env.START_AT)||0));
 const auth={apikey:secret,Authorization:'Bearer '+secret};
 const rows=[];
 for(let page=offset;page<offset+max;page+=500){
  const u=new URL(base+'/rest/v1/series');
  u.searchParams.set('select','id,name');
  u.searchParams.set('fr_verified','eq.true');
  u.searchParams.set('rarity_source','neq.pending');
  u.searchParams.set('order','id.asc');
  u.searchParams.set('offset',String(page));
  u.searchParams.set('limit',String(Math.min(500,offset+max-page)));
  const items=await getJSON(u,auth);
  if(!Array.isArray(items))throw Error('Résultat Supabase inattendu');
  rows.push(...items);
  if(items.length<Math.min(500,offset+max-page))break;
 }
 let inserted=0,withImage=0,missing=0,errors=0;
 for(const item of rows){
  try{
   const raw=await getJSON('https://api.tvmaze.com/shows/'+Number(item.id)+'/seasons');
   if(!Array.isArray(raw)||!raw.length){missing++;continue}
   const seasons=raw.map(s=>cleanTVmazeSeason(s,item.id)).filter(Boolean);
   if(!seasons.length){missing++;continue}
   const u=new URL(base+'/rest/v1/series_seasons');
   u.searchParams.set('on_conflict','series_id,season_number');
   const response=await fetch(u,{method:'POST',headers:{...auth,
    'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
    body:JSON.stringify(seasons),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Upsert HTTP '+response.status);
   inserted+=seasons.length;withImage+=seasons.filter(s=>Boolean(s.image_url)).length;
  }catch(e){errors++;console.error('Erreur TVmaze saison '+Number(item.id)+': '+String(e.message).slice(0,70));}
  // Per-IP limit TVmaze 20 calls / 10 s. Never saturate the free endpoint.
  await new Promise(resolve=>setTimeout(resolve,760));
 }
 const report='Lot '+offset+' : '+rows.length+' séries TVmaze, '+inserted+
  ' saisons, '+withImage+' affiches de saison, '+missing+' sans saison, '+errors+
  ' erreurs. Aucune carte modifiée.\n';
 console.log(report);
 if(process.env.GITHUB_STEP_SUMMARY){
  const fs=await import('node:fs/promises');
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,report);
 }
 if(errors>Math.max(15,Math.ceil(rows.length*.25)))throw Error('Échec réseau important');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
 main().catch(err=>{console.error(err.message);process.exitCode=1});
