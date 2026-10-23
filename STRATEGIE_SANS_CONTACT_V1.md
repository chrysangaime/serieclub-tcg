# Epizora TCG — stratégie « sans contact TVmaze/TMDB » (V1.0)

**23 octobre 2026 · nom de travail Epizora TCG · aucune offre payante activée.**

## Décisions

1. **TVmaze est conservé** comme source principale : sa [documentation API](https://www.tvmaze.com/api) autorise l'usage de ses données à toute fin sous licence CC BY-SA avec attribution/ShareAlike, et autorise le hotlink de ses images. Une [réponse publique de l'administrateur TVmaze](https://www.tvmaze.com/threads/6552/using-posters-and-data-from-tvmaze-api-on-a-commercial-website) confirme les données commerciales et conseille les liens directs pour les affiches, à propos d'un site comportant de la publicité et de l'affiliation. Il n'est pas nécessaire de leur écrire pour exploiter les permissions déjà rendues publiques. Les droits sous-jacents des photographies restent distincts : ne pas revendiquer une immunité générale, offrir un canal de retrait et prévoir une illustration de remplacement.
2. **TMDB est maintenu uniquement comme source historique et outil de prototype sans revenu**, pas comme source commerciale. Les [conditions officielles](https://www.themoviedb.org/api-terms-of-use) exigent un accord écrit pour toute utilisation de son contenu contribuant à générer des revenus. Si l'on ne souhaite pas les contacter, **la seule voie prudente vers un jeu monétisé consiste à supprimer la dépendance TMDB, ses données dérivées et caches utilisés commercialement**. Une simple mention d'attribution n'y remédie pas.
3. **Les trois actualisations automatiques TMDB sont suspendues** dans GitHub Actions : `sync-fr-streaming.yml`, `expand-fr-catalog.yml` et `sync-fr-cast.yml`. Le déclenchement manuel reste réservé aux essais non commerciaux. L'import TVmaze demeure distinct.
4. **L'accès anticipé reste sans paiement**. Les boutiques et crédits virtuels historiques continuent de fonctionner mais **ne doivent pas être monétisés avant la migration de données décrite ci-dessous**.
5. **Renommage de marque** en **Epizora TCG** (nom de travail) pour distinguer le jeu de la chaîne SérieClub. Conserver les noms techniques et identifiants SQL de l'ancien dépôt afin de préserver l'historique et les comptes. Faire un contrôle INPI/EUIPO et du domaine avant publicité. La recherche sur le Web ne suffit pas à garantir la disponibilité juridique.

## Plan de remplacement de TMDB sans demande de licence

**Lot 1 — Sources France** : identifier les séries françaises via `network.country.code='FR'` / `webChannel.country.code='FR'` provenant de TVmaze ; pour les autres, consolider les preuves depuis les sources officielles des éditeurs et diffuseurs publiant explicitement les informations nécessaires, ou des sources ouvertes compatibles avec un usage commercial. Attention : avoir été disponible en France ne prouve pas la disponibilité *actuelle*.

**Lot 2 — Où regarder** : en l'absence de données d'offres dont la licence commerciale est établie, montrer « Vérifier où regarder en France » et un **lien sortant vers JustWatch France**, plutôt que reproduire des listes TMDB/JustWatch ou affirmer « Disponible sur X » sans autorisation ou preuve. Les liens ne sont pas une licence de réutilisation des données JustWatch.

**Lot 3 — Catalogue et packs** : passer en revue les `fr_verified` issus de `tmdb_fr_offer`, le cache `data/watch-fr.json`, les distributions `data/cast-fr.json` et les adhésions aux boosters SVOD liées à ces résultats. Ne pas republier ces dérivés pour générer des revenus sans droits. Reconstruire le sous-ensemble admissible à partir de TVmaze et de nouvelles sources compatibles, avec migration contrôlée qui **préserve l'historique des cartes des joueurs** et archive les anciennes preuves plutôt que supprimer leurs comptes.

**Lot 4 — UI et marketing** : privilégier des noms descriptifs de bouquets plutôt que des boosters pouvant laisser croire à un produit Netflix/Disney officiel ; maintenir les pictogrammes créés par le jeu. Pour un usage publicitaire, limiter les posters à ce que la permission ou le mécanisme de retrait peut effectivement couvrir. Les captures marketing peuvent présenter uniquement des graphismes originaux.

**Lot 5 — Bascule commerciale** : uniquement lorsque les tests confirment zéro requête ni charge de données TMDB utilisées par le service commercial, zéro source dérivée non autorisée, les mécanismes de droits et de retrait opérationnels, et des conditions d'hébergement/CGU/RGPD/paiements validées.

## Point de comparaison : Ciné TCG

Le fait qu'un autre jeu se lance ne prouve pas l'existence ou l'absence de ses accords de licence. [La page de crédits de Ciné TCG](https://cinetcg.com/credits) indique le recours à des créations graphiques et à une image de remplacement lorsque la photographie n'est pas libre. Cette pratique fournit une alternative de conception, **pas une permission de reproduire une affiche tierce**.

## Statut actuel et honnêteté du constat

- [x] Nouveau nom visible en V1 et absence de vente réelle maintenue.
- [x] Import automatique TMDB interrompu (trois workflows).
- [x] Attribution TVmaze présente, logos de prestataires TMDB déjà masqués.
- [ ] Nettoyage des caches et preuves dérivées de TMDB, sans perte de progression.
- [ ] Remplacement des informations françaises actuelles et des packs par des sources permettant une exploitation commerciale.
- [ ] Contact direct droits d'auteur accessible sans compte et moyens de masquer rapidement une image partout.
- [ ] Recherche d'antériorités INPI/EUIPO et vérification du domaine du nouveau nom.
- [ ] CGU/CGV, RGPD, hébergement commercial et tests paiements avant monétisation.

**Décision :** travailler sans écrire à TVmaze ni TMDB est réaliste pour la poursuite de la V1 gratuite ; pour les revenus, garder TVmaze sous sa licence publique et **renoncer à TMDB**, sauf changement de décision. Aucun accord individuel n'est présenté comme acquis.
