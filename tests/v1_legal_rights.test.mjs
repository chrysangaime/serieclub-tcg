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
 assert.match(html,/contact direct professionnel et confidentiel reste à publier/);
 assert.match(html,/issues\/new\?template=signalement-droits\.yml/);
 assert.match(html,/ne constitue ni une autorisation/);
 assert.match(aboutPage(),/This product uses the TMDB API/);
 assert.match(legalPage(),/data-route="rights"/);
 assert.match(footerHTML(),/data-route="rights"/);
 assert.equal(PRODUCT.launched,false);
 assert.match(read('v3/app.js'),/paymentsMode:'disabled'/,
  'Aucun paiement live tant que les droits et CGV ne sont pas autorisés');
});

test('Aucune ancienne offre ni logo TMDB ne s’affiche dans les fiches',()=>{
 assert.equal(platformLogoUsageApproved,false);
 const old={country:'FR',checked_at:new Date().toISOString(),
  offers:[{type:'flatrate',name:'Netflix',provider_id:8,logo_path:'/logo.png'}]};
 assert.equal(normalizeFranceOffers(old),null);
 const rendered=renderFranceAvailability(old,{fr_verification_method:'tmdb_fr_offer'});
 assert.match(rendered,/Offres de streaming non confirmées/);
 assert.match(rendered,/JustWatch France/);
 assert.doesNotMatch(rendered,/Netflix|image\.tmdb\.org|themoviedb\.org|<img\\b/);
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
