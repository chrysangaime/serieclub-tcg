import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalogue} from '../v3/views.js';

test('la page catalogue affiche le vrai nombre de séries France, même quand une page ne contient que 36 fiches',()=>{
 const html=catalogue({catalogMode:'series',catalogTotal:2033,
  catalog:[],cards:[],catalogQuery:'',catalogLoading:false,catalogError:'',catalogMore:false});
 assert.match(html,/2\\s033 séries éligibles en France/);
 assert.match(html,/0 affichées/);
 assert.match(html,/Catalogue France/);
});
test('un filtre de recherche affiche son propre nombre de résultats plutôt que le nombre global',()=>{
 const html=catalogue({catalogMode:'series',catalogTotal:12,
  catalog:[],cards:[],catalogQuery:'archives',catalogLoading:false,catalogError:'',catalogMore:false});
 assert.match(html,/12 séries éligibles en France/);
 assert.match(html,/value="archives"/);
});
test('le navigateur récupère le dernier cache des diffuseurs France sans exposer de token TMDB',()=>{
 const src=fs.readFileSync('v5/fr-watch.js','utf8');
 assert.match(src,/searchParams\.set\('hour'/);
 assert.doesNotMatch(src,/TMDB_READ_ACCESS_TOKEN/);
 assert.match(fs.readFileSync('index.html','utf8'),/v5\/fr-watch\.js\?v=5\.8\.0/);
});
