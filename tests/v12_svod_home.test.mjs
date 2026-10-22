import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {svodHome,homeGenres} from '../v12/home.js';
import {packs,foil,navItems} from '../v3/views.js';

const posters=[
 {id:1,name:'Lost',genres:['Drama','Mystery'],image_url:'https://static.tvmaze.com/p1.jpg'},
 {id:2,name:'Friends',genres:['Comedy'],image_url:'https://static.tvmaze.com/p2.jpg'},
 {id:3,name:'The X-Files',genres:['Science-Fiction','Mystery'],image_url:'https://static.tvmaze.com/p3.jpg'},
 {id:4,name:'From',genres:['Horror','Thriller'],image_url:'https://static.tvmaze.com/p4.jpg'},
 {id:5,name:'Stranger Things',genres:['Fantasy'],image_url:'https://static.tvmaze.com/p5.jpg'},
 {id:6,name:'Arcane',genres:['Animation'],image_url:'https://static.tvmaze.com/p6.jpg'}
];
const demo={pack:'classic',cards:[],seasonShows:[],homeShows:posters,user:{id:'test'},
 stock:{stock:7,maximum:10,recharge_seconds:300},wallet:{boosters_opened:7,credits:3635}};
const renderer=s=>svodHome(s,{foil,platformStrip:()=>'<span>Netflix · Prime Video</span>',
 seasonShelf:()=>'',timecode:s=>String(s)});

test('V12 construit un vrai accueil SVOD distinct de la page historique',()=>{
 const html=renderer(demo);
 assert.match(html,/sc12-banner/);
 assert.match(html,/hero-packs sc12-home/);
 assert.match(html,/À découvrir ce soir/);
 assert.match(html,/Séries à l’affiche/);
 assert.match(html,/sc12-home-grid/);
 assert.match(html,/Mon avancement/);
 assert.match(html,/data-route="albums"/);
 assert.match(html,/3 635|3 635/);
 assert.match(html,/7 \/ 10 paquets/);
 assert.match(html,/id="packTimer"/);
 assert.match(html,/id="openPack"/);
 assert.match(html,/data-daily/);
 assert.match(html,/data-home-event/);
 assert.match(html,/id="svod-packs"/);
});
test('le vrai jeu n’offre que classic et halloween : premium est une vitrine, pas un booster actif',()=>{
 const html=renderer(demo);
 assert.match(html,/data-pack="classic"/);
 assert.match(html,/data-pack="halloween"/);
 assert.match(html,/data-route="store"/);
 assert.match(html,/EN PRÉPARATION/);
 assert.doesNotMatch(html,/data-pack="premium"/);
 assert.match(html,/mêmes probabilités/);
});
test('boutons gratuits et réserve: nouveaux et joueurs restent correctement traités',()=>{
 const guest=renderer({...demo,user:null,stock:null,pack:'classic'});
 assert.match(guest,/Commencer à jouer/);
 assert.match(guest,/Créer un compte gratuit/);
 assert.doesNotMatch(guest,/<button id="openPack"[^>]* disabled/);
 const empty=renderer({...demo,stock:{stock:0,maximum:10,recharge_seconds:600}});
 assert.match(empty,/<button id="openPack"[^>]* disabled/);
});
test('les affiches sont sourcées depuis le catalogue certifié injecté, avec accès aux vraies fiches',()=>{
 const html=renderer(demo);
 assert.match(html,/sc12-pack-backdrop/);
 assert.match(html,/data-series="1"/);
 assert.match(html,/aria-label="Voir la fiche de Lost"/);
 assert.match(html,/data-home-genre="Comedy"/);
 assert.match(html,/data-home-decade="1990"/);
 assert.equal(homeGenres.length,6);
 assert.doesNotMatch(html,/data-pay-now|data-buy-credits/);
});
test('les genres, noms et URL sont échappés (aucun HTML dynamique non fiable)',()=>{
 const bad={id:999,name:'<img src=x onerror=alert(1)>',genres:['Comedy'],
  image_url:'javascript:alert(1)'};
 const html=renderer({...demo,homeShows:[bad]});
 assert.doesNotMatch(html,/<img src=x onerror/);
 assert.doesNotMatch(html,/src="javascript:/);
 const html2=renderer({...demo,homeShows:[{...bad,image_url:'https://example.com/c.png'}]});
 assert.match(html2,/&lt;img src=x onerror=alert\(1\)&gt;/);
});
test('V12 est chargé en dernier et les deux thèmes utilisent les mêmes composants',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const css=fs.readFileSync('v12/svod.css','utf8');
 const app=fs.readFileSync('v3/app.js','utf8');
 assert.ok(html.indexOf('v12/svod.css')>html.indexOf('v11/design-system.css'));
 assert.match(html,/v3\/app\.js\?v=12\.0\.0/);
 assert.match(html,/v12\/home\.js\?v=12\.0\.0/);
 assert.match(css,/:root\[data-theme="night"\]/);
 assert.match(css,/:root\[data-theme="day"\]/);
 assert.match(css,/#sidebar \.logo \.logo-mark/);
 assert.match(css,/transform:none!important/);
 assert.match(css,/@media\(max-width:600px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(app,/function loadHomeShows\(/);
 assert.match(app,/function submitGlobalSearch\(/);
 assert.match(app,/function globalClick\(e\)/);
 assert.match(app,/data-home-genre/);
 assert.match(app,/globalSearchForm/);
 assert.equal(navItems.length,14);
});
test('un aperçu reste possible même sans données réseau de séries',()=>{
 const html=renderer({...demo,homeShows:[],seasonShows:[],cards:[]});
 assert.match(html,/De nouvelles séries seront affichées ici/);
 assert.match(html,/sc12-genre-card/);
 assert.match(html,/id="openPack"/);
});
