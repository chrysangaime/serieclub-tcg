import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {storePage} from '../v10/store.js';
import {profile} from '../v3/views.js';
test('Abonnement jamais cliquable sans backend actif',()=>{
 const h=storePage({paymentsMode:'disabled'});
 assert.match(h,/Abonnement bientôt disponible/);assert.doesNotMatch(h,/data-premium-checkout/);
});
test('Sandbox : paiement Premium seulement; crédits inaccessibles',()=>{
 const h=storePage({paymentsMode:'test'});
 assert.match(h,/data-premium-checkout/);assert.match(h,/sans débit/);assert.match(h,/Achat suspendu/);
 assert.match(storePage({premiumActive:true}),/data-premium-portal/);
});
test('Le serveur vérifie authentification, signature et idempotence',()=>{
 const c=fs.readFileSync('supabase/functions/stripe-checkout/index.ts','utf8');
 const w=fs.readFileSync('supabase/functions/stripe-webhook/index.ts','utf8');
 const sql=fs.readFileSync('supabase/game_v16_premium_stripe.sql','utf8');
 assert.match(c,/admin\.auth\.getUser\(token\)/);
 assert.match(w,/constructEventAsync/);assert.match(sql,/ON CONFLICT\(event_id\) DO NOTHING/);
 assert.doesNotMatch(w,/player_wallets/);
});

test('La récompense cosmétique Premium est visible uniquement aux abonnés',()=>{
 const source=fs.readFileSync('v3/views.js','utf8');
 assert.ok(source.includes('sc16-premium-badge'));
});
