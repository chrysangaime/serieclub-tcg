import test from 'node:test';
import assert from 'node:assert/strict';
import {
 findFrenchEditorial,wikipediaFrenchSynopsis,translatedFrenchSynopsis,getFrenchSynopsis
} from '../v4/synopsis-fr.js';
import {frenchSynopsisHTML,showDetailHTML} from '../v4/series.js';

const wiki=(title,id,extract)=>({
 query:{pages:[{pageid:id,title,extract}]}
});
const apiResponse=translatedText=>({
 responseStatus:200,responseData:{translatedText}
});

test('Dear White People and legendary titles have original French summaries with year-specific identity', async()=>{
 const show={id:1200001,name:'Dear White People',premiered:'2017-04-28'};
 assert.match((await getFrenchSynopsis(show,'A satire of campus life.')).text,/université prestigieuse/);
 assert.equal((await getFrenchSynopsis(show,'')).source,'editorial');
 assert.equal(findFrenchEditorial({id:1200002,name:'Lost',premiered:'2001-09-05'}),null);
 assert.equal(findFrenchEditorial({id:1200003,name:'Lost',premiered:'2004-09-22'})?.source,'editorial');
});

test('Wikipedia summaries must match television context, title and premiere year',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async()=>({ok:true,json:async()=>wiki(
  'Lost : Les Disparus',220001,
  'Lost : Les Disparus est une série télévisée américaine diffusée depuis 2004. '+
  'Un groupe de rescapés se retrouve isolé sur une île mystérieuse où il doit survivre.'
 )});
 try{
  const correct=await wikipediaFrenchSynopsis({name:'Lost',premiered:'2004-09-22'});
  assert.equal(correct?.source,'wikipedia');
  assert.match(correct?.text||'',/île mystérieuse/);
  assert.equal(correct?.sourceUrl,'https://fr.wikipedia.org/?curid=220001');
  assert.equal(await wikipediaFrenchSynopsis({name:'Lost',premiered:'2001-09-05'}),null);
  assert.equal(await wikipediaFrenchSynopsis({name:'Un autre titre',premiered:'2004-09-22'}),null);
 }finally{globalThis.fetch=old}
});

test('localized Wikipedia copy has visible source, license and no executable HTML',()=>{
 const html=frenchSynopsisHTML({
  source:'wikipedia',text:'Une série française <img src=x onerror=alert(1)> située à Paris.',
  sourceUrl:'https://fr.wikipedia.org/?curid=321'
 });
 assert.match(html,/CC BY-SA 4\.0/);
 assert.match(html,/curid=321/);
 assert.doesNotMatch(html,/<img/);
 assert.doesNotMatch(html,/onerror=/);
});

test('TVmaze translations are labeled automated and do not expose English first',async()=>{
 const old=globalThis.fetch;
 globalThis.fetch=async url=>{
  if(String(url).startsWith('https://fr.wikipedia.org/')){
   return {ok:true,json:async()=>({query:{pages:[]}})};
  }
  assert.ok(String(url).startsWith('https://api.mymemory.translated.net/get?'));
  const q=new URL(url).searchParams.get('q');
  assert.ok(new TextEncoder().encode(q).length<=500);
  return {ok:true,json:async()=>apiResponse(
   'Un groupe de jeunes étudiants découvre les secrets de leur université, '+
   'les relations entre amis et la vie qui évolue au fil des années.'
  )};
 };
 try{
  const show={id:1200101,name:'Campus Mystère',premiered:'2020-08-15'};
  const result=await getFrenchSynopsis(show,
   'A diverse group of young students uncovers the secrets of their university '+
   'as friendships and rivalries change over the years.');
  assert.equal(result.source,'translated');
  assert.match(result.text,/Un groupe de jeunes/);
  const html=showDetailHTML({
   name:show.name,summary:'A diverse group of young students uncovers secrets.'
  },show,result);
  assert.match(html,/Traduction automatique/);
  assert.doesNotMatch(html,/class="sc5-summary-short">A diverse group/);
 }finally{globalThis.fetch=old}
});

test('if French sources are unavailable, English is hidden in an opt-in disclosure',()=>{
 const html=frenchSynopsisHTML({source:'unavailable',text:''},
   'A young protagonist discovers the secrets of a mysterious city.');
 assert.match(html,/résumé français fiable/i);
 assert.match(html,/<details class="sc5-english-original">/);
 assert.match(html,/<summary>Consulter le synopsis original en anglais<\/summary>/);
 const loading=showDetailHTML({
  name:'Unknown',summary:'A protagonist discovers a mystery.'
 },{}, {source:'loading'});
 assert.match(loading,/Recherche du résumé en français/);
 assert.doesNotMatch(loading,/class="sc5-summary-short">A protagonist/);
});
