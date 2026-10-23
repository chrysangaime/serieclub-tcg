/** Interface de recyclage : les crédits ne sont attribués que par Supabase. */
export const VALUES=Object.freeze({'Commune':3,'Peu commune':5,'Rare':8,'Épique':12,'Légendaire':20,'Mythique':25,'Unique':35});
export const LIMIT=20;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const candidates=data=>(data?.groups||[]).filter(g=>g.eligible&&g.sellableCopy&&VALUES[g.rarity])
 .map(g=>({id:g.sellableCopy.id,name:g.name,rarity:g.rarity,credits:VALUES[g.rarity]}));
export function recyclePanel(data,selected=[]){
 const choices=candidates(data),marked=new Set(selected),valid=choices.filter(x=>marked.has(x.id));
 const active=data?.recycleReady===true,remaining=Math.max(0,Number(data?.recycleRemaining)||0);
 const amount=valid.reduce((sum,x)=>sum+x.credits,0);
 return '<section class="sc1-recycle" aria-label="Recycler des doublons"><div class="sc1-recycle-header"><div><span class="caps">MES DOUBLONS</span><h2>Faire de la place, gagner des crédits.</h2><p>Seuls les exemplaires supplémentaires disponibles sont éligibles. Les dernières copies et les cartes engagées restent protégées.</p></div>'+
 '<div class="sc1-recycle-count"><strong>'+valid.length+' / '+LIMIT+'</strong><small>Sélection</small><strong>◇ '+amount+'</strong><small>Estimation</small></div></div>'+
 (choices.length?'<div class="sc1-recycle-choices">'+choices.map(x=>
 '<label class="sc1-recycle-option"><input type="checkbox" data-recycle-item="'+esc(x.id)+'"'+(marked.has(x.id)?' checked':'')+
 ((!marked.has(x.id)&&valid.length>=LIMIT)?' disabled':'')+'><span><b>'+esc(x.name)+'</b><small>'+esc(x.rarity)+'</small></span><strong>+'+x.credits+' ◇</strong></label>').join('')+'</div>':
 '<p class="sc1-recycle-empty">Aucun doublon supplémentaire disponible pour le recyclage.</p>')+
 '<div class="sc1-recycle-actions"><small>'+(active?'Quota restant aujourd’hui : '+remaining+' carte(s). Suppression définitive.':'Recyclage en préparation : activation serveur nécessaire.')+'</small>'+ 
 '<button type="button" class="btn subtle" data-recycle-all '+(!choices.length||!active||remaining===0?'disabled':'')+'>Sélectionner automatiquement</button>'+
 '<button type="button" class="btn primary" data-recycle-preview '+(!valid.length||!active||valid.length>remaining?'disabled':'')+'>Vérifier le recyclage →</button></div></section>';
}
export function recycleConfirm(items){
 const amount=items.reduce((n,x)=>n+x.credits,0);
 return '<div class="dialog sc1-recycle-confirm" role="dialog" aria-modal="true" aria-labelledby="recycleTitle">'+
 '<button type="button" class="close" data-close aria-label="Fermer">×</button>'+
 '<span class="caps">OPÉRATION IRRÉVERSIBLE</span><h2 id="recycleTitle">Recycler '+items.length+' doublon'+(items.length>1?'s':'')+' ?</h2>'+
 '<p>Les exemplaires ci-dessous seront définitivement supprimés. Aucun dernier exemplaire, exemplaire protégé ou engagé ne peut être recyclé.</p>'+
 '<div class="sc1-recycle-review">'+items.map(x=>'<div><span>'+esc(x.name)+' <small>· '+esc(x.rarity)+'</small></span><b>+'+x.credits+' ◇</b></div>').join('')+'</div>'+
 '<p class="sc1-recycle-total">Récompense indicative : <strong>+'+amount+' crédits</strong></p>'+
 '<div class="sc1-recycle-actions"><button type="button" class="btn subtle" data-close>Annuler</button>'+
 '<button type="button" class="btn primary" data-recycle-confirm>Confirmer la suppression →</button></div></div>';
}
