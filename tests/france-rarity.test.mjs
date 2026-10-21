import test from 'node:test';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {card,officialRarity,raritySlug} from '../v3/views.js';
import {selectCollection,collectionStudio} from '../v5/collection.js';
import {showDetailHTML} from '../v4/series.js';
import {whereToWatchLink} from '../v3/discovery.js';
import {
 getFrenchOriginChannel,normalizeFranceOffers,renderFranceAvailability,justwatchFranceUrl
} from '../v5/fr-watch.js';
import {matchTVShow,normalizeFRResult,hasVerifiedFranceOffer,recordFranceEligibility} from '../scripts/sync-fr-providers.mjs';

test('the canonical series rank wins over the historical card rank',()=>{
 const old={id:'old',series_id:31,rarity:'Commune',series:{
  id:31,name:'The X-Files',rarity:'Légendaire',rarity_source:'editorial',
  image_url:'https://example.com/xfiles.jpg',genres:['Mystery']
 }};
 assert.equal(officialRarity(old),'Légendaire');
 assert.equal(raritySlug(officialRarity(old)),'legendaire');
 const rendered=card(old,'');
 assert.match(rendered,/sc53-rarity-legendaire/);
 assert.match(rendered,/sc53-rank-label">Légendaire/);
 assert.doesNotMatch(rendered,/class="rarity rarity--Commune/);
 const state={cards:[old],wishes:[],marketActivity:[],rank:'Légendaire',
  filter:'',genre:'',collectionMode:'all',collectionSort:'rarity',collectionPage:0,user:{id:'u'}};
 assert.equal(selectCollection(state).total,1);
 assert.match(collectionStudio(state),/Légendaire/);
 assert.equal(selectCollection({...state,rank:'Commune'}).total,0);
});

test('only France country-code broadcaster is displayed, not American networks',()=>{
 const show={id:1,name:'US TV Show',
  premiered:'2005-01-01',network:{name:'CBS',country:{code:'US'}},
  webChannel:{name:'Paramount France',country:{code:'FR'}}};
 assert.deepEqual(getFrenchOriginChannel(show),['Paramount France']);
 assert.deepEqual(getFrenchOriginChannel({...show,webChannel:null}),[]);
 const html=showDetailHTML(show,{rarity:'Rare',rarity_source:'popularity'},{
  source:'editorial',text:'Une série américaine.'
 });
 assert.doesNotMatch(html,/>CBS</);
 assert.match(html,/Diffusion en France/);
 assert.match(html,/Paramount France/);
 assert.match(html,/rareté officielle/);
 assert.match(html,/sc53-tier-rare/);
});

test('real streaming offers always come only from the FR region',()=>{
 const selected=matchTVShow({name:'Lost',premiered:'2004-09-22'},[
  {id:10,original_name:'Lost',first_air_date:'2001-09-05'},
  {id:20,original_name:'Lost',first_air_date:'2004-09-22'}
 ]);
 assert.equal(selected?.id,20);
 assert.equal(matchTVShow({name:'Stranger Things',premiered:'2016-07-15'},[
  {id:21,original_name:'Another series',first_air_date:'2016-07-15'}
 ]),null);
 const checked_at=new Date().toISOString();
 const fr=normalizeFRResult({id:1},selected,{
  link:'https://www.themoviedb.org/tv/20/watch?locale=FR',
  flatrate:[{provider_id:8,provider_name:'Netflix',logo_path:'/netflix.png'}],
  free:[{provider_id:111,provider_name:'Arte',logo_path:'/arte.png'}]
 },checked_at);
 assert.equal(fr.country,'FR');
 assert.equal(fr.offers.length,2);
 const view=renderFranceAvailability(fr,{network:{name:'ABC',country:{code:'US'}}});
 assert.match(view,/Netflix/);
 assert.match(view,/Arte/);
 assert.match(view,/JustWatch/);
 assert.match(view,/TMDB/);
 assert.match(view,/locale=FR/);
 assert.doesNotMatch(view,/>ABC</);
 assert.ok(view.includes('image.tmdb.org'));
});

test('unverified, foreign and expired offers cannot be presented as France availability',()=>{
 const current=new Date().toISOString(),expired=new Date(Date.now()-50*86400000).toISOString();
 assert.equal(normalizeFranceOffers({country:'US',checked_at:current,offers:[]}),null);
 assert.equal(normalizeFranceOffers({country:'FR',checked_at:expired,offers:[]}),null);
 const html=renderFranceAvailability(null,{network:{name:'NBC',country:{code:'US'}}});
 assert.match(html,/Plateformes françaises non encore renseignées/);
 assert.doesNotMatch(html,/Netflix/);
 assert.doesNotMatch(html,/NBC/);
 assert.match(html,/JustWatch France/);
 const malicious=renderFranceAvailability({
  country:'FR',checked_at:current,url:'javascript:alert(1)',
  offers:[{type:'flatrate',name:'<script>alert(1)</script>',logo_path:'https://evil.example/image.png'}]
 });
 assert.doesNotMatch(malicious,/<script>/);
 assert.match(malicious,/&lt;script&gt;/);
 assert.doesNotMatch(malicious,/javascript:/);
 assert.doesNotMatch(malicious,/evil\.example/);
});

test('the search fallback links directly to JustWatch France, never Google',()=>{
 assert.equal(whereToWatchLink('How I Met Your Mother'),justwatchFranceUrl());
 assert.equal(whereToWatchLink('Any show'),'https://www.justwatch.com/fr');
 assert.ok(!whereToWatchLink('Lost').includes('google.com'));
});

test('official French offers certify eligibility while non-FR or empty records never do',async()=>{
 const checked_at=new Date().toISOString();
 const show={id:7171,name:'Fiction validée',premiered:'2018-03-01'};
 const verified={
  country:'FR',tmdb_id:7171,checked_at,
  offers:[{type:'flatrate',provider_id:8,name:'Netflix'}]
 };
 const missing={country:'FR',tmdb_id:7171,checked_at,offers:[]};
 const overseas={...verified,country:'US'};
 assert.equal(hasVerifiedFranceOffer(verified),true);
 assert.equal(hasVerifiedFranceOffer(missing),false);
 assert.equal(hasVerifiedFranceOffer(overseas),false);
 const saved=[];
 const previous=globalThis.fetch;
 globalThis.fetch=async (url,config)=>{
  saved.push({url:String(url),config});
  return {ok:true,status:204,text:async()=>''};
 };
 try{
  assert.equal(await recordFranceEligibility(show,missing,'https://unit.test','service'),false);
  assert.equal(await recordFranceEligibility(show,overseas,'https://unit.test','service'),false);
  assert.equal(saved.length,0);
  assert.equal(await recordFranceEligibility(show,verified,'https://unit.test','service'),true);
  assert.equal(saved.length,1);
  assert.match(saved[0].url,/fr_verified=is\.false/);
  const payload=JSON.parse(saved[0].config.body);
  assert.equal(payload.fr_verified,true);
  assert.equal(payload.fr_verification_method,'tmdb_fr_offer');
  assert.match(payload.fr_evidence_url,/locale=FR/);
 }finally{globalThis.fetch=previous}
});

test('French original TVmaze network requires explicit FR country code before verification',()=>{
 const code=fs.readFileSync(new URL('../scripts/import-tvmaze.mjs',import.meta.url),'utf8');
 assert.match(code,/network\?\.country\?\.code==='FR'/);
 assert.match(code,/webChannel\?\.country\?\.code==='FR'/);
 assert.match(code,/fr_verified=is\.false/);
});
