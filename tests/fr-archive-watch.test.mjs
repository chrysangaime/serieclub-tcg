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

test('Les anciennes offres ne sont pas affichées ni chargées, même avec une cache existante',async()=>{
 const old={country:'FR',checked_at:new Date().toISOString(),
  offers:[{type:'flatrate',name:'Disney+'},{type:'flatrate',name:'Amazon Prime Video'}]};
 assert.equal(normalizeFranceOffers(old),null);
 assert.equal(await getFrenchOffersByShow(430),null);
 const html=renderFranceAvailability(old,{fr_verification_method:'tmdb_fr_offer'});
 assert.match(html,/Offres de streaming non confirmées/);
 assert.match(html,/JustWatch France/);
 assert.doesNotMatch(html,/Amazon Prime Video|Disney\+|themoviedb\.org|Disponible sur/);
});

test('Le lien de consultation reste sûr pour des relevés anciens et malveillants',()=>{
 const old={country:'FR',source:'justwatch_fr_editorial',
  checked_at:'2025-01-01T10:00:00Z',url:'https://evil.example',
  offers:[{type:'flatrate',name:'<script>alert(1)</script>'}]};
 assert.equal(normalizeFranceOffers(old),null);
 const html=renderFranceAvailability(old);
 assert.match(html,/https:\/\/www\.justwatch\.com\/fr/);
 assert.doesNotMatch(html,/<script>|evil\.example|themoviedb/);
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
