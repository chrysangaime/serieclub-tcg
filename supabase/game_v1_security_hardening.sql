-- SériesClubTCG V1.0 - verrouillage des accès RPC PostgreSQL.
-- Les cinq RPC d'information explicitement publiques restent accessibles sans compte.
-- Les opérations de jeu, transaction et profil ne le sont plus.
BEGIN;
DO $$
DECLARE r record;function_name text;was_authenticated boolean;allow_anon boolean;
BEGIN
 FOR r IN
  SELECT n.nspname,p.proname,p.oid,p.prorettype,
   pg_get_function_identity_arguments(p.oid) AS params,
   has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_before
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.prokind='f' AND p.prosecdef
 LOOP
  function_name:=format('%I.%I(%s)',r.nspname,r.proname,r.params);
  was_authenticated:=r.auth_before;
  allow_anon:=r.proname IN (
   'get_leaderboard','get_series_rarity','get_official_season_titles',
   'list_credit_boosters','public_personal_albums'
  );
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',function_name);
  IF was_authenticated AND r.prorettype<>'pg_catalog.trigger'::regtype THEN
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',function_name);
  END IF;
  IF allow_anon THEN
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon',function_name);
  END IF;
 END LOOP;
END $$;
-- Les nouvelles fonctions devront accorder explicitement EXECUTE aux rôles autorisés.
-- Cette règle n'altère pas les données, les cartes ni les crédits.
COMMIT;
