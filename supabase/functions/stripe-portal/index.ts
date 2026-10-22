// V16 : portail Stripe accessible uniquement au titulaire authentifié.
import Stripe from 'npm:stripe@22.0.0';
import {createClient} from 'npm:@supabase/supabase-js@2';
Deno.serve(async req=>{
 const site=(Deno.env.get('PUBLIC_SITE_URL')||'').replace(/\/+$/,'');
 const origin=site?new URL(site).origin:'null';
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'OPTIONS, POST','Content-Type':'application/json'};
 const reply=(obj:unknown,status=200)=>new Response(JSON.stringify(obj),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST'||req.headers.get('origin')!==origin)return reply({error:'Non autorisé'},403);
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 const admin=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false}});
 const {data:{user},error}=await admin.auth.getUser(token);
 if(error||!user)return reply({error:'Connexion requise'},401);
 const {data}=await admin.from('commerce_subscriptions').select('stripe_customer_id').eq('player_id',user.id).maybeSingle();
 if(!data?.stripe_customer_id)return reply({error:'Aucun abonnement'},404);
 try{
  const stripe=new Stripe(Deno.env.get('STRIPE_SECRET_KEY')||'');
  const session=await stripe.billingPortal.sessions.create({customer:data.stripe_customer_id,return_url:site+'/#/premium'});
  return reply({url:session.url});
 }catch(e){console.error(e);return reply({error:'Portail non disponible'},503)}
});