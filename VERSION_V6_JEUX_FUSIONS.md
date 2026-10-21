# SérieClub TCG — V6.0 : Arène des jeux et Atelier de fusion

## Jeux & défis : une vraie expérience en manches

Trois mini-jeux indépendants et gratuits, jouables même sans compte, sur la base de séries **certifiées pour la France** :

- **Affiche mystère** : affiche floutée, quatre propositions, révélation après la réponse.
- **Avant ou après ?** : confronte deux séries aux années de diffusion distinctes ; le joueur doit identifier la plus ancienne.
- **La bonne année** : deviner quelle série a commencé une année donnée, parmi quatre réponses.

Chaque partie comprend **cinq manches**, avec score immédiat, progression visuelle, correction détaillée, écran final et possibilité de rejouer. Les meilleurs scores sont stockés uniquement sur le navigateur de l'appareil (`sc-quiz-records-v6`) : **pas de synchronisation au compte**, pas de coût, ni gain de crédits, XP ou cartes. Le score local n'est pas une donnée compétitive opposable aux autres joueurs.

Les questions sont sélectionnées parmi un échantillon aléatoire de titres vérifiés `fr_verified=true`, dotés d'une affiche et d'une date de première diffusion passée. Elles ne reposent plus sur les 36 premiers résultats de l'onglet Catalogue. Les titres futurs, les séries non certifiées et les homonymes hors catalogue sont exclus. Les questions récemment utilisées sont écartées des manches suivantes dans la même partie tant que le stock le permet.

## Fusion : protection par défaut des exemplaires uniques

- Affichage par rang d'origine et rang cible officiel (Commune → Peu commune → Rare → Épique → Légendaire → Mythique → Unique).
- Statistiques des doublons utilisables, des derniers exemplaires, progression de 0 à 10.
- **« Préserver mes dernières copies » actif par défaut** ; l'utilisateur peut délibérément le désactiver pour risquer un dernier exemplaire.
- **Sélection intelligente** avec priorité aux doublons excédentaires.
- Exclusion des cartes verrouillées, réservées, en vente, avec rareté incohérente ou non certifiées France.
- Grille paginée par 24 cartes, sans avoir à défiler parmi tous les exemplaires.
- **Fenêtre de confirmation explicite**, listant les dix cartes supprimées avant la moindre opération serveur. Les avertissements sont renforcés lorsque des dernières copies sont incluses.
- Une fois Supabase ayant validé et exécuté la fusion atomique, affichage de la **véritable carte obtenue** et accès direct à la collection.

**La règle du jeu n'a pas changé :** dix cartes consommées pour une nouvelle carte officielle du rang supérieur, choisie aléatoirement côté serveur, et +100 XP par fusion réussie selon la procédure `fuse_cards`. Le frontend ne déduit pas de cartes et n'invente aucune récompense ; l'atomicité, la propriété et le périmètre France restent contrôlés par la fonction SQL existante.

## Accessibilité et pérennité

Navigation clavier et tactile, retours vocaux sur les résultats, responsive mobile, chargement asynchrone des questions, états d'erreur et faible dépendance aux animations. Le code sépare logique pure, présentation et appels serveur :

- `v6/games.js` : tirage, scoring et rendu des questions ;
- `v6/fusion.js` : calcul d'éligibilité, sélection sûre et récapitulatif ;
- `v6/experience.css` : présentation responsive des deux rubriques ;
- `tests/game-fusion-v6.test.mjs` : éligibilité, scores, duplications, historique France, confirmations, interfaces.

Exécuter `npm run check`, `npm test` ; GitHub Actions vérifie aussi les migrations SQL et les scénarios anti-fraude.

## Ordre de refonte des prochaines rubriques

1. Jeux & défis + Fusion — **V6 livrée**.
2. Collection : navigation parmi les cartes, recherche et tris, gestion des doublons, actions rapides.
3. Mes Saisons / Albums : progression des ensembles et parcours de collection.
4. Le Comptoir : fluidité des annonces, échanges et contrôles de sécurité.
5. Missions, classement, profil et paramètres : progression cohérente, accessibilité, simplification générale.

Le service est gratuit à ce stade. Toute distribution future de gains sur les jeux exige des mécanismes anti-triche et un calcul serveur, pas une récompense uniquement déclenchée dans le navigateur.
