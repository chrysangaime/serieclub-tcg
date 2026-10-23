import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const app=fs.readFileSync('v3/app.js','utf8');
const migration=fs.readFileSync('supabase/game_v1_account_requests.sql','utf8');
test('Un échec de suppression garde le compte intact et propose un examen manuel',()=>{
 assert.match(app,/function requestDeletionReview\(/);
 assert.match(app,/data-delete-review/);
 assert.match(app,/rpc\('request_account_deletion'\)/);
 assert.match(app,/Ton compte reste actif jusqu’au traitement confirmé/);
 assert.match(app,/Suppression non confirmée/);
});
test('Une demande ne supprime pas elle-même les données ou les comptes Auth',()=>{
 assert.match(migration,/account_deletion_requests/);
 assert.match(migration,/auth\.uid\(\)/);
 assert.match(migration,/REVOKE ALL ON FUNCTION public\.request_account_deletion\(\) FROM PUBLIC,anon/);
 assert.doesNotMatch(migration,/DELETE FROM auth\.users|deleteUser\(/i);
});
