# SérieClub TCG

Jeu de collection de séries TV, indépendant et gratuit au lancement.

## Démo en ligne
https://chrysangaime.github.io/serieclub-tcg/

## État du projet
Prototype statique : catalogue TVmaze, recherche, boosters, sept raretés, collection locale et sauvegarde JSON. **Pas encore de comptes, synchronisation, échanges, marché, enchères ni système antifraude.**

## Cible fonctionnelle (inspirée des mécaniques du genre, sans reproduction de l'identité de Cinéclub TCG)
1. Accueil éditorial, démonstration de booster sans compte, onboarding.
2. Catalogue complet indexé côté serveur et enrichi (séries, genres, années, affiches autorisées).
3. Authentification, profil et inventaire synchronisé (Supabase gratuit sous quotas).
4. Boosters générés côté serveur, limites temporelles et probabilités auditées.
5. Albums thématiques, collection par rareté, filtres, doublons et statistiques.
6. Défis (affiche mystère, chronologie), quêtes quotidiennes et progression.
7. Fusions, crédits virtuels, économie contrôlée et journal des transactions.
8. Échanges, marché, enchères et classements, avec transactions atomiques et anti-abus.
9. PWA, accessibilité, responsive, administration et modération.
10. Publicité/abonnement éventuels seulement après examen des droits d'exploitation des visuels et conditions des fournisseurs.

## Architecture visée
- Frontend statique compatible GitHub Pages au départ.
- Base PostgreSQL et authentification Supabase lorsque les comptes sont mis en place.
- Fonctions serveur sécurisées pour tirages, inventaire, échanges, marché et fusions.
- Secrets jamais exposés dans le JavaScript public.
- Catalogue synchronisé en lots, cache, attribution des sources et stratégie d'images conforme aux licences.

## Avertissement
Les affiches appartiennent à leurs ayants droit. Les API de métadonnées et d'images ne confèrent pas automatiquement des droits de reproduction ou de monétisation. Vérifier les conditions de TVmaze et de chaque source avant toute exploitation commerciale.

## Développement
Le fichier `index.html` contient la démo actuelle. GitHub Pages publie la branche `main`.
