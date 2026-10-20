# SérieClub TCG V5 — Une série = une rareté, sans exception de tirage

Cette version **remplace** la logique où la même série pouvait être tirée en Commune, Rare ou Mythique au hasard.

## Règle principale

**Chaque série possède un seul rang officiel, enregistré dans `public.series.rarity`.** Il est partagé par toutes les cartes et tous les collectionneurs. Un exemplaire de Lost ne peut donc pas être Commune quand un autre exemplaire de Lost est Légendaire.

La base de données impose ce rang par déclencheur sur `public.player_cards`, y compris lors des imports, fusions et anciennes RPC. La rareté **ne dépend pas de la chance au moment où une carte est créée**.

Les cinq cartes d'un booster sont cinq séries distinctes, sélectionnées aléatoirement parmi les séries **déjà classées**. Les catégories sont tirées selon des poids de disponibilité, mais une fois la série choisie, sa rareté est entièrement déterminée par le catalogue.

## Incontournables validés

| Série | Rang officiel V5 |
|---|---|
| Lost (2004) | **Légendaire** |
| Stranger Things (2016) | **Légendaire** |
| The X-Files / X-Files (1993) | **Légendaire** |

Le rang « Mythique » n'a pas été attribué arbitrairement à Stranger Things : tu avais demandé **au moins Légendaire**, et nous conservons exactement ce plancher pour les trois.

Le catalogue comporte toujours sept rangs : Commune, Peu commune, Rare, Épique, Légendaire, Mythique et Unique.

## Popularité : données accessibles, pas d'audience inventée

Pour les autres séries, la première classification repose sur la valeur `weight` fournie par TVmaze. Cette donnée est un **indicateur relatif de popularité TVmaze**, et **non** une audience TV consolidée entre Netflix, les chaînes et les différentes années. Le script récupère également la note moyenne `rating.average` à titre informatif, mais ne la traite pas comme une audience.

Le barème initial de popularité est transparent :

| TVmaze weight | Rareté de la série |
|---|---|
| Inférieure à 40 | Commune |
| 40 à moins de 60 | Peu commune |
| 60 à moins de 75 | Rare |
| 75 à moins de 87 | Épique |
| 87 à moins de 95 | Légendaire |
| 95 à moins de 99 | Mythique |
| 99 et plus | Unique |

Ce sont des seuils **de conception V5**, pas des classifications déjà validées sur l'ensemble des séries. Ils pourront être recalibrés à partir de la distribution réelle des scores après la synchronisation. **Une fois classée, une série conserve son rang malgré les fluctuations du score TVmaze**. Une correction ultérieure est possible uniquement par décision éditoriale / migration.

Les séries sans score sont repérées `pending` / « À classer » et **ne sortent plus dans les nouveaux boosters** jusqu'à synchronisation, sauf les trois exceptions éditoriales.

## Activation nécessaire — les modifications SQL ne sont pas exécutées depuis GitHub

**Prérequis :** avoir exécuté toutes les migrations jusqu'à `supabase/game_v4.sql`.

1. Dans le SQL Editor Supabase du projet SérieClub, exécuter le contenu intégral de **[supabase/game_v5.sql](supabase/game_v5.sql)**.
2. Lancer ensuite manuellement le workflow GitHub **[Synchroniser le catalogue TVmaze](https://github.com/chrysangaime/serieclub-tcg/actions/workflows/sync-catalog.yml)** avec le bouton « Run workflow » afin de renseigner `popularity_weight` et d'attribuer les rangs aux titres encore en attente.
3. Recharger le navigateur et vérifier le classement dans Catalogue et Collection.

**Précaution :** l'activation normalise la rareté des anciennes cartes. Les annonces et propositions d'échange encore ouvertes peuvent être annulées pour empêcher des transactions sur un ancien rang devenu incorrect. Les copies ne sont pas supprimées, et les crédits restent inchangés.

### Requête de contrôle Supabase après synchronisation

```sql
-- Contrôler quelques séries et leur unique rareté officielle.
select id,name,premiered,rarity,rarity_source,popularity_weight
from public.series
where lower(name) in ('lost','stranger things','the x-files','x-files')
order by premiered;

-- Une série ne doit jamais avoir plusieurs raretés d'exemplaires.
select c.series_id,s.name,count(distinct c.rarity) as variantes,
       min(c.rarity) as rang_des_cartes,s.rarity as rang_officiel
from public.player_cards c
join public.series s on s.id=c.series_id
group by c.series_id,s.name,s.rarity
having count(distinct c.rarity)<>1 or min(c.rarity)<>s.rarity;
```

La deuxième requête doit retourner **zéro ligne**.

## Fusions et boosters

- Le booster classique sélectionne cinq séries possédant un rang connu.
- Le booster Halloween fait de même, avec une série horreur/thriller au minimum, uniquement en octobre.
- La fusion de dix cartes de même rang permet de recevoir une **autre série du rang immédiatement supérieur**. Il ne peut pas créer une version « Rare » d'une série classée Commune.
- Si le catalogue ne contient pas de série du rang supérieur, la fusion est refusée sans consommer les cartes.

## Les fiches aussi ont été corrigées

La V5 conserve les fiches de séries **compactes** et réintroduit les **petites photos** dans la distribution, la recherche d'acteurs et leur filmographie, avec des miniatures d'environ 30 px. Aucune grande grille de posters ne remplace les listes.

Les tests CI `.github/workflows/quality.yml` contiennent des vérifications JavaScript et un scénario PostgreSQL `tests/v5_rarity.sql`. Tant que l'exécution de ces tests et une vérification de production ne sont pas confirmées, il ne faut pas les considérer comme une recette de production réussie.
