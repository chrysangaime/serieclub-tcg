# SérieClub TCG V5.8 — Séries patrimoniales, recherche France et suivi

## Objectif
Accroître la part de **séries étrangères historiquement connues en France**, sans considérer toutes les séries mondiales comme éligibles. L'historique France et la disponibilité française actuelle sont deux notions différentes.

## Ce qui change

1. **Exploration par périodes** : le classement TMDB par popularité globale ne couvre pas équitablement les séries anciennes. `scripts/fr-discovery-plan.mjs` découpe maintenant les années en périodes disjointes (1900–2030), prioritaires pour les années 1970–2009. Trois exécutions sur quatre explorent ces archives et la quatrième poursuit le classement populaire à son point de reprise.
2. **Vérification française inchangée** : l'import d'une série étrangère exige une offre réelle `results.FR` dans l'API TMDB. Une date de première diffusion ancienne ne constitue **pas** une preuve de diffusion passée en France.
3. **Recherche d'identité sécurisée** : lorsque TVDB/IMDb ne résolvent pas l'identité, les résultats multiples de `/search/shows` TVmaze sont comparés par titre exact normalisé et millésime. Les homonymes ambigus sont rejetés au lieu de sélectionner arbitrairement le premier.
4. **Aucune réécriture des raretés ni des cartes gagnées** : enrichissement par ID TVmaze conservé, preuve d'éligibilité seulement ajoutée si absente, relevés éditoriaux JustWatch conservés.
5. **Catalogue utilisateur** : la page indique désormais le décompte exact Supabase des fiches françaises jouables et le nombre de cartes chargées (pagination de 36).
6. **Disponibilités FR** : le navigateur rafraîchit l'URL du cache toutes les heures au lieu de conserver indéfiniment la version d'origine. Les requêtes authentifiées TMDB restent exclusivement dans GitHub Actions.
7. **Qualité** : des tests couvrent les fenêtres d'exploration, la reprise, la sélection univoque d'une série, le total du catalogue et le cache FR. La CI exécute désormais toute la suite via `npm test`.

## Configuration et fonctionnement

- `TMDB_READ_ACCESS_TOKEN` est présent dans GitHub Actions : token Bearer ou clé API v3 gérés automatiquement.
- `SUPABASE_SERVICE_ROLE_KEY` est présent dans GitHub Actions et reste strictement serveur.
- `.github/workflows/expand-fr-catalog.yml` lance quotidiennement l'exploration (20 pages, 400 résultats par exécution par défaut).
- Les états `data/catalog-fr-state.json` et `data/watch-fr.json` se mettent à jour seulement après des exécutions réussies.
- `FR_DISCOVERY_MODE=popular|archive|auto` permet de forcer un mode depuis les variables du workflow, par défaut `auto`. `FR_START_PAGE` reste disponible pour un diagnostic.
- `.github/workflows/audit-fr-catalog.yml` affiche dans GitHub les totaux certifiés et jouables à partir de Supabase.

## Baseline vérifiée

Le 21 octobre 2026 à 11:37 UTC, un audit réel a confirmé **2 033 séries jouables** en France : 1 650 certifiées par le diffuseur français TVmaze, 377 par une offre TMDB/JustWatch France et 6 par documentation éditoriale historique. Ce relevé précède les imports de l'exploration patrimoniale V5.8 ; ne pas confondre séries *examinées* et séries nouvellement certifiées.

## Limitations et précautions

Une offre actuelle TMDB ne prouve pas la **date** de première diffusion française. Les séries anciennement diffusées sur TF1, M6, France Télévisions, etc. mais aujourd'hui sans offre TMDB nécessitent une source de diffusion historique spécifique (archives INA, chaînes françaises, documentation éditoriale vérifiable) avant leur inclusion. Le catalogue n'est donc pas présenté comme exhaustif de toutes les diffusions anciennes.

TMDB peut exiger une licence commerciale lorsque le jeu comporte publicité, parrainage ou affiliation. Valider les conditions de réutilisation des données et visuels avant monétisation.

Sources : https://developer.themoviedb.org/reference/discover-tv · https://www.tvmaze.com/api · https://developer.themoviedb.org/docs/faq
