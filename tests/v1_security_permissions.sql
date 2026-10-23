-- Contrôler la surface RPC exposée après toutes les migrations du jeu.
DO $$
DECLARE total_anon int; privileged_anon int; exposed text[];
BEGIN
 SELECT count(*),
 count(*) FILTER(WHERE has_function_privilege('anon',p.oid,'EXECUTE'))
 INTO total_anon,privileged_anon
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.prosecdef;
 IF total_anon<30 THEN RAISE EXCEPTION 'Inventaire RPC anormal';END IF;
 IF privileged_anon<>5 THEN RAISE EXCEPTION 'Seules 5 RPC publiques sont prévues. Exposées : %',privileged_anon;END IF;
 IF EXISTS(
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname IN
  ('buy_card_listing','open_halloween_booster','open_starter_booster','recycle_duplicate_cards',
   'set_card_locked','propose_card_trade','claim_daily_reward','my_club_invite_code')
  AND has_function_privilege('anon',p.oid,'EXECUTE')
 ) THEN RAISE EXCEPTION 'Une fonction transactionnelle est accessible sans compte';END IF;
 IF NOT has_function_privilege('authenticated','public.open_halloween_booster()','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.recycle_duplicate_cards(uuid[])','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.follow_player_by_code(text)','EXECUTE')
 THEN RAISE EXCEPTION 'Un parcours connecté est devenu inaccessible';END IF;
 IF NOT has_function_privilege('anon','public.list_credit_boosters()','EXECUTE')
 OR NOT has_function_privilege('anon','public.get_leaderboard()','EXECUTE')
 THEN RAISE EXCEPTION 'Lecture publique du catalogue bloquée';END IF;
END $$;
SELECT 'Accès V1 sécurisé : 5 RPC de lecture publiques, fonctions de jeu authentifiées' AS result;
