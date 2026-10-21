# SérieClub TCG V5.7 — Catalogue français élargi et actualisation continue

## Règle d'éligibilité
Une série n'est jouable que si une diffusion en France est prouvée :
- **Passé :** diffusion française déjà documentée, même si elle n'est plus proposée aujourd'hui.
- **Présent :** offre actuelle France vérifiée dans `results.FR` de TMDB/JustWatch.
- **À venir :** annonce d'une diffusion française avec diffuseur d'origine français identifié par TVmaze. La fiche parle de « diffusion annoncée » et ne présente jamais cette diffusion comme déjà réalisée.

Une série produite hors de France peut être éligible : le **pays de production seul n'est pas un filtre**. Aucune série sans preuve n'entre dans le catalogue jouable ni dans les boosters. Le contrôle est aussi appliqué côté SQL.

**Précision territoriale :** cette version atteste spécifiquement la France, conformément aux précédentes règles du jeu. Les diffusions uniquement attestées au Québec, en Belgique ou en Suisse romande demanderaient des preuves et un affichage territorial spécifiques avant d'être ajoutées. Elles ne sont pas assimilées silencieusement à une diffusion en France.

## Enrichissement effectif

`scripts/import-tvmaze.mjs` parcourt à présent des **tranches successives de l'index TVmaze**. La reprise est enregistrée dans `data/tvmaze-import-state.json`, avec rotation vers la page zéro quand l'index est épuisé. Le workflow ne recommence plus chaque semaine les 20 premières pages.

`.github/workflows/sync-catalog.yml` examine jusqu'à **300 pages par lancement**, importe les métadonnées illustrées dans Supabase et marque les séries dont la chaîne originale est explicitement française. Les modifications SQL antérieures, les raretés fixées et les cartes obtenues ne sont pas effacées.

Premier passage du **21 octobre 2026**, pages 0-99 : **22 353 séries TVmaze traitées** et **216 mises à jour de preuves d'origine française**. Deuxième passage pages 100-199 : **21 125 séries traitées** et **453 mises à jour de preuves d'origine française**. Le balayage a ensuite atteint la fin de l’index TVmaze à la page 381. Le **21 octobre 2026 à 08:51 UTC**, le contrôle en base a confirmé **1 656 séries dont `fr_verified = true`**. Les 216, 453 et 1 434 tentatives de mise à jour d'origine française relevées au fil des passages ne doivent pas être additionnées comme des séries uniques : le nombre de séries certifiées est celui du contrôle SQL en base. Le point de reprise a été remis à la page 0 pour la prochaine rotation.

## Séries étrangères ayant eu une diffusion française

`scripts/expand-fr-catalog.mjs` explore TMDB avec `watch_region=FR` et les types d'offres `flatrate|free|ads|rent|buy`. Pour ne pas confondre les titres homonymes :
1. identification exacte TVDB ou IMDb côté TVmaze, puis validation de l'année ;
2. à défaut, nom original et millésime cohérents ;
3. vérification supplémentaire d'au moins une offre réelle dans `/tv/{id}/watch/providers`, territoire `FR` ;
4. insertion des informations et de la preuve `tmdb_fr_offer`, sans remplacer la rareté ni détruire l'historique ;
5. reprise des pages de découverte via `data/catalog-fr-state.json`.

L'enrichissement est automatisé par `.github/workflows/expand-fr-catalog.yml` (quotidien). Les cache d'offres françaises de `data/watch-fr.json` restent datés et les relevés éditoriaux ne sont pas effacés par une réponse externe vide.

**Prérequis non encore satisfait le 21 octobre 2026 :** le secret GitHub `TMDB_READ_ACCESS_TOKEN` est absent. Le workflow signale l'absence et s'achève sans erreur ; le chemin TVmaze fonctionne **sans** ce jeton. Tant que ce secret manque, ne pas considérer l'import des séries étrangères disponibles en France comme effectué.

## Contrôles de qualité

- `npm run check` inclut les deux scripts d'importation.
- `npm test` couvre les identités, années, preuves françaises, doublons d'offres et diffusions futures.
- Les exemples historiques, les cartes déjà possédées et les règles serveur de filtrage France sont préservés.

## Coûts et droits

TVmaze et TMDB ont des conditions de réutilisation distinctes. TMDB ne permet pas d'exploiter son API gratuite à des fins commerciales (publicité ou affiliation génératrice de revenus) sans accord de licence. Source : https://developer.themoviedb.org/docs/faq.

Actions : https://github.com/chrysangaime/serieclub-tcg/actions
Site : https://chrysangaime.github.io/serieclub-tcg/
