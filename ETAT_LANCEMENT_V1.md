# SériesClubTCG · V1.0 — Contrôle de préparation

Dernière vérification technique : **23 octobre 2026**. Ceci est un constat d'ingénierie, **pas** une certification légale ou une recette utilisateur.

## Validé dans le code et l'environnement connecté
- [x] Projet unique SériesClubTCG V1.0 : aucune version technique « V22 » affichée comme version publique.
- [x] Interface mobile jour/nuit, catalogue France, collections, albums, souhaits, Top 20, défis et achats en crédits virtuels développés.
- [x] Quatre boosters thématiques présents en production (Netflix, Prime Video, Disney+, Télévision) avec un catalogue de séries associé.
- [x] Halloween : deux titres classés Horror et une troisième carte thématique garanties par le sélecteur serveur, sans changer les raretés officielles.
- [x] Recyclage multiple protégé et codes d'invitation présents dans la base Supabase.
- [x] 36 fonctions privilégiées accessibles aux visiteurs anonymes avant durcissement ; **5 fonctions de lecture** restent publiques après migration.
- [x] Sept index FK manquants ajoutés ; alertes « unindexed_foreign_keys » et « auth_rls_initplan » supprimées.
- [x] Migration de verrouillage RPC et tests de permissions présents dans la chaîne CI.
- [x] Bibliothèque Supabase JS figée sur une version stable ; aucun secret service_role dans le navigateur.
- [x] Manifeste d'installation mobile, raccourcis et page hors connexion. Les données joueurs et crédits ne sont jamais mis en cache par le service worker.
- [x] Tests automatisés JavaScript et PostgreSQL dans GitHub Actions.

## Pas encore certifié — critères BLOQUANTS avant lancement commercial
- [ ] **Recette vraie vie** Android, iOS et ordinateur avec comptes de test : inscription, login, rafraîchissement, attribution de cartes, doublons, échanges, profils, mode jour et nuit, installation de l'application.
- [ ] **Droits des œuvres et de la marque :** conditions de réutilisation des affiches et images ; statut de la marque SériesClubTCG et confusion éventuelle avec « Série Club ».
- [ ] **Mentions légales et RGPD :** identité et contact de l'éditeur, politique de confidentialité, conservation, export, procédure effective de suppression des comptes et gestion des signalements.
- [ ] **Sécurité :** revue manuelle des RPC accessibles aux comptes authentifiés ; suivi des abus et activation de la protection contre les mots de passe compromis selon le plan Supabase.
- [ ] **Domaine personnalisé :** propriété du domaine, DNS, HTTPS, liens d'authentification et retours d'URL correctement configurés.
- [ ] **Paiements :** validation juridique du jeu aléatoire avec cartes échangeables, prix/cadre fiscal, CGV, remboursement/résiliation, webhook Stripe, tests en mode sandbox puis revue avant activation réelle.
- [ ] **Accessibilité et performance :** tests lecteurs d'écran/clavier, très petits écrans, lenteur réseau, performances des images et du catalogue.
- [ ] **Politique de modération** avant messagerie, enchères ou notifications externes.

## Fonctionnalités différées (ne bloquent pas une V1 gratuite maîtrisée)
Enchères, messagerie privée, notifications push et personnalisation commerciale avancée. Ne pas activer avant modération, protection anti-fraude et retour des joueurs.

## Décision actuelle
**ACCÈS ANTICIPÉ / NON LANCÉ COMMERCIALEMENT.** La V1.0 est déployée pour essais. Le statut `noindex,nofollow` est volontaire ; la vente de crédits en euros et la facturation Premium réelle restent désactivées. Conserver ce statut tant que les critères précédents ne sont pas satisfaits.
