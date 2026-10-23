/** SériesClubTCG V1.0 — pages d'information, assistance et droits des joueurs. */
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const head=(k,t,desc)=>'<header class="sc1-rights-head"><span class="caps">'+k+'</span><h1>'+t+'</h1><p>'+desc+'</p></header>';
export function privacyPage(s={}){
 return '<div class="page-content sc1-rights">'+head('TES DONNÉES · V1.0','Comprendre et contrôler tes données.','Informations de transparence pour la version en accès anticipé. Les mentions de l’éditeur et leurs coordonnées définitives sont encore à compléter avant le lancement.')+
 '<section class="panel"><h2>Ce que le club conserve</h2><p>Supabase gère l’adresse e-mail, la connexion et les informations de session. La base du jeu conserve ton pseudonyme, ton profil, tes cartes, tes crédits virtuels, tes souhaits, tes Saisons et albums, tes échanges et tes récompenses.</p>'+
 '<p>Ton pseudonyme, tes résultats au classement et les albums que tu rends publics peuvent être visibles par d’autres joueurs. Tes données d’authentification, ton e-mail et le détail de ta collection privée ne sont pas affichés dans les profils publics.</p>'+
 '<h2>À quoi servent ces informations ?</h2><p>Au fonctionnement du compte et du jeu, à la lutte contre les abus, au suivi des opérations et à la sécurité du service. Les préférences d’apparence et les records locaux peuvent être conservés uniquement sur ton appareil. Des informations publiques sur les séries et leurs affiches proviennent de fournisseurs externes tels que TVmaze et TMDB.</p>'+
 '<h2>Prestataires et durée</h2><p>Supabase héberge les comptes et les données du jeu. GitHub Pages héberge l’interface. Les informations actives du compte restent nécessaires pendant son utilisation ; les durées détaillées de conservation et les éventuelles obligations légales doivent encore être validées avant un lancement commercial.</p>'+
 '<h2>Exercer tes droits</h2><p>Tu peux télécharger les données associées à ton compte et demander sa suppression depuis les Paramètres. Certains éléments soumis à une obligation légale peuvent, le cas échéant, être conservés conformément à la réglementation applicable.</p>'+
 '<div class="sc1-rights-actions"><button class="btn primary" type="button" data-route="settings">Gérer et exporter mes données →</button><button class="btn subtle" type="button" data-route="support">Signaler un problème →</button></div></section>'+
 '<p class="sc1-rights-note">La politique complète devra préciser l’identité et les coordonnées du responsable de traitement, les bases légales retenues, les durées par catégorie, les transferts hors UE et les moyens d’opposition. Des images affichées par des fournisseurs tiers peuvent entraîner des requêtes réseau vers leurs serveurs. Ces points restent à documenter avant l’ouverture officielle.</p>'+
 '<p class="sc1-rights-note">Cette page est une information provisoire : elle ne remplace pas une politique de confidentialité juridiquement validée. Pour comprendre le droit d’effacement : <a href="https://www.cnil.fr/fr/comprendre-mes-droits/le-droit-leffacement-supprimer-vos-donnees-en-ligne" rel="noopener noreferrer" target="_blank">CNIL</a>.</p></div>';
}
export function legalPage(){
 return '<div class="page-content sc1-rights">'+head('TRANSPARENCE · V1.0','Mentions légales en préparation.','Le service est accessible en test. Les informations de l’éditeur doivent être vérifiées et publiées avant tout lancement officiel.')+
 '<section class="panel"><h2>Le service</h2><p>SériesClubTCG est un jeu indépendant de collection consacré aux séries télévisées disponibles en France. Aucune affiliation ou autorisation de marque des plateformes citées n’est revendiquée.</p>'+
 '<h2>Éditeur et contact</h2><p><strong>Informations non encore publiées :</strong> identité/statut juridique de l’éditeur, coordonnées professionnelles et adresse de contact pour les demandes RGPD et les réclamations. Ces informations sont à renseigner et à valider avant une ouverture commerciale.</p>'+
 '<h2>Hébergement</h2><p>Interface statique : GitHub Pages (GitHub). Gestion des comptes et base de données : Supabase. Les prestations de données et d’images peuvent impliquer TVmaze, TMDB ou des fournisseurs de liens de diffusion.</p>'+
 '<h2>Conditions et droits des images</h2><p>Les crédits du jeu ne sont pas une monnaie réelle. Aucun paiement d’abonnement en production ni achat de crédits en euros ne doit être activé avant validation des CGU/CGV, des droits des œuvres et des obligations réglementaires. Les affiches proviennent de liens directs TVmaze ; les licences et permissions des ayants droit font l’objet d’un audit avant lancement.</p>'+
 '<button class="btn subtle" type="button" data-route="rights">Consulter les crédits, les licences et les droits des images →</button>'+
 '<div class="sc1-rights-actions"><button class="btn primary" type="button" data-route="privacy">Informations personnelles →</button><button class="btn subtle" type="button" data-route="about">À propos →</button></div></section></div>';
}
export function supportPage(s={}){
 return '<div class="page-content sc1-rights">'+head('LE CLUB · AIDE','Signaler un problème.','Les signalements sont enregistrés dans une file d’administration privée. Ils ne sont pas affichés publiquement.')+
 '<section class="panel"><h2>Signaler un profil, une annonce ou une fiche</h2>'+
 (s.user?'<form id="clubReportForm" class="sc1-report-form">'+
 '<label>Type de contenu<select id="reportTargetType" required><option value="player">Profil joueur</option><option value="listing">Annonce du Comptoir</option><option value="series">Fiche de série</option></select></label>'+
 '<label>Identifiant du contenu<input id="reportTargetRef" required maxlength="48" autocomplete="off" placeholder="ID du profil / annonce, ou numéro de série"></label>'+
 '<label>Motif<select id="reportReason" required><option value="abuse">Comportement abusif</option><option value="fraud">Fraude ou échange suspect</option><option value="offensive">Contenu offensant</option><option value="copyright">Droits sur un visuel ou une œuvre</option><option value="other">Autre problème</option></select></label>'+
 '<label>Décris le problème<textarea id="reportDetails" required minlength="15" maxlength="600" rows="4" placeholder="Explique les faits avec précision (15 à 600 caractères)."></textarea></label>'+
 '<button type="submit" class="btn primary" id="reportSubmitButton">Envoyer le signalement →</button>'+
 '<p class="note">Cinq signalements au maximum par 24 heures. N’inclus pas d’informations sensibles dans le texte.</p></form>':
 '<p>Connecte-toi pour signaler un contenu depuis ton compte. La messagerie privée n’est pas ouverte pendant l’accès anticipé.</p><button class="btn primary" data-auth type="button">Se connecter →</button>')+
 '</section><section class="panel"><h2>Besoin d’une aide concernant tes données ?</h2><p>Consulte les Paramètres pour exporter tes informations ou fermer ton compte. Le contact de l’éditeur sera rendu disponible lors de la publication des mentions légales définitives.</p><button type="button" class="btn subtle" data-route="settings">Paramètres et données →</button></section></div>';
}
export function deletionDialog(email=''){
 return '<div class="dialog sc1-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="deleteAccountTitle">'+
 '<button type="button" class="close" data-close aria-label="Fermer">×</button>'+
 '<span class="caps">FERMETURE DU COMPTE</span><h2 id="deleteAccountTitle">Supprimer définitivement mon compte</h2>'+
 '<p>Tu perdras ton compte, tes cartes, crédits virtuels, albums, souhaits et progression. La suppression est irréversible. <strong>Exporte tes données avant de continuer.</strong></p>'+
 '<p>Confirme l’adresse e-mail et saisis <strong>SUPPRIMER</strong> ci-dessous. Nous demandons également ton mot de passe actuel avant l’envoi.</p>'+
 '<label for="deleteAccountEmail">Adresse e-mail du compte<input id="deleteAccountEmail" class="input" type="email" autocomplete="email" value="'+esc(email)+'" required></label>'+
 '<label for="deleteAccountPassword">Mot de passe actuel<input id="deleteAccountPassword" class="input" type="password" autocomplete="current-password" required></label>'+
 '<label for="deleteAccountPhrase">Confirmation exacte<input id="deleteAccountPhrase" class="input" type="text" autocapitalize="characters" autocomplete="off" placeholder="SUPPRIMER" required></label>'+
 '<p id="deleteAccountFeedback" role="alert" class="feedback"></p>'+
 '<div class="sc1-delete-actions"><button class="btn subtle" type="button" data-close>Annuler</button><button class="btn sc1-delete-danger" type="button" data-delete-account-confirm>Supprimer mon compte</button></div></div>';
}
