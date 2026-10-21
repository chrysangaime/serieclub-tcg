/**
 * SérieClub — rendu des parties récompensées.
 * Les bonnes réponses ne sont jamais déduites du navigateur :
 * ce composant ne révèle que les résultats déjà validés par Supabase.
 */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeImg=x=>/^https:\/\/(?:static\.tvmaze\.com|image\.tmdb\.org|[^/]+\.tvmaze\.com)\//i.test(x||'')?esc(x):'';
const levels={poster:['◈','Détail mystère','Retrouve la série à partir d’un fragment de son affiche.'],
 pixel:['▦','Mosaïque pixel','Reconnais l’affiche entière en gros pixels.'],
 timeline:['◷','Chrono séries','Qui est apparu sur nos écrans en premier ?'],
 year:['✧','L’année culte','Retrouve les séries qui ont marqué leur époque.']};
export const gameModes=Object.freeze(Object.keys(levels));
export function gameCards(status={},records={}){
 const active=status?.enabled===true;
 return '<div class="sc7-mode-grid">'+gameModes.map(type=>{
  const [symbol,title,description]=levels[type];
  const info=status?.modes?.[type];
  const retry=Date.parse(info?.next_available_at||'');
  const resume=active&&status?.active_mode===type;
  const locked=!resume&&info?.available===false&&Number.isFinite(retry)&&retry>Date.now();
  const next=locked?new Date(retry).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
  return '<article class="sc7-mode sc7-mode-'+type+'">'+
   '<div class="sc7-mode-art"><span aria-hidden="true">'+symbol+'</span>'+
   '<div class="sc7-mode-ornament" aria-hidden="true"></div></div>'+
   '<div class="sc7-mode-content"><span class="sc7-mode-eyebrow">'+
    (active?'DÉFI RÉCOMPENSÉ':'ENTRAÎNEMENT')+'</span><h2>'+esc(title)+'</h2><p>'+esc(description)+'</p>'+
   '<div class="sc7-mode-meta"><span>5 questions</span><span>'+(active?'80 crédits max':'Sans crédits')+'</span></div>'+ 
   (locked?'<p class="sc8-retry">Disponible le '+esc(next)+'</p>':'')+
   '<button class="btn primary" data-challenge="'+type+'"'+(locked?' disabled':'')+'>'+(resume?'Reprendre':locked?'À demain':'Jouer')+' <span aria-hidden="true">↗</span></button></div></article>'
 }).join('')+'</div>';
}
export function rewardQuizHTML(session,feedback=null,busy=false){
 if(!session)return '';
 if(session.finished && !feedback){
  const best=session.score===5;
  return '<section class="sc7-finish" role="status"><div class="sc7-finish-symbol">'+(best?'✦':'★')+'</div>'+
   '<p class="caps">DÉFI TERMINÉ</p><h2>'+(best?'Sans-faute !':'Bien joué !')+'</h2>'+
   '<strong class="sc7-result-score">'+Number(session.score||0)+' / 5</strong>'+
   '<p class="sc7-reward-total">+'+Number(session.credits_earned||0)+' crédits gagnés</p>'+
   '<p>'+(best?'Bonus parfait inclus.':'Reviens tenter un nouveau défi !')+'</p>'+
   '<div class="sc7-end-actions"><button class="btn primary" data-quiz-home>Choisir un autre jeu</button>'+
   '<button class="btn subtle" data-route="packs">Ouvrir un paquet ↗</button></div></section>';
 }
 const display=feedback?.previous||session;
 const q=display.question||{};
 const choices=Array.isArray(q.options)?q.options:[];
 const isTimeline=display.mode==='timeline';
 const isPixel=display.mode==='pixel';
 const img=safeImg(q.poster);
 const poster=img?'<div class="sc7-clue '+(isPixel?'sc7-pixel sc8-pixel':'sc7-poster sc8-poster')+
   (feedback?' is-revealed':'')+'"><img src="'+img+'" alt="'+(feedback?'Affiche dévoilée':'Indice visuel de série à reconnaître')+
   '" loading="eager"></div>':'';
 const buttons=choices.map(c=>{
  const selected=feedback&&Number(c.id)===Number(feedback.answer);
  const correct=feedback&&Number(c.id)===Number(feedback.correct_answer);
  const classes=(correct?' is-correct':'')+(selected&&!correct?' is-wrong':'');
  return '<button type="button" class="sc7-answer'+classes+'" data-reward-answer="'+Number(c.id)+'"'+
    (feedback||busy?' disabled':'')+'>'+
    (isTimeline&&safeImg(c.image_url)?'<img src="'+safeImg(c.image_url)+'" alt="" loading="lazy">':'')+
    '<span>'+esc(c.name)+'</span>'+(correct?'<b aria-label="Bonne réponse">✓</b>':selected?'<b aria-label="Mauvaise réponse">×</b>':'')+
    '</button>';
 }).join('');
 const step=Number(display.round||1),total=5;
 const header='<div class="sc7-quiz-top"><span>QUESTION '+step+' / '+total+'</span>'+
   '<strong>✦ '+Number(display.score||0)+' bonne'+(Number(display.score)===1?'':'s')+' réponse'+(Number(display.score)===1?'':'s')+'</strong></div>'+
   '<div class="sc7-quiz-steps" aria-label="Progression">'+
    Array.from({length:total},(_,i)=>'<span class="'+(i<step-1?'complete':i===step-1?'current':'')+'"></span>').join('')+'</div>';
 const answered=feedback?'<div class="sc7-quiz-feedback '+(feedback.correct?'good':'bad')+'" role="status">'+
  '<strong>'+(feedback.correct?'✓ Exact !':'Pas cette fois !')+'</strong>'+
  '<span>'+(feedback.correct?'+'+Number(feedback.earned||0)+' crédits':'Réponse : '+esc(choices.find(x=>Number(x.id)===Number(feedback.correct_answer))?.name||'')+
     (Number(feedback.earned)>0?' · +'+Number(feedback.earned)+' crédits':''))+'</span></div>'+
  '<button class="btn primary sc7-next" data-reward-next '+(busy?'disabled':'')+'>'+
   (feedback.completed?'Voir ma récompense':'Question suivante →')+'</button>':'';
 return '<section class="sc7-quiz" aria-label="Défi '+esc(levels[display.mode]?.[1]||'Séries')+'">'+
   header+'<h2>'+esc(q.description||'À toi de jouer !')+'</h2>'+poster+
   '<div class="sc7-answers">'+buttons+'</div>'+answered+
   (!feedback?'<p class="sc7-help">'+(busy?'Validation de la réponse…':'Bonne réponse : +10 crédits · Sans-faute : +30 crédits')+'</p>':'')+
   '<button class="sc7-quit" data-quiz-home>← Retour aux jeux</button></section>';
}
