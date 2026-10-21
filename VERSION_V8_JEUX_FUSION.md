# SérieClub TCG V8 — Correctifs de jeux, booster et fusion

## 1. Correction fermeture du paquet découvert

La croix du résumé « Ta nouvelle collection » (voir capture mobile du 21/10/2026) est désormais :
- traitée directement sur la fenêtre modale, y compris après changement de carte ;
- prioritaire sur le contenu et les animations (z-index élevé) ;
- agrandie à une zone tactile de **48 × 48 px** ;
- compatible Échap et clic en dehors de la modale.

La fermeture ne supprime jamais les cartes : elles sont déjà enregistrées côté serveur.

## 2. Quatre jeux, désormais différents

- **Détail mystère** (anciennement Affiche mystère) : une **zone nette et très recadrée** de l'affiche. Le joueur doit déduire la série de ce détail.
- **Mosaïque pixel** : l'affiche entière est physiquement réduite à 10 % de résolution puis agrandie en **vrais gros pixels**, avec interpolation nearest-neighbor. Ce n'est plus un simple flou.
- **Chrono séries** : identifier la plus ancienne des séries proposées.
- **L'année culte** : associer une année à la bonne série.

Chaque partie comporte cinq questions, les choix sont sélectionnés parmi les séries vérifiées pour la France. Le service qui attribue des crédits conserve les bonnes réponses dans PostgreSQL et jamais dans le navigateur.

## 3. Quota : une partie par jeu toutes les 24 heures

La migration `supabase/game_v7_1_24h.sql` remplace le plafond global V7 de **trois parties par journée calendaire** par :
- **une partie récompensée / mode / période glissante de 24 heures** ;
- jusqu'à quatre défis différents sur la période, 80 crédits max par partie (320 au total si quatre sans-faute) ;
- blocage transactionnel avec verrou sur le portefeuille serveur pour empêcher un double lancement depuis deux appareils ;
- informations `modes.{poster|pixel|timeline|year}.next_available_at` exposées au joueur sans dévoiler les réponses ;
- **reprise d'une partie active** pendant son délai de 20 minutes, qui ne consomme pas une nouvelle tentative.

La partie est décomptée lors de son **démarrage** et les tentatives interrompues ou abandonnées restent décomptées pendant 24 heures.

### Déploiement en production indispensable

La migration SQL V7.1 est enregistrée sur GitHub et exécutée avec succès dans la base PostgreSQL de test GitHub Actions. **Elle ne modifie pas automatiquement Supabase production.** Il faut l'appliquer une fois sur :

1. https://supabase.com/dashboard/project/anjfidksqbqlaggttdop/sql/new
2. Contenu complet : https://github.com/chrysangaime/serieclub-tcg/blob/main/supabase/game_v7_1_24h.sql

Il ne faut pas coller ici la clé `service_role` ni aucun mot de passe. Le SQL Editor authentifié suffit.

**Compatibilité transitoire :** si Supabase est encore en V7, l'interface conserve les défis récompensés sous le plafond serveur historique (trois parties/jour) et ajoute un délai local de 24 h par jeu sur ce navigateur ; cette limite locale n'est **pas** une sécurité anti-fraude entre appareils. Si le RPC V7 est indisponible, les entraînements restent sans crédits avec un délai de confort local de 24 h.

## 4. Fusion

- Sélection intelligente : privilégie toujours les doublons et répartit les dix cartes entre plusieurs séries lorsqu'il existe assez de copies, en choisissant les cartes les plus anciennes.
- Panier de fusion : montre en permanence les cartes retenues et permet de les retirer individuellement, avec progression accessible de 0 à 10.
- Préservation des dernières copies active par défaut ; les cartes bloquées, offertes, protégées ou non certifiées France sont exclues.
- Confirmation explicite avant consommation définitive ; les dix cartes et la récompense sont traitées exclusivement par `fuse_cards` dans une transaction Supabase.

## Contrôles

- `npm run check`, `npm test` (dont `tests/v8_game_fix.test.mjs`)
- Pipeline PostgreSQL : installation V7 puis V7.1, suite `tests/v7_rewarded_quiz.sql` (4 modes, anti-rejeu, limite et crédits).
- Aucune suppression de cartes, de joueurs ni de crédits ; pas de nouvel accès admin côté client.
