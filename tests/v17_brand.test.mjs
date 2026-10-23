import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('La nouvelle marque Epizora TCG est visible sur tous les points de contact',()=>{
 for(const p of ['index.html','manifest.webmanifest','v3/app.js','v3/views.js','v12/home.js','v10/store.js','v7/booster.js','v3/icon.svg']){
  assert.match(read(p),/Epizora TCG|EPIZORA TCG|EPI<strong>ZORA|EPI<em>ZORA/,p);
  assert.doesNotMatch(read(p),/SériesClubTCG|SÉRIESCLUBTCG|SÉRIES<strong>CLUB/,p);
 }
});
