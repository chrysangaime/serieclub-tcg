import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('Marque commerciale officielle SériesClubTCG sur les points de contact publics',()=>{
 for(const p of ['index.html','manifest.webmanifest','v3/app.js','v3/views.js','v12/home.js','v10/store.js','v7/booster.js','v3/icon.svg']){
  assert.match(read(p),/SériesClubTCG|SÉRIESCLUBTCG|SÉRIES<strong>CLUB<\/strong><em>TCG<\/em>|SÉRIES<em>CLUB<\/em>TCG/,p);
  assert.doesNotMatch(read(p),/SérieClub TCG|SÉRIECLUB TCG|SÉRIECLUB(?!TCG)/,p);
 }
});
