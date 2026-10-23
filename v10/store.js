/** Boutique Stripe V16. Jamais de vente de crédits permettant des cartes échangeables. */
export const offers=Object.freeze({
 premium:{label:'Premium',eur:1.99,interval:'mois'},
 packs:[{id:'starter',credits:250,eur:0.99},{id:'plus',credits:750,eur:2.49},{id:'max',credits:1800,eur:4.99}]
});
export function storePage(s={}){
 const mode=s.paymentsMode||'disabled',isPremium=s.premiumActive===true;
 const enabled=mode==='test'||mode==='live';
 const notice=isPremium?'✦ Premium actif':
  mode==='test'?'TEST : aucun prélèvement bancaire':
  mode==='live'?'Paiement sécurisé par Stripe':'Paiement non activé';
 const action=isPremium?'<button type="button" class="btn primary" data-premium-portal>Gérer mon abonnement</button>':
  enabled?'<button type="button" class="btn primary" data-premium-checkout>'+
    (mode==='test'?'Tester le paiement sans débit':'S’abonner pour 1,99 € / mois')+'</button>':
    '<button type="button" class="btn primary" disabled>Abonnement bientôt disponible</button>';
 return '<div class="page-content sc10-shop sc16-shop">'+
 '<div class="sc10-shop-hero"><span class="caps">SÉRIESCLUBTCG · PREMIUM</span><h1>Le club, à ton image.</h1>'+
 '<p>Le jeu, les cartes, les boosters et leurs raretés restent accessibles gratuitement.</p></div>'+
 '<div class="sc10-shop-grid"><article class="sc10-premium-card"><span class="caps">PRIVILÈGES COSMÉTIQUES</span>'+
 '<h2>✦ SériesClubTCG Premium</h2><strong class="sc10-price">1,99 € <small>/ mois</small></strong>'+
 '<p>Statut Premium distinctif sur le profil. Aucun avantage sur les tirages, les cartes ou les chances de rareté.</p>'+
 '<div class="sc10-shop-status" role="status">'+notice+'</div>'+action+
 '<p class="sc16-terms">Abonnement renouvelable mensuellement, résiliable depuis Stripe.</p></article>'+
 '<section class="sc10-credit-shop"><h2>Crédits du club</h2>'+
 '<p>Les crédits restent obtenus gratuitement. Les achats sont suspendus dans l’attente d’une validation juridique.</p>'+
 '<div class="sc10-shop-status" role="status">Achat suspendu · Les crédits ne sont pas vendus contre des euros.</div>'+
 '<p>Tu peux déjà obtenir des crédits grâce aux ouvertures de paquets, aux récompenses quotidiennes et aux défis disponibles.</p>'+
 '<button type="button" class="btn subtle" data-route="packs">Retourner aux paquets gratuits →</button>'+
 '<p class="sc16-terms">Les modalités de toute future offre payante seront annoncées uniquement après vérifications juridiques et techniques.</p>'+
 '</section></div><p class="sc10-store-note">L’abonnement est validé uniquement après notification Stripe signée côté serveur.</p></div>';
}
