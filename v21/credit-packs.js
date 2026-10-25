/** Boutique TV/SVOD avec prix et disponibilité exclusivement fournis par Supabase. */
const html=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const themes=Object.freeze([
 {key:'genre_comedy',name:'Comédies',note:'Humour et séries comiques',mark:'☺',tone:'teal'},
 {key:'genre_crime',name:'Enquêtes',note:'Policiers et intrigues',mark:'⌕',tone:'blue'},
 {key:'genre_thriller',name:'Suspense',note:'Thrillers et mystères',mark:'◈',tone:'violet'},
 {key:'genre_fantasy',name:'Fantastique',note:'Univers fantastiques',mark:'✦',tone:'red'},
 {key:'netflix',name:'Netflix',note:'Sélection française non officielle',mark:'▣',tone:'red'},
 {key:'prime',name:'Prime Video',note:'Prime Video France',mark:'▶',tone:'blue'},
 {key:'disney',name:'Disney+',note:'Disney+ France',mark:'✦',tone:'violet'},
 {key:'television',name:'Télévision',note:'TV & replay en France',mark:'TV',tone:'teal'}
]);
export const creditThemeName=key=>themes.find(p=>p.key===key)?.name||'Booster de séries';
export function creditThemeShelf(s={}){
 const offers=new Map((Array.isArray(s.creditPacks)?s.creditPacks:[]).map(x=>[x.pack_key,x]));
 const balance=Number(s.wallet?.credits)||0;
 return '<section class="sc21-shop" id="svod-credit-packs"><div class="sc21-shop-head"><div><span class="sc12-eyebrow">BOOSTERS EN CRÉDITS</span><h2>Les univers à collectionner.</h2><p>Ouvre les boosters thématiques avec tes crédits gagnés en jouant. Les offres par plateforme restent soumises à vérification.</p></div><span>◇ '+balance.toLocaleString('fr-FR')+' crédits</span></div>'+
 '<div class="sc21-shop-rail">'+themes.map(t=>{
  const offer=offers.get(t.key),cost=Number(offer?.price_credits)||0,available=offer?.available===true;
  const genre=t.key.startsWith('genre_');
  const allowed=available&&cost>0&&(!s.user||balance>=cost);
  const action=!available?'En préparation':!s.user?'Se connecter':balance<cost?'Crédits insuffisants':'Ouvrir pour '+cost+' crédits';
  const date=offer?.proof_date?String(offer.proof_date).slice(0,10).split('-').reverse().join('/'):'';
  return '<article class="sc21-shop-item sc21-'+t.tone+'"><div class="sc21-shop-art">'+(genre?'<img class="sc-v13-credit-pack-art" src="./v1/packs/'+t.key+'.svg" loading="lazy" alt="Pochette '+html(t.name)+'">':'<span class="sc21-shop-logo">'+t.mark+'</span>')+'<small>'+(genre?'BOOSTER THÉMATIQUE':'SÉLECTION NON OFFICIELLE')+'</small></div>'+
  '<div class="sc21-shop-info"><h3>'+html(t.name)+'</h3><p>'+html(t.note)+'</p><strong>5 cartes <span>· 7 raretés</span></strong></div>'+
  '<div class="sc21-shop-actions"><b>'+(cost?cost+' ◇':'Bientôt')+'</b><button type="button" data-credit-pack="'+t.key+'"'+(allowed?'':' disabled')+'>'+html(action)+' →</button></div>'+
  (date&&!genre?'<small class="sc21-shop-proof">Dernier relevé : '+html(date)+'</small>':'')+'</article>';
 }).join('')+'</div><p class="sc21-shop-legal">Boosters Comédies, Enquêtes, Suspense et Fantastique accessibles en crédits virtuels. Sélections SVOD non officielles temporairement désactivées : preuves françaises périmées, aucune disponibilité actuelle garantie. Aucun crédit vendu contre des euros.</p></section>';
}
