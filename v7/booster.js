/**
 * Cinématique de boosters — l'attribution existe déjà côté serveur.
 * Cette interface n'effectue aucun tirage et ne modifie aucune récompense.
 */
const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export const rarityTier=r=>{
 const name=String(r||'Commune').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return name.replace(/[^a-z]+/g,'-');
};
export const quality=r=>['mythique','unique','legendaire','epique'].includes(rarityTier(r));
export function openingFrame(cards,step=0,reduced=false){
 const list=Array.isArray(cards)?cards.slice(0,5):[];
 const opened=Math.min(list.length,Math.max(0,step-1));
 const sealed=step===0,summary=step>list.length,now=opened>0?list[opened-1]:null;
 const rank=now?.rarity||'Commune';
 const rare=quality(rank);
 const chars=rare&&!reduced?Array.from({length:16},(_,i)=>'<span class="sc7-spark" style="--i:'+i+'" aria-hidden="true">✦</span>').join(''):'';
 const progress='<div class="sc7-pack-progress">'+list.map((_,i)=>'<span class="'+(i<opened?'done':i===opened?'next':'')+'"></span>').join('')+'</div>';
 const actions='<div class="sc7-pack-actions">'+(!summary?
   '<button class="btn primary sc7-pack-next" id="openingNext">'+(sealed?'Ouvrir le paquet':opened===list.length-1?'Révéler la dernière carte':'Révéler une carte →')+'</button>'+
   '<button class="btn subtle" id="openingSkip">Tout révéler</button>'
   :'<button class="btn primary" id="openingDone">Voir ma collection →</button>')+'</div>';
 if(sealed){
  return '<div class="sc7-opening sc7-sealed" role="group" aria-label="Ouverture de paquet">'+
   '<p class="sc7-opening-kicker">SÉRIECLUB · 5 CARTES</p><h2>Le moment de vérité.</h2>'+
   '<div class="sc7-sealed-pack" aria-hidden="true"><span>SC</span><strong>SÉRIECLUB</strong><small>5 CARTES À DÉCOUVRIR</small></div>'+
   '<p class="sc7-pack-sub">Les cinq cartes ont été ajoutées à ta collection.</p>'+actions+'</div>';
 }
 if(summary){
  return '<div class="sc7-opening sc7-summary" role="group" aria-label="Résultat du paquet">'+
   '<p class="sc7-opening-kicker">PAQUET DÉCOUVERT</p><h2>Ta nouvelle collection</h2>'+
   '<div class="sc7-opening-grid">'+list.map(c=>
    '<div class="sc7-opening-mini sc7-tier-'+rarityTier(c.rarity)+'">'+
    '<img src="'+esc(/^https:\/\//.test(c.image_url||'')?c.image_url:'')+'" alt="Affiche de '+esc(c.name)+'">'+
    '<b>'+esc(c.name)+'</b><span>'+esc(c.rarity)+'</span></div>').join('')+'</div>'+
   '<div class="sc7-pack-bonus">✦ +25 crédits <span>·</span> +50 XP</div>'+actions+'</div>';
 }
 const thumb=now?.image_url&&/^https:\/\//.test(now.image_url)?esc(now.image_url):'';
 return '<div class="sc7-opening sc7-revealing '+(rare?'sc7-rare-event':'')+' sc7-tier-'+rarityTier(rank)+'" role="group" aria-label="Carte '+opened+' sur '+list.length+'">'+
  '<p class="sc7-opening-kicker">DÉCOUVERTE '+opened+' / '+list.length+'</p>'+progress+
  '<div class="sc7-reveal-stage">'+chars+'<article class="sc7-reveal-card" tabindex="0" aria-label="'+esc(now.name)+', '+esc(rank)+'">'+
  (thumb?'<img src="'+thumb+'" alt="Affiche de '+esc(now.name)+'">':'<span class="sc7-reveal-empty">✦</span>')+
  '<div class="sc7-reveal-shine" aria-hidden="true"></div>'+
  '<div class="sc7-reveal-bottom"><strong>'+esc(now.name)+'</strong><span>'+esc(rank)+'</span></div>'+
  '</article></div>'+
  '<div class="sc7-reveal-rarity">✦ '+esc(rank)+(rare?' · RARETÉ EXCEPTIONNELLE':'')+'</div>'+
  '<p class="sc7-pack-sub">'+(rare?'Une découverte exceptionnelle !':'Une nouvelle série rejoint ton album.')+'</p>'+
  (opened===list.length?'':actions)+
  (opened===list.length?'<div class="sc7-pack-actions"><button class="btn primary" id="openingNext">Voir mes cinq cartes →</button></div>':'')+
  '</div>';
}
