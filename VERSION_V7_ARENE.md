# SérieClub TCG — V7 : L'Arène & l'ouverture cinématique

## Disponible immédiatement sur le site

### Boosters
- Un paquet scellé, puis révélation **carte par carte** sur action de l'utilisateur.
- Animation d'apparition, balayage de lumière, particules et contour suivant la rareté de la série.
- Distinction accrue des cartes Épique, Légendaire, Mythique et Unique.
- Bouton **Tout révéler** pour passer directement au résultat, puis récapitulatif des cinq cartes et du gain du booster déjà attribué par le serveur (+25 crédits, +50 XP).
- Animation adaptée aux mobiles et automatiquement désactivée lorsque la préférence de mouvement réduit est active. Fermer la fenêtre ne supprime aucune carte.

### Arène
- **Affiche mystère** : deviner une affiche floutée.
- **Pixel secret** : deviner une affiche visuellement dégradée.
- **Chrono séries** : retrouver la série diffusée en premier.
- **L'année culte** : retrouver la série correspondant à une année.

Quatre modes, 5 questions, parcours réactif et résultats lisibles.
En attendant l'activation SQL sur la base réelle, les défis restent en **entraînement libre, sans gain fictif**.

## Récompenses sécurisées à activer

Fichier de migration : `supabase/game_v7_quiz.sql`.

Une fois cette migration exécutée sur le **projet Supabase de production**, les quatre jeux utiliseront les RPC :
- `rewarded_quiz_status()` : nombre de parties encore disponibles.
- `start_rewarded_quiz(p_mode)` : génération et reprise d'une partie de 5 manches.
- `submit_rewarded_quiz_answer(p_session,p_choice)` : validation d'une seule réponse avec attribution atomique de crédits.

Barème réel : **+10 crédits par bonne réponse**, **+30 crédits supplémentaires pour un sans-faute**, **3 parties maximum par jour** selon le fuseau `Europe/Paris`. Donc au plus 80 crédits par partie et **240 crédits par jour** en cas de trois scores parfaits.

Anti-triche : réponses enregistrées côté PostgreSQL dans une table RLS non lisible depuis le navigateur, RPC transactionnelles avec verrouillage du portefeuille et de la partie, vérification d'identité `auth.uid()`, contrôle des 4 choix, absence de paiement pour une manche rejouée, expiration après 20 minutes et limite quotidienne.

Le modèle de crédits et les raretés sont inchangés pour les collections, fusions et boosters existants. Le jeu ne permet aucun dépôt d'argent ou retrait monétaire.

## Activation

Option recommandée : connecter Supabase à ChatGPT avec accès au projet concerné, afin de permettre à l'assistant d'appliquer et de vérifier la migration **une seule fois**.

Option manuelle : ouvrir https://supabase.com/dashboard/project/anjfidksqbqlaggttdop/sql/new, copier le contenu de `supabase/game_v7_quiz.sql` dans l'éditeur SQL et exécuter. Le jeu reconnaîtra ensuite automatiquement la disponibilité des récompenses à la prochaine ouverture de la page Jeux & défis.

Le jeton `SUPABASE_SERVICE_ROLE_KEY` ne doit jamais être exposé dans le frontend ou partagé publiquement.

## Validation

- `tests/v7_experience.test.mjs` : ouverture carte par carte, raretés, réduction des animations, interface des défis et gains.
- `tests/v7_rewarded_quiz.sql` : exécution de parties sous rôle `authenticated` dans PostgreSQL 16 avec vérification de l'interdiction d'accès aux réponses, de l'anti-rejeu, du quota quotidien, du calcul des gains et de la protection des crédits.
- Le CI GitHub exécute les tests habituels des cartes, fusions et preuves France en plus des tests V7.

Le passage des tests SQL dans GitHub ne déploie **pas** la migration dans Supabase production : il faut explicitement activer cette dernière pour obtenir de vrais crédits.
