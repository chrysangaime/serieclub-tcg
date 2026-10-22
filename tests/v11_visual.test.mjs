import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {navigationIcon} from '../v11/icons.js';
import {pixelGrid} from '../v10/pixel-canvas.js';
import {pixelPreviewHTML} from '../v10/pixel-preview.js';
import {navItems} from '../v3/views.js';

const css=fs.readFileSync('v11/design-system.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('v3/app.js','utf8');

function luminance(hex){
 const rgb=hex.match(/[a-f0-9]{2}/gi).map(n=>parseInt(n,16)/255);
 const channels=rgb.map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
 return channels[0]*0.2126+channels[1]*0.7152+channels[2]*0.0722;
}
function contrast(a,b){
 const [hi,lo]=[luminance(a),luminance(b)].sort((a,b)=>b-a);
 return (hi+.05)/(lo+.05);
}
test('les couleurs jour et nuit conservent un contraste de texte confortable',()=>{
 const surfaces={
  night:['#f4f7fd','#1d2738','#b8c5d7'],
  day:['#202c40','#ffffff','#50627b']
 };
 for(const [mode,[ink,surface,muted]] of Object.entries(surfaces)){
  assert.ok(contrast(ink,surface)>=7,mode+' title contrast');
  assert.ok(contrast(muted,surface)>=4.5,mode+' secondary contrast');
  assert.match(css,new RegExp(':root\\[data-theme="'+mode+'"\\]'));
  assert.ok(css.includes(ink));
  assert.ok(css.includes(muted));
 }
});
test('le nouveau design est chargé en dernier après les règles historiques',()=>{
 const before=html.indexOf('v10/experience.css?v=10.1.0');
 const after=html.indexOf('v11/design-system.css?v=11.0.0');
 assert.ok(before>=0&&after>before);
 assert.match(html,/v3\/app\.js\?v=1[12]\.\d+\.\d+/);
 assert.match(app,/v11\/icons\.js\?v=11\.0\.0/);
 assert.match(app,/function chooseTheme\(next\)/);
 assert.match(app,/document\.documentElement\.dataset\.theme=state\.theme/);
});
test('menus clairs et sombres : les feuilles anciennes sont neutralisées dans toutes les grandes rubriques',()=>{
 for(const element of ['#sidebar','#topbar','#mobileNav','.side-link','.sc7-hero',
  '.sc7-mode','.sc60-fusion-hero','.sc59-explorer','.sc52-stats',
  '.sc4-album','.sc10-season-card','.sc11-preview','.sc10-shop-hero']){
  assert.ok(css.includes(element),'Missing '+element);
 }
 for(const token of ['--sc11-ink','--sc11-sub','--sc11-border','--sc11-surface',
  '--sc11-teal','--sc11-purple','--sc11-amber']){
  assert.match(css,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 }
 assert.match(css,/html\[data-theme="day"\] \.sc7-hero/);
 assert.match(css,/html\[data-theme="day"\] \.sc7-quiz/);
 assert.match(css,/html\[data-theme="day"\] \.sc7-answer/);
 assert.match(css,/html\[data-theme="day"\] \.sc10-shop-hero/);
 assert.match(css,/@media\(max-width:860px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
test('navigation vectorielle homogène sur toutes les rubriques',()=>{
 for(const [route] of navItems){
  const icon=navigationIcon(route);
  assert.match(icon,/<svg /);
  assert.match(icon,/viewBox="0 0 24 24"/);
  assert.match(icon,/aria-hidden="true"/);
  assert.doesNotMatch(icon,/<script|onerror=/i);
 }
 assert.match(app,/const sections=\{packs:'DÉCOUVRIR'/);
 assert.match(app,/navigationIcon\(key,esc\(icon\)\)/);
 assert.match(app,/navigationIcon\(route,icon\)/);
});
test('pixel 5 manches : équilibre facilité, progression et aperçu cohérent sans quota',()=>{
 const widths=[1,2,3,4,5].map(n=>pixelGrid(n)[0]);
 assert.deepEqual(widths,[22,19,17,15,13]);
 assert.ok(widths.every((n,i)=>i===0||widths[i-1]>n));
 const pv=pixelPreviewHTML({items:[{id:9,name:'Série',image_url:'https://static.tvmaze.com/123.jpg'}],round:3,index:0,revealed:false});
 assert.match(pv,/17 pixels de largeur/);
 assert.match(app,/index:0,round:2,revealed:false,loading:true/);
 assert.match(html,/pixel-canvas\.js\?v=10\.2\.0/);
 assert.match(html,/pixel-preview\.js\?v=10\.2\.0/);
});
