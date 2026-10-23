import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rightsPage} from '../v1/rights.js';
import {aboutPage,footerHTML,PRODUCT} from '../v1/product.js';
import {legalPage} from '../v1/privacy.js';
import {normalizeFranceOffers,renderFranceAvailability,platformLogoUsageApproved} from '../v5/fr-watch.js';
import {showDetailHTML} from '../v4/series.js';

const read=path=>fs.readFileSync(path,'utf8');

test('La V1 dispose des crédits officiels et n’annonce pas de licence acquise',()=>{
 const html=rightsPage();
 assert.match(html,/TVmaze/);
 assert.match(html,/CC BY-SA/);
 assert.match(html,/https:\/\/www\.tvmaze\.com\/api/);
 assert.match(html,/This product uses the TMDB API but is not endorsed or certified by TMDB\./);
 assert.match(html,/www\.themoviedb\.org/);
 assert.match(html,/sans transfert de leur propriété/);
 assert.match(html,/un contact direct professionnel.*reste à publier/);
 assert.match(html,/ne constitue ni une autorisation/);
 assert.match(aboutPage(),/This product uses the TMDB API/);
 assert.match(legalPage(),/data-route="rights"/);
 assert.match(footerHTML(),/data-route="rights"/);
 assert.equal(PRODUCT.launched,false);
});

test('La présence d’une URL de logo TMDB ne suffit pas à autoriser une image de marque',()=>{
 assert.equal(platformLogoUsageApproved,false);
 const data=normalizeFranceOffers({
   country:'FR',checked_at:new Date().toISOString(),
   offers:[{type:'flatrate',name:'Netflix',provider_id:8,logo_path:'/logo.png'}]
 });
 assert.equal(data.offers.length,1);
 assert.equal(data.offers[0].logo,null);
 const rendered=renderFranceAvailability({
   country:'FR',checked_at:new Date().toISOString(),
   offers:[{type:'flatrate',name:'Netflix',provider_id:8,logo_path:'/logo.png'}]
 });
 assert.match(rendered,/Disponible sur/);
 assert.match(rendered,/Netflix/);
 assert.doesNotMatch(rendered,/image\.tmdb\.org/);
 assert.doesNotMatch(rendered,/<img\b/);
});

test('La fiche de série renvoie vers le contenu TVmaze identifiable',()=>{
 const html=showDetailHTML(
   {id:12,name:'Série test',genres:['Drama'],image_url:'https://static.tvmaze.com/uploads/images/medium_portrait/1/2.jpg'},
   {id:12,name:'Série test',rarity:'Commune',fr_verified:true},
   {source:'loading'}
 );
 assert.match(html,/https:\/\/www\.tvmaze\.com\/shows\/12/);
 assert.match(html,/Source TVmaze · données et affiche/);
});

test('Le registre juridique verrouille les trois obstacles commerciaux et le signalement public',()=>{
 const report=read('AUDIT_JURIDIQUE_ET_LICENCES_V1.md');
 for(const phrase of ['TVmaze','TMDB','GitHub Pages','ShareAlike','CGU','signalement','licence commerciale'])
   assert.match(report,new RegExp(phrase,'i'));
 assert.match(read('v3/app.js'),/rights:rightsPage/);
 assert.match(read('index.html'),/noindex,nofollow/);
});
