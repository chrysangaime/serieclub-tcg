import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PRODUCT,aboutPage,footerHTML} from '../v1/product.js';
import {settings} from '../v3/views.js';
const file=p=>fs.readFileSync(p,'utf8');
test('L’identité publique demeure V1.0 avant tout lancement',()=>{
 const pkg=JSON.parse(file('package.json')),html=file('index.html');
 assert.equal(pkg.version,'1.0.0');assert.equal(PRODUCT.version,'V1.0');
 assert.equal(PRODUCT.launched,false);
 assert.match(html,/<title>SériesClubTCG V1\.0/);
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(html,/v1\/finish\.css\?v=1\.0\.0/);
 assert.match(html,/v3\/app\.js\?v=1\.0\.0&build=5/);
});
test('Navigation à propos et liens de pied de page réellement routés',()=>{
 const app=file('v3/app.js');
 assert.match(app,/about:aboutPage/);
 assert.match(app,/views\.js\?v=1\.0\.0&build=2/);
 assert.match(file('index.html'),/views\.js\?v=1\.0\.0&build=2/);
 assert.match(app,/apropos:'about'/);
 assert.match(app,/about:'apropos'/);
 assert.match(app,/footerHTML\(\)/);
 assert.match(app,/data-route/);
 assert.match(app,/function publicError\(error\)/);
 assert.doesNotMatch(app,/Active la migration SQL V\d/);
 assert.match(footerHTML(),/data-route="rules"/);
 assert.match(footerHTML(),/data-route="about"/);
 assert.match(settings({theme:'night'}),/data-route="about"/);
});
test('La page de transparence est informative et sans fausse affiliation',()=>{
 const about=aboutPage();
 for(const phrase of ['Accès anticipé','TVmaze','TMDB','JustWatch','Supabase','n’éditent pas','avant tout lancement commercial'])
  assert.match(about,new RegExp(phrase,'i'));
 assert.match(about,/data-route="albums"/);
 assert.match(about,/data-route="games"/);
 assert.doesNotMatch(about,/www\.github\.io/);
});
test('Le nom commercial et le routage préservent la continuité des comptes',()=>{
 const app=file('v3/app.js'),html=file('index.html');
 assert.match(app,/createClient\(/);
 assert.match(app,/loadSession\(/);
 assert.match(html,/id="overlay"/);
 assert.match(html,/id="mobileNav"/);
 assert.match(file('v1/finish.css'),/@media\(max-width:760px\)/);
 assert.doesNotMatch(html,/seriesclub-tcg\.fr/);
});
