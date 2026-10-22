import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pixelPreviewHTML} from '../v10/pixel-preview.js';
import {gameCards} from '../v7/arena.js';
import {games} from '../v3/views.js';
import {pixelGrid} from '../v10/pixel-canvas.js';

const sample={id:1,name:'Série de test',image_url:'https://static.tvmaze.com/uploads/images/medium_portrait/1.jpg'};
const waiting={enabled:true,limit_per_mode_hours:24,
 modes:{pixel:{available:false,next_available_at:new Date(Date.now()+6*3600000).toISOString()}}};

test('Le bouton de test est toujours activé même lorsque les parties Pixels sont bloquées',()=>{
 const html=gameCards(waiting);
 assert.match(html,/data-challenge="pixel" disabled/);
 assert.match(html,/data-pixel-preview/);
 assert.doesNotMatch(html,/data-pixel-preview[^>]*disabled/);
 assert.match(html,/Tester les pixels sans jouer/);
});

test('L’aperçu propose cinq difficultés en pixels réels, sans score ni récompense',()=>{
 const view=pixelPreviewHTML({items:[sample],index:0,round:3,revealed:false});
 assert.match(view,/data-quiz-round="3"/);
 assert.match(view,/sc9-visual--pixel/);
 assert.match(view,/sc11-preview-source/);
 for(let n=1;n<=5;n++)assert.match(view,new RegExp('data-pixel-preview-round="'+n+'"'));
 assert.match(view,/17 pixels de largeur/);
 assert.match(view,/data-pixel-preview-reveal/);
 assert.match(view,/data-pixel-preview-next/);
 assert.match(view,/data-pixel-preview-close/);
 assert.match(view,/aucun score, aucune carte et aucun crédit attribué/);
 assert.deepEqual([1,2,3,4,5].map(n=>pixelGrid(n)[0]),[22,19,17,15,13]);
});
test('Révéler affiche l’image originale et le nom de la série sans créer de partie',()=>{
 const view=pixelPreviewHTML({items:[sample],index:0,round:2,revealed:true});
 assert.match(view,/sc9-visual--pixel is-revealed/);
 assert.match(view,/Série : <strong>Série de test<\/strong>/);
 assert.match(view,/Remasquer l’affiche/);
});
test('Échappement des noms et URL malveillants dans l’aperçu',()=>{
 const view=pixelPreviewHTML({items:[{id:2,name:'<script>bad</script>',image_url:'javascript:alert(1)'}],
  index:0,round:2,revealed:true});
 assert.doesNotMatch(view,/<script>/);
 assert.doesNotMatch(view,/src="javascript:/);
});
test('L’écran de Jeux privilégie l’aperçu, même lorsque le jeu Pixels est verrouillé',()=>{
 const html=games({rewardStatus:waiting,quiz:null,rewardQuiz:null,
  pixelPreview:{items:[sample],index:0,round:1,revealed:false},wallet:{credits:350}});
 assert.match(html,/Tester Mosaïque pixel/);
 assert.match(html,/22 pixels de largeur/);
 assert.doesNotMatch(html,/data-reward-answer/);
});

test('L’aperçu ne touche ni au délai de 24 heures, ni aux RPC de récompense',()=>{
 const app=fs.readFileSync('v3/app.js','utf8');
 const preview=app.slice(app.indexOf('async function openPixelPreview(){'),app.indexOf('async function chooseChallenge(type){'));
 assert.match(preview,/supa\.from\('series'\)/);
 assert.doesNotMatch(preview,/supa\.rpc\(/);
 assert.doesNotMatch(preview,/startTraining\(/);
 assert.doesNotMatch(preview,/startRewardedChallenge\(/);
 assert.doesNotMatch(preview,/TRAINING_KEY|game_transactions|credits\s*[+]=/);
 assert.match(app,/if\(e\.target\.closest\('\[data-pixel-preview\]'\)\)/);
 assert.match(app,/updatePixelClues\(\$\('page'\)\)/);
 assert.match(fs.readFileSync('index.html','utf8'),/pixel-preview\.js\?v=10\.2\.0/);
});
