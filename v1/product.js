/** SériesClubTCG — identité publique stable pendant la préparation du lancement. */
export const PRODUCT=Object.freeze({name:'SériesClubTCG',version:'V1.0',stage:'En préparation',launched:false});
export function footerHTML(){
 return '<footer class="app-footer sc1-footer" aria-label="Informations sur SériesClubTCG">'+
 '<div class="sc1-footer-brand"><strong>SériesClubTCG</strong><span class="sc1-version">'+PRODUCT.version+' · '+PRODUCT.stage+'</span></div>'+
 '<nav aria-label="Informations pratiques"><button type="button" data-route="rules">Comment jouer</button>'+
 '<button type="button" data-route="settings">Paramètres</button><button type="button" data-route="privacy">Confidentialité</button><button type="button" data-route="rights">Sources et droits</button><button type="button" data-route="legal">Mentions légales</button><button type="button" data-route="support">Assistance</button><button type="button" data-route="about">À propos</button></nav>'+
 '<p>Jeu indépendant consacré aux séries diffusées en France. Marques et visuels : droits réservés à leurs propriétaires respectifs. Aucune affiliation avec les plateformes de diffusion mentionnées.</p></footer>';
}
export function aboutPage(){
 return '<div class="page-content sc1-about">'+
 '<div class="sc1-about-head"><span class="caps">SÉRIESCLUBTCG · V1.0</span><h1>Le club des séries à collectionner.</h1>'+
 '<p>Ouvre des boosters de saisons, complète les albums des séries d’au moins trois saisons et débloque des badges permanents.</p>'+
 '<span class="sc1-about-phase">● En préparation · Accès anticipé</span></div>'+
 '<section class="sc1-about-grid" aria-label="Découvrir le jeu">'+
 '<article><span class="sc1-step">01</span><h2>Découvrir</h2><p>Ouvre un booster gratuit de cinq cartes de séries. Chaque carte correspond à une saison lorsqu’elle est référencée.</p><button data-route="packs" type="button">Choisir un paquet →</button></article>'+
 '<article><span class="sc1-step">02</span><h2>Collectionner</h2><p>Protège tes cartes, rassemble les saisons manquantes, termine les albums éligibles et échange tes doublons.</p><button data-route="albums" type="button">Voir mes albums →</button></article>'+
 '<article><span class="sc1-step">03</span><h2>Participer</h2><p>Retrouve les défis, le Comptoir et la communauté. Certaines activités nécessitent une activation serveur.</p><button data-route="games" type="button">Découvrir les défis →</button></article></section>'+
 '<section class="sc1-about-details"><h2>Informations et transparence</h2>'+
 '<div><h3>État du projet</h3><p>La V1.0 est en préparation et n’a pas fait l’objet d’un lancement public. Certaines fonctions peuvent évoluer ou rester momentanément indisponibles.</p></div>'+
 '<div><h3>Crédits et paiement</h3><p>Les crédits du jeu sont virtuels. Les boosters thématiques peuvent être ouverts avec les crédits gagnés, lorsque leur catalogue est disponible. La vente de crédits en euros est suspendue. L’abonnement Premium est encore soumis à son activation.</p></div>'+
 '<div><h3>Compte et confidentialité</h3><p>L’authentification et les cartes sont synchronisées via Supabase. Certaines préférences sont stockées dans le navigateur. Le pseudonyme et des résultats de jeu peuvent être visibles par les autres joueurs.</p></div>'+
 '<div><h3>Données, sources et marques</h3><p>Les fiches de séries et leurs affiches sont principalement liées à TVmaze. Les offres françaises, lorsqu’elles sont vérifiées et présentes, proviennent de Streaming Availability API par Movie of the Night ; certaines preuves historiques du catalogue sont en cours de remplacement depuis TMDB. Les plateformes de streaming citées n’éditent pas, ne sponsorisent pas et ne cautionnent pas ce jeu. La consultation externe sur JustWatch France reste proposée quand aucune offre commerciale vérifiée n’est disponible. Les disponibilités peuvent changer.</p><p lang="en">This product uses the TMDB API but is not endorsed or certified by TMDB.</p><button type="button" data-route="rights">Crédits, licences et droits des affiches →</button></div>'+
 '</section><p class="sc1-about-legal">Les mentions légales définitives, les conditions du service et la vérification des droits des visuels restent à finaliser avant tout lancement commercial.</p>'+
 '<div class="sc1-about-bottom"><button class="btn primary" data-route="rules" type="button">Lire les règles →</button><button class="btn subtle" data-route="settings" type="button">Paramètres</button></div></div>';
}
