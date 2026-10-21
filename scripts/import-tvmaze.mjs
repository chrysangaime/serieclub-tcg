// GitHub Actions only. Requires SUPABASE_SERVICE_ROLE_KEY in repository secrets.
// Never put this key in frontend code, commits, logs or browser.
const base=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
import fs from 'node:fs/promises';
const CURSOR_FILE='data/tvmaze-import-state.json';
const maxPages=Math.max(1,Math.min(400,Number(process.env.TVMAZE_PAGES||100)));
const oldCursor=JSON.parse(await fs.readFile(CURSOR_FILE,'utf8').catch(()=>'{"next_page":0}'));
let page=Number.isInteger(Number(process.env.TVMAZE_START_PAGE))&&
 process.env.TVMAZE_START_PAGE!==undefined&&process.env.TVMAZE_START_PAGE!==''
 ?Number(process.env.TVMAZE_START_PAGE):Number(oldCursor.next_page||0);
page=Math.max(0,Math.min(5000,Math.floor(page)));
const startPage=page;
let reachedEnd=false;
const headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let imported=0,frVerified=0,frEligibleEnabled=null;
async function enableFranceVerification(){
 if(frEligibleEnabled!==null)return frEligibleEnabled;
 const r=await fetch(base+'/rest/v1/series?select=id,fr_verified&limit=1',{
  headers:{apikey:key,Authorization:'Bearer '+key}
 });
 if(!r.ok){
  const message=await r.text();
  if(/fr_verified|schema cache|column/i.test(message)){
   console.warn('Validation France inactive : exécuter supabase/game_v5_4_fr.sql.');
   frEligibleEnabled=false;return false;
  }
  throw Error('Vérification du schéma Supabase : HTTP '+r.status+' '+message.slice(0,160));
 }
 frEligibleEnabled=true;return true;
}
async function recordFranceOrigin(x){
 // TVmaze's country identifies the original channel, not foreign broadcasts.
 const country=x.network?.country?.code||x.webChannel?.country?.code;
 if(country!=='FR'||!Number.isSafeInteger(x.id))return;
 const source=String(x.url||'');
 if(!/^https:\/\/www\.tvmaze\.com\/shows\/\d+\//.test(source))return;
 const r=await fetch(base+'/rest/v1/series?id=eq.'+x.id+'&fr_verified=is.false',{
  method:'PATCH',headers:{apikey:key,Authorization:'Bearer '+key,
   'Content-Type':'application/json','Prefer':'return=minimal'},
  body:JSON.stringify({
   fr_verified:true,fr_verification_method:'tvmaze_fr_origin',
   fr_evidence_url:source,fr_verified_at:new Date().toISOString()
  })
 });
 if(!r.ok)throw Error('Preuve France TVmaze '+x.id+': HTTP '+r.status+' '+(await r.text()).slice(0,180));
 frVerified++;
}
for(let step=0;step<maxPages;step++,page++){
 let response;
 for(let attempt=0;attempt<4;attempt++){
  response=await fetch('https://api.tvmaze.com/shows?page='+page);
  if(response.ok||response.status===404)break;
  await pause((attempt+1)*1500);
 }
 if(response.status===404){console.log('Reached final TVmaze page',page);reachedEnd=true;break}
 if(!response.ok)throw Error('TVmaze page '+page+' HTTP '+response.status);
 const raw=await response.json();
 const rows=raw.filter(x=>x.id&&x.name&&x.image?.medium).map(x=>({
  id:x.id,name:x.name,
  premiered:/^\d{4}-\d{2}-\d{2}$/.test(x.premiered||'')?x.premiered:null,
  genres:x.genres||[],image_url:x.image.medium,source:'tvmaze',
  popularity_weight:typeof x.weight==='number'&&Number.isFinite(x.weight)?x.weight:null,
  rating_average:typeof x.rating?.average==='number'&&Number.isFinite(x.rating.average)?x.rating.average:null
}));
 for(let offset=0;offset<rows.length;offset+=100){
  const batch=rows.slice(offset,offset+100);
  let r=await fetch(base+'/rest/v1/series?on_conflict=id',{method:'POST',headers,body:JSON.stringify(batch)});
  if(!r.ok){
   const message=await r.text();
   if(r.status===400&&/popularity_weight|rating_average/i.test(message)){
    const legacy=batch.map(({popularity_weight,rating_average,...series})=>series);
    r=await fetch(base+'/rest/v1/series?on_conflict=id',{
      method:'POST',headers,body:JSON.stringify(legacy)
    });
    if(!r.ok)throw Error('Supabase legacy upsert page '+page+': '+r.status+' '+(await r.text()).slice(0,180));
    console.warn('Scores non importés : exécute game_v5.sql avant le prochain import.');
   }else throw Error('Supabase upsert page '+page+': '+r.status+' '+message.slice(0,180));
  }
  imported+=batch.length;
 }
 if(await enableFranceVerification()){
  const frenchShows=raw.filter(x=>x?.image?.medium&&
   (x.network?.country?.code==='FR'||x.webChannel?.country?.code==='FR'));
  // Handle in small batches to avoid excessive requests.
  for(let offset=0;offset<frenchShows.length;offset+=8){
   await Promise.all(frenchShows.slice(offset,offset+8).map(recordFranceOrigin));
  }
 }
 console.log('Page '+page+': '+rows.length+' series, total '+imported+
  ', preuves d’origine française enregistrées '+frVerified);
 await pause(350);
}
// Reprise au prochain passage : parcours de l'index complet, pas seulement
// les 5 000 premiers titres. Une 404 marque la fin : recommencer à zéro.
const nextPage=reachedEnd?0:page;
await fs.mkdir('data',{recursive:true});
await fs.writeFile(CURSOR_FILE,JSON.stringify({
 next_page:nextPage,updated_at:new Date().toISOString(),
 previous_start:startPage, imported,france_verified_updates:frVerified
},null,2)+'\n');
// Contrôle de résultat : compter les séries françaises déjà certifiées
// dans Supabase, et non supposer que chaque PATCH crée une nouvelle preuve.
try{
 const countResponse=await fetch(base+'/rest/v1/series?select=id&fr_verified=eq.true',{
  method:'HEAD',headers:{apikey:key,Authorization:'Bearer '+key,Prefer:'count=exact'}
 });
 if(countResponse.ok){
  const count=countResponse.headers.get('content-range')?.split('/')[1];
  if(count&&count!=='*')console.log('TOTAL SERIES FRANÇAISES VÉRIFIÉES EN BASE :',count);
 }
}catch(error){console.warn('Comptage final indisponible :',error.message)}
console.log('Imported '+imported+' series. France-origin verified updates: '+
 frVerified+'. Next TVmaze page: '+nextPage);
