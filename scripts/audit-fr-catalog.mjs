/**
 * Contrôle en lecture seule du catalogue France dans Supabase.
 * Le jeton service_role reste une variable GitHub Actions, jamais un artefact public.
 * Les métriques de cartes/joueurs ne sont PAS interrogées.
 */
import {appendFile} from 'node:fs/promises';

const base=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!/^https:\/\/[a-z0-9.-]+$/i.test(base)||!key)
  throw Error('Accès Supabase de vérification non configuré');

const headers={apikey:key,Authorization:'Bearer '+key,Prefer:'count=exact'};
async function count(label,filters=''){
 const url=base+'/rest/v1/series?select=id'+filters;
 const c=new AbortController(),timeout=setTimeout(()=>c.abort(),14000);
 try{
  const response=await fetch(url,{method:'HEAD',headers,signal:c.signal});
  if(!response.ok)throw Error('Contrôle '+label+': HTTP '+response.status);
  const value=response.headers.get('content-range')?.split('/').at(-1);
  if(!value||value==='*'||!/^[0-9]+$/.test(value))
    throw Error('Comptage indisponible : '+label);
  return Number(value);
 }finally{clearTimeout(timeout)}
}
// Contrôle ciblé d’une série connue, sans données joueur ni secret.
async function inspectSeries(id){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);
 try{
  const response=await fetch(base+'/rest/v1/series?select=id,name,rarity,rarity_source,fr_verified,fr_verification_method&id=eq.'+id,
    {headers,signal:c.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  const rows=await response.json();
  console.log('Contrôle fiche '+id+':',JSON.stringify(rows?.[0]||null));
 }catch(error){console.warn('Fiche ciblée inaccessible :',error.message)}
 finally{clearTimeout(timer)}
}
await inspectSeries(2993);

const stats={
 total:await count('toutes les séries'),
 verified:await count('diffusion France','&fr_verified=eq.true'),
 playable:await count('jouables France',
  '&fr_verified=eq.true&rarity_source=neq.pending&image_url=not.is.null'),
 tmdb:await count('preuve TMDB France',
  '&fr_verified=eq.true&fr_verification_method=eq.tmdb_fr_offer'),
 frenchOrigin:await count('origine France TVmaze',
  '&fr_verified=eq.true&fr_verification_method=eq.tvmaze_fr_origin'),
 editorial:await count('preuve éditoriale',
  '&fr_verified=eq.true&fr_verification_method=eq.editorial_fr_history')
};
console.log('Détail des comptages indépendants :',JSON.stringify(stats));
// Les compteurs sont interrogés successivement. Durant un import actif,
// des INSERT peuvent augmenter le nombre de séries entre deux lectures.
// Ne pas transformer cette évolution normale en fausse alerte.
if(stats.playable>stats.verified||stats.verified>stats.total)
 console.warn('Mesures non atomiques pendant un import : écarts à revérifier au prochain audit.');
if(stats.verified===0)throw Error('Aucune série France vérifiée');
const report=[
 '## SérieClub TCG — contrôle du catalogue France',
 '',
 '| Indicateur | Nombre |',
 '| :-- | --: |',
 '| Séries présentes en base | '+stats.total+' |',
 '| Séries certifiées pour la France | '+stats.verified+' |',
 '| Séries jouables (classées et illustrées) | '+stats.playable+' |',
 '| Preuves via TMDB / JustWatch FR | '+stats.tmdb+' |',
 '| Origine France via TVmaze | '+stats.frenchOrigin+' |',
 '| Preuves éditoriales historiques | '+stats.editorial+' |',
 '',
 'Une série étrangère peut entrer dans le jeu si sa disponibilité en France est prouvée.',
 'L’absence d’une offre en cours ne retire jamais une preuve de diffusion passée.',
 '',
].join('\n');
console.log(report);
if(process.env.GITHUB_STEP_SUMMARY)
 await appendFile(process.env.GITHUB_STEP_SUMMARY,report);
