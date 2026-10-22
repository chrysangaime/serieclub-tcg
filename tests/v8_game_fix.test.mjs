import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GAME_MODES,COOLDOWN_MS,trainingModeStatus,canStartTraining,startTraining} from '../v8/game-limits.js';
import {gameCards,rewardQuizHTML} from '../v7/arena.js';
import {quizQuestion,quizHTML,newQuiz} from '../v6/games.js';
import {fusionPlan,autoFusion} from '../v6/fusion.js';
import {fusions} from '../v3/views.js';

test('24 heures glissantes et quotas indépendants des quatre mini-jeux',()=>{
 const now=Date.parse('2026-10-21T16:00:00Z');
 assert.deepEqual(GAME_MODES,['poster','pixel','timeline','year']);
 let played={};
 played=startTraining(played,'poster',now);
 assert.ok(played);
 assert.equal(canStartTraining(played,'poster',now+COOLDOWN_MS-1),false);
 assert.equal(canStartTraining(played,'poster',now+COOLDOWN_MS),true);
 for(const other of ['pixel','timeline','year'])assert.equal(canStartTraining(played,other,now),true);
 assert.equal(startTraining(played,'poster',now+20),null);
 const status=trainingModeStatus(played,now);
 assert.equal(status.poster.available,false);
 assert.equal(status.pixel.available,true);
 assert.equal(status.poster.next_available_at,'2026-10-22T16:00:00.000Z');
});
test('jeu verrouillé côté interface ; trois autres modes restent jouables',()=>{
 const status={enabled:true,limit_per_mode_hours:24,
  modes:{poster:{available:false,next_available_at:new Date(Date.now()+3_600_000).toISOString()},
  pixel:{available:true,next_available_at:null}}};
 const ui=gameCards(status,{});
 assert.match(ui,/data-challenge="poster" disabled/);
 assert.match(ui,/data-challenge="pixel"(?! disabled)/);
 assert.match(ui,/Disponible le/);
 assert.match(ui,/Mosaïque pixel/);
 assert.match(ui,/Détail mystère/);
});
test('une partie commencée reste reprenable même pendant son délai de 24 heures',()=>{
 const until=new Date(Date.now()+COOLDOWN_MS).toISOString();
 const html=gameCards({enabled:true,limit_per_mode_hours:24,active_mode:'poster',
  modes:{poster:{available:false,next_available_at:until}}});
 assert.match(html,/data-challenge="poster">Reprendre/);
 assert.doesNotMatch(html,/data-challenge="poster" disabled/);
});

test('affiche et pixels ont deux présentations vraiment différentes',()=>{
 const pool=Array.from({length:30},(_,i)=>({
  id:i+1,name:'Série '+i,image_url:'https://example.org/'+i+'.jpg',
  premiered:(1970+i)+'-01-01',fr_verified:true
 }));
 const poster=quizQuestion('poster',pool,()=>0.123);
 const pixels=quizQuestion('pixel',pool,()=>0.123);
 assert.match(poster.description,/détail d’affiche/);
 assert.match(pixels.description,/mosaïque de pixels/);
 assert.match(quizHTML(newQuiz('poster',pool,()=>0.12)),/sc8-training-poster/);
 assert.match(quizHTML(newQuiz('pixel',pool,()=>0.12)),/sc7-training-pixel sc8-pixel/);
 const sample={session_id:'x',mode:'poster',round:1,score:0,
  question:{description:'?',poster:'https://static.tvmaze.com/a.jpg',
   options:[{id:1,name:'Série 1'},{id:2,name:'Série 2'}]}};
 assert.match(rewardQuizHTML(sample),/sc7-poster sc8-poster/);
 assert.match(rewardQuizHTML({...sample,mode:'pixel'}),/sc7-pixel sc8-pixel/);
 const css=fs.readFileSync('v8/experience.css','utf8');
 assert.match(css,/\.sc8-poster/);
 assert.match(css,/transform:scale\(2\.35\)/);
 assert.match(css,/\.sc8-pixel/);
 assert.match(css,/width:10%/);
 assert.match(css,/image-rendering:pixelated/);
});
test('le bouton fermer du récapitulatif a une cible tactile dédiée',()=>{
 const app=fs.readFileSync('v3/app.js','utf8');
 const css=fs.readFileSync('v8/experience.css','utf8');
 assert.match(app,/\$\('overlay'\)\.addEventListener\('click',e=>\{/);
 assert.match(app,/const close=e\.target\.closest\?\.\('\[data-close\]'\)/);
 assert.match(app,/e\.stopPropagation\(\);closeModal\(\)/);
 assert.match(css,/opening-dialog>\.close/);
 assert.match(css,/width:48px/);
});
test('la fusion automatique étale les doublons sur plusieurs séries et prévoit un retrait simple',()=>{
 const cards=[];
 for(let series=0;series<11;series++){
  for(let copy=0;copy<3;copy++)cards.push({
   id:'c'+series+'-'+copy,series_id:series,rarity:'Commune',locked:false,
   reserved_trade_id:null,obtained_at:new Date(2024,0,series+copy+1).toISOString(),
   series:{name:'Série '+series,rarity:'Commune',rarity_source:'popularity',
    fr_verified:true,image_url:'https://example.org/'+series+'.jpg'}
  });
 }
 const plan=fusionPlan(cards,'Commune',[],[],true);
 const selected=autoFusion(plan);
 assert.equal(selected.length,10);
 assert.equal(new Set(selected.map(id=>id.split('-')[0])).size,10);
 assert.equal(selected.some(id=>plan.allowed.find(c=>String(c.id)===id)?.isLast),false);
 const html=fusions({cards,marketActivity:[],fusionRank:'Commune',fusionSelected:selected,
  fusionProtectLast:true,fusionPage:0});
 assert.match(html,/Ton panier de fusion/);
 assert.match(html,/aria-valuenow="10"/);
 assert.match(html,/Retirer Série/);
});
test('migration 24 heures : quota SQL, verrou anti-double appareil, aucun effacement du jeu',()=>{
 const sql=fs.readFileSync('supabase/game_v7_1_24h.sql','utf8');
 assert.match(sql,/mode=p_mode/);
 assert.match(sql,/interval '24 hours'/);
 assert.match(sql,/FOR UPDATE/);
 assert.match(sql,/next_available_at/);
 assert.doesNotMatch(sql,/DELETE FROM public\.(?:player_cards|player_wallets)/i);
});

test('pixels : le conteneur de l’indice a toujours une hauteur réelle avant les réponses',()=>{
 const pool=Array.from({length:12},(_,i)=>({
  id:900+i,name:'Série test '+i,image_url:'https://example.org/'+i+'.jpg',
  premiered:(1992+i)+'-01-01',fr_verified:true
 }));
 for(const mode of ['pixel','poster']){
  const html=quizHTML(newQuiz(mode,pool,()=>0.3));
  assert.match(html,new RegExp('sc60-mystery sc9-visual sc9-visual--'+mode));
  const imageIndex=html.indexOf('sc9-clue-image');
  const answersIndex=html.indexOf('sc60-choices');
  assert.ok(imageIndex>0 && answersIndex>imageIndex,
    'l’indice est présent avant les quatre réponses');
  assert.match(html,/loading="eager"/);
  assert.match(html,/data-quiz-change-clue hidden/);
 }
 const css=fs.readFileSync('v8/experience.css','utf8');
 assert.match(css,/sc60-mystery\.sc9-visual\s*\{/);
 assert.match(css,/aspect-ratio:2\s*\/\s*3/);
 assert.match(css,/width:min\(220px,65vw\)/);
 assert.match(css,/position:relative!important/);
 assert.match(css,/sc9-visual--pixel:not\(\.is-revealed\)>\.sc9-clue-image/);
 assert.match(css,/width:10%!important/);
 assert.match(css,/transform:scale\(10\)!important/);
 assert.match(css,/image-rendering:pixelated!important/);
 const app=fs.readFileSync('v3/app.js','utf8');
 assert.match(app,/function changeQuizClue\(\)/);
 assert.match(app,/document\.addEventListener\('error'/);
 assert.match(app,/\[data-quiz-change-clue\]/);
});

test('la tentative Pixel perdue est recréditée une fois, sans remettre à zéro les autres jeux',()=>{
 const app=fs.readFileSync('v3/app.js','utf8');
 const start=app.indexOf("const TRAINING_KEY=");
 const end=app.indexOf("function offlineChallengeStatus()",start);
 assert.ok(start>=0 && end>start);
 const snippet=app.slice(start,end);
 const data=new Map([['sc8-quiz-cooldowns',JSON.stringify({pixel:10000,poster:20000,year:30000})]]);
 const localStorage={
  getItem(key){return data.get(key)??null},
  setItem(key,value){data.set(key,String(value))}
 };
 const first=vm.runInNewContext(snippet+';readTrainingStarts()', {localStorage});
 assert.equal(first.pixel,undefined);
 assert.equal(first.poster,20000);
 assert.equal(first.year,30000);
 assert.equal(data.get('sc8.1-pixel-visibility-restored'),'yes');
 data.set('sc8-quiz-cooldowns',JSON.stringify({pixel:40000,poster:20000,year:30000}));
 const second=vm.runInNewContext(snippet+';readTrainingStarts()', {localStorage});
 assert.equal(second.pixel,40000,'le correctif ne doit pas permettre de rejouer indéfiniment');
 assert.equal(second.poster,20000);
});
