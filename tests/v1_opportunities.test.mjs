import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {opportunityData,opportunityPanel} from '../v1/opportunities.js';
import {marketPage} from '../v4/club.js';
const user={id:'mine'};
const feed=[
 {listing_id:'a',series_id:7,seller_id:'other',series_name:'Dark',price:105},
 {listing_id:'b',series_id:8,seller_id:'mine',series_name:'Lost',price:50},
 {listing_id:'c',series_id:42,seller_id:'other',series_name:'Sherlock',price:95}
];
const state={user,marketListings:feed,wishes:[{series_id:7},{series_id:8}],tradeOffers:[
 {offer_id:'t1',seller_id:'mine',proposer_id:'other',status:'pending'},
 {offer_id:'t2',seller_id:'other',proposer_id:'mine',status:'pending'},
 {offer_id:'t3',seller_id:'mine',proposer_id:'other',status:'accepted'}],
 marketActivity:[],cards:[],wallet:{credits:200},marketQuery:'',marketRarity:'',marketWishOnly:false};
test('Le centre d’opportunités ne compte que les souhaits achetables et échanges en attente',()=>{
 const o=opportunityData(state);
 assert.equal(o.received.length,1);
 assert.equal(o.sent.length,1);
 assert.equal(o.wanted.length,1);
 assert.equal(o.wanted[0].listing_id,'a');
 assert.equal(o.count,2);
});
test('Le centre du Comptoir possède les raccourcis et le texte de disponibilité limitée',()=>{
 const html=marketPage(state);
 assert.match(html,/id="sc1-opportunities"/);
 assert.match(html,/data-opportunities-wishes/);
 assert.match(html,/data-opportunities-trades/);
 assert.match(html,/id="sc1-trades"/);
 assert.match(html,/id="sc1-market-listings"/);
 assert.match(html,/dernières annonces/);
});
test('Un visiteur ne reçoit aucune donnée privée dans le centre',()=>{
 const o=opportunityData({...state,user:null});
 assert.equal(o.count,0);
 assert.equal(opportunityPanel({...state,user:null}),'');
});
test('Les noms de séries affichés sont neutralisés contre le HTML injecté',()=>{
 const out=opportunityPanel({...state,marketListings:[
  {listing_id:'h',series_id:7,seller_id:'other',series_name:'<script>bad()</script>',price:10}
 ]});
 assert.ok(!out.includes('<script>bad()</script>'));
 assert.ok(out.includes('&lt;script&gt;bad()&lt;/script&gt;'));
});
test('L’icône d’alertes ouvre le centre et les filtres sans nouvelle API',()=>{
 const app=fs.readFileSync('v3/app.js','utf8');
 assert.match(app,/data-opportunities-open/);
 assert.match(app,/data-opportunities-wishes/);
 assert.match(app,/data-opportunities-trades/);
 assert.match(app,/opportunityData\(state\)/);
});
