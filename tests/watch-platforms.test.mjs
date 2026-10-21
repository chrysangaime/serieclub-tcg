import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {renderFranceAvailability,normalizeFranceOffers} from '../v5/fr-watch.js';
import {showDetailHTML} from '../v4/series.js';

const availability=JSON.parse(fs.readFileSync('data/watch-fr.json','utf8')).titles['171'];
const show={
 id:171,name:'How I Met Your Mother',premiered:'2005-09-19',
 genres:['Drama','Comedy','Romance'],
 rarity:'Unique',rarity_source:'editorial',fr_verified:true,
 fr_evidence_url:'https://www.disneyplus.com/fr-fr/browse/entity-bc68ac79-3ace-4427-9ec0-5ee6f314d194'
};

test('How I Met Your Mother: Disney+ is subscription, Amazon Video/Apple purchase only',()=>{
 assert.equal(availability.country,'FR');
 assert.equal(availability.source,'justwatch_fr_editorial');
 assert.equal(availability.url,'https://www.justwatch.com/fr/serie/how-i-met-your-mother');
 assert.match(availability.checked_at,/^2026-10-17/);
 assert.deepEqual(
  availability.offers.filter(x=>x.type==='flatrate').map(x=>x.name),['Disney+']
 );
 assert.deepEqual(
  availability.offers.filter(x=>x.type==='buy').map(x=>x.name),
  ['Apple TV Store','Amazon Video']
 );
 assert.ok(!availability.offers.some(x=>x.name==='Amazon Prime Video'));
 const html=renderFranceAvailability(availability,show);
 assert.match(html,/Disponible sur/);
 assert.match(html,/sc56-brand-disney/);
 assert.match(html,/sc56-secondary/);
 assert.match(html,/Achat :/);
 assert.match(html,/Apple TV Store/);
 assert.match(html,/Amazon Video/);
 assert.doesNotMatch(html,/Amazon Prime Video/);
 assert.match(html,/17\/10\/2026/);
 assert.match(html,/justwatch\.com\/fr\/serie\/how-i-met-your-mother/);
 assert.match(html,/disneyplus\.com\/fr-fr\/browse\/entity\/bc68ac79/);
});

test('Platforms are compact near title/rarity, not repeated in big footer banner',()=>{
 const html=showDetailHTML({},show,{source:'editorial',text:'Ted raconte ses rencontres.'});
 const index=html.indexOf('data-fr-watch');
 assert.ok(index>0);
 assert.ok(index<html.indexOf('En quelques mots'));
 assert.equal(html.split('data-fr-watch').length-1,1);
 assert.doesNotMatch(html,/sc54-fr-cert/);
 assert.doesNotMatch(html,/sc53-fr-watch/);
 assert.doesNotMatch(html,/Série diffusée en France/);
 assert.match(html,/Où regarder en France/);
 assert.match(html,/Source de diffusion française/);
});

test('Streaming-only vs purchase-only offers are not mixed or falsely asserted',()=>{
 const now=new Date().toISOString();
 const purchaseOnly={country:'FR',source:'justwatch_fr_editorial',checked_at:now,
  url:availability.url,offers:[{type:'buy',name:'Amazon Video'}]};
 const html=renderFranceAvailability(purchaseOnly,show);
 assert.match(html,/Disponible à l’achat ou à la location sur/);
 assert.doesNotMatch(html,/sc56-brand-disney/);
 const empty=renderFranceAvailability(null,show);
 assert.match(empty,/Plateformes françaises non encore renseignées/);
 assert.doesNotMatch(empty,/Disney\+/);
 assert.doesNotMatch(empty,/Aucune disponibilité française vérifiée/);
});

test('Invalid provider links and HTML are not injected into new platform badges',()=>{
 const hostile={country:'FR',source:'justwatch_fr_editorial',
  checked_at:new Date().toISOString(),url:'javascript:alert(1)',
  offers:[{type:'flatrate',name:'<img onerror=alert(1)>',provider_url:'https://evil.example/'}]};
 const html=renderFranceAvailability(hostile,show);
 assert.doesNotMatch(html,/<img onerror=/);
 assert.doesNotMatch(html,/https:\/\/evil\.example/);
 assert.doesNotMatch(html,/javascript:/);
 assert.match(html,/&lt;img onerror=alert\(1\)&gt;/);
 assert.equal(normalizeFranceOffers({...hostile,country:'US'}),null);
});
