import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";
import {privacyPage,legalPage,supportPage,deletionDialog} from "../v1/privacy.js";
import {settings} from "../v3/views.js";
import {footerHTML} from "../v1/product.js";
test("Le joueur accède réellement à la confidentialité et aux mentions provisoires",()=>{
 const footer=footerHTML();for(const route of ['privacy','legal','support'])assert.match(footer,new RegExp('data-route="'+route+'"'));
 assert.match(privacyPage(),/Supabase/);
 assert.match(privacyPage(),/préparation|provisoire/);
 assert.match(legalPage(),/informations de l’éditeur|éditeur/);
 assert.match(legalPage(),/non encore publiées/);
 const app=fs.readFileSync("v3/app.js","utf8");
 assert.match(app,/privacy:privacyPage/);
 assert.match(app,/legal:legalPage/);
 assert.match(app,/support:supportPage/);
});
test("Suppression : confirmation explicite et aucun champ de destinataire modifiable",()=>{
 const panel=settings({user:{id:'u',email:'test@example.org'},theme:'night'});
 assert.match(panel,/data-delete-account-start/);
 const dialog=deletionDialog("test@example.org");
 assert.match(dialog,/data-delete-account-confirm/);
 assert.match(dialog,/SUPPRIMER/);
 assert.match(dialog,/type="password"/);
 assert.match(dialog,/test@example\.org/);
 const app=fs.readFileSync("v3/app.js","utf8");
 assert.match(app,/supa\.auth\.signInWithPassword\(\{email,password:pass\}\)/);
 assert.match(app,/supa\.functions\.invoke\('account-delete'/);
 assert.match(app,/data\?\.deleted!==true/);
 const signedOut=settings({user:null,theme:'night'});
 assert.doesNotMatch(signedOut,/data-delete-account-start/);
});
test("Signalement : seules les personnes connectées peuvent transmettre",()=>{
 const inHtml=supportPage({user:{id:'player'}});
 assert.match(inHtml,/id="clubReportForm"/);
 assert.match(inHtml,/maxlength="600"/);
 assert.match(inHtml,/option value="copyright"/);
 assert.doesNotMatch(supportPage({user:null}),/id="clubReportForm"/);
 const app=fs.readFileSync("v3/app.js","utf8");
 assert.match(app,/supa\.rpc\('submit_player_report'/);
 assert.match(app,/supa\.rpc\('export_my_account_data'/);
});

test("Un signalement est accessible depuis une carte, une annonce et le profil public",()=>{
 const market=fs.readFileSync("v4/club.js","utf8");
 const details=fs.readFileSync("v4/series.js","utf8");
 const app=fs.readFileSync("v3/app.js","utf8");
 assert.match(market,/data-report-listing=/);
 assert.match(market,/data-report-player=/);
 assert.match(details,/data-report-series=/);
 assert.match(app,/data-report-player\],\[data-report-listing\],\[data-report-series\]/);
});
test("Mot de passe oublié et récupération de compte",()=>{
 const app=fs.readFileSync("v3/app.js","utf8");
 assert.match(app,/authForgotPassword/);
 assert.match(app,/resetPasswordForEmail/);
 assert.match(app,/PASSWORD_RECOVERY/);
 assert.match(app,/updateUser\(\{password\}\)/);
 assert.match(app,/password.length<12/);
});
