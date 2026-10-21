# SérieClub TCG V5.5 — Disponibilités françaises sourcées et anciennes cartes exclues

## Le problème constaté

La fiche de **The X-Files (1993)** pouvait afficher « Diffusion française à vérifier » et « Aucune disponibilité française vérifiée » malgré sa présence sur **Disney+** et **Amazon Prime Video**, notamment.

Deux causes techniques distinctes :
1. La fenêtre de série réutilisait parfois un ancien enregistrement ne contenant pas `fr_verified`. Son appel de rattrapage à Supabase oubliait également de sélectionner ce champ : le message « à vérifier » persistait après confirmation.
2. `data/watch-fr.json` était vide. Le module d'affichage, prêt à consommer des données TMDB/JustWatch, n'avait **aucune donnée française à afficher**. « Non renseigné dans SérieClub » ne signifie évidemment pas « indisponible en France ».

## Disponibilité de The X-Files corrigée

Le fichier **`data/watch-fr.json`** contient maintenant l'entrée TVmaze **430** pour *The X-Files*, avec un relevé attribué à [JustWatch France](https://www.justwatch.com/fr/serie/the-x-files), région FR.

Source : relevé du **10 septembre 2026**. Les offres recensées comprenaient :
- Abonnement : **Disney+**, **Amazon Prime Video**, SFR Play, Molotov TV.
- Avec publicité : M6+.
- Achat : Apple TV Store, Amazon Video.

Il s'agit d'une **observation datée**, pas d'une promesse que tous les épisodes sont encore accessibles aujourd'hui. À partir de 14 jours, une mention demande une revérification ; au-delà de 45 jours, les plateformes sont explicitement qualifiées d'**offres auparavant constatées**. Un lien mène **directement** à la fiche française de la série sur JustWatch plutôt qu'à Google ou à la page d'accueil générique. Les disponibilités d'une saison à l'autre peuvent varier.

La synchronisation TMDB/JustWatch (si son jeton a été configuré) peut actualiser ces offres. Elle ne doit plus écraser un relevé éditorial français sourcé par une réponse vide ou sans correspondance.

## Exclure aussi les cartes déjà obtenues

**Accepté : les cartes des séries sans preuve de diffusion française sont exclues de la collection jouable, y compris lorsqu'elles ont été gagnées avant la V5.4.**

Le choix est **réversible** :

- Les cartes non vérifiées **ne figurent plus dans « Ma collection »** ni dans les statistiques, les fusions, les achats/ventes possibles, la sélection des doublons et la progression en France.
- Leur nombre apparaît dans un message de collection (« anciennes cartes exclues »), sans encombrer la grille.
- Les données originales restent **conservées dans `public.player_cards`**. Aucun exemplaire n'est effacé : si sa diffusion française est prouvée plus tard, il réapparaît automatiquement avec la même rareté officielle.
- Les classements et l'annuaire des joueurs ne comptent désormais que les exemplaires des séries certifiées françaises.
- Les anciennes annonces ou propositions d'échanges portant sur une carte non éligible sont clôturées, sans transfert de carte ni de crédits.
- Une protection SQL supplémentaire bloque tout changement de propriétaire d'une carte non certifiée, même depuis une ancienne annonce mémorisée dans un navigateur.

**Aucune récompense ni aucun remboursement fictif** n'est créé pour les anciennes cartes exclues. Elles ne sont pas supprimées.

## Une seule opération Supabase : V5.4 + V5.5

Exécuter le **[script combiné `supabase/install_v5_4_v5_5.sql`](supabase/install_v5_4_v5_5.sql)** dans le [SQL Editor Supabase](https://supabase.com/dashboard/project/anjfidksqbqlaggttdop/sql/new).

Il installe d'abord les règles France de V5.4 (ou les réapplique si déjà présentes), puis :
- certifie **The X-Files (1993), TVmaze ID 430**, avec le lien exact [JustWatch France](https://www.justwatch.com/fr/serie/the-x-files) ;
- exclut les cartes non françaises du classement, de l'annuaire et du marché ;
- protège les anciennes cartes conservées contre des transferts non autorisés.

**Une seule transaction `BEGIN`/`COMMIT`**, sans suppression des cartes ni des profils. Si une étape échoue, tout est annulé. Prérequis : V4 et V5 déjà installées (raretés fixes).

### Vérification SQL après installation

```sql
-- The X-Files doit être certifiée FR, avec la source JustWatch vérifiée.
SELECT id,name,premiered,rarity,fr_verified,fr_evidence_url
FROM public.series
WHERE id=430;

-- Anciennes cartes conservées versus cartes actuellement jouables.
SELECT
 COUNT(*) AS cartes_conservees,
 COUNT(*) FILTER (
  WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending'
 ) AS cartes_jouables_france,
 COUNT(*) FILTER (
  WHERE s.fr_verified IS DISTINCT FROM TRUE OR s.rarity_source='pending'
 ) AS cartes_ecartees_non_fr
FROM public.player_cards c
JOIN public.series s ON s.id=c.series_id;
```

Le deuxième contrôle affiche le volume **pour tous les comptes**. La collection individuelle doit quant à elle afficher le nombre d'anciennes cartes écartées de ce joueur.

## Améliorer durablement la couverture française

Le référencement exact des plateformes reste une fonction distincte de la preuve de diffusion historique. Le relevé *The X-Files* fonctionne **sans nouvelle clé TMDB**. Pour actualiser automatiquement les offres et enrichir des milliers de séries étrangères ayant été diffusées en France, la synchronisation sécurisée TMDB/JustWatch nécessite toujours `TMDB_READ_ACCESS_TOKEN` dans les secrets GitHub et le workflow [Actualiser les plateformes de streaming France](https://github.com/chrysangaime/serieclub-tcg/actions/workflows/sync-fr-streaming.yml).

Une absence de relevé ne prouve **jamais** qu'une série n'a pas été diffusée en France. Tant que la preuve n'est pas enregistrée, la série reste exclue du jeu, mais ses anciennes cartes ne sont pas perdues.

## Vérifications techniques

- `tests/fr-archive-watch.test.mjs` : source JustWatch réelle et datée, Disney+/Prime Video, lien direct, ancien relevé présenté comme historique, exclusion réversible.
- `tests/v5_5_fr.sql` : certification de TVmaze 430, compteurs France dans les classements, marché et transferts.
- Le workflow qualité vérifie aussi la syntaxe du SQL combiné et l'intégration des modules.

**Limite :** la migration n'a pas été exécutée automatiquement dans le projet Supabase de production. L'activation exige une exécution manuelle du fichier combiné par le propriétaire du projet.
