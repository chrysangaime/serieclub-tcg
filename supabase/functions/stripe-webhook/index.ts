// V16 : webhook à signature Stripe, seul à pouvoir attribuer Premium.
import Stripe from 'npm:stripe@22.0.0';
import {createClient} from 'npm:@supabase/supabase-js@2';
const key=Deno.env.get('STRIPE_SECRET_KEY')||'';
const signing=Deno.env.get('STRIPE_WEBHOOK_SECRET')||'';
const priceId=Deno.env.get('STRIPE_PRICE_PREMIUM_MONTHLY')||'';
const stripe=new Stripe(key),cryptoProvider=Stripe.createSubtleCryptoProvider();
const admin=createClient(Deno.env.get('SUPABASE_URL')||'',Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',{auth:{persistSession:false}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Not allowed',{status:405});
 if(!key||!signing||!priceId)return new Response('Not configured',{status:503});
 const sig=req.headers.get('stripe-signature');if(!sig)return new Response('Missing signature',{status:400});
 let ev:Stripe.Event;
 try{ev=await stripe.webhooks.constructEventAsync(await req.text(),sig,signing,undefined,cryptoProvider)}
 catch{return new Response('Invalid signature',{status:400})}
 if(ev.livemode!==key.startsWith('sk_live_'))return new Response('Wrong environment',{status:400});
 if(!['checkout.session.completed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted'].includes(ev.type))
  return Response.json({received:true,ignored:true});
 try{
  let sub:Stripe.Subscription;
  if(ev.type==='checkout.session.completed'){
   const session=ev.data.object as Stripe.Checkout.Session;
   if(session.mode!=='subscription'||typeof session.subscription!=='string')return Response.json({received:true,ignored:true});
   sub=await stripe.subscriptions.retrieve(session.subscription);
  }else sub=ev.data.object as Stripe.Subscription;
  const user=sub.metadata?.player_id;
  if(!user||!uuid.test(user)||!sub.items.data.some(i=>i.price.id===priceId))
   return Response.json({received:true,ignored:true});
  const customer=typeof sub.customer==='string'?sub.customer:sub.customer.id;
  const state=['active','trialing','past_due','canceled'].includes(sub.status)?sub.status:'inactive';
  const end=typeof sub.current_period_end==='number'?new Date(sub.current_period_end*1000).toISOString():null;
  const {error}=await admin.rpc('apply_stripe_premium_event',{
   p_event_id:ev.id,p_player_id:user,p_subscription_id:sub.id,p_customer_id:customer,
   p_status:state,p_period_end:end,p_event_created:new Date(ev.created*1000).toISOString()
  });
  if(error)throw error;
  return Response.json({received:true});
 }catch(e){console.error('premium webhook:',e);return new Response('Retry',{status:500})}
});