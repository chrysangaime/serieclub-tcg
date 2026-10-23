import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=p=>fs.readFileSync(p,"utf8");

test("Le dernier renommage non approuvé est annulé, sans toucher à la persistance",()=>{
 const publicFiles=["index.html","manifest.webmanifest","offline.html","v3/app.js","v3/views.js","v10/store.js","v12/home.js","v1/product.js","v4/club.js","v4/albums.js","v7/booster.js","v3/icon.svg"];
 for(const p of publicFiles) assert.doesNotMatch(read(p),/Epizora/i,p);
 assert.match(read("v1/product.js"),/name:'SériesClubTCG'/);
 assert.match(read("index.html"),/SériesClubTCG V1\.0/);
 assert.match(read("manifest.webmanifest"),/"short_name": "SériesClubTCG"/);
 assert.match(read("v3/app.js"),/createClient\(/);
 assert.match(read("index.html"),/name="robots" content="noindex,nofollow"/);
});
test("Les trois workflows d'enrichissement TMDB sont uniquement manuels",()=>{
 for(const p of [".github/workflows/sync-fr-streaming.yml",".github/workflows/expand-fr-catalog.yml",".github/workflows/sync-fr-cast.yml"]){
  const src=read(p);
  assert.match(src,/workflow_dispatch:/,p);
  assert.doesNotMatch(src,/^\s+schedule:/m,p);
  assert.doesNotMatch(src,/^\s+push:/m,p);
 }
});
test("Le mode commercial reste interdit tant que les caches TMDB ne sont pas éliminés",()=>{
 assert.match(read("v3/app.js"),/paymentsMode:'disabled'/);
 assert.match(read("STRATEGIE_SANS_CONTACT_V1.md"),/supprimer la dépendance TMDB/i);
 assert.match(read("STRATEGIE_SANS_CONTACT_V1.md"),/sources compatibles|sources commerciales|commercialement autorisées/);
});
