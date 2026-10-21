/**
 * Synchronisation JustWatch France via l'API officielle TMDB, serveur uniquement.
 * Requires TMDB_READ_ACCESS_TOKEN and SUPABASE_SERVICE_ROLE_KEY as Actions secrets.
 * No token, credentials or personal data are written into data/watch-fr.json.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const STORE='data/watch-fr.json';
const BASE='https://api.themoviedb.org/3';
const TTL=14*86400000;
const MAX=Number(process.env.MAX_TITLES)||120;
const TIMEOUT=12000;
const normalize=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const year=v=>Number(String(v||'').slice(0,4))||null;
const TYPE_KEYS=['flatrate','free','ads','rent','buy'];
function cleanLogo(value){
 return /^\/[A-Za-z0-9_-]+\.(?:png|jpg|webp)$/i.test(value||'')?value:null;
}
export function matchTVShow(show,matches=[]){
 const expected=year(show.premiered),label=normalize(show.name);
 if(!label||!expected)return null;
 const best=(matches||[]).map(x=>{
  const orig=normalize(x.original_name),local=normalize(x.name),yr=year(x.first_air_date);
  if(!yr||Math.abs(yr-expected)>1)return null;
  const sameName=orig===label||local===label;
  if(!sameName)return null;
  const score=(yr===expected?100:10)+(orig===label?5:0)+(Number(x.popularity)||0)/10000;
  return {row:x,score};
 }).filter(Boolean).sort((a,b)=>b.score-a.score);
 // Two different series with essentially identical identity should not be guessed.
 if(best.length>1&&Math.abs(best[0].score-best[1].score)<.25&&best[0].row.id!==best[1].row.id)return null;
 return best[0]?.row||null;
}
export function normalizeFRResult(show,matched,region,checked_at){
 if(!matched||!region)return null;
 const offers=[];
 for(const type of TYPE_KEYS){
  for(const p of Array.isArray(region[type])?region[type]:[]){
   if(!Number.isSafeInteger(p.provider_id)||!p.provider_name)continue;
   offers.push({type,provider_id:p.provider_id,
    name:String(p.provider_name).slice(0,65),logo_path:cleanLogo(p.logo_path)});
  }
 }
 let link=null;
 try{
  const url=new URL(region.link||'');
  if(url.protocol==='https:'&&['www.themoviedb.org','themoviedb.org'].includes(url.hostname))link=url.href;
 }catch{}
 return {country:'FR',tmdb_id:matched.id,checked_at,url:link,offers:offers.slice(0,30)};
}
async function json(url,headers={}){
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),TIMEOUT);
 try{
  const r=await fetch(url,{headers:{Accept:'application/json',...headers},signal:abort.signal});
  if(!r.ok)throw Error('HTTP '+r.status+' ('+new URL(url).hostname+')');
  return await r.json();
 }finally{clearTimeout(timer)}
}
async function tmdb(endpoint,token){return json(BASE+endpoint,{Authorization:'Bearer '+token})}
export async function fetchFRShow(show,token,checked_at){
 const query=new URLSearchParams({query:show.name,language:'fr-FR',include_adult:'false'});
 const search=await tmdb('/search/tv?'+query,token);
 const matched=matchTVShow(show,search.results);
 if(!matched)return null;
 const byRegion=await tmdb('/tv/'+matched.id+'/watch/providers',token);
 const france=byRegion?.results?.FR;
 if(!france)return {country:'FR',tmdb_id:matched.id,checked_at,url:null,offers:[]};
 return normalizeFRResult(show,matched,france,checked_at);
}
/**
 * Evidence of AT LEAST ONE real offer from country FR proves that the series
 * has been distributed in France at some point. A missing offer NEVER revokes
 * a previous historical verification.
 */
export function hasVerifiedFranceOffer(record){
 return record?.country==='FR' && Number.isSafeInteger(record?.tmdb_id) &&
  record.tmdb_id>0 && Array.isArray(record.offers) &&
  record.offers.some(p=>TYPE_KEYS.includes(p?.type)&&Number.isSafeInteger(p?.provider_id)&&p.provider_id>0);
}
export async function recordFranceEligibility(show,record,supabase,key){
 if(!hasVerifiedFranceOffer(record))return false;
 // Region FR evidence (when present) links to the individual TMDB title.
 const evidence='https://www.themoviedb.org/tv/'+record.tmdb_id+'/watch?locale=FR';
 const resp=await fetch(supabase+'/rest/v1/series?id=eq.'+encodeURIComponent(show.id)+
  '&fr_verified=is.false',{
   method:'PATCH',
   headers:{apikey:key,Authorization:'Bearer '+key,
    'Content-Type':'application/json','Prefer':'return=minimal'},
   body:JSON.stringify({
    fr_verified:true,fr_verification_method:'tmdb_fr_offer',
    fr_evidence_url:evidence,fr_verified_at:record.checked_at
   })
  });
 if(!resp.ok){
  const body=await resp.text();
  if(resp.status===400&&/fr_verified|fr_verification_method|schema cache/i.test(body)){
   throw Error('Migration française absente : exécute supabase/game_v5_4_fr.sql avant la synchronisation TMDB.');
  }
  throw Error('Preuve de disponibilité FR : HTTP '+resp.status+' '+body.slice(0,200));
 }
 return true;
}
async function getCatalog(supabase,key){
 let out=[],offset=0;
 do{
  const query=new URLSearchParams({select:'id,name,premiered,popularity_weight,fr_verified',
    order:'popularity_weight.desc.nullslast,id.asc',limit:'750',offset:String(offset)});
  const rows=await json(supabase+'/rest/v1/series?'+query,{
   apikey:key,Authorization:'Bearer '+key
  });
  if(!Array.isArray(rows))throw Error('Réponse du catalogue Supabase invalide');
  out.push(...rows.filter(x=>x.id&&x.name&&x.premiered));
  if(rows.length<750)break;
  offset+=750;
  if(offset>=15000)break;
 }while(true);
 return out;
}
export async function run(){
 const token=process.env.TMDB_READ_ACCESS_TOKEN;
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const supabase=process.env.SUPABASE_URL||'https://anjfidksqbqlaggttdop.supabase.co';
 if(!token||!service)throw Error('Secrets manquants : ajouter TMDB_READ_ACCESS_TOKEN et SUPABASE_SERVICE_ROLE_KEY dans GitHub Actions.');
 if(!supabase.startsWith('https://'))throw Error('SUPABASE_URL doit être en HTTPS');
 const raw=JSON.parse(await fs.readFile(STORE,'utf8'));
 if(!raw.titles||typeof raw.titles!=='object')throw Error('Invalid France store');
 const shows=await getCatalog(supabase,service),now=Date.now(),checked_at=new Date().toISOString();
 let verifiedFrance=0;
 // Reuse prior authenticated observations: even if a provider was available
 // several weeks ago, that is valid evidence of an actual French release.
 for(const show of shows){
  const record=raw.titles[String(show.id)];
  if(!show.fr_verified&&hasVerifiedFranceOffer(record)){
   if(await recordFranceEligibility(show,record,supabase,service))verifiedFrance++;
  }
 }
 const queued=shows.filter(s=>!raw.titles[String(s.id)]||
   now-Date.parse(raw.titles[String(s.id)].checked_at||0)>TTL)
  .slice(0,Math.max(1,Math.min(MAX,400)));
 console.log('Catalogue :',shows.length,'séries. A examiner :',queued.length,
  '. Historique FR déjà repris :',verifiedFrance);
 let inserted=0,notMatched=0,failed=0;
 for(let i=0;i<queued.length;i++){
  const show=queued[i];
  try{
   const res=await fetchFRShow(show,token,checked_at);
   const existing=raw.titles[String(show.id)];
   if(res){
    // A positive FR provider match supersedes an old manually sourced offer.
    // An API response with no providers is NOT evidence the earlier JustWatch
    // observation was false, so retain its historical, dated record.
    if(await recordFranceEligibility(show,res,supabase,service))verifiedFrance++;
    if(hasVerifiedFranceOffer(res)||existing?.source!=='justwatch_fr_editorial'){
     raw.titles[String(show.id)]=res;
    }
    inserted++;
   }else{
    // Keep dated, attributed historical French evidence when TMDB returns
    // no confident match, rather than replacing it with an empty result.
    if(existing?.source!=='justwatch_fr_editorial'){
     raw.titles[String(show.id)]={country:'FR',tmdb_id:null,checked_at,url:null,offers:[]};
    }
    notMatched++;
   }
  }catch(err){
   failed++;console.warn('FR data failed for TVmaze',show.id,':',err.message);
   if(failed>12)break;
  }
  if((i+1)%30===0)console.log('Synchronisées',i+1,'/',queued.length);
 }
 raw.schema=1;raw.region='FR';raw.source='TMDB/JustWatch';raw.updated_at=checked_at;
 await fs.mkdir(path.dirname(STORE),{recursive:true});
 await fs.writeFile(STORE,JSON.stringify(raw,null,0)+'\n');
 console.log('Disponibilités FR :',inserted,'titres associés,',notMatched,
   'sans correspondance,',failed,'échecs. SérieClub vérifiées FR :',verifiedFrance,
   '. Total cache :',Object.keys(raw.titles).length);
 if(failed>12)throw Error('Trop d’échecs TMDB : vérifier les quotas et la connexion');
}
const invoked=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){run().catch(e=>{console.error('Sync France :',e.message);process.exitCode=1})}
