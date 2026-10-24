# V1 — Plan de reconstruction contrôlée (24 octobre 2026)

Statut : **préproduction**. L'utilisateur autorise expressément la perte de sa collection de test si cela contribue à repartir sur une base saine. Cette autorisation ne vaut PAS consentement à effacer les autres comptes.

## Principes impératifs

1. D'abord construire et tester le nouveau catalogue, ensuite seulement remettre à zéro la progression du propriétaire identifié.
2. Aucun DELETE global sur `player_cards`, `player_wallets`, `profiles` ou `auth.users`.
3. Séparer l'éligibilité aux nouveaux tirages de l'affichage des collections historiques. Les séries dont la seule justification est `tmdb_fr_offer` ne doivent pas entrer dans le catalogue commercial.
4. Une origine française TVmaze n'est pas une licence sur les affiches, ni la preuve d'une offre SVOD en cours. La distinction entre droits des métadonnées et droits photographiques reste obligatoire.
5. Conserver les achats en euros désactivés et la V1 non indexée tant que la conformité juridique, le nom et les tests de paiement ne sont pas achevés.

## Diagnostic de référence

- 81 862 fiches séries TVmaze ; 2 640 références marquées comme françaises.
- Preuves France : 1 650 `tvmaze_fr_origin`, 984 `tmdb_fr_offer`, 6 `editorial_fr_history`.
- 389 titres de boosters associés à `tmdb_fr_offer` et 74 cartes possédées sur ces titres lors de l'audit.
- Les moteurs `pick_official_pack` et `buy_credit_booster` utilisent `fr_verified`, condition insuffisante pour une ouverture commerciale sans TMDB.
- Movie of the Night : 30 relevés non expirés, dont 28 avec des offres lors du précédent contrôle.

## Reconstruction sans perte de contrôle

### Phase A — catalogue autorisé

- Créer une liste d'autorisation des titres et saisons avec `source_id`, `evidence_url`, `evidence_type`, `last_verified_at`, `rights_status`, `eligible_for_draw`.
- Source française indépendante vérifiée requise pour chaque titre avant tirage.
- Ne jamais considérer la présence d'un lien TVmaze/CDN comme preuve de droit de reproduction d'un poster.
- Prévoir un visuel d'origine propre ou dûment autorisé quand le droit d'image n'est pas établi.
- Reconstituer les packs SVOD uniquement à partir d'offres françaises non expirées, pas des anciennes appartenances dérivées de TMDB.

### Phase B — moteur serveur

- Faire respecter cette liste côté PostgreSQL dans les **trois** circuits : packs gratuits, Halloween et packs à crédits. Ne pas compter sur un filtre uniquement dans l'interface.
- Tester l'absence de titres exclus, les cinq cartes distinctes, la rareté, les saisons, le blocage si le vivier est insuffisant et la transaction atomique avec portefeuille inchangé en cas d'échec.
- Contrôler les RPC SECURITY DEFINER et les permissions effectives des visiteurs.

### Phase C — remise à zéro optionnelle

- Compte à identifier depuis la session authentifiée du propriétaire, jamais par intuition à partir du pseudo.
- Capturer un état avant/après (cartes, soldes virtuels, transactions, albums, échanges et classement) sans exposer publiquement des données personnelles.
- Fermer les échanges et annonces impliquant les cartes avant toute suppression.
- Effectuer une opération transactionnelle limitée au compte autorisé, avec contrôle des dépendances FK, sauvegarde et mécanisme de reprise.
- Ne pas effacer les comptes ou progressions de tiers.
- Ne pas déclencher la remise à zéro tant que le nouveau tirage de cinq cartes n'est pas validé.

## Sortie de chantier

La V1 est publiable seulement après : absence de dépendances commerciales TMDB, licences des médias vérifiées, identité éditeur et contact de retrait, RGPD/CGU/CGV, hébergement autorisé, sécurité et recette fonctionnelle terminées. Ne jamais annoncer « 100 % conforme » sur la seule réussite technique.
