import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {independentFranceProof} from '../scripts/reverify-tvmaze-origin.mjs';

test('TVmaze confirme une origine française seulement avec code FR, ID et source identique',()=>{
 const show={id:17,url:'https://www.tvmaze.com/shows/17/example',
  network:{name:'France 2',country:{code:'FR'}}};
 assert.equal(independentFranceProof(show,17)?.network,'France 2');
 assert.equal(independentFranceProof({...show,network:{name:'NBC',country:{code:'US'}}},17),null);
 assert.equal(independentFranceProof({...show,id:18},17),null);
 assert.equal(independentFranceProof({...show,url:'https://evil.example/shows/17'},17),null);
 assert.equal(independentFranceProof({...show,network:null,webChannel:{name:'ARTE',country:{code:'FR'}}},17)?.network,'ARTE');
});
test('La revalidation ne supprime ni joueurs ni cartes, ne promeut pas de preuves TMDB',()=>{
 const script=fs.readFileSync('scripts/reverify-tvmaze-origin.mjs','utf8');
 assert.doesNotMatch(script,/DELETE\s+FROM\s+(?:public\.)?player_cards/i);
 assert.match(script,/fr_verification_method:'tvmaze_fr_origin'/);
 assert.match(script,/fr_verification_method=eq\.tmdb_fr_offer/);
 assert.match(script,/owned=new Set/);
 assert.match(script,/review-artifacts\/revalidation-tvmaze-fr\.csv/);
});
