import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeSeasonList,seasonGalleryHTML,creditedSeasonCast} from '../v4/season-detail.js';
import {showDetailHTML} from '../v4/series.js';

const saisons=[
 {id:54,number:2,name:'Saison 2',premiereDate:'2015-06-21',episodeOrder:8,
  image:{medium:'https://static.tvmaze.com/uploads/images/medium_portrait/2/222.jpg'},
  summary:'<p>Une <b>autre</b> enquête.</p>'},
 {id:53,number:1,name:'Saison 1',premiereDate:'2014-01-12',episodeOrder:8,
  image:{medium:'https://static.tvmaze.com/uploads/images/medium_portrait/1/111.jpg'},
  summary:'<p>La première enquête.</p>'}
];
test('Saisons distinctes : deux affiches et intrigues différentes, saison 1 avant saison 2',()=>{
 const normalized=normalizeSeasonList(saisons);
 assert.deepEqual(normalized.map(s=>s.number),[1,2]);
 assert.notEqual(normalized[0].poster,normalized[1].poster);
 const html=seasonGalleryHTML(saisons);
 assert.match(html,/Explorer les saisons/);
 assert.match(html,/Affiche de la saison 1/);
 assert.match(html,/Affiche de la saison 2/);
 assert.match(html,/La première enquête/);
 assert.match(html,/Une autre enquête/);
 assert.ok(html.indexOf('Saison 1')<html.indexOf('Saison 2'));
 assert.match(html,/Distribution par saison vérifiée/i);
 assert.doesNotMatch(html,/themoviedb|image\.tmdb/);
});
test('Un poster hostile, une saison zéro ou une légende injectée ne passent pas',()=>{
 const raw=[{id:1,number:0},{id:2,number:1,
  name:'<img src=x onerror=alert(1)>',
  image:{medium:'https://evil.example/123.jpg'},
  summary:'<script>alert(1)</script> Saison <b>enquête</b>'}];
 const h=seasonGalleryHTML(raw);
 assert.doesNotMatch(h,/<img src=x|<script>|evil\.example/);
 assert.match(h,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(h,/sc-season-no-poster/);
 assert.doesNotMatch(h,/<img src=x|<script>|evil\.example/);
});
test('La fiche de True Detective conserve la carte série et ajoute la galerie TVmaze',()=>{
 const show={id:5,name:'True Detective',image_url:'https://static.tvmaze.com/uploads/images/medium_portrait/1/1.jpg',
  _embedded:{seasons:saisons,cast:[]}};
 const card={id:5,name:'True Detective',rarity_source:'editorial',rarity:'Légendaire',fr_verified:true};
 const html=showDetailHTML(show,card,{source:'unavailable'});
 assert.match(html,/True Detective/);
 assert.match(html,/Légendaire/);
 assert.match(html,/sc-season-gallery/);
 assert.match(html,/Distribution générale/);
 assert.match(html,/TVmaze/);
 assert.ok(html.indexOf('sc-season-gallery')<html.indexOf('sc5-cast-section'));
 assert.equal(card.id,5,'La carte mère ne change pas');
});
test('La V1 intègre effectivement les styles de saison et le chargement TVmaze tardif',()=>{
 assert.match(fs.readFileSync('index.html','utf8'),/season-detail\.css\?v=1\.0\.2/);
 const app=fs.readFileSync('v3/app.js','utf8');
 assert.match(app,/seasonGallery=template\.querySelector/);
 assert.match(fs.readFileSync('v4/series.js','utf8'),/seasonGalleryHTML\(show\._embedded\?\.seasons,\{showId:show\.id,cast\}\)/);
});

test('True Detective distingue les castings HBO des saisons 1, 2, 3 et 4',()=>{
 const s1=creditedSeasonCast(5,1,[{person:{id:19,name:'Matthew McConaughey',image:{medium:'https://static.tvmaze.com/uploads/images/medium_portrait/1/11.jpg'}},character:{name:'Rust Cohle'}}]);
 const s2=creditedSeasonCast(5,2);
 const s3=creditedSeasonCast(5,3);
 const s4=creditedSeasonCast(5,4);
 assert.ok(s1.some(x=>x.name==='Matthew McConaughey'&&x.character==='Rust Cohle'));
 assert.ok(s2.some(x=>x.name==='Rachel McAdams')&&!s2.some(x=>x.name==='Matthew McConaughey'));
 assert.ok(s3.some(x=>x.name==='Mahershala Ali'));
 assert.ok(s4.some(x=>x.name==='Jodie Foster'));
 assert.deepEqual(creditedSeasonCast(1000,1),[]);
 const html=seasonGalleryHTML(saisons,{showId:5,cast:[]});
 assert.match(html,/Distribution principale · Saison 1/);
 assert.match(html,/Matthew McConaughey/);
 assert.match(html,/Rachel McAdams/);
 assert.doesNotMatch(html,/image\.tmdb\.org/);
});
