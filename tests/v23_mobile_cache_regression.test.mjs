import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {svodHome} from '../v12/home.js';
const read=p=>fs.readFileSync(p,'utf8');
test('La page déployée charge réellement le composant V23 (sans cache de V18)',()=>{
 const index=read('index.html'),app=read('v3/app.js'),views=read('v3/views.js');
 assert.match(index,/v3\/app\.js\?v=1\.0\.0/);
 assert.match(index,/v23\/final-mobile\.css\?v=23\.0\.0/);
 assert.match(app,/\.\/views\.js\?v=1\.0\.0/);
 assert.match(views,/v12\/home\.js\?v=1\.0\.0&build=9/);
 assert.match(app,/v7\/booster\.js\?v=1\.0\.0&build=9/);
 assert.match(index,/v3\/views\.js\?v=1\.0\.0&build=9/);
 assert.doesNotMatch(views,/v12\/home\.js\?v=18\.0\.0/);
});
test('Les libellés ne recouvrent plus les pochettes',()=>{
 const html=svodHome({pack:'classic',homeShows:[],seasonShows:[],cards:[],wallet:{credits:5000},
  stock:{stock:8,maximum:10},isOctober:true},{});
 assert.match(html,/sc22-booster--original/);
 assert.match(html,/sc22-booster--halloween/);
 assert.match(html,/sc22-booster--premium/);
 assert.match(html,/sc23-pack-label/);
 // Pas de libellé enfant direct entre <article> et .sc15-pack-art.
 const titles=['sc12-pack-original','sc12-pack-halloween','sc12-pack-premium'];
 for(const title of titles){
  const at=html.indexOf('sc12-pack-tile sc12-pack-'+(title==='sc12-pack-original'?'classic':title.replace('sc12-pack-','')));
  assert.ok(at>=0,title);
  const segment=html.slice(at,html.indexOf('</article>',at));
  assert.ok(segment.indexOf('sc15-pack-art')<segment.indexOf('sc23-pack-label'),
   'Le badge doit se situer après le visuel, hors de la pochette');
 }
});
test('CSS de sécurité : pochettes limitées au conteneur et étiquettes statiques',()=>{
 const css=read('v23/final-mobile.css');
 for(const part of [
  'max-width:calc(100% - 18px)!important',
  '.sc15-pack-copy>.sc23-pack-label',
  'position:static!important',
  '@media(max-width:690px)',
  '.sc12-pack-premium'
 ])assert.ok(css.includes(part),part);
 assert.match(css,/width:100px!important;height:128px!important/);
});
