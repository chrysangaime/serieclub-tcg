/** Véritable pixellisation par réduction du nombre de pixels source.
 * drawImage vers un canvas de quelques pixels fonctionne même quand
 * l'image TVmaze/TMDB ne donne pas de permission de lecture CORS :
 * on ne lit ni n'exporte jamais le canvas.
 */
export const pixelGrid=round=>{
 const step=Math.min(5,Math.max(1,Number(round)||1));
 // Équilibre V10.2 : de 22 à 13 pixels, difficulté croissante mais accessible.
 return [[22,33],[19,29],[17,26],[15,23],[13,20]][step-1];
};
export function pixelateImage(img,round=1){
 if(!img?.complete||!img.naturalWidth||!img.naturalHeight)return false;
 const wrap=img.closest('.sc9-visual--pixel,.sc7-pixel');
 if(!wrap||wrap.classList.contains('is-revealed'))return false;
 wrap.querySelector('.sc10-pixel-canvas')?.remove();
 const canvas=document.createElement('canvas');
 const [width]=pixelGrid(round);
 const height=Math.max(1,Math.round(width*img.naturalHeight/img.naturalWidth));
 canvas.width=width;canvas.height=height;
 canvas.className='sc10-pixel-canvas';
 canvas.setAttribute('role','img');
 canvas.setAttribute('aria-label','Mosaïque pixellisée de la série mystère');
 const context=canvas.getContext('2d',{alpha:false});
 if(!context)return false;
 context.imageSmoothingEnabled=true;
 try{context.drawImage(img,0,0,width,height)}
 catch{return false}
 wrap.append(canvas);
 wrap.classList.add('sc10-pixel-ready');
 return true;
}
export function updatePixelClues(root=document){
 if(!root)return;
 root.querySelectorAll('.sc9-visual--pixel:not(.is-revealed) img,.sc7-pixel:not(.is-revealed) img').forEach(img=>{
  const round=Number(img.closest('[data-quiz-round]')?.dataset.quizRound)||1;
  if(img.complete&&img.naturalWidth)pixelateImage(img,round);
  else img.addEventListener('load',()=>pixelateImage(img,round),{once:true});
 });
}
