import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {card,catalogue} from '../v3/views.js';
import {showDetailHTML} from '../v4/series.js';
import {deriveCollection} from '../v5/collection.js';

const verified={
 id:121,name:'Stranger Things',premiered:'2016-07-15',
 rarity:'Légendaire',rarity_source:'editorial',fr_verified:true,
 fr_verification_method:'editorial_fr_history',
 fr_evidence_url:'https://www.netflix.com/fr/title/80057281',
 genres:['Horror'],image_url:'https://example.org/stranger.jpg'
};
const pending={
 id:122,name:'Série non vérifiée',rarity:'Rare',
 rarity_source:'popularity',fr_verified:false,genres:['Drama'],
 image_url:'https://example.org/other.jpg'
};

test('catalogue description explicitly limits playable series to confirmed French distribution',()=>{
 const state={catalogMode:'series',catalog:[verified],catalogLoading:false,
  catalogError:'',catalogQuery:'',catalogMore:false,wishes:[],cards:[]};
 const html=catalogue(state);
 assert.match(html,/Catalogue France/);
 assert.match(html,/diffusion.*France/i);
 assert.match(html,/diffusion française confirmée/i);
 const script=fs.readFileSync('v3/app.js','utf8');
 assert.match(script,/\.eq\('fr_verified',true\)\.neq\('rarity_source','pending'\)/);
 assert.doesNotMatch(script,/Active la migration France V5\.4/);
 assert.match(script,/\.eq\('fr_verified',true\)/);
});

test('unverified past-owned cards retain their place in the collection, explicitly marked',()=>{
 const old={id:'owned0',series_id:122,rarity:'Commune',locked:false,series:pending};
 const html=card(old);
 assert.match(html,/À vérifier/);
 const summary=deriveCollection([old],[],[]);
 assert.equal(summary.unique,1);
 assert.equal(summary.groups[0].eligible,false);
 assert.equal(summary.groups[0].sellableCopy,null);
 assert.equal(summary.rankStats.find(v=>v.rank==='Rare').cards,1);
});

test('known verified French broadcasts show the official source in the series sheet',()=>{
 const html=showDetailHTML({},verified,{
  source:'editorial',text:'Une série située dans les années 80.'
 });
 assert.match(html,/Diffusion en France confirmée/);
 assert.match(html,/https:\/\/www\.netflix\.com\/fr\/title\/80057281/);
 assert.match(html,/Légendaire/);
 assert.doesNotMatch(html,/Offres en France à confirmer/);
 const other=showDetailHTML({},pending,{source:'unavailable'});
 assert.match(other,/Offres en France à confirmer/);
 assert.match(other,/Offres de streaming non confirmées/);
});
test('no historic series is deleted by server eligibility migration',()=>{
 const sql=fs.readFileSync('supabase/game_v5_4_fr.sql','utf8');
 const migrationDdl=sql.slice(0,sql.indexOf('CREATE OR REPLACE FUNCTION public.pick_official_pack'));
 assert.doesNotMatch(migrationDdl,/\bDELETE\s+FROM\s+public\.(?:series|player_cards)\b/i);
 // Existing fusion logic legitimately deletes consumed cards when explicitly invoked.
 assert.match(sql,/BEFORE INSERT ON public\.player_cards/);
 assert.match(sql,/BEFORE INSERT ON public\.player_wishlist/);
 assert.match(sql,/BEFORE INSERT ON public\.card_listings/);
 assert.match(sql,/BEFORE INSERT ON public\.card_trade_offers/);
 assert.match(sql,/WHERE s\.fr_verified IS TRUE AND s\.rarity=/);
 assert.match(sql,/s\.fr_verified IS TRUE/);
 assert.match(sql,/CREATE OR REPLACE VIEW public\.playable_fr_series/);
});
