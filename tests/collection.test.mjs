import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveCollection,selectCollection,collectionStudio,COLLECTION_PAGE_SIZE} from '../v5/collection.js';

const make=(id,show,name,rarity='Rare',extras={})=>({
 id,owner_id:'u1',series_id:show,rarity,locked:false,reserved_trade_id:null,
 obtained_at:'2026-10-20T10:00:00Z',
 series:{id:show,name,image_url:'https://example.org/'+show+'.jpg',
  genres:['Drama'],premiered:'2004-01-01',rarity,rarity_source:'popularity'},...extras
});
const cards=[
 make('l1',1,'Lost','Légendaire'),
 make('l2',1,'Lost','Légendaire',{locked:true}),
 make('l3',1,'Lost','Légendaire',{reserved_trade_id:'tr1'}),
 make('o1',2,'Lost','Commune',{series:{id:2,name:'Lost',image_url:'https://example.org/2.jpg',
  premiered:'2001-01-01',genres:['Adventure'],rarity:'Commune',rarity_source:'pending'}}),
 make('s1',3,'Stranger Things','Légendaire'),
 make('s2',3,'Stranger Things','Légendaire'),
 make('f1',4,'Friends','Rare')
];
const wishes=[
 {series_id:1,series:{name:'Lost',rarity:'Légendaire'}},
 {series_id:42,series:{id:42,name:'Dark',rarity:'Mythique',image_url:'https://example.org/dark.jpg'}},
 {series_id:43,series:{id:43,name:'Sherlock',rarity:'Rare',image_url:'https://example.org/sherlock.jpg'}}
];
const activity=[{card_id:'s2',seller_id:'u1',status:'active'}];
const state={cards,wishes,marketActivity:activity,user:{id:'u1'},
 collectionMode:'all',collectionSort:'rarity',collectionPage:0,
 filter:'',rank:'',genre:'',collectionEligibleTotal:20};

test('one series is counted once; similarly named shows with different IDs remain distinct',()=>{
 const x=deriveCollection(cards,wishes,activity);
 assert.equal(x.totalCards,7);
 assert.equal(x.unique,4);
 assert.equal(x.duplicates,3);
 assert.equal(x.duplicateGroups,2);
 assert.equal(x.protectedCards,1);
 assert.equal(x.reservedCards,2);
 assert.equal(x.tradableDuplicates,1,'only Lost has an unlocked unreserved copy');
 assert.equal(x.groups.find(g=>g.id==='1')?.sellableCopy?.id,'l1');
 assert.equal(x.groups.find(g=>g.id==='3')?.sellableCopy,null);
 assert.equal(x.missing.length,2);
 assert.deepEqual(x.missing.map(w=>w.series_id),[42,43]);
 assert.equal(x.rankStats.find(s=>s.rank==='Légendaire').series,2);
 assert.equal(x.groups.find(g=>g.id==='2').rarity,'Commune');
});

test('studio supports duplicates, uniques, protected and exact wishlist gaps',()=>{
 const d=selectCollection({...state,collectionMode:'duplicates'});
 assert.equal(d.total,2);
 assert.deepEqual(d.entries.map(g=>g.id),['1','3']);
 assert.equal(selectCollection({...state,collectionMode:'unique'}).total,4);
 assert.equal(selectCollection({...state,collectionMode:'protected'}).total,1);
 const wish=selectCollection({...state,collectionMode:'missing',rank:'Mythique'});
 assert.equal(wish.total,1);
 assert.equal(wish.entries[0].series.name,'Dark');
 assert.equal(selectCollection({...state,collectionMode:'unique',genre:'Adventure'}).total,1);
 assert.equal(selectCollection({...state,collectionMode:'unique',filter:'lost'}).total,2);
});

test('only available duplicate can be offered to the market; no selling of engaged copies',()=>{
 const html=collectionStudio({...state,collectionMode:'duplicates'});
 assert.match(html,/data-sell-copy="l1"/);
 assert.doesNotMatch(html,/data-sell-copy="s2"/);
 assert.match(html,/Doublons/);
 assert.match(html,/Exploration du catalogue/);
 assert.match(html,/séries classées possédées/);
 assert.match(html,/data-collection-mode="unique"/);
 assert.match(html,/data-collection-mode="missing"/);
 assert.match(html,/data-collection-rank="Légendaire"/);
});

test('pagination caps each DOM render to 48 items even for 3,000 owned copies',()=>{
 const big=Array.from({length:3000},(_,i)=>make('c'+i,5000+i,'Série numéro '+i,'Commune'));
 const first=selectCollection({...state,cards:big,wishes:[],marketActivity:[],collectionPage:0});
 const last=selectCollection({...state,cards:big,wishes:[],marketActivity:[],collectionPage:62});
 assert.equal(first.entries.length,COLLECTION_PAGE_SIZE);
 assert.equal(last.entries.length,24);
 assert.equal(first.total,3000);
 assert.equal(last.pages,63);
 assert.equal(last.page,62);
 assert.equal(selectCollection({...state,cards:big,collectionPage:500}).page,62);
});

test('all displayed series names and wishlist content are safely escaped',()=>{
 const nasty=make('evil',42,'<img src=x onerror=alert(1)>');
 const html=collectionStudio({...state,cards:[nasty],wishes:[],marketActivity:[],collectionMode:'unique'});
 assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
});
