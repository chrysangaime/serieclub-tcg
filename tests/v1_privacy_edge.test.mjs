import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
const edge=fs.readFileSync("supabase/functions/account-delete/index.ts","utf8");
const sql=fs.readFileSync("supabase/game_v1_privacy_and_reports.sql","utf8");
test("La suppression exige un JWT et supprime l'identité renvoyée par Auth",()=>{
 for(const x of ["admin.auth.getUser(token)","admin.auth.admin.deleteUser(user.id, false)",
 "confirmation!==\"SUPPRIMER\"","get(\"SUPABASE_SERVICE_ROLE_KEY\")"])
 assert.ok(edge.includes(x),x);
 assert.doesNotMatch(edge,/deleteUser\((payload|body|input)\./);
 assert.match(edge,/request\.method !== "POST"/);
 assert.match(edge,/Cache-Control/);
 assert.match(edge,/new Set\(\[SITE_ORIGIN\]\)/);
 assert.match(fs.readFileSync("supabase/config.toml","utf8"),/\[functions\.account-delete\]\s*verify_jwt = true/);
});
test("Une transaction d'autre joueur n'empêche plus l'effacement du profil acheteur",()=>{
 assert.match(sql,/FOREIGN KEY \(buyer_id\) REFERENCES public\.profiles\(id\) ON DELETE SET NULL/);
 assert.match(sql,/CREATE OR REPLACE FUNCTION public\.export_my_account_data/);
 assert.match(sql,/REVOKE ALL ON FUNCTION public\.export_my_account_data\(\) FROM PUBLIC,anon/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.player_reports/);
 assert.match(sql,/REVOKE ALL ON public\.player_reports FROM PUBLIC,anon,authenticated/);
});
