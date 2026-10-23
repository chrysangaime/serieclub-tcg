/** Boutique TV/SVOD avec prix et disponibilité exclusivement fournis par Supabase. */
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const themes=Object.freeze([
 {key:'netflix',name:'Netflix',note:'Sélection française non officielle',mark:'▣',tone:'red'},
 {key:'prime',name:'Prime Video',note:'Prime Video France',mark:'▶',tone:'blue'},
 {key:'disney',name:'Disney+',note:'Disney+ France',mark:'✦',tone:'violet'},
 {key:'television',name:'Télévision',note:'TV & replay en France',mark:'TV',tone:'teal'}
]);
export const creditThemeName=key=>themes.find(p=>p.key===key)?.name||'Booster de séries';
export function creditThemeShelf(s={}){
 const offers=new Map((Array.isArray(s.creditPacks)?s.creditPacks:[]).map(x=>[x.pack_key,x]));
 const balance=Number(s.wallet?.credits)||0;
 return '<section class="sc21-shop" id="svod-credit-packs"><div class="sc21-shop-head"><div><span class="sc12-eyebrow">BOOSTERS EN CRÉDITS</span><h2>Choisis ta plateforme.</h2><p>5 séries par booster · rareté officielle · crédits gagnés en jouant.</p></div><span>◇ '+balance.toLocaleString('fr-FR')+' crédits</span></div>'+
 '<div class="sc21-shop-rail">'+themes.map(t=>{
  const offer=offers.get(t.key),cost=Number(offer?.price_credits)||0,available=offer?.available===true;
  const allowed=available&&cost>0&&(!s.user||balance>=cost);
  const action=!available?'En préparation':!s.user?'Se connecter':balance<cost?'Crédits insuffisants':'Ouvrir pour '+cost+' crédits';
  const date=offer?.proof_date?String(offer.proof_date).slice(0,10).split('-').reverse().join('/'):'';
  return '<article class="sc21-shop-item sc21-'+t.tone+'"><div class="sc21-shop-art"><span class="sc21-shop-logo">'+t.mark+'</span><small>SÉLECTION NON OFFICIELLE</small></div>'+
  '<div class="sc21-shop-info"><h3>'+html(t.name)+'</h3><p>'+html(t.note)+'</p><strong>5 séries <span>· 7 raretés</span></strong></div>'+
  '<div class="sc21-shop-actions"><b>'+(cost?cost+' ◇':'Bientôt')+'</b><button type="button" data-credit-pack="'+t.key+'"'+(allowed?'':' disabled')+'>'+html(action)+' →</button></div>'+
  (date?'<small class="sc21-shop-proof">Sélection historique relevée le '+html(date)+'</small>':'')+'</article>';
 }).join('')+'</div><p class="sc21-shop-legal">Sélections thématiques historiques non officielles, sans partenariat avec les plateformes. Leurs preuves françaises sont en cours de revalidation indépendante : la présence d’une série ne garantit pas son offre actuelle. Les crédits sont uniquement virtuels et ne sont pas vendus contre des euros.</p></section>';
}
