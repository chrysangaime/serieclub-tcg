import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const code=fs.readFileSync('supabase/functions/catalog-season-sync/index.ts','utf8');
const workflow=fs.readFileSync('.github/workflows/catalog-season-sync.yml','utf8');
test('Synchronisation incrémentale sécurisée : seulement les séries admises',()=>{
 assert.match(code,/req\.method!=='POST'/);
 assert.match(code,/bearer!==`Bearer \$\{role\}`/);
 assert.match(code,/\.eq\('content_status','series'\)/);
 assert.match(code,/\.eq\('fr_verified',true\)/);
 assert.match(code,/\.gt\('id',cursor\)/);
 assert.match(code,/catalog_sync_state/);
});
test('Données authentiques : vrai ID de saison, date et affiche TVmaze',()=>{
 assert.match(code,/tvmaze_season_id:x\.id/);
 assert.match(code,/premiereDate/);
 assert.match(code,/endDate/);
 assert.match(code,/x\.image\?\.original/);
 assert.match(code,/row\.image_url\|\|existing\.image_url/);
 assert.match(code,/\.eq\('season_number',row\.season_number\)/);
});
test('La tâche planifiée utilise uniquement un secret administrateur',()=>{
 assert.match(workflow,/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(workflow,/curl --fail-with-body/);
 assert.doesNotMatch(workflow,/sk_test_|sk_live_|eyJhbGci/);
});
