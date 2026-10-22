# SérieClub TCG V12.2 — Refonte réelle TV / SVOD

## Objectif
Remplacer le vieux tableau de bord statique par une expérience cinématique de découverte, conforme à la direction artistique approuvée (mode Nuit + mode Jour). **Il s'agit d'un déploiement HTML/CSS/JavaScript réel, pas d'une maquette.**

## Architecture et fichiers
- `v12/home.js` : nouvelle page Paquets produite comme vue interactive complète.
- `v12/cinema-hero.svg` : illustration cinématique originale, référencée par le CSS sans API externe.
- `v12/svod.css` : palette et layout des modes Nuit/Jour, accueil, pack cards, hero, progression, rayons, topbar, navigation mobile.
- `v12/streaming-sections.css` : nouvelle charte des rubriques Catalogue, Collection, Jeux, Saisons, Fusion, Comptoir, Signal, Profil et Premium.
- `v3/app.js` : recherche globale, chargement d'une vitrine de séries vérifiées France depuis Supabase, navigation thématique, événements et identité de compte.
- `v3/views.js` : branchement effectif de la nouvelle page Paquets.
- `v3/icon.svg`, `manifest.webmanifest` : logo S **droit** et couleurs du navigateur/PWA assorties à la charte.
- `tests/v12_svod_home.test.mjs`, `tests/v12_sections.test.mjs` : tests de la navigation, du rendu, des deux thèmes et des limites de la boutique.

## Interface de la page Paquets
- Grande bannière de saison (Halloween uniquement en octobre) et alternative « Le club des séries TV » le reste de l'année.
- Deux **vrais** paquets : Original, Halloween. La variante Halloween est sélectionnable en octobre uniquement, depuis la réserve existante.
- Troisième carte « Premium » **clairement indiquée comme présentation en préparation** : aucun booster Premium fictif, aucun paiement, aucune rareté payante.
- Ouverture : `#openPack` réutilise le flux de jeu existant et les validations serveur.
- Crédit quotidien : `[data-daily]` réutilise le RPC existant.
- Vue de progression : ouverture de 10 paquets, 50 cartes, 10 séries uniques, valeurs issues du profil actuel ; pas d'objectifs récompensés fictivement.
- Panneau crédits : valeur réellement lue dans le portefeuille, lien vers la vitrine Premium sans paiement activé.
- Univers genres : raccourcis reliés aux filtres réels du Catalogue (genres, années 90).
- Sélection d'affiches : données Supabase `fr_verified=true`, rareté déjà attribuée et image valide, fusion de favoris populaires et données déjà chargées.
- Recherche globale : champ fonctionnel sur ordinateur, raccourci mobile vers le catalogue ; aucun faux résultat.
- Aucun contenu d'affiche supplémentaire stocké sur le navigateur.

## Nouvelle identité
- Logo redressé (pas de rotation), icône homogène et topbar de type plateforme de contenus.
- Mode Nuit : fond bleu très profond, surfaces sombres, accents turquoise / violet et bannière cinématique.
- Mode Jour : surfaces blanches / bleu glacier, contrastes de texte renforcés et **bannière éditoriale toujours cinématique**.
- Boutons, champs, panneaux, filtres, collection, fiches, jeux et profils harmonisés.
- Cibles adaptées au tactile, grilles réorganisées en téléphone / tablette / PC, préférence de réduction du mouvement respectée.

## Sécurité et contraintes
- Aucune modification des probabilités de rareté, des réserves, des cartes, des crédits ni des RPC serveur.
- Aucun logo ni identité prétendant représenter des services de SVOD externes.
- Les affiches de séries sont celles déjà référencées et doivent respecter les droits de leurs ayants droit ; la visibilité en France ne constitue pas une licence de réutilisation commerciale.
- Le visuel de la bannière est une **illustration SVG originale stylisée** : il reprend l'ambiance de la maquette, sans prétendre en être une copie pixel pour pixel.
- Premium et achat de crédits restent **non activés** tant que Stripe, conditions légales et paiements vérifiés ne sont pas établis.

## Vérification
La CI GitHub exécute les tests HTML/JS, les règles de jeu et les intégrations SQL PostgreSQL. Les contrôles visuels automatisés portent sur la structure, les deux thèmes, les URLs et la présence des styles ; les tests de code ne sont pas une validation pixel par pixel du rendu navigateur.

Site : https://chrysangaime.github.io/serieclub-tcg/
Workflow qualité : https://github.com/chrysangaime/serieclub-tcg/actions/workflows/quality.yml
