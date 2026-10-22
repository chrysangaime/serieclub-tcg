import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pixelGrid,pixelateImage} from '../v10/pixel-canvas.js';
import {profileArtPanel} from '../v10/profile.js';
import {officialSeasonCatalog,officialSeasonHTML,seasonBadges} from '../v10/seasons.js';
import {storePage,offers} from '../v10/store.js';
import {profile,settings,navItems} from '../v3/views.js';

test('les pixels deviennent véritablement plus gros à chaque manche',()=>{
 assert.deepEqual([1,2,3,4,5].map(n=>pixelGrid(n)[0]),[13,10,9,7,6]);
 assert.equal(pixelGrid(0)[0],13);assert.equal(pixelGrid(99)[0],6);
 const code=fs.readFileSync('v10/pixel-canvas.js','utf8');
 assert.match(code,/canvas\.width=width/);
 assert.match(code,/context\.drawImage\(img,0,0,width,height\)/);
 assert.doesNotMatch(code,/toDataURL\(/);
 const app=fs.readFileSync('v3/app.js','utf8');
 assert.match(app,/updatePixelClues\(\$\('page'\)\)/);
 const css=fs.readFileSync('v10/experience.css','utf8');
 assert.match(css,/image-rendering:pixelated/);
 assert.match(css,/sc10-pixel-canvas/);
});
test('l’indice Pixel dessine vraiment une mosaïque de 10x15 pixels au canvas (manche 2)',()=>{
 const oldDocument=globalThis.document;
 const drawCalls=[],appended=[];
 const classes=new Set();
 const wrapper={
  classList:{contains:c=>classes.has(c),add:c=>classes.add(c)},
  querySelector:()=>null,
  append:canvas=>appended.push(canvas)
 };
 const canvas={
  width:0,height:0,className:'',
  setAttribute(){},
  getContext:()=>({imageSmoothingEnabled:false,
   drawImage:(image,x,y,w,h)=>{
    assert.equal(typeof w,'number');
    assert.equal(typeof h,'number');
    assert.ok(w>0&&h>0);
    drawCalls.push({w,h});
   }})
 };
 globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return canvas}};
 try{
  const img={complete:true,naturalWidth:400,naturalHeight:600,
   closest:()=>wrapper};
  assert.equal(pixelateImage(img,2),true);
  assert.equal(canvas.width,10);
  assert.equal(canvas.height,15);
  assert.deepEqual(drawCalls,[{w:10,h:15}]);
  assert.equal(appended.length,1);
  assert.equal(classes.has('sc10-pixel-ready'),true);
 }finally{
  if(oldDocument===undefined)delete globalThis.document;
  else globalThis.document=oldDocument;
 }
});
test('nuit par défaut et jour mémorisé et accessibles sans compte',()=>{
 const app=fs.readFileSync('v3/app.js','utf8');
 const html=fs.readFileSync('index.html','utf8');
 assert.match(app,/function savedTheme\(/);
 assert.match(app,/state\.theme=next==='day'\?'day':'night'/);
 assert.match(app,/localStorage\.setItem\('sc10-theme'/);
 assert.match(html,/document\.documentElement\.dataset\.theme/);
 assert.match(html,/v10\/experience\.css\?v=10\.\d+\.\d+/);
 const settingsHtml=settings({theme:'day'});
 assert.match(settingsHtml,/data-theme-choice="night"/);
 assert.match(settingsHtml,/data-theme-choice="day"/);
 assert.match(settingsHtml,/aria-pressed="true"/);
});
test('saisons officielles visibles, revendication réservée aux joueurs ayant atteint le seuil',()=>{
 assert.equal(officialSeasonCatalog.length,6);
 const preview=officialSeasonHTML({});
 assert.match(preview,/Les Saisons à compléter/);
 assert.match(preview,/Retour dans les années 90/);
 assert.match(preview,/data-claim-season="comedies" disabled/);
 const active=officialSeasonCatalog.map(x=>({...x,owned:3,claimed:false}));
 active[0]={...active[0],owned:8};
 const html=officialSeasonHTML({officialSeasons:active,officialSeasonError:''});
 assert.match(html,/data-claim-season="nineties"(?! disabled)/);
 assert.match(html,/aria-valuenow="8"/);
 assert.match(html,/data-claim-season="comedies" disabled/);
 const claimed=seasonBadges([{id:'nineties',title:'90',badge:'📼 Nostalgie',claimed:true},{id:'x',claimed:false}]);
 assert.equal(claimed.length,1);
});
test('avatars et bannières uniquement proposés parmi les affiches de cartes possédées',()=>{
 const cards=[{series_id:1,series:{id:1,name:'Lost',image_url:'https://example.org/lost.jpg'}},
  {series_id:2,series:{id:2,name:'24',image_url:'https://example.org/24.jpg'}},
  {series_id:2,series:{id:2,name:'24',image_url:'https://example.org/24.jpg'}}];
 const s={cards,user:{id:'1'},username:'Test',avatarSeriesId:1,bannerSeriesId:2,
  officialSeasons:[{id:'nineties',title:'Les 90',badge:'📼 Nostalgie',claimed:true}]};
 const html=profileArtPanel(s);
 assert.match(html,/id="profileAvatar"/);
 assert.match(html,/id="profileBanner"/);
 assert.match(html,/Lost/);assert.match(html,/24/);
 assert.match(html,/📼 Nostalgie/);
 assert.match(html,/2 affiches débloquées/);
 assert.match(profile({...s,wallet:{},bio:'',favoriteGenre:''}),/profileAvatar/);
});
test('Premium et achats : prix clairs sans checkout trompeur ou crédits client fictifs',()=>{
 assert.equal(offers.premium.eur,1.99);
 assert.deepEqual(offers.packs.map(x=>x.eur),[0.99,2.49,4.99]);
 const html=storePage();
 assert.match(html,/1,99 €|1\.99/);
 assert.match(html,/aucun prélèvement/);
 assert.match(html,/Abonnement non disponible/);
 assert.match(html,/disabled/);
 assert.ok(navItems.some(([key])=>key==='store'));
 const sql=fs.readFileSync('supabase/game_v10_commerce_ready.sql','utf8');
 assert.match(sql,/enabled boolean NOT NULL DEFAULT false/);
 assert.match(sql,/REVOKE ALL ON public\.commerce_receipts/);
 assert.doesNotMatch(sql,/UPDATE public\.player_wallets SET credits/i);
});
