/**
 * Epizora — mini-jeux locaux : zéro gain de crédits/XP.
 * Uniquement des séries certifiées pour la France (vérification serveur au chargement).
 */
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const shuffle=(items,rng=Math.random)=>{
 const out=[...items];
 for(let i=out.length-1;i>0;i--){
  const j=Math.min(i,Math.max(0,Math.floor(rng()*(i+1))));
  [out[i],out[j]]=[out[j],out[i]];
 }
 return out;
};
const year=s=>Number(String(s?.premiered||'').slice(0,4));
const valid=s=>Number.isSafeInteger(Number(s?.id))&&s?.name&&/^https:\/\//.test(s?.image_url||'')&&year(s)>=1900&&Date.parse(String(s.premiered))<=Date.now()&&s.fr_verified===true;
const pick=(items,n,rng)=>shuffle(items,rng).slice(0,n);
export function quizQuestion(type,pool,rng=Math.random){
 // Éviter les intitulés identiques et les années équivalentes :
 // chaque question ne doit admettre qu'une seule réponse correcte.
 const known=new Set();
 const list=pool.filter(valid).filter(item=>{
  const key=String(item.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  if(known.has(key))return false;
  known.add(key);return true;
 });
 if(list.length<4)return null;
 if(type==='timeline'){
  const pairs=pick(list,Math.min(list.length,18),rng);
  for(let i=0;i<pairs.length;i++)for(let j=i+1;j<pairs.length;j++){
   if(Math.abs(year(pairs[i])-year(pairs[j]))>=2){
    const [a,b]=shuffle([pairs[i],pairs[j]],rng);
    return {type,items:[a,b],answer:String(year(a)<year(b)?a.id:b.id),
     description:'Quelle série a commencé en premier ?'};
   }
  }
  return null;
 }
 let options,target;
 if(type==='year'){
  const byYear=new Map();
  for(const item of shuffle(list,rng)){
   const y=year(item);
   if(!byYear.has(y))byYear.set(y,item);
  }
  options=pick([...byYear.values()],4,rng);
  if(options.length<4)return null;
  target=options[0];
 }else{
  options=pick(list,4,rng);
  target=options[0];
 }
 options=shuffle(options,rng);
 if(type==='poster'||type==='pixel')return {type,items:options,target,answer:String(target.id),
  description:type==='poster'?'De quelle série provient ce détail d’affiche ?':'Quelle série se cache derrière cette mosaïque de pixels ?'};
 if(type==='year')return {type,items:options,target,answer:String(target.id),
  description:'Quelle série a commencé en '+year(target)+' ?'};
 return null;
}
export function newQuiz(type,pool,rng=Math.random){
 const question=quizQuestion(type,pool,rng);
 return question?{type,pool,question,usedIds:question.items.map(x=>x.id),round:1,total:5,score:0,answered:false,finished:false}:null;
}
export function answerQuiz(session,id){
 if(!session||session.answered||session.finished)return session;
 const correct=String(id)===session.question.answer;
 return {...session,answered:true,score:session.score+(correct?1:0),correct};
}
export function nextQuiz(session,rng=Math.random){
 if(!session?.answered)return session;
 if(session.round>=session.total)return {...session,finished:true};
 const excludes=new Set(session.usedIds||session.question.items.map(x=>x.id));
 const available=session.pool.filter(x=>!excludes.has(x.id));
 const question=quizQuestion(session.type,available.length>=4?available:session.pool,rng);
 return question?{...session,question,usedIds:[...excludes,...question.items.map(x=>x.id)],round:session.round+1,answered:false,correct:undefined}:session;
}
export function quizHTML(session){
 if(!session)return '<div class="sc60-quiz-empty">Impossible de constituer une manche avec des séries françaises vérifiées.</div>';
 const q=session.question;
 if(session.finished)return '<div class="sc60-finish" role="status"><div class="sc60-medal">✦</div><h2>Partie terminée !</h2><strong>'+session.score+' / '+session.total+'</strong><p>'+ (session.score===session.total?'Sans-faute ! Tu connais tes séries.':'Belle partie ! À toi d’améliorer ce score.')+'</p><span class="sc8-training-cooldown">Reviens dans 24 h pour ce jeu.</span><button class="btn subtle" data-quiz-home>Choisir un autre jeu</button><p class="note">Partie gratuite · aucun crédit ni XP ajouté</p></div>';
 let title=q.type==='poster'?'Détail mystère':q.type==='pixel'?'Mosaïque pixel':q.type==='timeline'?'Avant ou après ?':'La bonne année';
 let visual='';
 if(q.type==='poster'||q.type==='pixel')visual='<div data-quiz-round="'+session.round+'" class="sc60-mystery sc9-visual sc9-visual--'+q.type+(session.answered?' is-revealed':'')+'" role="group" aria-label="'+(q.type==='pixel'?'Mosaïque de pixels à identifier':'Fragment d’affiche à identifier')+'">'+
  '<img class="sc9-clue-image '+(session.answered?'sc9-revealed':q.type==='pixel'?'sc7-training-pixel sc8-pixel':'sc8-training-poster')+'" src="'+esc(q.target.image_url)+'" alt="'+(session.answered?'Affiche de '+esc(q.target.name):'Indice de série à deviner')+'" loading="eager" decoding="async">'+
  '<span class="sc9-image-error" role="status" hidden>Image indisponible. Clique sur « Changer d’indice » pour continuer.</span>'+
  '<button type="button" class="sc9-retry-clue" data-quiz-change-clue hidden>Changer d’indice ↻</button></div>';
 const choices=q.items.map(x=>{
  const correct=session.answered&&String(x.id)===q.answer;
  const wrong=session.answered&&!correct&&String(x.id)===String(session.choice);
  return '<button class="sc60-choice '+(correct?'is-correct':wrong?'is-wrong':'')+'" data-quiz-answer="'+esc(x.id)+'" '+(session.answered?'disabled':'')+' aria-pressed="'+(correct?'true':'false')+'">'+
   (q.type==='timeline'?'<img src="'+esc(x.image_url)+'" loading="lazy" alt="">':'')+
   '<span>'+esc(x.name)+'</span></button>';
 }).join('');
 const answer=q.items.find(x=>String(x.id)===q.answer)||q.target;
 return '<section class="sc60-quiz" aria-label="'+title+'">'+
  '<div class="sc60-quiz-top"><div><span class="caps">'+esc(title)+'</span><strong>Manche '+session.round+' / '+session.total+'</strong></div><span class="sc60-score">✦ '+session.score+' point'+(session.score!==1?'s':'')+'</span></div>'+
  '<div class="sc60-progress" aria-hidden="true"><span style="width:'+Math.round((session.round-1+(session.answered?1:0))/session.total*100)+'%"></span></div>'+
  '<h2>'+esc(q.description)+'</h2>'+visual+'<div class="sc60-choices">'+choices+'</div>'+
  (session.answered?'<div class="sc60-answer" role="status">'+(session.correct?'✓ Bonne réponse !':'La bonne réponse était '+esc(answer?.name||'cette série')+'.')+
   ' <span>'+esc(String(year(answer)))+'</span></div><button class="btn primary" data-quiz-next>'+(session.round===session.total?'Voir mon résultat':'Manche suivante →')+'</button>':'<p class="note">Choisis une réponse pour continuer.</p>')+
  '<button class="sc60-quit" data-quiz-home>← Tous les jeux</button>'+
  '<p class="sc60-caveat">Jeux de connaissance indépendants de la progression économique · séries certifiées France</p></section>';
}
