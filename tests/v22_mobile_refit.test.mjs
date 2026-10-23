import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {svodHome} from '../v12/home.js';
test('Les trois boosters ont un vrai logo TV original, pas des carrés génériques',()=>{
 const h=svodHome({pack:'classic',homeShows:[],seasonShows:[],wallet:{credits:1000},stock:{stock:10,maximum:10}}, {timecode:x=>x});
 for(const cls of ['sc22-booster-brand','sc22-booster-center','sc22-booster-footer','sc22-booster--original','sc22-booster--halloween','sc22-booster--premium'])
  assert.ok(h.includes(cls),cls);
 assert.match(h,/SÉRIES<em>CLUB<\/em>/);
 assert.match(h,/data-pack="classic"/);
 assert.match(h,/data-pack="halloween"/);
});
test('La charte V22 impose deux pochettes côte à côte sur mobile et Premium en bandeau',()=>{
 const css=fs.readFileSync('v22/mobile-refit.css','utf8');
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/v22\/mobile-refit\.css\?v=22\.0\.0/);
 assert.match(css,/@media\(max-width:690px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/sc12-pack-premium/);
 assert.match(css,/sc22-booster--halloween/);
 assert.match(css,/min-height:275px!important/);
});
test('Le bouton jour/nuit tient dans le topbar mobile, sans glyphes superposés',()=>{
 const css=fs.readFileSync('v22/mobile-refit.css','utf8');
 const app=fs.readFileSync('v3/app.js','utf8');
 assert.match(app,/sc22-theme-icon/);
 assert.match(app,/sc22-theme-label/);
 assert.match(css,/\.sc10-theme-toggle:before\{display:none!important/);
 assert.match(css,/width:38px!important/);
});
test('La boutique TV reste active et indépendante des boosters gratuits',()=>{
 const home=fs.readFileSync('v12/home.js','utf8');
 const app=fs.readFileSync('v3/app.js','utf8');
 assert.match(home,/creditThemeShelf\(s\)/);
 assert.match(app,/buy_credit_booster/);
 assert.match(app,/data-confirm-credit-pack/);
 assert.match(app,/open_starter_booster/);
});
