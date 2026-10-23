import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeSeasonList,seasonGalleryHTML} from '../v4/season-detail.js';
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
 assert.match(html,/distribution générale/i);
 assert.doesNotMatch(html,/themoviedb|image\.tmdb/);
});
test('Un poster hostile, une saison zéro ou une légende injectée ne passent pas',()=>{
 const raw=[{id:1,number:0},{id:2,number:1,
  name:'<img src=x onerror=alert(1)>',
  image:{medium:'https://evil.example/123.jpg'},
  summary:'<script>alert(1)</script> Saison <b>enquête</b>'}];
 const h=seasonGalleryHTML(raw);
 assert.doesNotMatch(h,/<img src=x|<script>|evil\.example|onerror=/);
 assert.match(h,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.match(h,/sc-season-no-poster/);
 assert.doesNotMatch(h,/data-season-number="0"/);
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
 assert.match(fs.readFileSync('index.html','utf8'),/season-detail\.css\?v=1\.0\.0/);
 const app=fs.readFileSync('v3/app.js','utf8');
 assert.match(app,/seasonGallery=template\.querySelector/);
 assert.match(fs.readFileSync('v4/series.js','utf8'),/seasonGalleryHTML\(show\._embedded\?\.seasons\)/);
});
