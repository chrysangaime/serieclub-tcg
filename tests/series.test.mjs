import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stripSummary,miniSummary,getShowDetails,searchPeople,getPersonFilmography,
  showDetailHTML,actorDetailHTML,actorCatalogueView
} from '../v4/series.js';

test('sanitizes rich synopsis into text and safely truncates it',()=>{
 assert.equal(stripSummary('<p>Une <b>grande</b> série &amp; une suite&#8230;</p>'),'Une grande série & une suite…');
 assert.ok(miniSummary('<p>'+('A description of the show. '.repeat(30))+'</p>').endsWith('…'));
 const html=showDetailHTML({
  id:99,name:'<i>Fake show</i>',summary:'<p>Critique <img src=x onerror="alert(1)"> &amp; suspense.</p>',
  premiered:'2022-01-03',status:'Running',rating:{average:8},
  _embedded:{cast:[{person:{id:45,name:'Actor Example',image:{medium:'https://example.com/person.jpg'}},character:{name:'Detective'}}],seasons:[{},{}]}
 });
 assert.match(html,/data-person="45"/);
 const castSection=html.split('class="sc5-cast-list"')[1].split('</section>')[0];
 assert.match(castSection,/sc5-cast-thumb/,'compact cast rows should include small portrait');
 assert.match(html,/sc5-compact-dialog/);
 assert.match(html,/Informations complémentaires/);
 assert.match(html,/2 saisons/);
 assert.match(html,/En quelques mots/);
 assert.ok(!html.includes('onerror='));
 assert.ok(!html.includes('<i>Fake show</i>'));
 assert.match(html,/&lt;i&gt;Fake show&lt;\/i&gt;/);
 assert.match(html,/TVmaze/);
});
test('shows filmography with catalogued cards and direct series navigation',()=>{
 const people=actorDetailHTML({id:45,name:'Actress X',image:{medium:'https://example.com/p.jpg'}},[
  {id:99,name:'Fiction A',premiered:'2020-01-01'},
  {id:98,name:'Fiction B',premiered:'2018-01-01'}
 ],new Set([99]),true);
 assert.match(people,/data-series="99"/);
 assert.match(people,/sc5-actor-portrait/,'actor detail retains only a small portrait');
 const actorList=people.split('class="sc5-credits"')[1].split('</section>')[0];
 assert.match(actorList,/sc5-credit-thumb/,'compact actor filmography should include poster thumbnails');
 assert.match(people,/Dans SérieClub/);
 assert.match(people,/Retour à la série/);
 const catalog=actorCatalogueView({
  catalogMode:'actors',actorQuery:'X',
  actorMatches:[{id:45,name:'Actress X',country:{name:'France'}}],
  actorSelected:{id:45,name:'Actress X'},actorShows:[{id:99,name:'Fiction A'},{id:98,name:'Fiction B'}],
  actorCatalogueIds:[99],actorLoading:false,actorError:''
 });
 assert.match(catalog,/data-select-actor="45"/);
 assert.match(catalog,/data-series="99"/);
 const catalogueList=catalog.split('class="sc5-filmography-grid"')[1].split('</div>')[0];
 assert.match(catalogueList,/sc5-list-thumb/,'actor filters should include small series artwork');
 assert.match(catalog,/Dans SérieClub/);
 assert.match(catalog,/Par acteur/);
 const onlyClub=actorCatalogueView({
  catalogMode:'actors',actorQuery:'X',actorMatches:[],
  actorSelected:{id:45,name:'Actress X'},actorShows:[{id:99,name:'Fiction A'},{id:98,name:'Fiction B'}],
  actorCatalogueIds:[99],actorOnlyClub:true,actorLoading:false,actorError:''
 });
 assert.match(onlyClub,/type="checkbox" id="actorOnlyClub"/);
 assert.match(onlyClub,/Fiction A/);
 assert.doesNotMatch(onlyClub,/Fiction B/);
});
test('fetches genuine TVmaze cast and cross-series credits with one in-memory cache',async()=>{
 const original=globalThis.fetch;
 const calls=[];
 globalThis.fetch=async (url)=>{
  const path=new URL(url).pathname;
  calls.push(path);
  const routes={
   '/shows/849912':{id:849912,name:'TVmaze Show',_embedded:{cast:[{person:{id:849913,name:'Actor Y'}}],seasons:[{}]}},
   '/search/people':[{person:{id:849913,name:'Actor Y'}}],
   '/people/849913':{id:849913,name:'Actor Y'},
   '/people/849913/castcredits':[
    {_embedded:{show:{id:849912,name:'TVmaze Show',premiered:'2024-01-01'}}},
    {_embedded:{show:{id:849911,name:'Another Show',premiered:'2012-01-01'}}},
    {_embedded:{show:{id:849912,name:'TVmaze Show',premiered:'2024-01-01'}}}
   ]
  };
  if(!(path in routes))throw Error('Unexpected URL '+url);
  return {ok:true,status:200,json:async()=>routes[path]};
 };
 try{
  const show=await getShowDetails(849912);
  assert.equal(show._embedded.cast[0].person.name,'Actor Y');
  assert.equal((await searchPeople('Actor Y'))[0].name,'Actor Y');
  const film=await getPersonFilmography(849913);
  assert.equal(film.person.name,'Actor Y');
  assert.deepEqual(film.shows.map(x=>x.name),['TVmaze Show','Another Show']);
  await getShowDetails(849912);
  assert.equal(calls.filter(x=>x==='/shows/849912').length,1,'show details should be cached');
  assert.equal(calls.length,4);
 }finally{globalThis.fetch=original}
});
