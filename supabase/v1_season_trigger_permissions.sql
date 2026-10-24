-- SériesClubTCG V1.0 — réduction des privilèges de la fonction trigger.
-- Cette fonction est invoquée par le moteur PostgreSQL lors de l'attribution
-- d'une carte ; le navigateur n'a pas besoin de l'appeler via l'API RPC.
-- Idempotent : peut être rejoué sans altérer les cartes ni les soldes.
REVOKE EXECUTE ON FUNCTION public.assign_card_season_variant()
FROM PUBLIC, anon, authenticated;

-- Contrôle attendu : false, false, true. Le service_role conserve son droit.
SELECT
  has_function_privilege('anon', 'public.assign_card_season_variant()', 'EXECUTE') AS anonymous_can_execute,
  has_function_privilege('authenticated', 'public.assign_card_season_variant()', 'EXECUTE') AS player_can_execute,
  has_function_privilege('service_role', 'public.assign_card_season_variant()', 'EXECUTE') AS service_can_execute;
