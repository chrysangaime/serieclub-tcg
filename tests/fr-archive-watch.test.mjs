import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {partitionFrenchInventory,frenchPlayable} from '../v5/fr-collection.js';
import {getFrenchOffersByShow,normalizeFranceOffers,renderFranceAvailability} from '../v5/fr-watch.js';

const base={
 id:430,name:'The X-Files',premiered:'1993-09-10',
 rarity:'Légendaire',rarity_source:'editorial',
 image_url:'https://example.com/xfiles.jpg'
};
const card=(id,verified,source='editorial')=>({
 id,series_id:Number(id.slice(1)),rarity:'Commune',
 series:{...base,fr_verified:verified,rarity_source:source}
});

test('old non-French cards are excluded from every playable collection counter without being deleted',()=>{
 const existing=[card('c1',true),card('c2',false),card('c3',null),
  card('c4',true,'pending')];
 const originalCopy=[...existing];
 const wishes=[
  {series_id:430,series:{...base,fr_verified:true}},
  {series_id:431,series:{...base,fr_verified:false}}
 ];
 const visible=partitionFrenchInventory(existing,wishes);
 assert.equal(visible.cards.length,1);
 assert.equal(visible.cards[0].id,'c1');
 assert.equal(visible.wishes.length,1);
 assert.equal(visible.excludedCardsCount,3);
 assert.equal(visible.excludedWishesCount,1);
 assert.equal(originalCopy.length,4);
 assert.equal(existing.length,4,'the historical database/query input must remain untouched');
 assert.equal(frenchPlayable(existing[1]),false);
 assert.equal(frenchPlayable(existing[0]),true);
});

test('The X-Files offers use the latest cached French provider proof, not a frozen 2026-09-10 snapshot',()=>{
 const file=JSON.parse(fs.readFileSync('data/watch-fr.json','utf8'));
 const record=file.titles['430'];
 assert.equal(record.country,'FR');
 assert.match(record.checked_at,/^\d{4}-\d{2}-\d{2}T/);
 assert.ok(/^https:\/\/(?:www\.justwatch\.com\/fr\/serie\/|www\.themoviedb\.org\/tv\/)/.test(record.url));
 assert.ok(record.offers.some(o=>/Disney(?:\+| Plus)/i.test(o.name)));
 assert.ok(record.offers.some(o=>/Amazon Prime Video/i.test(o.name)));
 const normalized=normalizeFranceOffers(record);
 assert.ok(normalized,'Un relevé français trop vieux doit être vérifié ou remplacé');
 assert.equal(normalized.source,record.source==='justwatch_fr_editorial'?'justwatch_fr_editorial':'tmdb');
 assert.equal(normalized.url,record.source==='justwatch_fr_editorial'?record.url:normalized.url);
 const html=renderFranceAvailability(record,{});
 assert.match(html,/Disney(?:\+| Plus)/i);
 assert.match(html,/Amazon Prime Video/);
 assert.match(html,/Disponible sur/);
 assert.match(html,/Voir les offres en France|Ouvrir la fiche JustWatch France/);
 assert.doesNotMatch(html,/google\.com/);
});

test('old JustWatch observation remains visible as HISTORIC, never advertised as up-to-date availability',()=>{
 const old={
  country:'FR',source:'justwatch_fr_editorial',
  checked_at:'2025-01-01T10:00:00Z',
  url:'https://www.justwatch.com/fr/serie/the-x-files',
  offers:[{type:'flatrate',name:'Disney+'}]
 };
 assert.equal(normalizeFranceOffers(old)?.historical,true);
 const html=renderFranceAvailability(old);
 assert.match(html,/relevé ancien/);
 assert.match(html,/pas confirmées aujourd’hui/);
 assert.match(html,/avant de souscrire/);
 const sameWithoutSource={...old,source:'tmdb'};
 assert.equal(normalizeFranceOffers(sameWithoutSource),null);
 const malicious={...old,url:'https://evil.example',offers:[{type:'flatrate',name:'<script>evil</script>'}]};
 const safe=renderFranceAvailability(malicious);
 assert.doesNotMatch(safe,/<script>/);
 assert.doesNotMatch(safe,/evil\.example/);
});

test('French proof and archive logic is enforced by frontend and SQL and is reversible',()=>{
 const app=fs.readFileSync('v3/app.js','utf8');
 const sql=fs.readFileSync('supabase/game_v5_5_fr_fix.sql','utf8');
 const install=fs.readFileSync('supabase/install_v5_4_v5_5.sql','utf8');
 assert.match(app,/partitionFrenchInventory\(allCards,allWishes\)/);
 assert.match(app,/state\.excludedCardsCount=france\.excludedCardsCount/);
 assert.match(app,/fr_verified,fr_verification_method,fr_evidence_url/);
 assert.match(app,/every modal open/i);
 assert.match(sql,/lower\(btrim\(s\.name\)\)='the x-files'/);
 assert.match(sql,/s\.id=430/);
 assert.match(sql,/www\.justwatch\.com\/fr\/serie\/the-x-files/);
 assert.match(sql,/public\.get_leaderboard/);
 assert.match(sql,/public\.player_directory/);
 assert.match(sql,/public\.marketplace_feed/);
 assert.match(sql,/enforce_fr_card_transfer/);
 assert.doesNotMatch(sql,/\bDELETE\s+FROM\s+public\.player_cards/i);
 assert.equal((install.match(/^BEGIN;/gm)||[]).length,1);
 assert.equal((install.match(/^COMMIT;/gm)||[]).length,1);
 assert.equal((install.match(/\$\$/g)||[]).length%2,0);
});
