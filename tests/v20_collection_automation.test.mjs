import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {officialSeasonCatalog,officialSeasonHTML,officialSeasonDetailsHTML} from '../v10/seasons.js';
import {albumDialog,albumSeriesSearchResults} from '../v4/albums.js';
import {marketPage} from '../v4/club.js';
const source=p=>fs.readFileSync(p,'utf8');
test('Top20 : suivi activable à l’unité et en lot, sans récompense gratuite',()=>{
 const ss=officialSeasonCatalog.map(x=>({...x,owned:0,claimed:false}));
 const html=officialSeasonHTML({user:{id:'test'},officialSeasons:ss,trackedSeasons:['top20_netflix_2026']});
 assert.match(html,/data-sync-all-seasons/);
 assert.match(html,/✓ Suivi automatique actif/);
 assert.match(html,/data-season-details="top20_netflix_2026"/);
 const detail=officialSeasonDetailsHTML(ss[6],
 Array.from({length:20},(_,i)=>({series_id:i+1,rank_number:i+1,name:'Série '+i,owned:false})),
 {user:true,tracked:true,wishes:[1]});
 assert.match(detail,/data-sync-season="top20_netflix_2026"/);
 assert.match(detail,/data-unfollow-season="top20_netflix_2026"/);
 assert.match(detail,/★ Dans mes souhaits/);
});
test('Album personnel : les séries peuvent être ciblées sans carte physique',()=>{
 const album={album_id:'11111111-1111-4111-8111-111111111111',title:'Séries favorites'};
 const html=albumDialog({cards:[],personalAlbums:[album]},album,[],[{series_id:42,name:'Une série',owned:false,locked:false}]);
 assert.match(html,/data-sync-personal-album/);
 assert.match(html,/data-album-search/);
 assert.match(html,/☆ Dans mes souhaits/);
 const list=albumSeriesSearchResults(album,[{series_id:42,name:'<script>bad</script>',image_url:'javascript:evil'}]);
 assert.match(list,/data-add-album-target="42"/);
 assert.doesNotMatch(list,/<script>|src="javascript:/);
});
test('Un album public ne peut être modifié par simple interaction',()=>{
 const album={album_id:'11111111-1111-4111-8111-111111111111',title:'Saison publique'};
 const h=albumDialog({cards:[],personalAlbums:[]},album,[],[]);
 assert.doesNotMatch(h,/data-sync-personal-album|data-album-search|data-add-album-target/);
});
test('Automatisation strictement serveur et protection d’un seul exemplaire',()=>{
 const sql=source('supabase/game_v20_collection_automation.sql');
 const app=source('v3/app.js');
 for(const fragment of ['AFTER INSERT OR UPDATE OF owner_id OR DELETE','public.protect_collection_copy',
 'c.reserved_trade_id IS NULL',"l.status='active'",'auth.uid()', 'ON CONFLICT DO NOTHING',
 'player_tracked_seasons','player_album_targets'])assert.ok(sql.includes(fragment),fragment);
 assert.match(app,/sync_official_collection/);
 assert.match(app,/sync_personal_album_collection/);
 assert.match(app,/my_tracked_seasons/);
 assert.doesNotMatch(sql,/UPDATE public\.player_wallets SET credits/);
});

test('Comptoir : les annonces des souhaits remontent et peuvent être filtrées',()=>{
 const entries=[
  {listing_id:'first',series_id:11,series_name:'Première',rarity:'Commune',seller_id:'other',price:50},
  {listing_id:'wanted',series_id:22,series_name:'Recherchée',rarity:'Rare',seller_id:'other',price:100}
 ];
 const context={user:{id:'test'},cards:[],wishes:[{series_id:22}],wallet:{credits:300},
  marketListings:entries,marketActivity:[],tradeOffers:[],marketWishOnly:true};
 const html=marketPage(context);
 assert.match(html,/data-market-wishes/);
 assert.match(html,/1 annonce\(s\) correspondant/);
 assert.match(html,/Souhait recherché/);
 assert.match(html,/Recherchée/);
 assert.doesNotMatch(html,/Première/);
});
