-- SériesClubTCG V1.0 : aligner les nouvelles installations sur la production.
-- Cette table contient exclusivement les définitions éditoriales des Saisons.
-- Les fonctions SECURITY DEFINER my_official_seasons() et claim_official_season()
-- lisent ces définitions avec leurs propres contrôles d'identité.
-- Sans politique RLS, un client Web ne peut pas interroger directement la table,
-- même s'il possède un ancien privilège SELECT (comportement actuel en production).
BEGIN;
ALTER TABLE public.official_seasons ENABLE ROW LEVEL SECURITY;
COMMIT;

-- Contrôle :
-- SELECT relrowsecurity FROM pg_class
-- WHERE oid='public.official_seasons'::regclass;
