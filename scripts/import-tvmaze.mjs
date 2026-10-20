// GitHub Actions only. Requires SUPABASE_SERVICE_ROLE_KEY in repository secrets.
// Never put this key in frontend code, commits, logs or browser.
const base=process.env.SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key)throw Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
const maxPages=Math.max(1,Math.min(100,Number(process.env.TVMAZE_PAGES||20)));
const headers={'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let imported=0;
for(let page=0;page<maxPages;page++){
 let response;
 for(let attempt=0;attempt<4;attempt++){
  response=await fetch('https://api.tvmaze.com/shows?page='+page);
  if(response.ok||response.status===404)break;
  await pause((attempt+1)*1500);
 }
 if(response.status===404){console.log('Reached final TVmaze page',page);break}
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
 console.log('Page '+page+': '+rows.length+' series, total '+imported);
 await pause(350);
}
console.log('Imported '+imported+' series.');
