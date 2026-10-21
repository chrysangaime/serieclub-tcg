import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sameSeries,collectFrenchOffers} from '../scripts/expand-fr-catalog.mjs';
import {renderFranceAvailability} from '../v5/fr-watch.js';

const french={id:991,name:'The X-Files',original_name:'The X-Files',first_air_date:'1993-09-10'};
const tvmaze={id:430,name:'The X-Files',premiered:'1993-09-10',image:{medium:'https://static.tvmaze.com/a.jpg'}};

test('identités : ni mauvais millésime, ni homonyme, ni absence d’affiche',()=>{
 assert.equal(sameSeries(french,tvmaze),true);
 assert.equal(sameSeries(french,{...tvmaze,name:'Other X-Files'}),false);
 assert.equal(sameSeries(french,{...tvmaze,premiered:'2026-09-10'},true),false);
 assert.equal(sameSeries(french,{...tvmaze,image:null},true),false);
 assert.equal(sameSeries(french,{...tvmaze,name:'X Files Remake'},true),true,
  'une correspondance TVDB attestée conserve la priorité, après contrôle de l’année');
});

test('France : les offres doivent explicitement provenir de results.FR',()=>{
 const region={
  flatrate:[{provider_id:337,provider_name:'Disney+',logo_path:'/disney.png'},
   {provider_id:337,provider_name:'Disney+'}],
  buy:[{provider_id:10,provider_name:'Amazon Video'}],
  ads:[{provider_id:0,provider_name:'Offre non identifiée'}]
 };
 const offers=collectFrenchOffers(region);
 assert.deepEqual(offers.map(o=>o.type+':'+o.provider_id),['flatrate:337','buy:10']);
 assert.equal(collectFrenchOffers(null).length,0);
 assert.equal(collectFrenchOffers({}).length,0);
});

test('aucune carte n’est supprimée : on enrichit la base existante de manière incrémentale',()=>{
 const src=fs.readFileSync('scripts/expand-fr-catalog.mjs','utf8');
 const importer=fs.readFileSync('scripts/import-tvmaze.mjs','utf8');
 const workflow=fs.readFileSync('.github/workflows/sync-catalog.yml','utf8');
 assert.match(src,/fr_verified=is\.false/);
 assert.match(src,/fr_verification_method:'tmdb_fr_offer'/);
 assert.match(src,/sameSeries\(candidate,found,true\)/);
 assert.doesNotMatch(src,/DELETE\s+FROM\s+(?:public\.)?player_cards/i);
 assert.match(importer,/tvmaze-import-state\.json/);
 assert.match(importer,/reachedEnd\?0:page/);
 assert.match(workflow,/tvmaze-import-state\.json/);
});

test('une diffusion française à venir est présentée comme annoncée, pas déjà passée',()=>{
 const details={fr_verified:true,premiered:'2999-01-01',
  network:{name:'France 2',country:{code:'FR'}}};
 const future=renderFranceAvailability(null,details);
 assert.match(future,/Diffusion annoncée en France/);
 assert.match(future,/France 2/);
 assert.doesNotMatch(future,/France · diffusion attestée/);
 const past=renderFranceAvailability(null,{...details,premiered:'2020-01-01'});
 assert.match(past,/Diffusion en France confirmée/);
});
