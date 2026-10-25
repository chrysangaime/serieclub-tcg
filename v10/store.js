/** SériesClubTCG Premium V1 — offres uniquement cosmétiques ; aucun avantage de tirage. */
export const offers=Object.freeze({premium:{label:'Premium',eur:3.99,interval:'mois'},packs:[]});
export function storePage(s={}){
 const active=s.premiumActive===true,test=s.paymentsMode==='test';
 const action=active?'<button type="button" class="btn primary" data-premium-portal>Gérer mon abonnement</button>':
  test?'<button type="button" class="btn primary" data-premium-checkout>Tester l’abonnement 3,99 € sans prélèvement</button>':
  '<button type="button" class="btn primary" disabled>Souscription publique en préparation</button>';
 const perks=[
  ['✦','Insigne exclusif','Étoile, couronne, diamant ou projecteur sur ton profil.'],
  ['♛','Titre de collectionneur','Archiviste, Légende du Club ou Curateur de saisons.'],
  ['◈','Cadres signatures','Or, néon ou cinéma pour distinguer ton profil.'],
  ['▣','Vitrine personnalisée','Mets en avant ton identité et tes succès de collection.']
 ];
 const free=['Boosters gratuits et crédits gagnés en jouant','Toutes les cartes et les sept raretés','Albums de séries et badges permanents','Jeux, missions, échanges et classements'];
 return '<div class="page-content sc10-shop sc16-shop sc-v11-premium">'+
  '<section class="sc-v11-premium-hero"><span class="caps">LE CLUB · COLLECTION & PERSONNALISATION</span>'+
  '<h1>Une collection unique.<br><em>Un profil à ton image.</em></h1>'+
  '<p>Tous les joueurs ont les mêmes chances. Premium enrichit uniquement l’identité et la présentation de ton profil.</p>'+
  '<div class="sc-v11-price-row"><strong>3,99 € <small>TTC / mois</small></strong>'+
  '<span>'+(active?'✦ Membre Premium actif':test?'Environnement de démonstration Stripe':'Lancement commercial suspendu')+'</span></div>'+action+
  '<p class="sc16-terms">Mensuel, sans engagement. Résiliation depuis l’espace de gestion lors de l’activation commerciale. Aucun bonus de rareté, aucune carte exclusive.</p></section>'+
  '<section class="sc-v11-premium-advantages"><div class="section-head"><div><span class="caps">PRIVILÈGES VISUELS</span><h2>Affirme ton style de collectionneur</h2></div></div>'+
  '<div class="sc-v11-perk-grid">'+perks.map(([icon,title,desc],i)=>
   '<article class="sc-v11-perk"><span class="sc-v11-perk-icon" aria-hidden="true">'+icon+'</span>'+
   '<span class="caps">0'+(i+1)+' · COSMÉTIQUE</span><h3>'+title+'</h3><p>'+desc+'</p></article>').join('')+'</div></section>'+
  '<section class="sc-v11-comparison"><div class="section-head"><div><span class="caps">ÉQUITÉ DU JEU</span><h2>Le jeu reste gratuit</h2></div></div>'+
  '<div class="sc-v11-compare-cols"><article><h3>Collectionneur gratuit</h3>'+free.map(x=>'<p>✓ '+x+'</p>').join('')+'</article>'+
  '<article class="sc-v11-premium-compare"><h3>✦ Collectionneur Premium</h3>'+free.map(x=>'<p>✓ '+x+'</p>').join('')+
  '<p>✦ Titres, insignes et cadres exclusifs</p><p>✦ Profil distinctif</p></article></div></section>'+
  '<section class="sc-v11-premium-final"><h2>Ton club. Ton identité.</h2><p>Les récompenses ne s’achètent pas : les badges de séries complètes se gagnent toujours en jouant.</p>'+
  '<div class="row"><button type="button" class="btn subtle" data-route="profile">Personnaliser mon profil</button><button type="button" class="btn subtle" data-route="albums">Mes albums de séries</button></div></section>'+
  '<p class="sc10-store-note">L’accès Premium n’est accordé qu’après validation d’un événement Stripe signé par le serveur. Aucun abonnement réel ne peut être souscrit sur cette version en préparation.</p></div>';
}
