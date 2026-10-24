// V16 : checkout Stripe réservé à un joueur authentifié, offre Premium uniquement.
import Stripe from 'npm:stripe@22.0.0';
import {createClient} from 'npm:@supabase/supabase-js@2';
const key=Deno.env.get('STRIPE_SECRET_KEY')||'';
const site=(Deno.env.get('PUBLIC_SITE_URL')||'').replace(/\/+$/,'');
const price=(Deno.env.get('STRIPE_SECRET_KEY')||'').startsWith('sk_test_')?'price_1UU6fzAnJaPjYT5OMtRFbfF3':(Deno.env.get('STRIPE_PRICE_PREMIUM_MONTHLY')||'');
const test=key.startsWith('sk_test_'),live=key.startsWith('sk_live_');
const ready=Boolean(site.startsWith('https://')&&price&&
 (test&&Deno.env.get('PREMIUM_TEST_ENABLED')==='true'||
 live&&Deno.env.get('PREMIUM_LIVE_ENABLED')==='true'));
const mode=ready&&test?'test':'disabled';
function headers(req:Request){
 const allowed=site?new URL(site).origin:'null';
 return {'Content-Type':'application/json','Access-Control-Allow-Origin':req.headers.get('origin')===allowed?allowed:'null',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Vary':'Origin'};
}
Deno.serve(async req=>{
 const send=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:headers(req)});
 if(req.method==='OPTIONS')return new Response(null,{headers:headers(req)});
 if(req.method==='GET')return send({mode,enabled:ready});
 if(req.method!=='POST')return send({error:'Méthode non autorisée'},405);
 if(!ready||!test)return send({error:'Paiement réel suspendu tant que les droits et les conditions commerciales ne sont pas validés'},503);
 if(req.headers.get('origin')!==new URL(site).origin)return send({error:'Origine interdite'},403);
 let body:{sku?:string};
 try{body=await req.json()}catch{return send({error:'Requête invalide'},400)}
 if(body?.sku!=='premium_monthly')return send({error:'Offre interdite'},400);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)return send({error:'Connexion requise'},401);
 const admin=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false}});
 const {data:{user},error}=await admin.auth.getUser(token);
 if(error||!user?.email)return send({error:'Compte non authentifié'},401);
 try{
  const {data:existing,error:dbError}=await admin.from('commerce_subscriptions')
   .select('status,stripe_customer_id').eq('player_id',user.id).maybeSingle();
  if(dbError)throw dbError;
  if(['active','trialing','past_due'].includes(existing?.status||''))return send({error:'Abonnement déjà existant : utilise le portail client'},409);
  const stripe=new Stripe(key);
  const configuredPrice=await stripe.prices.retrieve(price);
  if(configuredPrice.currency!=='eur'||configuredPrice.unit_amount!==399||configuredPrice.recurring?.interval!=='month')return send({error:'Prix Stripe non conforme à 3,99 € mensuels'},503);
  const session=await stripe.checkout.sessions.create({
   mode:'subscription',line_items:[{price,quantity:1}],locale:'fr',
   ...(existing?.stripe_customer_id?{customer:existing.stripe_customer_id}:{customer_email:user.email}),
   client_reference_id:user.id,
   metadata:{player_id:user.id,sku:'premium_monthly'},
   subscription_data:{metadata:{player_id:user.id,sku:'premium_monthly'}},
   success_url:site+'/?checkout=success#/premium',
   cancel_url:site+'/?checkout=cancel#/premium'
  });
  if(!session.url)throw new Error('Stripe URL absent');
  return send({url:session.url});
 }catch(e){console.error('checkout:',e);return send({error:'Paiement momentanément indisponible'},503)}
});