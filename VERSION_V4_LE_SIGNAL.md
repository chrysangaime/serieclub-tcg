# SérieClub TCG — V4.1 « Le Signal »

## Installation en une seule opération

**Prérequis déjà présents :** `schema.sql`, `game.sql`, `game_v2.sql` et `game_v3.sql` ont été exécutés dans le projet Supabase.

Ouvrir **[supabase/game_v4.sql](supabase/game_v4.sql)** en cliquant sur **Raw** dans GitHub, copier tout le script et l'exécuter dans **Supabase > SQL Editor > New query > Run**.

La migration est enveloppée dans une transaction SQL : si une instruction échoue, les changements de cette exécution sont annulés. Elle est réexécutable grâce aux `IF NOT EXISTS`, politiques et fonctions remplacées.

Aucune modification des clés Supabase ni des secrets GitHub n'est requise. **Ne partager aucune clé service_role.**

**Site :** https://chrysangaime.github.io/serieclub-tcg/

**Vérifications automatiques :** https://github.com/chrysangaime/serieclub-tcg/actions

## Ce qui a été développé

### Le Comptoir — marché et échanges sécurisés

- Vente d'une carte non protégée pour un prix de 10 à 50 000 crédits virtuels.
- Maximum de 12 annonces actives par joueur.
- Achats atomiques : transfert de la carte, débit du portefeuille de l'acheteur, crédit du vendeur et trace comptable dans la même transaction.
- Retrait d'annonce.
- Proposition d'échange carte contre carte, avec réservation de l'exemplaire proposé.
- Accepter, refuser ou retirer une proposition ; les autres propositions sont libérées si l'annonce est clôturée.
- Une carte en vente ou réservée ne peut pas être simultanément fusionnée, protégée ni engagée dans une autre opération.
- Les inventaires privés des autres joueurs restent inaccessibles ; seule la carte explicitement mise en vente est présentée publiquement.

**Limite :** ce ne sont que des crédits virtuels du jeu. Pas d'argent réel, pas d'achat de crédits, pas d'enchères.

### Le Signal — communauté

- Annuaire des pseudonymes avec le nombre de cartes et d'abonnés.
- Biographie publique de 160 caractères et genre préféré, éditables depuis le profil.
- Suivre/se désabonner d'autres joueurs (100 abonnements au maximum).
- Pas de consultation des cartes privées d'autrui.

**Limite :** messagerie privée, forums, modération et notifications automatiques ne sont pas encore disponibles.

### Missions — progression authentifiée

- « Le premier épisode » : ouvrir 1 paquet dans la journée et réclamer 35 crédits.
- « La trilogie du soir » : ouvrir 3 paquets dans la journée et réclamer 100 crédits.
- Comptage fondé sur les transactions historiques serveur ; une même récompense ne peut être réclamée deux fois.
- Date de réinitialisation selon le fuseau **Europe/Paris**.
- Les missions n'exigent pas de paiement et n'altèrent pas les chances de tirage.

### Mes Saisons — albums personnalisés

- Jusqu'à 20 albums par joueur, 100 cartes par album.
- Nom, courte description, statut public ou privé à la création.
- Ajout/retrait de ses propres cartes, suppression d'un album.
- Consultation des albums rendus publics par leur créateur.
- Albums automatiques par genre conservés.
- Mettre une carte dans un album ne détruit ni ne transfère son exemplaire.

### Identité visuelle

- Navigation organisée autour du parcours du sériephile : Paquets, Collection, Mes Saisons, Catalogue, Souhaits, Le Comptoir, Le Signal, Jeux & défis, Missions, Fusions, Classement, Profil, Paramètres.
- Modules Première et Parrainage non activés retirés du menu principal plutôt que de présenter des rubriques incomplètes.
- Univers bleu nuit / pétrole / turquoise et saison Halloween prune/cuivre conservés.

## Recette fonctionnelle après migration

1. Avec ton compte principal, ouvrir Paquets, Collection, Le Comptoir, Mes Saisons, Le Signal et Missions.
2. Mettre en vente une carte Commune non protégée, constater son apparition dans le marché, puis retirer l'annonce.
3. Créer un album privé, ajouter une carte, l'ouvrir puis la retirer. Créer ensuite un album public et vérifier qu'il apparaît parmi les saisons partagées.
4. Dans Profil, renseigner une courte biographie et un genre préféré ; vérifier leur affichage dans Le Signal.
5. Ouvrir un paquet, contrôler l'incrément des missions du jour, puis réclamer la première récompense.
6. **Avec un second compte de test**, vérifier un achat à 100 crédits, les deux soldes et l'unique propriétaire de la carte. Vérifier également une proposition d'échange, son acceptation puis les nouveaux propriétaires.
7. Vérifier les interfaces sur mobile et les contrôles de syntaxe sur GitHub Actions.

Les tests automatiques `.github/workflows/quality.yml` prévoient également un serveur PostgreSQL 16 éphémère, l'installation réelle des migrations et les vérifications des achats/échanges/quêtes. Ils ne remplacent pas une recette métier sur le Supabase de production.

## Sécurité et limites actuelles

Les écritures de cartes et de crédits sont exécutées uniquement par des fonctions SQL avec vérification de `auth.uid()`. Les tables de marché et de suivi utilisent des règles RLS.

Les enchères, la messagerie, le paiement Première, la modération de contenu, les pages légales exhaustives et la mise en place d'un véritable programme d'affiliation doivent encore être développés ou validés avant une ouverture publique à grande échelle.

Les liens de plateformes et de marchandises sont actuellement informatifs et ne constituent pas des garanties de disponibilité de streaming ni des partenariats. Les affiches restent soumises aux droits de leurs titulaires.

**Important :** l'identifiant d'affiliation Amazon n'est pas configuré et aucun gain commercial n'est actuellement activé.
