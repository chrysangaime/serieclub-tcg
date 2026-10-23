import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {communityPage} from '../v4/club.js';
test('Le Signal propose un code joueur sans divulguer d’adresse e-mail',()=>{
 const out=communityPage({user:{id:'u'},players:[],inviteCode:'AB12CD34EF'});
 assert.match(out,/data-copy-club-code/);
 assert.match(out,/data-follow-club-code/);
 assert.match(out,/value="AB12CD34EF"/);
 assert.doesNotMatch(out,/@example\.org/);
 const unavailable=communityPage({user:{id:'u'},players:[],inviteCode:null});
 assert.match(unavailable,/Activation en cours/);
 assert.match(unavailable,/data-follow-club-code disabled/);
});
test('Sans compte, aucune invitation publique ni faux accès aux données privées',()=>{
 const html=communityPage({user:null,players:[]});
 assert.doesNotMatch(html,/data-follow-club-code/);
 assert.doesNotMatch(html,/id="myClubCode"/);
});
test('La base conserve le code et contrôle la propriété et l’identité',()=>{
 const sql=fs.readFileSync('supabase/game_v1_invite_codes.sql','utf8');
 for(const frag of ['auth.uid()','gen_random_bytes(5)','owner_id uuid PRIMARY KEY','ON CONFLICT DO NOTHING',
 'RLS','FOR UPDATE','player_follows','GRANT EXECUTE','target=uid']) {
  if(frag==='RLS')assert.match(sql,/ENABLE ROW LEVEL SECURITY/);
  else assert.ok(sql.includes(frag),frag);
 }
});
