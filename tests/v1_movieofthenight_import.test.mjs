import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sanitizedOffers,tvmazeImdb} from '../scripts/sync-streaming-availability.mjs';
test('API v4 : IMDb TVmaze valide et disponibilités France uniquement',()=>{
 assert.equal(tvmazeImdb('tt1234567'),'tt1234567');
 assert.equal(tvmazeImdb('12345'),null);
 assert.equal(tvmazeImdb('tt12345evil'),null);
 const data={streamingOptions:{
  us:[{service:{id:'netflix'},type:'subscription',link:'https://www.netflix.com/title/99'}],
  fr:[{service:{id:'netflix'},type:'subscription',link:'https://www.netflix.com/title/42'},
   {service:{id:'prime'},type:'buy',link:'https://www.primevideo.com/detail/A2B2'},
   {service:{id:'netflix'},type:'subscription',link:'https://www.netflix.com/title/42'},
   {service:{id:'disney'},type:'subscription',link:'https://evil.example'}]}};
 assert.deepEqual(sanitizedOffers(data),[
  {id:'netflix',name:'netflix',type:'flatrate',url:'https://www.netflix.com/title/42'},
  {id:'prime',name:'prime',type:'buy',url:'https://www.primevideo.com/detail/A2B2'}
 ]);
 assert.deepEqual(sanitizedOffers({streamingOptions:{us:data.streamingOptions.fr}}),[]);
});
test('Le fournisseur est interrogé uniquement côté serveur, sans clé dans le client',()=>{
 const script=fs.readFileSync('scripts/sync-streaming-availability.mjs','utf8');
 const front=fs.readFileSync('v5/fr-watch.js','utf8');
 const workflow=fs.readFileSync('.github/workflows/sync-streaming-availability.yml','utf8');
 assert.match(script,/STREAMING_AVAILABILITY_API_KEY/);
 assert.match(script,/X-API-Key/);
 assert.match(workflow,/workflow_dispatch:/);
 assert.doesNotMatch(workflow,/^\s+schedule:/m);
 assert.doesNotMatch(front,/STREAMING_AVAILABILITY_API_KEY|X-API-Key/);
 assert.doesNotMatch(script,/DELETE\s+FROM\s+player_cards/);
});