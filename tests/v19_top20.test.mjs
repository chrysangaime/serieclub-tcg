import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {officialSeasonCatalog,officialSeasonHTML,officialSeasonDetailsHTML} from '../v10/seasons.js';
test('Historique et Top20 coexistent sans confondre 8 et 20 séries',()=>{
 assert.equal(officialSeasonCatalog.length,12);
 assert.equal(officialSeasonCatalog.filter(x=>x.elite).length,6);
 assert.equal(officialSeasonCatalog.filter(x=>!x.elite).length,6);
 assert.deepEqual([...new Set(officialSeasonCatalog.map(x=>x.id))].length,12);
 for(const x of officialSeasonCatalog.slice(6)){assert.equal(x.target_count,20);assert.ok(x.reward_credits>=300)}
});
test('Sans migration, les Top20 sont des aperçus, jamais des récompenses activées',()=>{
 const h=officialSeasonHTML({officialSeasons:officialSeasonCatalog.slice(0,6).map(x=>({...x,owned:8,claimed:true}))});
 assert.match(h,/12 saisons/);
 assert.match(h,/Top 20 Netflix France/);
 assert.match(h,/Top 20 Prime Video France/);
 assert.match(h,/Top 20 Disney\+ France/);
 assert.match(h,/Top 20 SF &amp; Fantasy/);
 assert.match(h,/Top 20 séries cultes/);
 assert.match(h,/Top 20 thrillers/);
 assert.match(h,/Activation serveur nécessaire/);
 assert.match(h,/data-season-details="top20_netflix_2026"/);
 assert.match(h,/data-claim-season="top20_netflix_2026" disabled/);
});
test('20 séries possédées ne suffisent pas si leur liste officielle est inactive',()=>{
 const entry=officialSeasonCatalog.find(x=>x.id==='top20_netflix_2026');
 const h=officialSeasonHTML({officialSeasons:[{...entry,owned:19,claimed:false}]});
 assert.match(h,/19 <small>\/ 20<\/small>/);
 assert.match(h,/data-claim-season="top20_netflix_2026" disabled/);
 const ok=officialSeasonHTML({officialSeasons:[{...entry,owned:20,claimed:false}]});
 assert.match(ok,/data-claim-season="top20_netflix_2026"(?! disabled)/);
});
test('Liste officielle 20 titres, possédés et liens affiches correctement échappés',()=>{
 const rows=Array.from({length:20},(_,i)=>({rank_number:i+1,series_id:i+1,
  name:i?'Titre '+i:'<script>alert(1)</script>',
  image_url:i?'https://example.org/x.png':'javascript:evil',owned:i<3}));
 const h=officialSeasonDetailsHTML({id:'top20_netflix_2026',title:'Top 20 Netflix France'},rows);
 assert.equal((h.match(/data-series="/g)||[]).length,20);
 assert.match(h,/3 \/ 20 séries possédées/);
 assert.match(h,/&lt;script&gt;/);
 assert.doesNotMatch(h,/<script>|src="javascript:/);
 assert.match(officialSeasonDetailsHTML({title:'Titre'},[]),/pas encore activée/);
});
test('Le serveur fige la sélection et contrôle chaque titre lors de la récompense',()=>{
 const sql=fs.readFileSync('supabase/game_v19_top20.sql','utf8');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS public\.official_season_titles/);
 assert.match(sql,/LEFT JOIN public\.official_season_titles/);
 assert.match(sql,/JOIN public\.official_season_titles t/);
 assert.match(sql,/count\(DISTINCT c\.series_id\)/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/ON CONFLICT\(player_id,season_id\) DO NOTHING/);
 assert.match(sql,/fr_verified IS TRUE/);
 assert.match(sql,/count\(\*\) FROM public\.official_season_titles/);
 assert.equal((sql.match(/\$\$/g)||[]).length%2,0);
});
