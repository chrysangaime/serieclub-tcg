# V1.0 — Intégration Streaming Availability API sans TMDB

**23 octobre 2026.** Le nom du jeu n'est pas arrêté ; l'ancienne marque reste une étiquette de préproduction. Aucun compte joueur, carte, portefeuille ou progression n'est modifié par le nouveau connecteur. Aucun paiement en euros n'est activé.

## Ce qui fonctionne

- **TVmaze** reste la référence des séries et de leurs identifiants numériques ; son champ `externals.imdb` est la passerelle entre sources.
- **Movie of the Night / Streaming Availability API v4** fournit uniquement les options de streaming françaises, avec paramètres `?country=fr&output_language=fr`.
- La synchronisation s'effectue **exclusivement côté GitHub Actions** (`scripts/sync-independent-streaming.mjs`, `.github/workflows/sync-independent-streaming.yml`). La clé API n'est **jamais** transmise au navigateur, au dépôt, ni incluse dans un fichier public. Les posters, logos et distributions fournis par l'API ne sont pas importés.
- La vérification des deux identifiants IMDb et du type `series` réduit les erreurs de correspondance entre séries homonymes.
- Le cache `public.fr_streaming_cache` est **privé**, protégé par RLS, sans permission `SELECT` pour `anon` ou `authenticated`. Le budget interne est suivi dans `public.fr_streaming_api_usage` (également privé).
- Une Edge Function `fr-streaming` a été déployée sur Supabase ; elle sert un seul titre à la fois et n'appelle jamais l'API commerciale. Les origines web sont restreintes à GitHub Pages et au serveur local de recette ; le futur domaine nécessitera un réglage explicite.
- L'interface `v5/fr-watch.js` affiche « Disponible sur… » **uniquement** pour une disponibilité validée, française, datée et non expirée. À défaut, elle renvoie vers JustWatch France sans réutiliser son catalogue.
- Les liens sortants et services sont filtrés par une liste blanche ; aucun visuel de marque externe n'est nécessaire.

## Action requise une seule fois pour démarrer des relevés réels

1. Ouvrir **https://developers.movieofthenight.com/**, créer un compte avec le **plan gratuit** (la documentation précise qu'aucune carte bancaire n'est demandée) et obtenir une clé **API v4 directe**. Ne pas utiliser RapidAPI sans raison : les coûts et la configuration y diffèrent.
2. Dans le dépôt GitHub privé à administrer, ouvrir **Settings → Secrets and variables → Actions → New repository secret**. Créer **`STREAMING_AVAILABILITY_API_KEY`** avec cette clé. Ne jamais l'insérer dans le code, dans un e-mail ou dans la conversation.
3. Lancer manuellement **Actions → « Disponibilités France sans TMDB (quota plafonné) » → Run workflow**, ou laisser tourner sa planification quotidienne (05:12 UTC). Tant que la clé n'est pas renseignée, le programme s'arrête sans appel réseau à ce fournisseur et sans dépense.
4. Contrôler les comptes-rendus GitHub Actions et la présence d'offres dans les fiches du jeu. La passerelle renvoie « aucune offre vérifiée » tant que le cache est vide.

**Quota :** la synchronisation est limitée par défaut à **6 appels par jour et 180 par mois**, et n'effectue aucun paiement. Ces limites sont des précautions internes et non une affirmation sur le quota exact du compte choisi. Vérifier les limites dans la console du fournisseur avant de les modifier. Les requêtes infructueuses ou échouées sont également comptabilisées.

## Données françaises et cartes historiques

À la date de l'audit initial :
- 81 862 séries TVmaze importées ;
- 1 650 séries prouvées françaises par l'origine TVmaze ;
- 984 séries initialement validées avec une preuve `tmdb_fr_offer` ;
- 6 séries avec preuve éditoriale indépendante ;
- 907 cartes en base, dont 55 sur 51 titres marqués `tmdb_fr_offer`.

L'outil privilégie les séries déjà possédées, puis les anciennes preuves TMDB. Lorsqu'une correspondance IMDb est exacte et qu'une disponibilité française réelle est confirmée, la méthode `tmdb_fr_offer` est remplacée **pour cette série uniquement** par `streaming_availability_fr`. Le statut de vérification France reste vrai et les cartes ne bougent pas.

En l'absence de disponibilité, d'identifiant IMDb, de quota, ou en cas d'erreur, l'ancienne preuve n'est pas automatiquement supprimée. Cela évite de masquer brutalement des cartes. **L'exploitation commerciale doit attendre l'extinction des preuves TMDB restantes**, une réévaluation de l'éligibilité future et la remise à plat des boosters SVOD dont les sélections sont actuellement historiques.

## Cadre contractuel et crédit

Conditions source : https://github.com/movieofthenight/streaming-availability-api/blob/main/TERMS.md

La licence publiée autorise l'utilisation commerciale des informations de disponibilité par les utilisateurs du site, avec attribution visible. Elle interdit de revendre ou offrir la base de disponibilité comme base de données ou API à d'autres entreprises. Le cache est donc privé et seul un affichage ponctuel et limité d'offres par fiche est fourni ; une revue des termes contractuels exacts du compte utilisé reste nécessaire avant le lancement payant.

Crédit à conserver sur la page « Sources et droits » : **Streaming Availability API par Movie of the Night**, avec lien vers **https://www.movieofthenight.com/about/api**. N'utiliser ni images, ni logos, ni posters renvoyés par cette API. Les affiches actuelles TVmaze ont leur propre régime de droits, à évaluer indépendamment.

## Vérifications

GitHub Actions : `npm run check`, `npm test`, recette navigateur et synchronisation de preuves.

SQL en lecture seule :
```sql
select count(*) as titres_mis_en_cache
from public.fr_streaming_cache;

select fr_verification_method,count(*) as series
from public.series
where fr_verified is true
group by fr_verification_method
order by series desc;

select request_month,count(*) as requetes
from public.fr_streaming_api_usage
group by request_month
order by request_month desc;
```

Les deux nouvelles tables ont RLS activé sans accès direct `anon`/`authenticated`. La fonction ne renvoie aucun profil joueur. Toute évolution d'origine ou de domaine doit être suivie d'un test de sécurité.

## Conditions encore nécessaires avant commercialisation

- Alimenter réellement le cache avec une clé et mesurer la couverture France de titres populaires ;
- Corriger les séries toujours liées à une preuve TMDB, **sans supprimer les cartes** ;
- Reconstituer la composition des boosters SVOD avec les nouvelles preuves ; leurs offres actuelles sont des sélections historiques non officielles ;
- Vérifier droits des affiches et photographies, marques des plateformes, futur nom et domaine, identité de l'éditeur, RGPD, CGU/CGV et hébergement commercial ;
- Prévoir un moyen direct et confidentiel de signalement/retrait des images, accessible sans compte.

**Statut : raccordement technique réalisé ; données réelles à activer après obtention de la clé. Pas de lancement payant.**
