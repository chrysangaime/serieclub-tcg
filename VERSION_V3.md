# SérieClub TCG — Version 3 (Halloween)

## Mise en ligne

La version 3 remplace le cumul des anciens scripts `auth.js`, `game.js`, `game-v2.js`, `club.js`, `editorial.js` et `polish.js` par **une application unique** :

- `index.html` : point d'entrée ;
- `v3/styles.css` : interface sombre et responsive, pochettes métalliques ;
- `v3/views.js` : pages et composants ;
- `v3/app.js` : navigation, authentification, accès Supabase, boosters, cartes, jeux ;
- `v3/icon.svg` : identité visuelle originale.

Les anciens fichiers restent dans le dépôt comme historique, mais **ne sont plus chargés**.

### Activation Supabase : une seule migration supplémentaire

Les migrations `supabase/schema.sql`, `supabase/game.sql` et `supabase/game_v2.sql` doivent déjà être exécutées.

Dans le SQL Editor du projet Supabase, exécuter **l'intégralité** de :

**[supabase/game_v3.sql](./supabase/game_v3.sql)**

Le script crée :
1. La liste de souhaits synchronisée avec les règles RLS individuelles ;
2. La fonction `set_card_locked` (protection et déprotection sécurisées) ;
3. La fonction `open_halloween_booster` (cinq cartes, dont au moins une série Horreur/Thriller/Supernatural), disponible **uniquement du 1er au 31 octobre, heure de Paris**.

Il utilise la même réserve de dix paquets que le booster classique. Ni nouvelles clés secrètes ni nouveau service payant ne sont nécessaires.

### Prérequis pour ouvrir les paquets

Le catalogue `public.series` doit contenir au moins cinq séries avec affiches. Le paquet Halloween exige également au moins une série de genre `Horror`, `Thriller` ou `Supernatural`. La synchronisation du catalogue est assurée par le workflow GitHub `sync-catalog.yml`, après ajout du secret `SUPABASE_SERVICE_ROLE_KEY` dans les secrets GitHub Actions.

Ne jamais inscrire la clé `service_role` dans le dépôt, le navigateur ou une conversation.

### Essais fonctionnels conseillés

- Se connecter et vérifier que le pseudonyme apparaît dans le menu latéral.
- Ouvrir **Paquets** et vérifier que la réserve contient initialement dix paquets.
- Ouvrir un paquet Classique : cinq cartes, +25 crédits, +50 XP et réserve à 9/10.
- En octobre, ouvrir Halloween : cinq cartes, dont au moins une série de genre horrifique.
- Dans Collection, protéger une carte ; contrôler son exclusion des fusions.
- Dans Catalogue, ajouter puis supprimer une série de la Liste de souhaits.
- Dans Albums, ouvrir un genre et vérifier le filtrage de la Collection.
- Vérifier l'affichage mobile et le bouton de réduction des animations.

### Périmètre des fonctionnalités

| Fonctionnalité | Version 3 |
|---|---|
| Menu latéral et barre supérieure | Oui |
| Pack Classique sécurisé | Oui, sous réserve de la migration V2 déjà exécutée |
| Pack Halloween sécurisé | Après exécution de `game_v3.sql` |
| Réserve de dix paquets et recharge | Oui, via `get_booster_status` |
| Révélation animée des cinq cartes | Oui |
| Collection / protection des cartes | Oui, protection après migration V3 |
| Albums par genre | Oui |
| Liste de souhaits Supabase | Après migration V3 |
| Fusions atomiques | Oui, via migration V2 |
| Quiz affiche mystère et chronologie | Oui, sans crédits |
| Récompense quotidienne | Oui |
| Classement public | Oui |
| Marché, enchères, échanges et messagerie | **Non — non simulés** |
| Première et parrainage payants | **Non — non commercialisés** |

### Limites / vérification

Les écritures de cartes et de crédits sont réalisées par des fonctions Supabase contrôlant `auth.uid()`; aucune clé privilégiée n'est présente dans le JavaScript. Les images proviennent des URL du catalogue TVmaze. Leur présence dans le catalogue ne donne pas de droits exclusifs sur les visuels.

Le contrôle automatique `.github/workflows/quality.yml` vérifie la syntaxe JavaScript, les ressources essentielles et plusieurs pages. Il ne remplace pas un essai de bout en bout depuis un compte connecté.

L'interface de la version 3 est originale, inspirée par la structure fonctionnelle de plateformes TCG, et n'utilise pas les graphismes, marques ou illustrations propriétaires de Cinéclub TCG.
