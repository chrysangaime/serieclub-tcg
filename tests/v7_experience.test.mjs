import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {openingFrame,rarityTier,quality} from '../v7/booster.js';
import {gameCards,rewardQuizHTML,gameModes} from '../v7/arena.js';
import {quizQuestion,newQuiz} from '../v6/games.js';
import {games} from '../v3/views.js';
const cards=[
 {series_id:1,name:'Premier titre',image_url:'https://example.org/a.jpg',rarity:'Commune'},
 {series_id:2,name:'Second titre',image_url:'https://example.org/b.jpg',rarity:'Rare'},
 {series_id:3,name:'Troisième titre',image_url:'https://example.org/c.jpg',rarity:'Légendaire'},
 {series_id:4,name:'Quatrième titre',image_url:'https://example.org/d.jpg',rarity:'Épique'},
 {series_id:5,name:'Cinquième titre',image_url:'https://example.org/e.jpg',rarity:'Unique'}
];
test('cinématique : booster fermé puis cinq révélations, raretés mises en valeur et bilan',()=>{
 assert.match(openingFrame(cards,0),/Le moment de vérité/);
 assert.match(openingFrame(cards,0),/openingNext/);
 assert.match(openingFrame(cards,1),/Premier titre/);
 assert.match(openingFrame(cards,3),/Troisième titre/);
 assert.match(openingFrame(cards,3),/sc7-tier-legendaire/);
 assert.match(openingFrame(cards,5),/Cinquième titre/);
 assert.match(openingFrame(cards,5),/Révéler la dernière carte|Voir mes cinq cartes/);
 const end=openingFrame(cards,6);
 for(const c of cards)assert.match(end,new RegExp(c.name));
 assert.match(end, /\+25 crédits/);
 assert.match(end, /\+50 XP/);
 assert.match(end, /id="openingDone"/);
});
test('animation accessible : réduction des mouvements désactive les particules',()=>{
 assert.equal(quality('Unique'),true);
 assert.equal(rarityTier('Légendaire'),'legendaire');
 assert.doesNotMatch(openingFrame(cards,5, true),/sc7-spark/);
 assert.match(openingFrame(cards,5,false),/sc7-spark/);
});
test('quatre défis, menu récompensé uniquement si serveur actif, sans promesse trompeuse',()=>{
 assert.deepEqual(gameModes,['poster','pixel','timeline','year']);
 const free=games({wallet:{credits:100},quiz:null, rewardStatus:{enabled:false}});
 assert.match(free,/Défis libres/);
 assert.doesNotMatch(free,/Jusqu’à 80 crédits/);
 const paid=games({wallet:{credits:100},quiz:null,rewardStatus:{enabled:true,remaining_today:2}});
 assert.match(paid,/\+10 crédits par bonne réponse/);
 assert.match(paid,/2 parties récompensées restantes/);
 for(const type of gameModes)assert.match(paid,new RegExp('data-challenge="'+type+'"'));
});
test('partie récompensée : jamais de révélation de la réponse avant validation serveur',()=>{
 const options=cards.slice(0,4).map((c,i)=>({id:i+1,name:c.name,image_url:null}));
 const started={session_id:'abc',mode:'poster',round:1,total:5,score:0,credits_earned:0,
  question:{description:'À quelle série appartient cette affiche ?',poster:'https://static.tvmaze.com/a.jpg',options}};
 const html=rewardQuizHTML(started);
 assert.match(html,/data-reward-answer="1"/);
 assert.match(html,/\+10 crédits/);
 assert.doesNotMatch(html,/is-correct/);
 const next={...started,round:2,score:1,question:{...started.question}};
 const feedback=rewardQuizHTML(next,{previous:started,answer:3,correct_answer:3,correct:true,earned:10,completed:false});
 assert.match(feedback,/is-correct/);
 assert.match(feedback,/data-reward-next/);
 assert.match(feedback,/Exact !/);
 const finished=rewardQuizHTML({...started,finished:true,score:5,credits_earned:80});
 assert.match(finished,/80 crédits gagnés/);
 assert.doesNotMatch(finished,/data-reward-answer/);
});
test('mode pixel disponible aussi en entraînement non récompensé',()=>{
 const pool=Array.from({length:15},(_,i)=>({id:200+i,name:'Série '+i,
  premiered:(1992+i)+'-01-01',image_url:'https://example.org/a.jpg',fr_verified:true}));
 assert.ok(quizQuestion('pixel',pool));
 assert.equal(newQuiz('pixel',pool).total,5);
 const src=fs.readFileSync('v3/app.js','utf8');
 assert.match(src,/submit_rewarded_quiz_answer/);
 assert.match(src,/start_rewarded_quiz/);
 assert.match(src,/openingFrame\(openingCards/);
 assert.match(src,/if\(state\.rewardStatus\?\.enabled===true\)/);
 const migration=fs.readFileSync('supabase/game_v7_quiz.sql','utf8');
 assert.match(migration,/FOR UPDATE/);
 assert.match(migration,/auth\.uid\(\)/);
 assert.match(migration,/REVOKE ALL ON TABLE public\.rewarded_quiz_runs/);
 assert.match(migration,/created_at AT TIME ZONE 'Europe\/Paris'/);
});
