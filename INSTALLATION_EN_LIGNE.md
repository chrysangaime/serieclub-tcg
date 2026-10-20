# Mise en service complète de SérieClub TCG

## 1. Base de données (une fois)
Dans Supabase SQL Editor, exécuter dans cet ordre :
1. `supabase/schema.sql`
2. `supabase/game.sql`

Le second fichier définit les boosters transactionnels, les crédits, les récompenses quotidiennes et les classements. Il est nécessaire même si le site et l'inscription fonctionnent déjà.

## 2. Catalogue automatique
Sur GitHub > dépôt `serieclub-tcg` > Settings > Secrets and variables > Actions > New repository secret :
- Name : `SUPABASE_SERVICE_ROLE_KEY`
- Value : clé `service_role` de Supabase, ou clé secrète compatible avec les requêtes REST du projet. **Ne jamais partager cette valeur dans un chat, un ticket ou un fichier.**
Cette clé reste côté GitHub Actions et n'est pas envoyée au navigateur.

Puis : GitHub > Actions > « Synchroniser le catalogue TVmaze » > Run workflow.
La valeur par défaut est 20 pages (jusqu'à ~5000 séries avant filtrage). La tâche hebdomadaire maintient le catalogue à jour.
Vérifier les journaux d'exécution : les comptes importés y figurent, sans exposer la clé.

## 3. Tester
- Se connecter à SérieClub TCG.
- Cliquer sur Espace joueur.
- Vérifier le profil, les crédits et la collection.
- Ouvrir un booster ; vérifier que cinq cartes sont visibles.
- Recharger la page ; vérifier la persistance.
- Tester la récompense quotidienne et le classement.

## Limitations restantes
L'interface « Marché & échanges » est informative, pas opérationnelle. Pas encore d'enchères, de fusion, de mini-jeux ou d'abonnement.
L'ancien bouton « Boosters » conserve un mode de démonstration local distinct. La vraie progression synchronisée est dans « Espace joueur ».
Le catalogue TVmaze et les visuels ne confèrent pas automatiquement une autorisation commerciale sur les affiches. Vérifier les licences et conditions d'utilisation avant publicité ou premium.

## Coût
GitHub Pages, Actions et Supabase disposent de formules gratuites avec quotas. Le dépassement de quotas, le domaine .fr et certaines fonctions premium ne sont pas garantis gratuits.
