# SérieClub TCG — V5.3.1 « France et raretés officielles »

**Site** : https://chrysangaime.github.io/serieclub-tcg/

## 1. Raretés : correction des cartes anciennes

### Ce qui causait l'anomalie
Après V5, `public.series.rarity` est le rang unique officiel. Certaines cartes créées avant le classement pouvaient encore contenir un ancien rang dans `public.player_cards.rarity`.

Le Studio filtrait alors sur la rareté officielle de la série, **mais l'étiquette de la carte affichait son ancienne rareté**. Une carte « Commune » pouvait donc apparaître dans la sélection « Unique » : ce n'était pas un tirage de deux raretés pour une même série, mais un décalage entre deux colonnes.

### Correctifs appliqués au site
- Le titre et toutes ses copies utilisent **toujours** `series.rarity` comme source d'affichage.
- Chaque carte dispose d'un contour coloré et d'un bandeau de rareté sur l'affiche.
- Les fiches de séries et les regroupements de doublons reprennent le code couleur (Commune, Peu commune, Rare, Épique, Légendaire, Mythique, Unique).
- Le Studio signale les anciennes copies incohérentes.
- Ces copies sont temporairement écartées des sélections de vente et de fusion tant que leur rang en base n'est pas réparé.

### Une réparation Supabase à faire UNE fois

**[Ouvrir `supabase/repair_rarity_v5_3.sql`](supabase/repair_rarity_v5_3.sql)** dans GitHub, puis exécuter l'intégralité du script dans le [SQL Editor Supabase](https://supabase.com/dashboard/project/anjfidksqbqlaggttdop/sql/new).

Ce script est transactionnel. Il ne supprime aucune carte, ne change pas les crédits, et synchronise uniquement les exemplaires dont le rang diffère de celui de leur série. Si une carte concernée est engagée dans une vente ou une proposition d'échange, cette transaction est annulée et la carte libérée pour éviter de modifier les termes d'un échange après publication. Les autres annonces restent en place.

Le script renvoie deux compteurs : `anciennes_cartes_a_corriger` puis `ecarts_apres_reparation`. Le second doit être égal à **0**.

## 2. Fiches : informations exclusivement françaises pour la diffusion

- Les chaînes étrangères de TVmaze ne sont plus présentées comme diffuseurs français.
- Une chaîne ou plateforme est identifiée comme diffuseur français seulement si `network.country.code === 'FR'` ou `webChannel.country.code === 'FR'` dans les données TVmaze.
- Les premières diffusions mondiales restent identifiées en tant que telles (année de création) ; elles ne sont pas annoncées comme dates de diffusion en France.
- Les synopsis français et les listes compactes d'acteurs sont conservés.
- Les genres importés en anglais depuis TVmaze s'affichent désormais en français (Drame, Comédie, Mystère, Horreur, etc.) dans les fiches, les albums, le profil et les listes, sans modifier les codes utilisés pour filtrer les données.

## 3. « Où regarder en France ? » : API officielles et vraie disponibilité

### Déjà opérationnel sans configuration

La fiche comprend maintenant un bloc dédié à la France :
- uniquement des offres `country: "FR"` ;
- distinction des offres avec abonnement, gratuites, avec publicité, location et achat ;
- visuels des plateformes uniquement s'ils sont inclus dans les données officielles ;
- lien vers la fiche française de TMDB lorsqu'elle est disponible, avec attribution TMDB / JustWatch et date du relevé ;
- en l'absence de relevé, message « Aucune disponibilité française vérifiée n'est encore enregistrée » sans citer de fausse plateforme ;
- un lien vers **JustWatch France** qui ne passe plus par Google.

**Attention :** le lien sans données vérifiées ouvre la page de recherche JustWatch France ; il ne prétend pas ouvrir automatiquement la bonne fiche. Les données TMDB permettront d'accéder à une fiche spécifique lorsqu'elles auront été synchronisées.

### Accès TMDB à configurer pour récupérer les plateformes réelles

JustWatch propose un accès partenaires qui nécessite un contrat et un jeton. **TMDB** est une alternative officiellement documentée : `GET /3/tv/{tmdb_id}/watch/providers`, données de JustWatch avec disponibilité par pays et obligation d'attribution.

Le site GitHub Pages est statique : publier un jeton directement dans le JavaScript serait dangereux. Pour éviter cela, le script `scripts/sync-fr-providers.mjs` tourne **côté GitHub Actions** et publie un fichier JSON ne contenant **que** des séries et leurs disponibilités françaises, jamais les secrets.

Activation :
1. Créer ou récupérer un **jeton de lecture API TMDB** dans https://www.themoviedb.org/settings/api.
2. L'ajouter en secret GitHub Actions, nommé exactement **`TMDB_READ_ACCESS_TOKEN`**, dans https://github.com/chrysangaime/serieclub-tcg/settings/secrets/actions (le conserver privé ; ne jamais le coller dans le chat ni dans le dépôt).
3. Vérifier que le secret `SUPABASE_SERVICE_ROLE_KEY`, déjà utilisé pour le catalogue, existe toujours.
4. Ouvrir https://github.com/chrysangaime/serieclub-tcg/actions/workflows/sync-fr-streaming.yml et choisir **Run workflow** (120 titres par défaut, jusqu'à 400 par exécution).

Le workflow sélectionne les séries à classer à partir du catalogue, rapproche leurs noms et années de première diffusion avec TMDB, récupère **uniquement** `results.FR`, puis met à jour `data/watch-fr.json`. Il pourra ensuite fonctionner chaque jour, par lots, sans intervention manuelle.

La mise en correspondance est volontairement **prudente** : si le titre et l'année ne permettent pas d'identifier la série avec suffisamment de certitude, aucune offre n'est affichée. Les relevés de plus de 45 jours ne sont plus présentés comme disponibles.

**État initial** : `data/watch-fr.json` est vide. Tant que le secret TMDB et le workflow n'ont pas été activés, **aucune disponibilité française réelle ne sera affichée**. Le module et le lien JustWatch France sont déjà utilisables.

### Pourquoi pas BetaSeries directement ?

L'API BetaSeries est bien documentée et francophone, mais exige également une clé spécifique (`X-BetaSeries-Key`). Elle serait utile pour des informations culturelles et des catalogues de séries, sans remplacer nécessairement les offres territoriales fournies par TMDB/JustWatch. Nous pouvons l'ajouter comme source secondaire après stabilisation de cette première intégration.

## 4. Tests

Le workflow `.github/workflows/quality.yml` vérifie :
- le rendu de la rareté officielle même lorsque l'exemplaire possède un ancien rang ;
- le code couleur, les groupes de doublons et les cartes ;
- l'absence de chaînes US présentées comme françaises ;
- le filtrage strict des offres `FR`, la validation de leurs URL, l'échappement HTML ;
- la non-affichage de plateformes si les données sont absentes ou trop anciennes ;
- les correspondances de séries par nom et année et la suppression du détour par Google.

**Limite de validation :** ces tests sont effectués sur des données simulées ; ils ne prouvent pas qu'un service français donné propose actuellement une série. Cette affirmation n'est faite qu'à partir d'un relevé officiel alimenté.

## 5. Conformité et transparence

La présence des logos des diffuseurs est **informative**, et ne constitue ni une publicité contractuelle ni un partenariat. La source JustWatch est affichée à côté des disponibilités (via TMDB). Les conditions de réutilisation et les attributions applicables doivent être respectées avant la mise en production d'une activité commerciale importante.
