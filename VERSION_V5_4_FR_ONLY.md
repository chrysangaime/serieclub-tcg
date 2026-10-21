# SérieClub TCG — V5.4 : seules les séries prouvées en France sont jouables

## La règle retenue

**Une série peut entrer dans le jeu seulement si une source fiable atteste sa diffusion télévisée ou sa mise à disposition en streaming/VOD en France, aujourd'hui ou dans le passé.**

- **Vérifiée France :** présente dans le catalogue jouable, les boosters, le booster Halloween, les résultats de fusion, les nouveaux souhaits et les nouvelles annonces/échanges.
- **À vérifier :** conservée comme référence TVmaze, mais **exclue des nouveaux tirages et du catalogue jouable**. L'absence de preuve ne signifie jamais qu'une diffusion française n'a jamais eu lieu.

Une série peut être américaine, britannique, coréenne ou japonaise : sa nationalité n'est pas le critère. Son éventuelle **diffusion en France** est le critère.

## Sources de validation

L'éligibilité est désormais stockée directement dans `public.series` :
`fr_verified`, `fr_verification_method`, `fr_evidence_url`, `fr_verified_at`.

Trois types de preuve sont reconnus :

1. `editorial_fr_history` : page officielle d'un diffuseur ou service français, vérifiée avec **titre et année**.
2. `tvmaze_fr_origin` : chaîne de diffusion d'origine explicitement localisée en France (`network.country.code === "FR"` ou `webChannel.country.code === "FR"`). Le fait que Netflix soit un service mondial n'est pas, à lui seul, une preuve de disponibilité en France.
3. `tmdb_fr_offer` : présence d'une offre dans `results.FR` de l'API officielle TMDB / JustWatch, après rapprochement prudent du titre et de l'année. Une offre VOD passée suffit : si elle disparaît ensuite, le titre **reste éligible** au titre de sa diffusion historique.

Toutes les sources sont conservées avec leur URL. Aucune supposition du type « la série est célèbre, donc elle a forcément été vue en France » n'est utilisée.

### Première sélection éditoriale sourcée

Lors de l'installation, sont vérifiées par une page officielle française et leur année de lancement :

- *Lost* (2004), *How I Met Your Mother* (2005) et *The X-Files* (1993) : Disney+ France.
- *Stranger Things* (2016), *Dark* (2017), *Better Call Saul* (2015), *The Haunting of Hill House* (2018), *The Haunting of Bly Manor* (2020), *Midnight Mass* (2021) : Netflix France.

Les URL précises se trouvent dans la migration. Des homonymes comme *Lost* (2001) ne sont **pas** validés par erreur.

Ce sont des preuves de diffusion française **à un moment donné**, pas des promesses de disponibilité actuelle.

## Installation indispensable : migration SQL V5.4

Pré-requis : migrations V4/V5 déjà exécutées. Le correctif de rareté V5.3 peut être exécuté avant ou après, indépendamment.

1. Ouvrir **[supabase/game_v5_4_fr.sql](supabase/game_v5_4_fr.sql)**.
2. Copier tout le script dans le [SQL Editor Supabase](https://supabase.com/dashboard/project/anjfidksqbqlaggttdop/sql/new).
3. Exécuter. La migration est transactionnelle : elle sera annulée entièrement en cas d'erreur.
4. Relancer [Synchroniser le catalogue TVmaze](https://github.com/chrysangaime/serieclub-tcg/actions/workflows/sync-catalog.yml) pour attester les séries dont **le diffuseur d'origine est français**.

**Sans la migration**, le nouveau catalogue ne revient PAS automatiquement à toutes les séries du monde : il affiche un message demandant l'activation, pour ne pas réintroduire des titres non vérifiés par inadvertance.

### Contrôles simples Supabase

```sql
SELECT
 COUNT(*) FILTER (WHERE fr_verified AND rarity_source <> 'pending' AND image_url IS NOT NULL) AS jouables_france,
 COUNT(*) FILTER (WHERE NOT fr_verified) AS a_verifier,
 COUNT(*) FILTER (WHERE fr_verified AND fr_verification_method = 'editorial_fr_history') AS sources_edito,
 COUNT(*) FILTER (WHERE fr_verified AND fr_verification_method = 'tvmaze_fr_origin') AS sources_tvmaze,
 COUNT(*) FILTER (WHERE fr_verified AND fr_verification_method = 'tmdb_fr_offer') AS sources_tmdb
FROM public.series;

SELECT name,premiered,rarity,fr_verified,fr_verification_method,fr_evidence_url
FROM public.series
WHERE lower(name) IN ('lost','stranger things','the x-files','how i met your mother')
ORDER BY name,premiered;
```

## Augmenter progressivement le catalogue français

La source TMDB / JustWatch peut ajouter automatiquement les séries de toutes nationalités ayant réellement été disponibles en France.

1. Ajouter dans les secrets GitHub Actions le jeton de lecture **`TMDB_READ_ACCESS_TOKEN`** (ne jamais le mettre dans du JavaScript public). Le secret Supabase existant `SUPABASE_SERVICE_ROLE_KEY` reste nécessaire.
2. Après la V5.4, démarrer le workflow [Actualiser les plateformes de streaming France](https://github.com/chrysangaime/serieclub-tcg/actions/workflows/sync-fr-streaming.yml) ; il valide les titres dont les offres **FR** sont confirmées.
3. Le workflow conserve les preuves de diffusion dans la base de données ; les relevés JustWatch/TMDB servent aussi au bloc « Où regarder en France ? ».

Le catalogue est donc **petit au départ et s'enrichit à mesure que les preuves sont obtenues**. Si le catalogue confirmé contient moins de cinq séries, une ouverture de booster est refusée sans consommation de stock (transaction SQL atomique). Les rangs de rareté dont aucune série française n'est disponible ne peuvent pas être attribués par une fusion.

**Important pour un projet avec publicité ou affiliation :** TMDB précise que son API de développement gratuite s'adresse aux usages non commerciaux ; une utilisation commerciale demande un accord/licence adapté. Consulte les [conditions et FAQ de TMDB](https://developer.themoviedb.org/docs/faq).

## Collections, classement et historique

Les **cartes déjà obtenues restent dans la collection** et ne sont ni supprimées ni échangées contre des crédits. Une carte dont la preuve française manque porte la mention « France à vérifier ».

Le pourcentage d'exploration se calcule **uniquement sur les séries françaises vérifiées**, en excluant les anciennes cartes non certifiées du numérateur. Le rang de rareté officiel de chaque série reste inchangé ; le filtre France n'a aucun impact sur la rareté.

Il n'est plus possible de créer une nouvelle carte, une nouvelle entrée de souhaits, une annonce ou une offre d'échange pour une série non vérifiée. Les transactions déjà ouvertes ne sont pas révoquées automatiquement.

Les pages d'acteurs peuvent encore présenter leur filmographie complète en tant qu'information culturelle issue de TVmaze, mais seules les séries avec preuve française portent le badge **« Dans SérieClub »**.

## Tests et sécurité

`tests/fr-eligibility.test.mjs` vérifie l'interface et la préservation des anciennes cartes. `tests/v5_4_fr.sql` vérifie les filtres **dans PostgreSQL**, y compris boosters, Halloween, fusions, souhaits, historique et transactions.

Le catalogue ne bascule pas vers une liste mondiale si un appel échoue : le filtre est **fail-closed**. Les vérifications de diffusion sont effectuées par une migration et des workflows côté serveur, sans exposer la clé Supabase ni le jeton TMDB dans le navigateur.
