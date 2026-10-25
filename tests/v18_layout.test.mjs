import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {svodHome} from '../v12/home.js';
import {storePage} from '../v10/store.js';
const read=p=>fs.readFileSync(p,'utf8');
const demo={isOctober:true,user:{id:'test'},pack:'classic',cards:[],homeShows:[],seasonShows:[],wallet:{credits:100},stock:{stock:10,maximum:10}};
test('Pochettes branding lisibles et deux variantes réellement jouables',()=>{
 const html=svodHome(demo,{timecode:()=>''});
 assert.match(html,/sc18-foil-brand/);
 assert.match(html,/SÉRIES<em>CLUB<\/em>/);
 assert.match(html,/<small>TCG<\/small>/);
 assert.match(html,/sc15-foil--original/);
 assert.match(html,/sc15-foil--halloween/);
 assert.doesNotMatch(html,/sc12-pack-premium/);
 assert.doesNotMatch(html,/<strong>SÉRIE<em>CLUB<\/em>TCG<\/strong>/);
});
test('Premium est une offre distincte avec bénéfices et aucun booster Premium fictif',()=>{
 const html=svodHome(demo,{timecode:()=>''});
 const premium=storePage({paymentsMode:'disabled'});
 assert.match(premium,/3,99 €/);
 assert.match(premium,/Insigne exclusif/);
 assert.match(premium,/Aucun bonus de rareté/);
 assert.doesNotMatch(html,/data-pack="premium"/);
 assert.match(premium,/Souscription publique en préparation/);
});
test('Desktop et mobile ont une disposition propre sans nouveau fichier CSS empilé',()=>{
 const css=read('v15/cinema.css'),idx=read('index.html');
 assert.match(css,/@container sc15packs \(max-width:900px\)/);
 assert.match(css,/@container sc15packs \(max-width:620px\)/);
 assert.match(css,/sc18-premium-perks/);
 assert.match(css,/text-shadow:none!important/);
 assert.match(idx,/v15\/cinema\.css\?v=18\.0\.0/);
 assert.doesNotMatch(idx,/v14\/rebuild\.css/);
 assert.match(idx,/v3\\/app\\.js\\?v=1\\.1\\.0/);
});
