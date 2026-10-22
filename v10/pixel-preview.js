/**
 * Banc d'essai visuel Pixels. Il n'ouvre AUCUNE partie, n'appelle AUCUNE RPC
 * de récompense et n'utilise jamais le quota local / serveur 24 heures.
 */
import {pixelGrid} from './pixel-canvas.js?v=10.2.0';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
}[c]));
const httpsImage=url=>/^https:\/\/[^\s"'<>]+$/i.test(url||'')?esc(url):'';

export function pixelPreviewHTML(preview){
 if(!preview)return '';
 const items=Array.isArray(preview.items)?preview.items:[];
 const index=((Number(preview.index)||0)%Math.max(items.length,1)+Math.max(items.length,1))%Math.max(items.length,1);
 const item=items[index]||null;
 const round=Math.min(5,Math.max(1,Number(preview.round)||2));
 const revealed=preview.revealed===true;
 return '<section class="sc11-preview" aria-label="Aperçu gratuit des pixels">'+
  '<div class="sc11-preview-top"><div><span class="caps">LABORATOIRE VISUEL · SANS PARTIE</span>'+
   '<h2>Tester Mosaïque pixel</h2><p>Vérifie les gros pixels et la difficulté sans attendre 24 h, sans perdre de tentative et sans dépenser de crédits.</p></div>'+
   '<button type="button" class="btn subtle" data-pixel-preview-close>← Retour aux jeux</button></div>'+
  (preview.loading?'<div class="sc11-preview-message" role="status">Chargement d’une affiche du catalogue France…</div>':
    preview.error?'<div class="sc11-preview-message" role="alert">'+esc(preview.error)+'</div>':'')+
  (item&&httpsImage(item.image_url)&&!preview.error?
   '<div class="sc11-preview-content"><div class="sc11-preview-controls"><strong>Difficulté par manche</strong>'+
    '<div class="sc11-preview-stages" role="group" aria-label="Choisir la difficulté">'+
     [1,2,3,4,5].map(n=>'<button type="button" data-pixel-preview-round="'+n+'" class="'+(round===n?'active':'')+
       '" aria-pressed="'+(round===n)+'" aria-label="Manche '+n+'">'+n+'</button>').join('')+'</div>'+
    '<small>Manche '+round+'/5 · '+pixelGrid(round)[0]+' pixels de largeur</small></div>'+
    '<div data-quiz-round="'+round+'" class="sc11-preview-frame sc9-visual--pixel'+(revealed?' is-revealed':'')+
      '" role="img" aria-label="'+(revealed?'Affiche originale : '+esc(item.name):'Affiche mystère fortement pixellisée')+'">'+
      '<img class="sc11-preview-source" src="'+httpsImage(item.image_url)+'" alt="'+(revealed?'Affiche de '+esc(item.name):'')+'" loading="eager" decoding="async"></div>'+
    '<div class="sc11-preview-actions"><button class="btn primary" data-pixel-preview-reveal>'+
       (revealed?'Remasquer l’affiche':'Révéler l’affiche')+'</button>'+
     '<button class="btn subtle" data-pixel-preview-next>Autre affiche ↻</button></div>'+
    (revealed?'<p class="sc11-preview-answer">Série : <strong>'+esc(item.name)+'</strong></p>':
      '<p class="sc11-preview-hint">Essaie de reconnaître la série, puis révèle l’affiche pour comparer.</p>')+
    '</div>':
    !preview.loading?'<div class="sc11-preview-message">Aucun visuel disponible. <button class="btn subtle" data-pixel-preview-refresh>Réessayer</button></div>':'')+
  '<p class="sc11-preview-disclaimer">Aperçu uniquement : aucun score, aucune carte et aucun crédit attribué. Tes vraies parties restent limitées à une par jeu toutes les 24 h.</p>'+
 '</section>';
}
