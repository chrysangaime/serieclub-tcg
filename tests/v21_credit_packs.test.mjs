import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {creditThemeShelf,themes} from '../v21/credit-packs.js';
import {svodHome} from '../v12/home.js';
import {openingFrame} from '../v7/booster.js';
test('Huit paquets à crédits dont quatre thématiques utilisables, sans casser les packs gratuits',()=>{
 assert.deepEqual(themes.map(x=>x.key),['genre_comedy','genre_crime','genre_thriller','genre_fantasy','netflix','prime','disney','television']);
 const html=svodHome({homeShows:[],seasonShows:[],cards:[],pack:'classic',
  stock:{stock:10,maximum:10},wallet:{credits:400},user:{id:'test'}},{timecode:()=>''});
 assert.match(html,/svod-credit-packs/);
 assert.match(html,/data-pack="classic"/);
 assert.match(html,/data-pack="halloween"/);
});
test('Sans migration, aucun achat en crédits n’est possible',()=>{
 const html=creditThemeShelf({creditPacks:[],user:{id:'test'},wallet:{credits:500}});
 assert.equal((html.match(/data-credit-pack=/g)||[]).length,8);
 assert.equal((html.match(/disabled/g)||[]).length,8);
});
test('Prix réel issu du serveur et refus de solde insuffisant',()=>{
 const html=creditThemeShelf({creditPacks:[
  {pack_key:'netflix',price_credits:250,available:true,proof_date:'2026-10-22'},
  {pack_key:'prime',price_credits:200,available:true,proof_date:'2026-10-22'}
 ],user:{id:'test'},wallet:{credits:225}});
 assert.match(html,/Crédits insuffisants/);
 assert.match(html,/data-credit-pack="prime"/);
 assert.match(html,/Dernier relevé : 22\/10\/2026/);
});
test('Un booster en crédits ne déclenche pas les bonus du booster gratuit',()=>{
 const cards=Array.from({length:5},(_,i)=>({name:'Série '+i,rarity:'Commune',image_url:'https://example.com/ok.jpg'}));
 const paid=openingFrame(cards,6,false,{kind:'credit',price:250,label:'Netflix'});
 assert.match(paid,/250 crédits utilisés/);
 assert.doesNotMatch(paid,/\+25 crédits|\+50 XP/);
 assert.match(openingFrame(cards,6),/\+25 crédits/);
});
test('Sécurité : solde contrôlé par SQL et rareté tirée du catalogue FR',()=>{
 const sql=fs.readFileSync('supabase/game_v21_credit_svod_packs.sql','utf8');
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/wallet\.credits<cfg\.price_credits/);
 assert.match(sql,/s\.fr_verified IS TRUE/);
 assert.match(sql,/cardinality\(used\)<>5/);
 assert.match(sql,/player_wallets\.credits-cfg\.price_credits/);
 assert.match(sql,/ON CONFLICT\(pack_key,series_id\)/);
 assert.doesNotMatch(sql,/STRIPE_SECRET_KEY/);
});
