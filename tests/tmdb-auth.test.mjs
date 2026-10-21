import test from 'node:test';
import assert from 'node:assert/strict';
import {tmdbRequest,tmdbAuthError} from '../scripts/tmdb-auth.mjs';

test('clé TMDB API v3 : utiliser query api_key, jamais en tant que Bearer',()=>{
 const key='a'.repeat(32),req=tmdbRequest('/discover/tv?page=3',key);
 assert.equal(req.mode,'API Key v3');
 assert.equal(req.headers.Authorization,undefined);
 const u=new URL(req.url);
 assert.equal(u.searchParams.get('api_key'),key);
 assert.equal(u.searchParams.get('page'),'3');
});

test('read access token JWT : utiliser Authorization Bearer et aucune clé en URL',()=>{
 const token='eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJURVNUIiwic2NvcGVzIjpbImFwaV9yZWFkIl19.signature-test';
 const req=tmdbRequest('/search/tv?query=Lost','Bearer '+token+'  ');
 assert.equal(req.mode,'Read Access Token');
 assert.equal(req.headers.Authorization,'Bearer '+token);
 assert.equal(new URL(req.url).searchParams.has('api_key'),false);
 assert.equal(req.url.includes(token),false);
});

test('jetons mal formés, host non officiel et messages sans secrets sont refusés',()=>{
 assert.throws(()=>tmdbRequest('/discover/tv', 'not-valid'),/non reconnu/);
 assert.throws(()=>tmdbRequest('https://evil.com', 'a'.repeat(32)),/non autorisé/);
 const secret='a'.repeat(32),msg=tmdbAuthError('API Key v3');
 assert.match(msg,/401/);assert.doesNotMatch(msg,new RegExp(secret));
});
