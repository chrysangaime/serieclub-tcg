import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFranceOffers,renderFranceAvailability} from '../v5/fr-watch.js';

const rec=(offers,daysAgo=0)=>({
 source:'movieofthenight',country:'FR',
 checked_at:new Date(Date.now()-daysAgo*86400000).toISOString(),
 expires_at:new Date(Date.now()+86400000).toISOString(),offers
});

test('Offre française Movie of the Night : Netflix abonnement et Apple achat clairement séparés',()=>{
 const data=rec([
  {id:'netflix',name:'netflix',type:'flatrate',url:'https://www.netflix.com/title/70197042'},
  {id:'apple',name:'apple',type:'buy',url:'https://tv.apple.com/fr/show/test'}]);
 const normalized=normalizeFranceOffers(data);
 assert.ok(normalized);
 assert.equal(normalized.offers.length,2);
 assert.equal(normalized.offers[0].name,'Netflix');
 const html=renderFranceAvailability(data);
 assert.match(html,/Disponible sur/);
 assert.match(html,/Netflix/);
 assert.match(html,/Achat \/ location/);
 assert.match(html,/Apple TV/);
 assert.match(html,/Source : Streaming Availability API par Movie of the Night/);
 assert.doesNotMatch(html,/themoviedb.org|image.tmdb.org/);
});

test('Le fournisseur ne peut pas injecter de mauvais liens, noms ou images',()=>{
 const data=rec([
  {id:'netflix',name:'<script>evil()</script>',type:'flatrate',url:'https://evil.example/'},
  {id:'prime',name:'prime',type:'flatrate',url:'javascript:alert(1)'},
  {id:'disney',name:'disney',type:'flatrate',url:'https://www.disneyplus.com/browse/entity-test'}]);
 const normalized=normalizeFranceOffers(data);
 assert.equal(normalized.offers.length,1);
 assert.equal(normalized.offers[0].name,'Disney+');
 const html=renderFranceAvailability(data);
 assert.match(html,/Disney\+/);
 assert.doesNotMatch(html,/evil.example|javascript:|<script>|Netflix/);
});
test('Données hors France ou périmées : aucun mensonge sur la disponibilité',()=>{
 const good=rec([{id:'netflix',type:'flatrate',url:'https://www.netflix.com/title/70'}]);
 assert.equal(normalizeFranceOffers({...good,country:'US'}),null);
 assert.equal(normalizeFranceOffers({...good,source:'tmdb'}),null);
 assert.equal(normalizeFranceOffers({...good,expires_at:'2020-01-01T00:00:00Z'}),null);
 assert.match(renderFranceAvailability(null),/Offres de streaming non confirmées/);
});
