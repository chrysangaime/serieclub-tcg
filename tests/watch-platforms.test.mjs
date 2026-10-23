import test from 'node:test';
import assert from 'node:assert/strict';
import {renderFranceAvailability,normalizeFranceOffers,getFrenchOffersByShow} from '../v5/fr-watch.js';
import {showDetailHTML} from '../v4/series.js';

const show={
 id:171,name:'How I Met Your Mother',premiered:'2005-09-19',
 genres:['Drama','Comedy','Romance'],
 rarity:'Unique',rarity_source:'editorial',fr_verified:true,
 fr_verification_method:'editorial_fr_history'
};

test('Aucune liste de diffuseurs TMDB ou JustWatch n’est reproduite sur une fiche',async()=>{
 const snapshot={country:'FR',checked_at:new Date().toISOString(),
  url:'https://www.themoviedb.org/tv/1/watch?locale=FR',
  offers:[{type:'flatrate',name:'Disney+'},{type:'buy',name:'Apple TV Store'}]};
 const html=renderFranceAvailability(snapshot,show);
 assert.match(html,/Où regarder en France/);
 assert.match(html,/Offres de streaming non confirmées/);
 assert.match(html,/https:\/\/www\.justwatch\.com\/fr/);
 assert.doesNotMatch(html,/Disney\+|Apple TV Store|themoviedb\.org|Disponible sur/);
 assert.equal(normalizeFranceOffers(snapshot),null);
 assert.equal(await getFrenchOffersByShow(171),null);
});

test('La présentation reste compacte près du titre et de la rareté',()=>{
 const html=showDetailHTML({},show,{source:'editorial',text:'Ted raconte ses rencontres.'});
 const at=html.indexOf('data-fr-watch');
 assert.ok(at>0);
 assert.ok(at<html.indexOf('En quelques mots'));
 assert.equal(html.split('data-fr-watch').length-1,1);
 assert.match(html,/Où regarder en France/);
 assert.match(html,/JustWatch France/);
});

test('Un diffuseur TVmaze français est identifié sans inventer un abonnement',()=>{
 const network={network:{name:'France 2',country:{code:'FR'}},
  fr_verification_method:'tvmaze_fr_origin'};
 const html=renderFranceAvailability(null,network);
 assert.match(html,/France 2/);
 assert.match(html,/Diffuseur d’origine en France/);
 assert.doesNotMatch(html,/Disponible sur|Netflix|Disney\+/);
 const US=renderFranceAvailability(null,{network:{name:'CBS',country:{code:'US'}}});
 assert.doesNotMatch(US,/CBS|France 2/);
});

test('Les anciennes offres, URL malveillantes et code HTML ne peuvent être injectés',()=>{
 const attack={country:'FR',url:'javascript:alert(1)',
  offers:[{name:'<script>alert(1)</script>',provider_url:'https://evil.example'}]};
 const html=renderFranceAvailability(attack,{});
 assert.doesNotMatch(html,/<script>|evil\.example|javascript:|themoviedb/);
 assert.equal(normalizeFranceOffers(attack),null);
});
