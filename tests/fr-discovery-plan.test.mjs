import test from 'node:test';
import assert from 'node:assert/strict';
import {
 ARCHIVE_PERIODS,discoveryCursor,discoveryParams,
 advanceDiscovery,discoveryLabel,saveDiscoveryCursor
} from '../scripts/fr-discovery-plan.mjs';
import {pickExactTVmaze} from '../scripts/expand-fr-catalog.mjs';

const source={id:447,original_name:'The X-Files',name:'Aux frontières du réel',first_air_date:'1993-09-10'};
const show=(id,name='The X-Files',premiered='1993-09-10')=>
 ({id,name,premiered,image:{medium:'https://static.tvmaze.com/image.jpg'}});

test('archives : fenêtres disjointes depuis 1900, films exclus, territoire FR systématique',()=>{
 const sorted=[...ARCHIVE_PERIODS].sort((a,b)=>a.start-b.start);
 assert.equal(sorted[0].start,1900);
 assert.ok(sorted.at(-1).end>=2026);
 for(let i=1;i<sorted.length;i++)assert.ok(sorted[i-1].end<sorted[i].start);
 const active=discoveryCursor({next_page:21});
 assert.equal(active.mode,'archive');
 assert.equal(active.archive.period,0);
 const q=discoveryParams(active);
 assert.equal(q.get('watch_region'),'FR');
 assert.equal(q.get('first_air_date.gte'),'1990-01-01');
 assert.equal(q.get('first_air_date.lte'),'1994-12-31');
 assert.equal(q.get('page'),'1');
 assert.match(discoveryLabel(active),/1990/);
});
test('rotations : 3 passages archives puis un passage popularité',()=>{
 const state={next_page:21};
 for(let run=0;run<8;run++){
  const current=discoveryCursor(state,'auto');
  assert.equal(current.mode,run%4===3?'popular':'archive');
  saveDiscoveryCursor(state,current);
 }
 assert.equal(state.discovery_runs,8);
 assert.equal(state.popular_page,21);
 const popular=discoveryCursor(state,'popular');
 assert.equal(discoveryParams(popular).get('first_air_date.gte'),null);
 assert.equal(discoveryParams(popular).get('page'),'21');
});
test('la fenêtre archive avance sans recommencer indéfiniment la page finale',()=>{
 const cursor=discoveryCursor({archive_cursor:{period:0,page:1}});
 advanceDiscovery(cursor,2);
 assert.equal(cursor.archive.page,2);
 advanceDiscovery(cursor,2);
 assert.equal(cursor.archive.page,1);
 assert.equal(cursor.archive.period,1);
 advanceDiscovery(cursor,0);
 assert.equal(cursor.archive.period,2);
 assert.equal(cursor.archive.page,1);
 cursor.archive.period=ARCHIVE_PERIODS.length-1;
 advanceDiscovery(cursor,0);
 assert.equal(cursor.archive.period,0);
});
test('recherche TVmaze : correspondance stricte et unique, homonymes refusés',()=>{
 assert.deepEqual(pickExactTVmaze(source,[{show:show(430)}, {show:show(431,'No Match')}]),show(430));
 assert.equal(pickExactTVmaze(source,[{show:show(430)}, {show:show(431)}]),null);
 assert.equal(pickExactTVmaze(source,[{show:show(430,'The X-Files','2018-01-01')}]),null);
 assert.equal(pickExactTVmaze(source,[{show:show(430,'X Files')}]),null);
 assert.equal(pickExactTVmaze(source,[{show:show(430)},{show:show(430)}]).id,430);
 assert.equal(pickExactTVmaze(source,[]),null);
});
