# Contrôle de pré-lancement V1.0 — 24 octobre 2026

> Statut : **accès anticipé non commercial**. Ce document ne constitue ni une certification de sécurité ni un avis juridique. Nom commercial à faire valider explicitement par l'éditeur ; ne pas renommer l'application sans accord.

## Constats vérifiés directement sur Supabase (projet serieclub-tcg)

- Base : active et saine au moment de la consultation, PostgreSQL 17.
- Séries éligibles France : **2 640** : 1 650 `tvmaze_fr_origin`, 984 `tmdb_fr_offer`, 6 `editorial_fr_history`.
- Cache Movie of the Night : **30 lignes fraîches sur 30**, dont **28** avec un tableau d'offres non vide et **2** sans offre. La couverture est insuffisante et ne vaut pas preuve d'une offre pour les 2 640 séries.
- Séries requalifiées en `streaming_availability_fr` : **0**. Ne pas considérer l'import d'offres comme une purge automatique des preuves TMDB.
- L'audit sécurité a identifié `public.assign_card_season_variant()` comme une fonction *trigger* SECURITY DEFINER accordée directement aux rôles visiteurs et joueurs. Le 24/10, les droits EXECUTE ont été retirés de PUBLIC, anon et authenticated, et le rôle service_role les conserve. Requête de contrôle : false/false/true. Script idempotent : [v1_season_trigger_permissions.sql](supabase/v1_season_trigger_permissions.sql).
- Après cette correction, alertes `anon_security_definer_function_executable` : **5** (fonctions publiques de lecture à revoir chacune), et `authenticated_security_definer_function_executable` : **49** (revue d'autorisations et de tests à conduire, leur simple existence n'établit pas une faille).
- Alerte Supabase Auth : protection contre les mots de passe compromis non activée. Voir l'interface de configuration de l'authentification (fonctionnalité dépendante de l'offre).
- Avis performance : un index FK potentiellement manquant sur `fr_streaming_api_usage.series_id` et des index non encore utilisés, sans justification pour les retirer avant mesure.

## Interdits avant autorisation de lancement commercial

1. Ne pas activer Stripe live, ni vendre de crédits ou abonnement Premium avec le contenu actuel.
2. Ne pas supprimer ou masquer en masse les 984 séries sous ancienne preuve TMDB, ni les cartes historiques et les soldes associés.
3. Ne pas annoncer de disponibilité actuelle sur une plateforme en l'absence d'une réponse française, non expirée et contenant effectivement une offre.
4. Ne pas utiliser la présence d'un poster TVmaze comme garantie suffisante des droits d'auteur sur la photographie.
5. Ne pas retirer `noindex,nofollow` avant validation du nom, des droits, de la protection des données et du produit.

## Ordre de travail pour la V1

1. **Données et licences** : requalifier chaque série ayant une preuve TMDB par une source indépendante autorisée, distinguer l'éligibilité historique du tirage futur, conserver les collections, puis reconstruire les packs SVOD.
2. **Sécurité** : auditer les RPC privilégiées, les paramètres Auth, les politiques RLS, les contrôles d'abus et la suppression de compte avec comptes d'essai.
3. **Moteur et UX** : tester les boosters gratuits et à crédits, saisons distinctes, échanges, doublons, reprise de session et appareils Android/iOS/desktop physiques. Ne pas confondre tests CI Chromium et recette utilisateur.
4. **Obligations commerciales** : choisir le nom après validation, vérifier marque/domaine, hébergeur, droits sur images, contact de retrait, mentions légales, RGPD, CGU/CGV, puis paiements en mode test.

## Tests de validation reproductibles (lecture seule)

```sql
-- Ventilation des preuves de diffusion France : les anciens dérivés TMDB doivent tendre vers zéro.
select fr_verification_method, count(*) as series
from public.series
where fr_verified is true
group by fr_verification_method
order by series desc;

-- Ne compter comme offres confirmées que les tableaux d'offres non vides et encore valides.
select count(*) as titres_en_cache,
       count(*) filter (
          where expires_at > now()
            and jsonb_typeof(offers)='array'
            and jsonb_array_length(offers)>0
       ) as titres_avec_offres_actuelles
from public.fr_streaming_cache;

-- Vérifier qu'aucun rôle public ne peut appeler directement le trigger d'attribution.
select has_function_privilege('anon','public.assign_card_season_variant()','EXECUTE') as anon,
       has_function_privilege('authenticated','public.assign_card_season_variant()','EXECUTE') as joueur,
       has_function_privilege('service_role','public.assign_card_season_variant()','EXECUTE') as serveur;
```

Les requêtes ci-dessus ne manipulent ni profils ni soldes. Après changement de schéma, exécuter les conseillers de sécurité et de performances Supabase, puis les tests applicatifs.

## Limites de la vérification du 24 octobre

La lecture des données de production et le correctif ponctuel de privilèges sont confirmés ; **aucune recette navigateur réelle, campagne complète de tests automatisés, revue juridique ni simulation d'achat live n'a été accomplie** au cours de cette vérification. Ne pas indiquer « prêt pour lancement » sur cette seule base.
