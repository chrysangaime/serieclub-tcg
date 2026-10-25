import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.118.0';
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
const validPoster=(v:unknown)=>typeof v==='string'&&/^https:\/\/(?:static\.tvmaze\.com|www\.tvmaze\.com)\//.test(v)?v:null;
Deno.serve(async req=>{
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 const role=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 const bearer=req.headers.get('authorization')||'';
 if(!role||bearer!==`Bearer ${role}`)return json({error:'Forbidden'},403);
 const url=Deno.env.get('SUPABASE_URL')||'';
 const db=createClient(url,role,{auth:{autoRefreshToken:false,persistSession:false}});
 let input:{cursor?:number;limit?:number}={};
 try{input=await req.json()}catch{return json({error:'Invalid JSON'},400)}
 const cursor=Number.isSafeInteger(input.cursor)&&Number(input.cursor)>=0?Number(input.cursor):0;
 const limit=Math.max(1,Math.min(12,Number(input.limit)||8));
 const {data:shows,error:queryError}=await db.from('series')
  .select('id,name,content_status,fr_verified,fr_verification_method')
  .eq('content_status','series').eq('fr_verified',true)
  .in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr','editorial_fr_history'])
  .gt('id',cursor).order('id',{ascending:true}).limit(limit);
 if(queryError)return json({error:queryError.message},500);
 const results:unknown[]=[];
 for(const show of shows||[]){
  try{
   const res=await fetch('https://api.tvmaze.com/shows/'+Number(show.id)+'/seasons',{
    headers:{'Accept':'application/json','User-Agent':'SeriesClubTCG-catalog-sync/1.0'}
   });
   if(res.status===404){results.push({id:show.id,status:'not_in_tvmaze'});continue}
   if(!res.ok){results.push({id:show.id,status:'api_error',http:res.status});continue}
   const entries=await res.json();
   if(!Array.isArray(entries)){results.push({id:show.id,status:'invalid_response'});continue}
   const rows=entries.filter(x=>
    Number.isSafeInteger(x.id)&&x.id>0&&Number.isSafeInteger(x.number)&&x.number>0&&x.number<=150
   ).map(x=>({
    series_id:show.id,season_number:x.number,tvmaze_season_id:x.id,
    season_name:typeof x.name==='string'?x.name.slice(0,220):null,
    premiered:/^\d{4}-\d{2}-\d{2}$/.test(x.premiereDate||'')?x.premiereDate:null,
    ended:/^\d{4}-\d{2}-\d{2}$/.test(x.endDate||'')?x.endDate:null,
    image_url:validPoster(x.image?.original)||validPoster(x.image?.medium),
    episode_count:Number.isSafeInteger(x.episodeOrder)&&x.episodeOrder>=0?x.episodeOrder:null,
    verified_source:'tvmaze',
    updated_at:new Date().toISOString()
   }));
   // Preserve factual editorial data until TVmaze supplies real dates; do not overwrite
   // a known season-specific picture with null or a generic show image.
   let inserted=0,updated=0,skipped=0;
   for(const row of rows){
    const {data:existing,error:readError}=await db.from('series_seasons')
      .select('tvmaze_season_id,premiered,ended,season_name,image_url,episode_count,verified_source')
      .eq('series_id',show.id).eq('season_number',row.season_number).maybeSingle();
    if(readError){skipped++;continue}
    if(existing){
     const {error:upError}=await db.from('series_seasons').update({
      tvmaze_season_id:row.tvmaze_season_id,
      season_name:row.season_name||existing.season_name,
      premiered:row.premiered||existing.premiered,
      ended:row.ended||existing.ended,
      episode_count:row.episode_count??existing.episode_count,
      image_url:row.image_url||existing.image_url,
      verified_source:'tvmaze',
      updated_at:row.updated_at
     }).eq('series_id',show.id).eq('season_number',row.season_number);
     if(upError)skipped++;else updated++;
    }else{
     const {error:writeError}=await db.from('series_seasons').insert(row);
     if(writeError)skipped++;else inserted++;
    }
   }
   results.push({id:show.id,name:show.name,found:rows.length,inserted,updated,skipped});
  }catch(e){results.push({id:show.id,status:'request_error',message:String(e).slice(0,100)})}
  await new Promise(resolve=>setTimeout(resolve,650));
 }
 return json({processed:(shows||[]).length,next_cursor:shows?.at(-1)?.id??cursor,results});
});
