# SérieClub TCG V5.9 — Expérience joueur et catalogue France

## Parcours joueur

- **Mobile** : barre de navigation fixe en bas (Paquets, Collection, Catalogue, Souhaits), compatible avec les marges de sécurité Android/iOS. L'ancien menu latéral demeure accessible par « ☰ » et se ferme en touchant l'arrière-plan ou avec Échap.
- **Accueil / onboarding** : pour un nouveau visiteur, « Commencer à jouer — Créer un compte gratuit » remplace le bouton d'ouverture précédemment désactivé. Le bouton ouvre la fenêtre d'inscription existante ; aucune nouvelle collecte de données.
- **Paquets sur mobile** : vignettes des deux boosters réduites pour éviter un défilement excessif avant l'action principale.
- **Accès rapide** : raccourci clavier « / » pour rechercher une série, et bouton « Rechercher » depuis l'en-tête sur ordinateur.
- **Accessibilité** : champs avec libellés et contrôles de focus, statut de recherche annoncé aux technologies d'assistance, cibles de navigation adaptées au tactile et respect des préférences de réduction des animations.

## Explorer le catalogue France

- Recherche au fil de la saisie avec délai de 420 ms et effacement complet des filtres.
- Filtres **rareté**, **genre**, **décennie** et tris **titre**, **date** et **popularité TVmaze**.
- Tous les filtres sont exécutés dans **Supabase** avec `fr_verified=true`, rareté officielle fixée et affiche présente : aucune recherche ne se limite à la première page déjà affichée.
- Pagination de 36 avec tri stable, total exact du serveur et protection contre les réponses asynchrones arrivant dans le désordre.
- États vides contextualisés, squelettes de chargement, accès aux fiches « où regarder » et à la liste de souhaits.

## Import historique

- Les séries anciennes restent soumises à une preuve de diffusion ou d'offre réelle en France, sans inventer un diffuseur.
- Lors d'une indisponibilité répétée du serveur TVmaze (notamment réponses HTTP 502), le traitement s'interrompt **partiellement**, conserve les données déjà trouvées et réessaie la page incomplète lors de la prochaine synchronisation. Il ne prétend pas avoir terminé l'exploration patrimoniale.
- Le cache `data/watch-fr.json`, le point de reprise `data/catalog-fr-state.json` et les raretés des cartes déjà acquises sont préservés.

## Contrôles

`npm run check` et `npm test` sont exécutés par GitHub Actions, en complément des tests SQL anti-fraude du jeu. `tests/experience-v59.test.mjs` vérifie les fonctions d'exploration, la navigation mobile, les états de chargement et le parcours gratuit d'inscription.

Le dernier relevé vérifié avant cette livraison était de **2 033 séries jouables certifiées France**. Ce total est un point de départ, pas une estimation du nombre de séries anciennes couvertes par les futures synchronisations.

## Liens
- Site : https://chrysangaime.github.io/serieclub-tcg/
- Tests : https://github.com/chrysangaime/serieclub-tcg/actions
- Bilan catalogue : https://github.com/chrysangaime/serieclub-tcg/actions/workflows/audit-fr-catalog.yml
