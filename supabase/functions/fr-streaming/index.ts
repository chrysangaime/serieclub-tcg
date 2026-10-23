/**
 * V1 - read-only, per-series, public streaming cache gateway.
 * Never invokes the paid provider API or exposes Supabase service key.
 * The backing table has RLS enabled and no direct anon/auth grants.
 */
const allowed = new Set([
  "https://chrysangaime.github.io",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);
for(const x of (Deno.env.get("STREAMING_ALLOWED_ORIGINS") || "").split(",")){
  if(/^https:\/\/[a-z0-9.-]+$/i.test(x.trim())) allowed.add(x.trim());
}
function json(payload:unknown,status:number,origin:string){
  return new Response(JSON.stringify(payload),{
    status,
    headers:{
      "Content-Type":"application/json; charset=utf-8",
      "Vary":"Origin",
      "Cache-Control":"public, max-age=300, s-maxage=600",
      "Access-Control-Allow-Origin":origin
    }
  });
}
Deno.serve(async req=>{
  const origin=req.headers.get("Origin")||"";
  if(!allowed.has(origin))return new Response("Forbidden",{status:403});
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
    "Access-Control-Allow-Origin":origin,
    "Access-Control-Allow-Methods":"GET, OPTIONS",
    "Access-Control-Allow-Headers":"content-type, apikey, authorization",
    "Access-Control-Max-Age":"7200",
    "Vary":"Origin"
  }});
  if(req.method!=="GET")return json({error:"Method not allowed"},405,origin);
  const url=new URL(req.url),raw=url.searchParams.get("series_id")||"";
  if(!/^[1-9][0-9]{0,7}$/.test(raw))return json({error:"Invalid series_id"},400,origin);
  const base=Deno.env.get("SUPABASE_URL"),role=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!base||!role)return json({error:"Service not configured"},503,origin);
  const target=new URL(base+"/rest/v1/fr_streaming_cache");
  target.searchParams.set("series_id","eq."+raw);
  target.searchParams.set("expires_at","gt."+new Date().toISOString());
  target.searchParams.set("select","series_id,country,source,checked_at,expires_at,offers");
  target.searchParams.set("limit","1");
  try{
    const response=await fetch(target,{
      headers:{apikey:role,Authorization:"Bearer "+role,Accept:"application/json"},
      signal:AbortSignal.timeout(6000)
    });
    if(!response.ok)return json({error:"Temporary unavailable"},503,origin);
    const rows=await response.json();
    if(!Array.isArray(rows)||!rows.length)return json({available:false},200,origin);
    const record=rows[0];
    // Only explicitly whitelisted, non-image service links are returned.
    if(record.country!=="FR"||record.source!=="movieofthenight"||!Array.isArray(record.offers))
      return json({available:false},200,origin);
    const opts=record.offers.slice(0,20).filter((offer:Record<string,unknown>)=>
      typeof offer.name==="string"&&typeof offer.type==="string"&&
      typeof offer.url==="string"&&/^https:\/\//.test(offer.url));
    return json({available:opts.length>0,country:"FR",source:"movieofthenight",
      checked_at:record.checked_at,expires_at:record.expires_at,offers:opts},200,origin);
  }catch{
    return json({error:"Temporary unavailable"},503,origin);
  }
});
