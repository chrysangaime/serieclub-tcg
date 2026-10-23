import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {demoCards,demoHTML} from '../v1/onboarding.js';
import {candidates,recyclePanel,recycleConfirm,VALUES,LIMIT} from '../v1/recycling.js';
import {deriveCollection,collectionStudio} from '../v5/collection.js';
import {openingFrame} from '../v7/booster.js';
const read=p=>fs.readFileSync(p,'utf8');
const cards=Array.from({length:5},(_,i)=>({id:i+1,name:'Série '+i,image_url:'https://example.com/'+i+'.jpg'}));
test('Simulation libre et sans crédit : aucune écriture Supabase',()=>{
 const demo=demoCards(cards);
 assert.equal(demo.length,5);assert.ok(demo.every(x=>x.demo));
 assert.match(demoHTML({user:null,homeShows:cards}),/data-demo-pack/);
 assert.doesNotMatch(demoHTML({user:{id:'1'},homeShows:cards}),/data-demo-pack/);
 assert.match(openingFrame(demo,0,false,{kind:'demo'}),/aucune carte ni aucun crédit attribué/);
 const result=openingFrame(demo,6,false,{kind:'demo'});
 assert.match(result,/Démonstration sans récompense réelle/);
 assert.doesNotMatch(result,/\+25 crédits|\+50 XP/);
 const app=read('v3/app.js');
 assert.match(app,/showOpening\(cards,\{kind:'demo'\}\)/);
});
test('Les doublons protégés et proposés à la vente sont exclus',()=>{
 const card=(id,series_id,locked=false)=>({id,series_id,locked,rarity:'Commune',
  series:{id:series_id,name:'Série '+series_id,rarity:'Commune',image_url:'https://example.com/x.jpg',
  rarity_source:'editorial',fr_verified:true}});
 const list=[card('a',10),card('b',10),card('c',20),card('d',20,true),card('e',30),card('f',30)];
 const data=deriveCollection(list,[],[{card_id:'f',status:'active'}]);
 const eligible=candidates(data);
 assert.deepEqual(eligible.map(x=>x.id),['b','c']);
 assert.equal(VALUES.Commune,3);assert.equal(LIMIT,20);
 const panel=recyclePanel({...data,recycleReady:true,recycleRemaining:60},['b']);
 assert.match(panel,/data-recycle-item="b"/);
 assert.doesNotMatch(panel,/data-recycle-item="f"/);
 assert.match(panel,/3/);
 assert.match(recycleConfirm(eligible),/suppression/);
});
test('En absence de migration, le recyclage n’annonce aucun achat actif',()=>{
 const html=collectionStudio({cards:[],wishes:[],marketActivity:[],collectionMode:'duplicates',
   recycleReady:false,recycleSelection:[],recycleRemaining:0,user:{id:'test'}});
 assert.match(html,/Recyclage en préparation/);
 assert.match(read('supabase/game_v1_bulk_recycling.sql'),/SECURITY DEFINER/);
 const sql=read('supabase/game_v1_bulk_recycling.sql');
 for(const pattern of [/FOR UPDATE OF c/,/60/,/card_listings/,/owner_id=uid/,/NOT c.locked/,
 /get diagnostics|GET DIAGNOSTICS/,/count\(DISTINCT id\)/,/game_transactions/,/cards_used\+n/])
 assert.match(sql,pattern);
});
