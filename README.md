# SériesClubTCG — V1.0, préparation du lancement

## État du produit
**Version publique unique : V1.0**. Le projet est actuellement accessible en accès anticipé, **pas officiellement lancé**.

### Fonctionnalités présentes dans le code
- Authentification Supabase et collection synchronisée, paquets gratuits à cinq cartes.
- Sept raretés officielles, catalogue France, fiches de séries et diffusion française.
- Saisons officielles de huit et vingt séries, souhaits, cartes protégées, saisons personnelles.
- Jeux, fusions, profils, échanges et Comptoir selon modules serveur activés.
- Boosters SVOD (Netflix, Prime Video, Disney+, télévision) contre crédits virtuels gagnés dans le jeu. Les quatre offres sont activées sur le Supabase de production.
- Jour/nuit, interface mobile, navigation et page de transparence.
- Démonstration de booster sans inscription (aucune attribution réelle).
- Halloween : 2 séries classées Horror et une troisième horreur / thriller / mystère / surnaturel par paquet, avec les raretés officielles des séries. Migration `supabase/game_v1_halloween_theme.sql` et 80 scénarios de tirage non transactionnels en CI.
- Recyclage groupé sécurisé de doublons contre crédits virtuels, avec migration `game_v1_bulk_recycling.sql` appliquée en production.
- Codes joueurs du Signal : partage de pseudonymes et abonnements via code non secret de 10 caractères, migration `game_v1_invite_codes.sql` appliquée en production. Pas de messagerie privée.
- Centre d'opportunités du Comptoir : échanges reçus ou envoyés, dernières annonces correspondant aux souhaits, liens directs vers les sections concernées. Pas de notifications push ni de promesse de disponibilité en temps réel.

### À ne pas confondre avec une version publique
Les répertoires `v3/`, `v12/`, `v23/` et les migrations SQL `game_v21_...` sont **historiques et techniques**. Leur renumérotation casserait les imports, migrations et données. Les joueurs voient uniquement **SériesClubTCG V1.0**.

### Statut des paiements
Abonnement Premium dans un parcours test/suspendu selon configuration Supabase/Stripe. Vente de crédits contre euros désactivée. L'activation live exige examens réglementaires et juridiques, tests de paiements et de résiliation, conditions contractuelles et identification de l'éditeur.

## Activation des nouveautés de l'accès anticipé

Les modules **recyclage sécurisé des doublons**, **codes joueurs du Signal**, **boosters en crédits**, **Halloween corrigé** et **Top 20** sont présents dans le Supabase de production (contrôlé le 23 octobre 2026).

La migration **`supabase/game_v1_least_privilege.sql`** a également été appliquée le 23 octobre 2026. Elle limite les droits directs des visiteurs et des comptes connectés sans modifier les politiques RLS ou les soldes. Vérifications effectuées : lectures publiques des quatre boosters SVOD opérationnelles, refus implicite d'accès aux cartes et portefeuilles sans identité authentifiée. Les futurs scripts SQL doivent déclarer explicitement leurs privilèges, et les tests de non-régression doivent confirmer ces droits à chaque mise à jour. Le fichier [INSTALLER_V1_PRELANCEMENT.sql](supabase/INSTALLER_V1_PRELANCEMENT.sql) est conservé pour les installations futures : **ne pas réexécuter les scripts anciens sans raison**. Les droits d'exécution des fonctions privilégiées sont verrouillés par `supabase/game_v1_security_hardening.sql` et les index de recherche sont présents.

## Installation mobile et déconnexion

Le manifeste permet d'installer le site comme application web. Le service worker **ne met en cache que la page d'information hors connexion** et jamais les données des joueurs ni les appels Supabase. L'ouverture de paquets reste impossible hors connexion. La page Paramètres propose un bouton d'installation sur les navigateurs compatibles.

## Préparer un véritable lancement
- [ ] Domaine personnalisé `seriesclub-tcg.fr` acquis, DNS/HTTPS, redirections et URL de retour auth/Stripe configurées.
- [x] Première cartographie des licences et images réalisée : [audit juridique V1](AUDIT_JURIDIQUE_ET_LICENCES_V1.md) et [dossier CGU/RGPD à valider](DOSSIER_LEGAL_VALIDATION_V1.md). La base de production référence 81 862 affiches TVmaze, aucune affiche principale TMDB ; les logos de plateformes provenant de TMDB sont masqués en V1 et une page publique « Sources et droits » est accessible.
- [ ] Obtenir une confirmation écrite TVmaze concernant affiches, photos d'acteurs et usage commercial des cartes ; obtenir une licence TMDB commerciale ou changer de source. Aucun accord implicite n'est revendiqué.
- [ ] Vérifier la marque, les logos et noms de packs, le domaine et la compatibilité de l'hébergeur commercial (GitHub Pages est inadapté pour la monétisation principale).
- [ ] Identifier l'éditeur, disposer de mentions légales, politique de confidentialité, CGU, CGV si paiement.
- [ ] Contrôler RGPD : conservation, droits d'accès/suppression, contacts, sous-traitants, cookies.
- [x] Premier audit Supabase en production : accès RPC anonymes restreints de 36 à 5, index et politiques RLS optimisés. Vérification continue en CI.
- [x] Vérification des droits Data API : tables sensibles passées au principe de privilège minimal, avec une migration versionnée.
- [x] Tests navigateur Chromium enrichis (360/390/1366 px, navigation au clavier, routes publiques dont « Sources et droits » et démonstration conditionnelle), déclenchés sur modifications de l'application. Les dernières exécutions sont à retrouver dans GitHub Actions ; ne pas confondre tests Chromium simulés et appareils physiques.
- [ ] Revue de sécurité indépendante : contrôle des fonctions `SECURITY DEFINER` authentifiées, quotas, modération et abus.
- [ ] Configurer la protection contre les mots de passe compromis dans Supabase Auth si disponible avec le plan.
- [ ] Mettre en place un canal de contact et une procédure de suppression des comptes et de leurs données.
- [ ] Tests sur vrais navigateurs et appareils Android/iOS/desktop : login, boosters, achats en crédits, badges, échanges, thèmes et déconnexion.
- [ ] Tests de charge, accessibilité (clavier, lecteur d'écran), performances et reprise après incident.
- [ ] Contrôler la disponibilité du catalogue France et les preuves de diffusion datées.
- [ ] Valider les mécanismes des tirages aléatoires et cartes échangeables avant tout paiement en euros.
- [ ] Quand le lancement est autorisé : retirer `noindex,nofollow` et activer le référencement.

**Important :** le succès des tests de CI ne prouve pas à lui seul la conformité juridique ni l'absence de problèmes en production. Ce document est le référentiel V1.0 avant lancement.

Voir également [État et critères de lancement V1](ETAT_LANCEMENT_V1.md).

## Données et signalements (accès anticipé)
- Export du compte authentifié via RPC `export_my_account_data`, sans accès aux données privées d'autres comptes.
- Fermeture volontaire du compte via Edge Function `account-delete` (JWT obligatoire, confirmation e-mail et saisie SUPPRIMER, mot de passe revérifié dans l'interface). La suppression efface les données du joueur liées en cascade. L'historique d'une annonce d'un autre vendeur perd l'identifiant acheteur.
- Les signalements authentifiés sont enregistrés dans `player_reports` et accessibles uniquement à l'administration, dans la limite de 5 par 24 h. **Un examen humain et des coordonnées de contact restent indispensables**.
- Les pages Confidentialité et Mentions légales restent identifiées comme **provisoires**, sans identité d'éditeur inventée.
- Le service de suppression est déployé mais **non testé avec une suppression réelle en production** : ne jamais utiliser un compte personnel pour un test destructif.
