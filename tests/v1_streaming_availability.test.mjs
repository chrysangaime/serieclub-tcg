import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeMovieOfTheNight} from '../scripts/sync-independent-streaming.mjs';
import {normalizeFranceOffers,renderFranceAvailability,getFrenchOffersByShow} from '../v5/fr-watch.js';

const imdb='tt1234567';
const providerResponse={
 showType:'series',imdbId:imdb,
 streamingOptions:{fr:[
  {type:'subscription',service:{id:'netflix'},link:'https://www.netflix.com/title/80230001'},
  {type:'subscription',service:{id:'disney'},link:'https://www.disneyplus.com/browse/entity-45'},
  {type:'buy',service:{id:'apple'},link:'https://tv.apple.com/fr/show/example'},
  {type:'addon',service:{id:'prime'},link:'https://www.primevideo.com/detail/test'},
  {type:'subscription',service:{id:'netflix'},link:'https://evil.netflix.com.attacker.tld/'},
  {type:'subscription',service:{id:'unknown'},link:'https://unknown.example/show'}
 ],us:[{type:'subscription',service:{id:'hbo'},link:'https://max.com'}]}
};
const licensed=()=>({
 source:'movieofthenight',country:'FR',
 checked_at:new Date().toISOString(),
 expires_at:new Date(Date.now()+6*86400000).toISOString(),
 offers:normalizeMovieOfTheNight(providerResponse,imdb)
});
test('Le fournisseur renvoie seulement les offres françaises par identifiant IMDb vérifié',()=>{
 const offers=normalizeMovieOfTheNight(providerResponse,imdb);
 assert.deepEqual(offers.map(o=>o.name),['Netflix','Disney+','Apple TV','Prime Video']);
 assert.deepEqual(offers.map(o=>o.type),['flatrate','flatrate','buy','addon']);
 assert.equal(normalizeMovieOfTheNight(providerResponse,'tt1234568'),null);
 assert.equal(normalizeMovieOfTheNight({...providerResponse,showType:'movie'},imdb),null);
 assert.equal(normalizeMovieOfTheNight({...providerResponse,streamingOptions:{}},imdb),null);
});
test('Les fiches affichent Disponible sur sans logo ni URL tierce malveillante',()=>{
 const info=licensed(),valid=normalizeFranceOffers(info);
 assert.equal(valid.offers.length,4);
 const html=renderFranceAvailability(info,{network:{name:'CBS',country:{code:'US'}}});
 assert.match(html,/Disponible sur/);
 assert.match(html,/Netflix/);
 assert.match(html,/Disney\+/);
 assert.match(html,/Achat \/ location/);
 assert.match(html,/Avec supplément/);
 assert.match(html,/Movie of the Night/);
 assert.doesNotMatch(html,/image\.tmdb\.org|themoviedb\.org|evil\.netflix|<img\b|>CBS</);
});
test('Les offres expirées, sources TMDB, pays hors FR et protocoles non sûrs sont exclus',()=>{
 const info=licensed();
 assert.equal(normalizeFranceOffers({...info,country:'US'}),null);
 assert.equal(normalizeFranceOffers({...info,source:'tmdb'}),null);
 assert.equal(normalizeFranceOffers({...info,checked_at:'2022-01-01T00:00:00Z'}),null);
 assert.equal(normalizeFranceOffers({...info,expires_at:'2022-01-01T00:00:00Z'}),null);
 const hostile={...info,offers:[{id:'netflix',type:'flatrate',name:'<script>x</script>',url:'javascript:alert(1)'}]};
 assert.equal(normalizeFranceOffers(hostile),null);
 assert.match(renderFranceAvailability(hostile),/Offres de streaming non confirmées/);
});
test('L’interface n’utilise que la passerelle privée et pas la clé du fournisseur',async()=>{
 const prev=globalThis.fetch,seen=[];
 globalThis.fetch=async u=>{
  seen.push(String(u));
  return {ok:true,json:async()=>licensed()};
 };
 try{
  const record=await getFrenchOffersByShow(800112);
  assert.equal(normalizeFranceOffers(record).offers.length,4);
  assert.equal(seen.length,1);
  assert.match(seen[0],/functions\/v1\/fr-streaming\?series_id=800112/);
  assert.doesNotMatch(seen[0],/movieofthenight\.com|themoviedb\.org/);
 }finally{globalThis.fetch=prev}
});
test('Le cache serveur privé interdit l’accès direct à la table',()=>{
 const edge=fs.readFileSync('supabase/functions/fr-streaming/index.ts','utf8');
 assert.match(edge,/fr_streaming_cache/);
 assert.match(edge,/Origin/);
 assert.doesNotMatch(edge,/movieofthenight\.com\/v4/);
 const job=fs.readFileSync('.github/workflows/sync-independent-streaming.yml','utf8');
 assert.match(job,/STREAMING_AVAILABILITY_API_KEY:.*secrets/);
 assert.match(job,/MONTHLY_LIMIT: '180'/);
 assert.match(fs.readFileSync('v3/app.js','utf8'),/paymentsMode:'disabled'/);
});
