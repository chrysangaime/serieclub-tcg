/**
 * V1 — revalidation indépendante des anciennes preuves TMDB avec TVmaze.
 * Aucun DELETE ni changement de collection. Les 984 séries sans preuve
 * d'origine FR restent inchangées pour l'accès anticipé et revue éditoriale.
 * Utilisation : SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
 *              MAX_SERIES=150 START_AT=0 node scripts/reverify-tvmaze-origin.mjs
 */
import fs from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const wait=ms=>new Promise(r=>setTimeout(r,ms));
export function independentFranceProof(show,expectedId){
 const id=Number(expectedId);
 if(!Number.isSafeInteger(id)||id<=0||Number(show?.id)!==id)return null;
 const channels=[show.network,show.webChannel].filter(ch=>
  ch?.country?.code==='FR'&&typeof ch.name==='string'&&ch.name.trim());
 if(!channels.length)return null;
 const url=String(show.url||'');
 if(!new RegExp('^https://www\\.tvmaze\\.com/shows/'+id+'(?:/|$)').test(url))return null;
 return {url,network:channels.map(ch=>ch.name.trim()).join(', ')};
}
async function requestJSON(url,{method='GET',body,headers={}}={}){
 for(let trial=0;trial<4;trial++){
  const ctrl=new AbortController();
  const timeout=setTimeout(()=>ctrl.abort(),18000);
  try{
   const r=await fetch(url,{method,body,headers,signal:ctrl.signal});
   if((r.status===429||r.status>=500)&&trial<3){
    await wait((trial+1)*2800);continue;
   }
   if(!r.ok)throw Error('HTTP '+r.status+' ('+new URL(url).hostname+')');
   if(r.status===204)return null;
   return await r.json();
  }catch(error){
   if(trial===3)throw error;
   await wait((trial+1)*1700);
  }finally{clearTimeout(timeout)}
 }
}
const csvField=s=>'"'+String(s??'').replace(/"/g,'""').replace(/[\r\n]/g,' ').slice(0,250)+'"';
export async function run(){
 const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!/^https:\/\/[-a-z0-9]+\.supabase\.co$/.test(base||'')||!key)
  throw Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis (secrets uniquement)');
 const limit=Math.min(250,Math.max(1,Number(process.env.MAX_SERIES)||150));
 const start=Math.max(0,Math.floor(Number(process.env.START_AT)||0));
 const dryRun=process.env.DRY_RUN==='true';
 const auth={apikey:key,Authorization:'Bearer '+key};
 const get=path=>requestJSON(base+'/rest/v1/'+path,{headers:auth});
 const series=await get('series?select=id,name&fr_verification_method=eq.tmdb_fr_offer&order=id.asc&limit=1000');
 // Protéger en priorité les séries possédées, sans jamais publier les
 // identifiants, profils ou habitudes des joueurs dans le rapport.
 const cards=await get('player_cards?select=series_id&limit=2000');
 const owned=new Set((cards||[]).map(x=>Number(x.series_id)));
 const ordered=[...(series||[])].sort((a,b)=>
  Number(owned.has(Number(b.id)))-Number(owned.has(Number(a.id)))||Number(a.id)-Number(b.id));
 const target=ordered.slice(start,start+limit);
 let promoted=0,pending=0,errors=0;
 const rows=[];
 for(let i=0;i<target.length;i++){
  const row=target[i],id=Number(row.id);
  try{
   const show=await requestJSON('https://api.tvmaze.com/shows/'+id);
   const proof=independentFranceProof(show,id);
   if(proof){
    if(!dryRun){
     const response=await requestJSON(base+'/rest/v1/series?id=eq.'+id+
      '&fr_verification_method=eq.tmdb_fr_offer',{
       method:'PATCH',headers:{...auth,'Content-Type':'application/json',
        Prefer:'return=representation'},
       body:JSON.stringify({
        fr_verified:true,fr_verification_method:'tvmaze_fr_origin',
        fr_evidence_url:proof.url,fr_verified_at:new Date().toISOString()
       })
      });
     if(!Array.isArray(response)||response.length!==1)throw Error('Mise à jour non confirmée');
    }
    promoted++;rows.push([id,row.name,'tvmaze_fr_origin',proof.network,proof.url]);
   }else{pending++;rows.push([id,row.name,'recherche éditoriale requise','','']);}
  }catch(e){errors++;rows.push([id,row.name,'erreur temporaire','','']);}
  await wait(620); // >1.5 req/s ; dans la limite officielle TVmaze de 20/10s.
 }
 await fs.mkdir('review-artifacts',{recursive:true});
 const csv='tvmaze_id,serie,etat,diffuseur_tvmaze_fr,source_tvmaze\n'+
  rows.sort((a,b)=>a[0]-b[0]).map(row=>row.map(csvField).join(',')).join('\n')+'\n';
 await fs.writeFile('review-artifacts/revalidation-tvmaze-fr.csv',csv);
 const summary=[
  '# Réévaluation des preuves France sans TMDB',
  '- Séries marquées TMDB avant analyse : '+ordered.length,
  '- Séries analysées : '+target.length,
  '- Preuves françaises TVmaze confirmées : '+promoted+
     (dryRun?' (simulation)':' (références remplacées en base)'),
  '- Séries à examiner : '+pending,
  '- Échecs réseau temporaires : '+errors,
  '- Cartes et portefeuilles modifiés : **0**',
  '- Priorité des séries possédées en mémoire ; aucune identité joueur publiée.',
  '- Autres lots : relancer avec START_AT='+String(start+limit)+
    ' tant que de nouvelles séries restent à vérifier.',
  '- Une absence de chaîne FR sur TVmaze NE prouve PAS une absence de diffusion française.'
 ].join('\n')+'\n';
 await fs.writeFile('review-artifacts/rapport.md',summary);
 if(process.env.GITHUB_STEP_SUMMARY)
  await fs.appendFile(process.env.GITHUB_STEP_SUMMARY,summary);
 console.log(summary);
 if(errors>Math.max(5,target.length*0.3))
  throw Error('Trop de requêtes ont échoué : relancer le lot plus tard');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)
 run().catch(error=>{console.error(error.message);process.exitCode=1});
