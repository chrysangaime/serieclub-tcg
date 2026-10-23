import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {collectibleKey,deriveCollection} from '../v5/collection.js';
import {card} from '../v3/views.js';

const series={id:5,name:'True Detective',image_url:'https://static.tvmaze.com/uploads/images/medium_portrait/1/123.jpg',rarity:'Unique',rarity_source:'editorial',fr_verified:true,genres:['Drama']};
const owned=(id,season_number,seasonPoster)=>({
 id,series_id:5,season_number,rarity:'Unique',series,
 season:season_number?{series_id:5,season_number,image_url:seasonPoster||null,premiered:'2014-01-12'}:null,
 obtained_at:'2026-10-23T10:00:00.000Z'
});
test('Chaque saison est un objet de collection distinct, pas un doublon de la série',()=>{
 const cards=[
  owned('a',1,'https://static.tvmaze.com/uploads/images/medium_portrait/5/101.jpg'),
  owned('b',2,'https://static.tvmaze.com/uploads/images/medium_portrait/5/102.jpg'),
  owned('c',1,'https://static.tvmaze.com/uploads/images/medium_portrait/5/101.jpg')
 ];
 assert.equal(collectibleKey(cards[0]),'5:s1');
 assert.equal(collectibleKey(cards[1]),'5:s2');
 const view=deriveCollection(cards,[]);
 assert.equal(view.totalCards,3);
 assert.equal(view.unique,2);
 assert.equal(view.duplicateGroups,1);
 assert.equal(view.duplicates,1);
 assert.equal(view.groups.find(x=>x.seasonNumber===1)?.count,2);
 assert.equal(view.groups.find(x=>x.seasonNumber===2)?.count,1);
 assert.equal(view.groups.find(x=>x.seasonNumber===2)?.name,'True Detective · Saison 2');
});
test('La carte saison 2 affiche son poster propre, sa rareté inchangée, et le numéro de saison',()=>{
 const c=owned('s2',2,'https://static.tvmaze.com/uploads/images/medium_portrait/5/102.jpg');
 const html=card(c);
 assert.match(html,/Saison 2/);
 assert.match(html,/Unique/);
 assert.match(html,/medium_portrait\/5\/102\.jpg/);
 assert.doesNotMatch(html,/medium_portrait\/1\/123\.jpg/);
});
test('Sans poster de saison, l’illustration de série reste et le numéro apparaît',()=>{
 const h=card(owned('s3',3,null));
 assert.match(h,/Saison 3/);
 assert.match(h,/medium_portrait\/1\/123\.jpg/);
});
test('La migration serveur maintient les achats, le tirage et le stock, sans DELETE',()=>{
 const migration=fs.readFileSync('supabase/v1_season_collectibles.sql','utf8');
 const pack=fs.readFileSync('supabase/v1_season_booster_rpc.sql','utf8');
 const backfill=fs.readFileSync('supabase/v1_season_card_backfill.sql','utf8');
 assert.match(migration,/REFERENCES public\.series_seasons\(series_id,season_number\)/);
 assert.match(migration,/ENABLE ROW LEVEL SECURITY/);
 assert.match(pack,/name:=selected\.show_name\|\|CASE WHEN variant_no IS NOT NULL/);
 assert.match(pack,/coalesce\(variant_image,selected\.show_image\)/);
 assert.match(backfill,/ss\.premiered<=CURRENT_DATE/);
 for(const source of [migration,pack,backfill])
  assert.doesNotMatch(source,/DELETE\s+FROM\s+public\.player_cards|DROP\s+TABLE/i);
});
