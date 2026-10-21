import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeCredits} from '../scripts/sync-fr-cast.mjs';
import {normalizePublicCast,castFallbackHTML} from '../v5/cast-fr.js';
import {getShowDetails,showDetailHTML} from '../v4/series.js';

const tmdb={cast:[
 {id:12,name:'Actrice sûre',roles:[{character:'Personnage'}],total_episode_count:8,profile_path:'/good.jpg'},
 {id:13,name:'<script>alert(1)</script>',roles:[{character:'<b>Malveillant</b>'}],total_episode_count:4,profile_path:'/good2.png'},
 {id:12,name:'Doublon',roles:[{character:'Doublon'}],total_episode_count:2}
]};

test('les crédits TMDB authentiques conservent acteur, personnage et photo sans doublon',()=>{
 const cast=normalizeCredits(tmdb);
 assert.equal(cast.length,2);
 assert.equal(cast[0].name,'Actrice sûre');
 assert.equal(cast[0].character,'Personnage');
 assert.equal(cast[0].profile_path,'/good.jpg');
 const display=normalizePublicCast(cast);
 assert.equal(display.length,2);
 assert.equal(display[0].image,'https://image.tmdb.org/t/p/w185/good.jpg');
 const html=castFallbackHTML({cast});
 assert.match(html,/Actrice sûre/);
 assert.match(html,/Personnage/);
 assert.match(html,/https:\/\/www\.themoviedb\.org\/person\/12/);
 assert.match(html,/&lt;script&gt;/);
 assert.doesNotMatch(html,/<script>/);
 assert.doesNotMatch(html,/<b>Malveillant<\/b>/);
});
test('la série peut afficher le casting TMDB même sans réponse TVmaze',()=>{
 const cast=normalizeCredits(tmdb);
 const html=showDetailHTML({},{id:2993,name:'Stranger Things',premiered:'2016-07-15',
   image_url:'https://example.org/st.jpg',rarity_source:'pending'}, {source:'loading'}, {cast});
 assert.match(html,/Actrice sûre/);
 assert.match(html,/Personnage/);
 assert.doesNotMatch(html,/Distribution non renseignée/);
 assert.doesNotMatch(html,/Rareté en attente de classement/);
 assert.doesNotMatch(html,/Informations fournies par TVmaze/);
 assert.doesNotMatch(html,/class="sc5-cast-section" data-cast-section hidden/);
 const empty=showDetailHTML({},{name:'Une série',rarity_source:'pending'});
 assert.match(empty,/data-cast-section hidden/);
});
test('Stranger Things est présente dans les deux caches France avec Netflix et une distribution',()=>{
 const fr=JSON.parse(fs.readFileSync('data/watch-fr.json','utf8'));
 const cast=JSON.parse(fs.readFileSync('data/cast-fr.json','utf8'));
 assert.equal(fr.titles['2993'].tmdb_id,66732);
 assert.ok(fr.titles['2993'].offers.some(o=>o.name==='Netflix'));
 assert.equal(cast.shows['2993'].tmdb_id,66732);
 assert.ok(cast.shows['2993'].cast.some(a=>a.name==='Millie Bobby Brown'));
 assert.ok(cast.shows['2993'].cast.some(a=>a.name==='Winona Ryder'));
});
test('TVmaze peut récupérer les artistes séparément si la fiche embarquée échoue',async()=>{
 const id=957319;
 const original=globalThis.fetch;
 const requested=[];
 globalThis.fetch=async url=>{
  const path=new URL(url).pathname;
  requested.push(path);
  if(path==='/shows/'+id) {
   if(String(url).includes('embed'))return {ok:false,status:502};
   return {ok:true,status:200,json:async()=>({id,name:'Test',premiered:'2000-01-01'})};
  }
  if(path==='/shows/'+id+'/cast')return {ok:true,status:200,json:async()=>[
   {person:{id:31,name:'Acteur'}}]};
  if(path==='/shows/'+id+'/seasons')return {ok:true,status:200,json:async()=>[{}]};
  throw Error('Unexpected request '+url);
 };
 try{
  const show=await getShowDetails(id);
  assert.equal(show.name,'Test');
  assert.equal(show._embedded.cast[0].person.name,'Acteur');
  assert.equal(show._embedded.seasons.length,1);
  assert.equal(requested.length,4);
 }finally{globalThis.fetch=original}
});
