import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePublicCast,castFallbackHTML,getFrenchCastByShow} from '../v5/cast-fr.js';
import {getShowDetails,showDetailHTML} from '../v4/series.js';

test('Le jeu ne charge plus la distribution, les portraits ni les liens TMDB',async()=>{
 const legacy={cast:[{id:12,name:'Artiste',character:'Personnage',profile_path:'/actor.jpg'}]};
 assert.deepEqual(normalizePublicCast(legacy.cast),[]);
 assert.equal(castFallbackHTML(legacy),'');
 assert.equal(await getFrenchCastByShow(2993),null);
 const html=showDetailHTML({},{id:2993,name:'Série test',rarity_source:'pending'}, {source:'loading'}, legacy);
 assert.doesNotMatch(html,/image\.tmdb\.org|themoviedb\.org|Artiste/);
 assert.match(html,/data-cast-section hidden/);
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
