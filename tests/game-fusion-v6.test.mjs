import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {quizQuestion,newQuiz,answerQuiz,nextQuiz,quizHTML} from '../v6/games.js';
import {fusionPlan,autoFusion,fusionConfirmation,nextFusionRank} from '../v6/fusion.js';
import {fusions,games} from '../v3/views.js';

const series=(id,year=1990)=>({id,name:'Série '+id,image_url:'https://example.org/'+id+'.jpg',
 premiered:year+'-01-01',fr_verified:true});
const pool=Array.from({length:110},(_,i)=>series(i+10,1950+i));

test('quiz : 3 modes, cinq manches, bonnes réponses et aucune distribution fictive de crédits',()=>{
 for(const type of ['poster','timeline','year']){
  const game=newQuiz(type,pool,()=>0.2);
  assert.ok(game,type);assert.equal(game.total,5);
  const html=quizHTML(game);
  assert.match(html,/data-quiz-answer/);
  if(type==='poster')assert.match(html,/sc60-blurred/);
  let active=game;
  for(let i=1;i<=5;i++){
   active=answerQuiz(active,active.question.answer);
   assert.equal(active.score,i);
   assert.equal(active.answered,true);
   active=nextQuiz(active,()=>0.2);
  }
  assert.equal(active.finished,true);
  assert.match(quizHTML(active),/5 \/ 5/);
  assert.match(quizHTML(active),/aucun crédit ni XP ajouté/);
 }
});
test('quiz : une série non vérifiée France ou une date ambiguë est exclue',()=>{
 const wrong=[...pool.slice(0,3),{...series(99),fr_verified:false}];
 assert.equal(newQuiz('poster',wrong),null);
 assert.equal(quizQuestion('timeline',pool.slice(0,4).map(x=>({...x,premiered:'2000-01-01'}))),null);
 assert.equal(answerQuiz(null,'x'),null);
 const q=newQuiz('poster',pool);
 const bad=answerQuiz(q,'99999');
 assert.equal(bad.score,0);
 assert.equal(answerQuiz(bad,bad.question.answer).score,0,'impossible de jouer deux fois');
});
const card=(series_id,copy=0,opts={})=>({
 id:'card-'+series_id+'-'+copy,series_id,rarity:'Commune',locked:false,
 reserved_trade_id:null,
 series:{name:'Serie '+series_id,image_url:'https://example.org/img.jpg',rarity:'Commune',
  rarity_source:'popularity',fr_verified:true},
 ...opts
});
test('fusion : ne sélectionner automatiquement que des doublons, jamais une dernière copie',()=>{
 const cards=Array.from({length:12},(_,i)=>[card(i,1),card(i,2)]).flat();
 const p=fusionPlan(cards,'Commune',[],[],true);
 assert.equal(p.duplicates,12);
 assert.equal(p.uniqueOnly,12);
 assert.equal(p.allowed.length,12);
 const picks=autoFusion(p);
 assert.equal(picks.length,10);
 const prepared=fusionPlan(cards,'Commune',picks,[],true);
 assert.equal(prepared.ready,true);
 assert.equal(prepared.selectedCards.some(x=>x.isLast),false);
 assert.equal(fusionConfirmation(prepared).lastCount,0);
 assert.equal(nextFusionRank('Mythique'),'Unique');
 assert.equal(nextFusionRank('Unique'),null);
});
test('fusion : exclusion des cartes protégées, en vente, réservées et sans preuve France',()=>{
 const list=[
  card(1,0),card(2,0,{locked:true}),
  card(3,0,{reserved_trade_id:'some-uuid'}),
  card(4,0,{series:{rarity:'Commune',fr_verified:false,rarity_source:'popularity',image_url:'https://x'}}),
  card(5,0,{series:{rarity:'Commune',fr_verified:true,rarity_source:'pending',image_url:'https://x'}}),
  card(6,0),card(7,0,{series:{rarity:'Rare',fr_verified:true,rarity_source:'editorial',image_url:'https://x'}})
 ];
 const market=[{card_id:'card-6-0',status:'active'}];
 const protectedPlan=fusionPlan(list,'Commune',[],market,true);
 assert.equal(protectedPlan.allowed.length,0);
 const riskPlan=fusionPlan(list,'Commune',[],market,false);
 assert.deepEqual(riskPlan.allowed.map(c=>c.id),['card-1-0']);
 assert.equal(fusionConfirmation(riskPlan),null);
 assert.deepEqual(fusionPlan(list,'Commune',['card-1-0'],market,true).selected,[]);
});
test('fusion : interface affiche conséquences et confirmation obligatoire avant appel RPC',()=>{
 const cards=Array.from({length:11},(_,i)=>[card(i,1),card(i,2)]).flat();
 const s={cards,marketActivity:[],fusionRank:'Commune',fusionSelected:[],
  fusionProtectLast:true,fusionPage:0,user:{id:'player'}};
 const html=fusions(s);
 assert.match(html,/Atelier de fusion/);
 assert.match(html,/Préserver mes dernières copies/);
 assert.match(html,/Sélection intelligente/);
 assert.match(html,/data-fusion-pick/);
 assert.match(html,/id="fusionSubmit"[^>]*disabled/);
 const prepared=fusions({...s,fusionSelected:autoFusion(fusionPlan(cards,'Commune',[],[],true))});
 assert.match(prepared,/Fusionner 10 → 1 · Vérifier/);
 assert.doesNotMatch(prepared,/id="fusionSubmit"[^>]*disabled/);
 const app=fs.readFileSync('v3/app.js','utf8');
 assert.match(app,/previewFusion\(\)/);
 assert.match(app,/fuse_cards/);
 assert.match(app,/fusionConfirmation\(plan\)/);
});
test('jeux : nouvelle arène et grille accessible en France',()=>{
 const html=games({wallet:{experience:120},quiz:null});
 for(const type of ['poster','timeline','year'])assert.match(html,new RegExp('data-challenge="'+type+'"'));
 assert.match(html,/5 manches/);
 assert.match(html,/aucun crédit/i);
});
