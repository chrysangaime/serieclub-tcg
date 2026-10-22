/** Vitrine économique préparatoire : aucun lien de paiement ni crédit client fictif. */
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export const offers=Object.freeze({
 premium:{label:'SérieClub Premium',eur:1.99,interval:'mois'},
 packs:[
  {id:'starter',credits:250,eur:0.99},
  {id:'plus',credits:750,eur:2.49},
  {id:'max',credits:1800,eur:4.99}
 ]
});
export function storePage(){
 return '<div class="page-content sc10-shop">'+
 '<div class="sc10-shop-hero"><span class="caps">SÉRIECLUB · AVANT-PREMIÈRE</span>'+
 '<h1>Le club, à ton rythme.</h1><p>Les fonctionnalités essentielles, les séries et les saisons restent accessibles gratuitement. Voici les offres envisagées pour soutenir le projet.</p></div>'+
 '<div class="sc10-shop-grid"><article class="sc10-premium-card"><span class="caps">FORMULE À VENIR</span>'+
 '<h2>✦ SérieClub Premium</h2><strong class="sc10-price">1,99 € <small>/ mois</small></strong>'+
 '<p>Projet de formule cosmétique : personnalisation avancée de la vitrine, décoration du profil et confort de collection. Sans exclusivité sur les séries ni amélioration des probabilités de rareté.</p>'+
 '<div class="sc10-shop-status">Pas encore commercialisé · aucun prélèvement</div>'+
 '<button class="btn primary" disabled>Abonnement non disponible</button></article>'+
 '<section class="sc10-credit-shop"><h2>Crédits du club</h2><p>Les crédits s’obtiennent déjà en jouant. Des packs d’achat sont envisagés, sans publicité trompeuse ni paiement activé pour le moment.</p>'+
 '<div class="sc10-pack-list">'+offers.packs.map(p=>
 '<article><strong>✦ '+p.credits+' crédits</strong><span>'+p.eur.toFixed(2).replace('.',',')+' €</span>'+
 '<button class="btn subtle" disabled aria-label="Achat de '+p.credits+' crédits non disponible">À venir</button></article>').join('')+'</div></section></div>'+
 '<p class="sc10-store-note">Les paiements nécessiteront un prestataire certifié, une vérification de la transaction côté serveur et des informations légales. Aucun achat ou abonnement n’est actuellement actif.</p>'+
 '</div>';
}
