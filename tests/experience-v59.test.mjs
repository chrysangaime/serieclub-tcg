import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalogue,packs} from '../v3/views.js';

const state={catalogMode:'series',catalog:[],cards:[],wishes:[],catalogQuery:'',
 catalogLoading:false,catalogError:'',catalogMore:false,catalogTotal:2033,
 catalogRarity:'',catalogGenre:'',catalogDecade:'',catalogSort:'name'};

test('les filtres du catalogue ont des labels, valeurs sélectionnées et un statut vocal',()=>{
 const html=catalogue({...state,catalogQuery:'Lost',catalogRarity:'Légendaire',
  catalogGenre:'Drama',catalogDecade:'2000',catalogSort:'recent'});
 for(const id of ['catalogQuery','catalogRarity','catalogGenre','catalogDecade','catalogSort','catalogSearch','catalogReset'])
  assert.ok(html.includes('id="'+id+'"'),id+' absent');
 assert.match(html,/id="catalogFeedback" role="status" aria-live="polite"/);
 assert.match(html,/value="Légendaire" selected/);
 assert.match(html,/value="Drama" selected/);
 assert.match(html,/value="2000" selected/);
 assert.match(html,/value="recent" selected/);
 assert.match(html,/value="Lost"/);
 assert.match(html,/2\s033 séries éligibles en France/);
});
test('les filtres échappent les recherches non fiables et gardent le chargement lisible',()=>{
 const html=catalogue({...state,catalogQuery:'<script>alert("x")</script>',catalogLoading:true});
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
 assert.match(html,/Recherche en cours/);
 assert.match(html,/sc59-skeleton-grid/);
});
test('un résultat vide propose un effacement uniquement lorsqu’un filtre est actif',()=>{
 const empty=catalogue({...state,catalogTotal:0});
 assert.match(empty,/Aucune série trouvée/);
 assert.doesNotMatch(empty,/id="catalogReset"/);
 const active=catalogue({...state,catalogTotal:0,catalogRarity:'Unique'});
 assert.match(active,/id="catalogReset"/);
});
test('navigation mobile, sécurité clavier, tri serveur et reprise partielle : contrôles intégrés',()=>{
 const html=fs.readFileSync('index.html','utf8');
 const app=fs.readFileSync('v3/app.js','utf8');
 const importer=fs.readFileSync('scripts/expand-fr-catalog.mjs','utf8');
 const css=fs.readFileSync('v5/experience.css','utf8');
 assert.match(html,/id="mobileNav"/);
 assert.match(html,/id="drawerBackdrop"/);
 assert.match(html,/v5\/experience\.css\?v=5\.9\.0/);
 assert.match(app,/catalogRequestId/);
 assert.match(app,/query\.contains\('genres'/);
 assert.match(app,/query\.eq\('rarity'/);
 assert.match(app,/query\.gte\('premiered'/);
 assert.match(app,/searchTimer=setTimeout/);
 assert.match(app,/e\.key==='\/'/);
 assert.match(importer,/if\(partial\)break/);
 assert.match(importer,/state\.last_run=\{/);
 assert.match(css,/@media\(max-width:860px\)/);
 assert.match(css,/safe-area-inset-bottom/);
});

test('un visiteur anonyme peut accéder à la création de compte depuis la page paquets',()=>{
 const html=packs({pack:'classic',stock:null,user:null,cards:[],wallet:null,seasonShows:[]});
 const button=html.match(/<button id="openPack"[^>]*>/)?.[0]||'';
 assert.match(button,/id="openPack"/);
 assert.doesNotMatch(button,/disabled/);
 assert.match(html,/Commencer à jouer/);
 assert.match(html,/Créer un compte gratuit/);
 const connected=packs({pack:'classic',stock:{stock:0,maximum:10},user:{id:'test'},cards:[],wallet:null,seasonShows:[]});
 assert.match(connected,/<button id="openPack"[^>]*disabled/);
});
test('la recherche globale est disponible depuis la barre supérieure sur toutes les pages',()=>{
 const app=fs.readFileSync('v3/app.js','utf8');
 assert.match(app,/id="topSearch"/);
 assert.match(app,/change\('catalog'\);\$\('catalogQuery'\)/);
});
