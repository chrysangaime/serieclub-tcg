# SérieClub TCG V4.3 — Fiches de séries et recherche par acteur

Cette mise à jour enrichit les fiches du jeu **sans modifier la base Supabase**. Elle utilise l’API TVmaze documentée sur https://www.tvmaze.com/api.

## Ce qui change

### Fiche d’une série

Depuis le **Catalogue**, la **Collection**, la sélection d’**Halloween**, la **Liste de souhaits** ou une **filmographie d’acteur**, cliquer sur « Voir la fiche / Découvrir » pour ouvrir :

- Une vraie affiche quand TVmaze en possède une.
- Un **résumé court** avec le bouton « Lire le résumé complet » si nécessaire.
- Genres, date de première diffusion, statut, nombre de saisons, langue, durée moyenne, note TVmaze et chaîne/service d’origine **lorsqu’ils sont disponibles**.
- Une distribution sous forme de portraits cliquables, avec noms et personnages.
- Des liens de recherche pour les services de streaming et les DVD/Blu-ray, sans affirmer une disponibilité non vérifiée.

Le résumé de TVmaze est affiché **dans sa langue d’origine** (souvent l’anglais). Nous n’inventons aucune traduction française ni aucune information manquante.

### Fiche d’un acteur

Cliquer sur un portrait dans la distribution :

- Photo et nom de l’acteur, pays et naissance si renseignés.
- Filmographie des séries TV, classée par date, avec affiches et années.
- Accès direct à chaque fiche série.
- Badge **« Dans SérieClub »** pour les œuvres trouvées dans le catalogue Supabase ; les autres sont correctement identifiées comme références TVmaze.
- Bouton **« Filtrer le catalogue par cet acteur »**.

### Catalogue : filtre acteur

Le catalogue dispose maintenant de deux modes :

1. **Par série** : la recherche habituelle parmi les séries de SérieClub.
2. **Par acteur** : saisir au moins deux caractères, choisir un résultat avec portrait, puis consulter les séries auxquelles l’acteur a participé, y compris celles qui ne sont pas encore dans les boosters.

Les résultats sont chargés à la demande. Le changement de mode ne supprime pas les cartes du joueur ni sa collection.

## Performance et sécurité

- Aucun nouvel identifiant privé, aucune clé API et aucune migration SQL.
- Appels HTTPS à TVmaze : détails d’une série avec distribution/saisons dans une requête, recherche de personnes et crédits par personne.
- **Cache mémoire de 30 minutes**, 9,5 secondes de délai maximum de réponse, et chargement des fiches uniquement au clic.
- Recherche limitée à 16 personnes et filmographie limitée à 120 séries pour préserver la fluidité mobile.
- Titres et résumés échappés avant insertion en HTML : aucun HTML de synopsis n’est exécuté.
- Les liens de source n’acceptent que les URL du domaine TVmaze en HTTPS.
- Les disponibilités streaming restent des recherches externes, pas des données d’abonnement vérifiées.

## Vérifications

GitHub Actions exécute maintenant les tests `tests/series.test.mjs` couvrant :

- la suppression sécurisée du HTML des résumés ;
- l’affichage des métadonnées et des acteurs ;
- la navigation vers les autres séries d’un acteur ;
- la distinction entre séries présentes ou absentes du catalogue ;
- les requêtes TVmaze simulées et le cache.

Commandes locales optionnelles, non nécessaires pour le déploiement GitHub Pages :

```bash
npm run check
npm test
```

### Recette dans le navigateur

1. Ouvrir [SérieClub](https://chrysangaime.github.io/serieclub-tcg/), puis Catalogue.
2. Rechercher une série, cliquer **Découvrir · où regarder** et vérifier résumé, saisons et distribution.
3. Cliquer le portrait d’un acteur : sa filmographie doit apparaître.
4. Cliquer **Filtrer le catalogue par cet acteur** pour retrouver ses autres séries.
5. Depuis **Catalogue > Par acteur**, saisir un nom (ex. « Pedro Pascal »), choisir la personne, puis ouvrir une autre série.
6. Refaire le parcours sur smartphone.

**Limite :** certaines séries ou personnes n’ont pas de résumé, de photo ou de casting renseignés dans TVmaze. Le site affiche alors un état explicite plutôt que d’inventer le contenu.
