/**
 * Extension automatique du catalogue jouable SérieClub.
 * Découverte : TMDB avec offres effectivement répertoriées en France.
 * Identifiants, affiches et métadonnées : TVmaze, sans casser les cartes existantes.
 * Un titre sans correspondance sûre ou sans offre FR vérifiée n'est JAMAIS ajouté.
 * Exécution serveur GitHub Actions uniquement : les clés ne vont pas au navigateur.
 */
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {tmdbRequest,tmdbAuthError} from './tmdb-auth.mjs';
import {discoveryCursor,discoveryParams,advanceDiscovery,discoveryLabel,saveDiscoveryCursor} from './fr-discovery-plan.mjs';

const TMDB='https://api.themoviedb.org/3';
const MAZE='https://api.tvmaze.com';
const STATE='data/catalog-fr-state.json';
const WATCH='data/watch-fr.json';
const ALLOWED=['flatrate','free','ads','rent','buy'];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const clean=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const year=v=>Number(String(v||'').slice(0,4))||null;
const validId=v=>Number.isSafeInteger(Number(v))&&Number(v)>0;
const limit=(v,def,max)=>Math.max(1,Math.min(max,Number(v)||def));

/** Refuse les homonymes et les séries au millésime incorrect. */
export function sameSeries(tmdb,maze,byExternalId=false){
 if(!validId(maze?.id)||!maze?.name||!maze?.image?.medium)return false;
 const a=year(tmdb?.first_air_date),b=year(maze?.premiered);
 if(!a||!b||Math.abs(a-b)>1)return false;
 if(byExternalId)return true; // concordance TVDB/IMDb + millésime
 const wanted=[tmdb.original_name,tmdb.name].map(clean).filter(Boolean);
 return wanted.includes(clean(maze.name));
}

/** L'éligibilité France exige une vraie catégorie d'offre dans results.FR. */
export function collectFrenchOffers(region){
 if(!region||typeof region!=='object')return [];
 const seen=new Set(),offers=[];
 for(const type of ALLOWED){
  for(const p of Array.isArray(region[type])?region[type]:[]){
   if(!validId(p?.provider_id)||!p.provider_name)continue;
   const id=type+':'+p.provider_id;
   if(seen.has(id))continue;
   seen.add(id);
   offers.push({type,provider_id:Number(p.provider_id),
    name:String(p.provider_name).slice(0,65),
    logo_path:/^\/[A-Za-z0-9_-]+\.(png|jpe?g|webp)$/i.test(p.logo_path||'')?p.logo_path:null});
  }
 }
 return offers.slice(0,45);
}

/**
 * TVmaze : environ 20 appels / 10 s par IP. Respecter le débit et le
 * Retry-After sans faire échouer tout un lot lors d'un HTTP 429 temporaire.
 * Les URL de requête ne sont JAMAIS écrites dans les logs (clé API v3).
 */
async function requestJSON(url,headers={},allow404=false){
 let last='Erreur réseau temporaire';
 const safePath=new URL(url).hostname+new URL(url).pathname;
 const maxAttempts=safePath.startsWith('api.tvmaze.com/')?2:5;
 for(let attempt=0;attempt<maxAttempts;attempt++){
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),15000);
  let retryAfter=0;
  try{
   const res=await fetch(url,{headers:{Accept:'application/json',...headers},signal:ctl.signal});
   if(res.status===404&&allow404)return null;
   if(res.ok)return await res.json();
   if(![429,500,502,503,504].includes(res.status))
    throw Error('HTTP '+res.status+' '+safePath);
   last='HTTP '+res.status+' '+safePath;
   const retrySeconds=Number(res.headers.get('retry-after'));
   if(res.status===429&&Number.isFinite(retrySeconds)&&retrySeconds>0)
    retryAfter=Math.min(20000,retrySeconds*1000);
  }catch(err){
   if(/^HTTP (?:400|401|403|404|405|422)\b/.test(err.message))throw err;
   last=err?.name==='AbortError'?'Délai dépassé '+safePath:
    String(err?.message||'Erreur réseau').slice(0,140);
  }finally{clearTimeout(timer)}
  if(attempt<maxAttempts-1)await pause(Math.max(retryAfter,(attempt+1)*1600));
 }
 throw Error('Échec API après reprises : '+last);
}
async function tmdb(path,token){
 const auth=tmdbRequest(path,token);
 try{return await requestJSON(auth.url,auth.headers)}
 catch(error){
  if(/^HTTP 401\b/.test(error.message))throw Error(tmdbAuthError(auth.mode));
  throw error;
 }
}
let lastTVmazeCall=0;
async function tvmaze(path){
 // Sérialiser et limiter volontairement à ~14 appels / 10 secondes.
 const elapsed=Date.now()-lastTVmazeCall;
 if(elapsed<720)await pause(720-elapsed);
 lastTVmazeCall=Date.now();
 return requestJSON(MAZE+path,{'User-Agent':'SerieClubTCG/5.8 (github.com/chrysangaime/serieclub-tcg)'},true);
}

/** TVmaze renvoie plusieurs homonymes : ne garder qu'une correspondance unique. */
export function pickExactTVmaze(candidate,search=[]){
 const exact=new Map();
 for(const item of Array.isArray(search)?search:[]){
  const show=item?.show||item;
  if(sameSeries(candidate,show,false))exact.set(show.id,show);
 }
 return exact.size===1?[...exact.values()][0]:null;
}

async function resolveTVmaze(candidate,token){
 const external=await tmdb('/tv/'+candidate.id+'/external_ids',token);
 for(const [parameter,id] of [['thetvdb',external?.tvdb_id],['imdb',external?.imdb_id]]){
  if(!id)continue;
  const found=await tvmaze('/lookup/shows?'+parameter+'='+encodeURIComponent(id));
  if(sameSeries(candidate,found,true))return found;
 }
 // Le titre localisé seul n'est PAS une identité suffisante.
 // Réexamen de l'original avec validation titre + année, sans devinette.
 for(const title of new Set([candidate.original_name,candidate.name].filter(Boolean))){
  const results=await tvmaze('/search/shows?q='+encodeURIComponent(title));
  const match=pickExactTVmaze(candidate,results);
  if(match)return match;
 }
 return null;
}

async function supaJSON(url,key,options={}){
 const result=await fetch(url,{
  ...options,headers:{apikey:key,Authorization:'Bearer '+key,
    'Content-Type':'application/json',...(options.headers||{})}
 });
 if(!result.ok){
  const info=(await result.text()).slice(0,240);
  throw Error('Supabase HTTP '+result.status+': '+info);
 }
 if(result.status===204)return null;
 return result.headers.get('content-type')?.includes('json')?result.json():null;
}

async function upsertConfirmed(show,candidate,offers,supabase,key,when){
 // Ne PAS réécrire les colonnes de rareté ni les preuves déjà validées.
 const row={
  id:show.id,name:show.name,
  premiered:/^\d{4}-\d{2}-\d{2}$/.test(show.premiered||'')?show.premiered:null,
  genres:Array.isArray(show.genres)?show.genres:[],
  image_url:show.image.medium,source:'tvmaze',
  popularity_weight:Number.isFinite(show.weight)?show.weight:null,
  rating_average:Number.isFinite(show.rating?.average)?show.rating.average:null
 };
 await supaJSON(supabase+'/rest/v1/series?on_conflict=id',key,{
  method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
  body:JSON.stringify([row])
 });
 const evidence='https://www.themoviedb.org/tv/'+candidate.id+'/watch?locale=FR';
 await supaJSON(supabase+'/rest/v1/series?id=eq.'+show.id+'&fr_verified=is.false',key,{
  method:'PATCH',headers:{Prefer:'return=minimal'},
  body:JSON.stringify({fr_verified:true,fr_verification_method:'tmdb_fr_offer',
   fr_evidence_url:evidence,fr_verified_at:when})
 });
 return {
  country:'FR',tmdb_id:candidate.id,checked_at:when,
  url:'https://www.themoviedb.org/tv/'+candidate.id+'/watch?locale=FR',
  offers
 };
}

export async function run(){
 const token=process.env.TMDB_READ_ACCESS_TOKEN;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const base=(process.env.SUPABASE_URL||'https://anjfidksqbqlaggttdop.supabase.co').replace(/\/$/,'');
 if(!token){
  console.warn('Enrichissement TMDB inactif : renseigner TMDB_READ_ACCESS_TOKEN dans les secrets GitHub.');
  return; // L'import TVmaze indépendant reste actif ; aucune fausse preuve ajoutée.
 }
 if(!key)throw Error('Secret SUPABASE_SERVICE_ROLE_KEY manquant');
 console.log('Méthode TMDB détectée : '+tmdbRequest('/discover/tv?page=1',token).mode);
 if(!/^https:\/\/[a-z0-9.-]+$/i.test(base))throw Error('URL Supabase invalide');
 const pageCount=limit(process.env.FR_DISCOVERY_PAGES,20,60);
 const budget=limit(process.env.FR_DISCOVERY_BUDGET,400,1000);
 const [stateFile,watchFile]=await Promise.all([
  fs.readFile(STATE,'utf8').catch(()=>'{"next_page":1}'),
  fs.readFile(WATCH,'utf8')
 ]);
 const state=JSON.parse(stateFile),watch=JSON.parse(watchFile);
 if(!watch.titles||typeof watch.titles!=='object')throw Error('Cache FR incorrect');
 const cursor=discoveryCursor(state,process.env.FR_DISCOVERY_MODE||'auto');
 if(process.env.FR_START_PAGE){
  const chosen=limit(process.env.FR_START_PAGE,1,500);
  if(cursor.mode==='popular')cursor.popular.page=chosen;
  else cursor.archive.page=chosen;
 }
 const checked_at=new Date().toISOString();
 console.log('Découverte TMDB : '+discoveryLabel(cursor)+' | '+pageCount+' pages max, '+budget+' titres max.');
 let discovered=0,approved=0,noMatch=0,withoutOffers=0,errors=0,processedPages=0;
 let outageErrors=0,partial=false;
 for(let j=0;j<pageCount&&discovered<budget;j++){
  const periodLabel=discoveryLabel(cursor);
  const activePage=cursor.mode==='popular'?cursor.popular.page:cursor.archive.page;
  const page=await tmdb('/discover/tv?'+discoveryParams(cursor),token);
  const totalPages=Math.max(0,Math.min(500,Number(page.total_pages)||0));
  if(activePage>totalPages){
   // Un catalogue trimestriel/annuel peut contenir moins de pages
   // qu'à la précédente synchronisation. Avancer sans boucler sur la même page.
   advanceDiscovery(cursor,totalPages);
   console.log('Tranche épuisée : '+periodLabel+' -> '+discoveryLabel(cursor));
   continue;
  }
  for(const candidate of Array.isArray(page.results)?page.results:[]){
   if(discovered>=budget)break;
   if(!validId(candidate.id)||!year(candidate.first_air_date)||!candidate.original_name)continue;
   discovered++;
   try{
    const show=await resolveTVmaze(candidate,token);
    if(!show){noMatch++;continue}
    const region=(await tmdb('/tv/'+candidate.id+'/watch/providers',token))?.results?.FR;
    const offers=collectFrenchOffers(region);
    if(!offers.length){withoutOffers++;continue}
    // Même TVmaze ID => mise à jour, jamais de nouvelle identité pour le doublon.
    const cached=watch.titles[String(show.id)];
    const record=await upsertConfirmed(show,candidate,offers,base,key,checked_at);
    if(cached?.source==='justwatch_fr_editorial'&&Array.isArray(cached.offers)&&
       cached.offers.length){
      // Ne jamais effacer les relevés éditoriaux attribués avec leurs liens directs.
    }else watch.titles[String(show.id)]=record;
    approved++;outageErrors=0;
   }catch(e){
    errors++; console.warn('Série TMDB',candidate.id,':',e.message);
    if(/HTTP 50[234] api\.tvmaze\.com/.test(e.message))outageErrors++;
    else outageErrors=0;
    if(outageErrors>=3||errors>=30){
     // Reporter la page incomplète au prochain passage, sans jeter le
     // cache enrichi durant les pages déjà terminées.
     partial=true;
     console.warn('Import partiel : fournisseur TVmaze temporairement indisponible. '+
      'La page courante sera réexaminée lors du prochain lancement.');
     break;
    }
   }
   await pause(550); // rester courtois envers TVmaze et TMDB
  }
  if(partial)break;
  processedPages++;
  advanceDiscovery(cursor,totalPages);
  console.log('Découverte FR : page',processedPages+'/'+pageCount,
   '| '+periodLabel,'| vérifiées',approved,'| sans correspondance',noMatch);
 }
 if(processedPages===0&&!partial)throw Error('Aucune page de découverte traitée');
 watch.updated_at=checked_at;
 if(processedPages>0)saveDiscoveryCursor(state,cursor);
 state.updated_at=checked_at;
 state.last_run={mode:cursor.mode,pages:processedPages,examined:discovered,confirmed:approved,
  no_match:noMatch,no_fr_offer:withoutOffers,errors,partial};
 await Promise.all([
  fs.writeFile(WATCH,JSON.stringify(watch)+'\n'),
  fs.writeFile(STATE,JSON.stringify(state,null,2)+'\n')
 ]);
 console.log('Terminé :',JSON.stringify(state.last_run),
  '| prochaine tranche',discoveryLabel(cursor),'| titres FR en cache',Object.keys(watch.titles).length);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 run().catch(e=>{console.error(e.message);process.exitCode=1});
}
