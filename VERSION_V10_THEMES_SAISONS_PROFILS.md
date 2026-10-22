# SérieClub TCG V10.0.1 — Nouvelles saisons et nouveau thème

## Fonctionnalités livrées sur le site
- **Nuit par défaut**, thème Jour au choix depuis le bouton de barre supérieure ou Paramètres, sauvegardé sur le navigateur.
- **Mosaïque Pixel** avec vrai canvas basse résolution et difficulté croissante de 13 pixels de largeur en manche 1 à 6 en manche 5. Le correctif 10.0.1 utilise une largeur numérique, et a été couvert par un test de dessin effectif ; l'ancien bug conservait l'affiche nette.
- **Six saisons officielles** en complément des saisons personnelles : Années 90, Rire ensemble, Enquête & mystères, Vers d’autres mondes, Nouvelle vague, Les grands classiques. Leurs progrès portent sur des séries *différentes*, certifiées diffusées en France. Récompenses de 100 à 150 crédits virtuels, badge permanent, réclamation autorisée une seule fois côté serveur.
- **Profil personnalisé :** avatar et bannière choisis exclusivement parmi les affiches des séries présentes dans la collection ; utilisation du visuel dans la barre latérale et dans Le Signal.
- **Boutique préparatoire :** Premium proposé à 1,99 €/mois, packs de 250 crédits/0,99 €, 750/2,49 €, 1800/4,99 €. **Aucun achat ni abonnement actif.** Aucun lien de paiement fictif n'est présenté.

## Activation des fonctions liées à Supabase (production)
Les scripts suivants ont réussi les tests sur une base PostgreSQL **temporaire**, mais ils ne sont **pas** automatiquement exécutés sur la base de production :
1. [Saisons officielles, badges, crédits et avatars sécurisés](https://github.com/chrysangaime/serieclub-tcg/blob/main/supabase/game_v10_seasons_profiles.sql) : à exécuter une seule fois dans [SQL Editor du projet Supabase](https://supabase.com/dashboard/project/anjfidksqbqlaggttdop/sql/new). Aucune carte ni aucun solde n'est supprimé.
2. [Schéma préparatoire de facturation](https://github.com/chrysangaime/serieclub-tcg/blob/main/supabase/game_v10_commerce_ready.sql) : facultatif à ce stade. Tous les produits restent `enabled=false` et les accès publics n'autorisent aucun paiement ni attribution de crédits.

Une migration ne doit être annoncée comme effective qu'après son exécution dans Supabase production.

## Monétisation future
La mise en vente demandera un compte marchand Stripe, les clés de service/configuration, Checkout et un webhook à signature vérifiée **côté serveur**, des événements idempotents et la gestion des remboursements. Aucun client JavaScript ne doit augmenter des crédits.
Avant toute vente : examiner le modèle économique (éviter pay-to-win ou incitations compulsives), droits de réutilisation des affiches/données TMDB, droit de la consommation, TVA et CGV.

## Conformité tests
- GitHub Actions : JavaScript `npm test` dont rasterisation réelle, thèmes, vue boutique, saisons, badges et limites d'accès.
- PostgreSQL CI : contrôle des huit cartes distinctes, récompense créditée une seule fois et refus d'une affiche de série non possédée.
- GitHub Pages : déploiement du site V10.0.1 réussi.
