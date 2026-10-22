import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {svodHome} from '../v12/home.js';
const read=p=>fs.readFileSync(p,'utf8');
test('V14 est prioritaire dans les thèmes Jour et Nuit',()=>{
 const html=read('index.html'),css=read('v14/rebuild.css');
 assert.ok(html.indexOf('v14/rebuild.css')>html.indexOf('v13/experience.css'));
 assert.match(css,/:root\[data-theme="night"\]/);
 assert.match(css,/:root\[data-theme="day"\]/);
 assert.match(css,/url\('\.\.\/v12\/cinema-hero\.svg'\)/);
 assert.ok(fs.existsSync('v12/cinema-hero.svg'));
 assert.match(css,/@container sc14-packs \(max-width:770px\)/);
 assert.match(css,/@container sc14-packs \(max-width:470px\)/);
});
test('les trois visuels restent des paquets de vitrine, sans paiement Premium',()=>{
 const html=svodHome({
   isOctober:true,pack:'classic',user:{id:'test'},cards:[],
   wallet:{credits:100},stock:{stock:10,maximum:10},
   homeShows:[],seasonShows:[]
 },{foil:()=>'<div class="foil">ANCIEN</div>',timecode:()=>''});
 assert.match(html,/sc14-pack-visual--original/);
 assert.match(html,/sc14-pack-visual--halloween/);
 assert.match(html,/sc14-pack-visual--premium/);
 assert.match(html,/sc12-pack-original/);
 assert.match(html,/5 SÉRIES · 7 RARETÉS/);
 assert.match(html,/data-pack="classic"/);
 assert.match(html,/data-pack="halloween"/);
 assert.doesNotMatch(html,/data-pack="premium"|data-pay-now/);
 assert.doesNotMatch(html,/>ANCIEN</);
 assert.match(html,/id="openPack"/);
});
test('V14 n’altère aucun style spécifique aux raretés ni action serveur',()=>{
 const css=read('v14/rebuild.css');
 assert.doesNotMatch(css,/\.sc53-rarity-(?:commune|rare|legendaire|mythique|unique)/i);
 assert.doesNotMatch(css,/rpc\(|open_starter_booster|open_halloween_booster/);
});