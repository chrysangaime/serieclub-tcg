# SériesClubTCG — stratégie « sans contact TVmaze/TMDB » (V1.0)

**23 octobre 2026 · aucun nouveau nom approuvé · V1 non commerciale. Le précédent nom est restauré provisoirement dans l'interface, sans validation juridique.**

## Décisions

1. **TVmaze est conservé** comme source principale : sa [documentation API](https://www.tvmaze.com/api) autorise l'usage de ses données à toute fin sous licence CC BY-SA avec attribution/ShareAlike, et autorise le hotlink de ses images. Une [réponse publique de l'administrateur TVmaze](https://www.tvmaze.com/threads/6552/using-posters-and-data-from-tvmaze-api-on-a-commercial-website) confirme les données commerciales et conseille les liens directs pour les affiches, à propos d'un site comportant de la publicité et de l'affiliation. Il n'est pas nécessaire de leur écrire pour exploiter les permissions déjà rendues publiques. Les droits sous-jacents des photographies restent distincts : ne pas revendiquer une immunité générale, offrir un canal de retrait et prévoir une illustration de remplacement.
2. **TMDB est maintenu uniquement comme source historique et outil de prototype sans revenu**, pas comme source commerciale. Les [conditions officielles](https://www.themoviedb.org/api-terms-of-use) exigent un accord écrit pour toute utilisation de son contenu contribuant à générer des revenus. Si l'on ne souhaite pas les contacter, **la seule voie prudente vers un jeu monétisé consiste à supprimer la dépendance TMDB, ses données dérivées et caches utilisés commercialement**. Une simple mention d'attribution n'y remédie pas.
3. **Les trois workflows TMDB ont été supprimés du dépôt actif** : `sync-fr-streaming.yml`, `expand-fr-catalog.yml` et `sync-fr-cast.yml`. Les deux caches publics `data/watch-fr.json` et `data/cast-fr.json` sont également retirés. Les scripts historiques restent dans Git pour traçabilité, sans workflow actif. L'import TVmaze reste fonctionnel.
4. **L'accès anticipé reste sans paiement**. Les boutiques et crédits virtuels historiques continuent de fonctionner mais **ne doivent pas être monétisés avant la migration de données décrite ci-dessous**.
5. **Nom commercial : décision en attente de l'utilisateur.** La proposition de changement de nom effectuée sans approbation a été annulée ; l'ancien libellé est restauré uniquement dans la V1 non publiée commercialement. Ne choisir ni déposer de nouveau nom sans validation de l'utilisateur puis recherche d'antériorités INPI/EUIPO. Conserver les identifiants techniques et les comptes.

## Plan de remplacement de TMDB sans demande de licence

**Lot 1 — Sources France** : identifier les séries françaises via `network.country.code='FR'` / `webChannel.country.code='FR'` provenant de TVmaze ; pour les autres, consolider les preuves depuis les sources officielles des éditeurs et diffuseurs publiant explicitement les informations nécessaires, ou des sources ouvertes compatibles avec un usage commercial. Attention : avoir été disponible en France ne prouve pas la disponibilité *actuelle*.

**Lot 2 — Où regarder (RÉALISÉ)** : le navigateur n'utilise plus de cache TMDB ou JustWatch, ni d'images TMDB du casting. Il affiche « Où regarder en France ? » et un lien vers la page générale de JustWatch France, sans liste d'offres ni confirmation commerciale non sourcée. Le casting provient de l'API TVmaze. Un lien n'est pas une licence de réutilisation des données JustWatch.

**Lot 3 — Catalogue et packs** : passer en revue les `fr_verified` issus de `tmdb_fr_offer` ainsi que les adhésions aux boosters SVOD liées à ces résultats. Ne pas republier ces dérivés pour générer des revenus sans droits. Reconstruire le sous-ensemble admissible à partir de TVmaze et de nouvelles sources compatibles, avec migration contrôlée qui **préserve l'historique des cartes des joueurs** et archive les anciennes preuves plutôt que supprimer leurs comptes.

**Lot 4 — UI et marketing** : privilégier des noms descriptifs de bouquets plutôt que des boosters pouvant laisser croire à un produit Netflix/Disney officiel ; maintenir les pictogrammes créés par le jeu. Pour un usage publicitaire, limiter les posters à ce que la permission ou le mécanisme de retrait peut effectivement couvrir. Les captures marketing peuvent présenter uniquement des graphismes originaux.

**Lot 5 — Bascule commerciale** : uniquement lorsque les tests confirment zéro requête ni charge de données TMDB utilisées par le service commercial, zéro source dérivée non autorisée, les mécanismes de droits et de retrait opérationnels, et des conditions d'hébergement/CGU/RGPD/paiements validées.

## Point de comparaison : Ciné TCG

Le fait qu'un autre jeu se lance ne prouve pas l'existence ou l'absence de ses accords de licence. [La page de crédits de Ciné TCG](https://cinetcg.com/credits) indique le recours à des créations graphiques et à une image de remplacement lorsque la photographie n'est pas libre. Cette pratique fournit une alternative de conception, **pas une permission de reproduire une affiche tierce**.

## Statut actuel et honnêteté du constat

- [x] Nom imposé sans accord annulé ; ancien libellé maintenu uniquement pour la préproduction, et aucun paiement live autorisé.
- [x] Imports TMDB retirés de GitHub Actions (trois workflows) ; fichiers publics `data/watch-fr.json` et `data/cast-fr.json` supprimés.
- [x] Attribution TVmaze présente, logos de prestataires TMDB déjà masqués.
- [x] Frontend sans chargement de cache TMDB et sans affichage de portraits TMDB ; attribution TVmaze et lien de consultation JustWatch conservés.
- [ ] Revalidation/purge des **preuves dans Supabase** : 984 séries marquées `tmdb_fr_offer` au démarrage, sans toucher aux cartes des joueurs. Le script `scripts/reverify-tvmaze-origin.mjs` et son workflow GitHub recoupent indépendamment les diffuseurs FR TVmaze sur des lots de séries, avec rapport CSV et sans suppression.
- [ ] Remplacement des informations françaises actuelles et des packs par des sources permettant une exploitation commerciale.
- [ ] Contact direct droits d'auteur accessible sans compte et moyens de masquer rapidement une image partout.
- [ ] Recherche d'antériorités INPI/EUIPO et vérification du domaine du nouveau nom.
- [ ] CGU/CGV, RGPD, hébergement commercial et tests paiements avant monétisation.

**Décision :** travailler sans écrire à TVmaze ni TMDB est réaliste pour la poursuite de la V1 gratuite ; pour les revenus, garder TVmaze sous sa licence publique et **renoncer à TMDB**, sauf changement de décision. Aucun accord individuel n'est présenté comme acquis.

## Résultat de l'audit chiffré (production, 23/10/2026)

- 81 862 séries TVmaze ; 2 640 validées pour le jeu France.
- 1 650 preuves `tvmaze_fr_origin`, 984 preuves `tmdb_fr_offer`, 6 preuves `editorial_fr_history`.
- 907 cartes enregistrées, dont 55 cartes sur 51 séries validées via TMDB. Les autres cartes ne sont pas à effacer ; certaines séries anciennes ne sont pas actuellement certifiées France.
- **Aucune migration ne doit passer aveuglément les 984 séries à `fr_verified=false` sans prévoir d'abord un archivage d'éligibilité et l'affichage de la collection historique.**
- La diffusion TVmaze en France ne constitue pas automatiquement une preuve de disponibilité actuelle sur un abonnement. Les droits de JustWatch pour l'API de disponibilités nécessitent aussi un accord de partenaire ; **un lien de navigation vers son site est différent de la reprise de ses données**.
- Alternative à explorer : propriétés structurées Wikidata sous CC0 et pages officielles de diffuseurs, avec vérification du titre, identifiant TVmaze, pays, période, preuve et statut France.

## Points de prudence et poursuite sans perte de progression

- **Aucune licence TMDB commerciale n'est obtenue** ; le fait de ne plus charger de caches TMDB dans l'interface est seulement la première étape. Les **984 preuves TMDB** historiques existent encore dans la base tant que les séries ne sont pas revalidées par une source indépendante. Les sélections de boosters SVOD historiques doivent également être refaites avant monétisation.
- Le workflow [Revalider preuves France par TVmaze](.github/workflows/reverify-tvmaze-origin.yml) inspecte d'abord les preuves des séries possédées. Il ne requalifie que les diffusions **d'origine française** avec source TVmaze et identifiant correspondant, ne touche à aucune carte ou portefeuille ; les séries étrangères diffusées *ensuite* en France requièrent des preuves officielles de diffusion ou une vérification éditoriale indépendante.
- **Ne pas supprimer ni masquer brutalement les cartes déjà attribuées** : le moteur existant tient compte du champ `fr_verified` et cacherait certaines cartes. L'éligibilité future et l'historique du joueur devront être séparés dans une migration testée avant la désactivation des anciennes preuves.
