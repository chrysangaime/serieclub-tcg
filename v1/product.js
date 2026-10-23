/** SériesClubTCG — identité publique stable pendant la préparation du lancement. */
export const PRODUCT=Object.freeze({name:'SériesClubTCG',version:'V1.0',stage:'En préparation',launched:false});
export function footerHTML(){
 return '<footer class="app-footer sc1-footer" aria-label="Informations sur SériesClubTCG">'+
 '<div class="sc1-footer-brand"><strong>SériesClubTCG</strong><span class="sc1-version">'+PRODUCT.version+' · '+PRODUCT.stage+'</span></div>'+
 '<nav aria-label="Informations pratiques"><button type="button" data-route="rules">Comment jouer</button>'+
 '<button type="button" data-route="settings">Paramètres</button><button type="button" data-route="privacy">Confidentialité</button><button type="button" data-route="legal">Mentions légales</button><button type="button" data-route="support">Assistance</button><button type="button" data-route="about">À propos</button></nav>'+
 '<p>Jeu indépendant consacré aux séries diffusées en France. Marques et visuels : droits réservés à leurs propriétaires respectifs. Aucune affiliation avec les plateformes de diffusion mentionnées.</p></footer>';
}
export function aboutPage(){
 return '<div class="page-content sc1-about">'+
 '<div class="sc1-about-head"><span class="caps">SÉRIESCLUBTCG · V1.0</span><h1>Le club des séries à collectionner.</h1>'+
 '<p>Découvre des séries, ouvre des paquets, organise ta collection et progresse à travers les Saisons.</p>'+
 '<span class="sc1-about-phase">● En préparation · Accès anticipé</span></div>'+
 '<section class="sc1-about-grid" aria-label="Découvrir le jeu">'+
 '<article><span class="sc1-step">01</span><h2>Découvrir</h2><p>Ouvre un paquet gratuit de cinq séries. Chaque titre dispose de sa rareté officielle dans le catalogue.</p><button data-route="packs" type="button">Choisir un paquet →</button></article>'+
 '<article><span class="sc1-step">02</span><h2>Collectionner</h2><p>Protège tes cartes, complète les Saisons, retrouve tes doublons et organise tes souhaits.</p><button data-route="albums" type="button">Voir les Saisons →</button></article>'+
 '<article><span class="sc1-step">03</span><h2>Participer</h2><p>Retrouve les défis, le Comptoir et la communauté. Certaines activités nécessitent une activation serveur.</p><button data-route="games" type="button">Découvrir les défis →</button></article></section>'+
 '<section class="sc1-about-details"><h2>Informations et transparence</h2>'+
 '<div><h3>État du projet</h3><p>La V1.0 est en préparation et n’a pas fait l’objet d’un lancement public. Certaines fonctions peuvent évoluer ou rester momentanément indisponibles.</p></div>'+
 '<div><h3>Crédits et paiement</h3><p>Les crédits du jeu sont virtuels. Les boosters thématiques peuvent être ouverts avec les crédits gagnés, lorsque leur catalogue est disponible. La vente de crédits en euros est suspendue. L’abonnement Premium est encore soumis à son activation.</p></div>'+
 '<div><h3>Compte et confidentialité</h3><p>L’authentification et les cartes sont synchronisées via Supabase. Certaines préférences sont stockées dans le navigateur. Le pseudonyme et des résultats de jeu peuvent être visibles par les autres joueurs.</p></div>'+
 '<div><h3>Données et marques</h3><p>Les informations sur les séries peuvent provenir de TVmaze, TMDB et JustWatch. Les plateformes de streaming citées n’éditent pas, ne sponsorisent pas et ne cautionnent pas ce jeu. Les disponibilités peuvent changer.</p></div>'+
 '</section><p class="sc1-about-legal">Les mentions légales définitives, les conditions du service et la vérification des droits des visuels restent à finaliser avant tout lancement commercial.</p>'+
 '<div class="sc1-about-bottom"><button class="btn primary" data-route="rules" type="button">Lire les règles →</button><button class="btn subtle" data-route="settings" type="button">Paramètres</button></div></div>';
}
