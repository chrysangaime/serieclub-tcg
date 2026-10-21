-- SérieClub V7.1 : une partie récompensée par mode sur 24 heures glissantes.
-- À appliquer APRÈS game_v7_quiz.sql. Aucun effacement de cartes, crédits,
-- ou historique; ne touche pas au barème des récompenses.
BEGIN;
CREATE INDEX IF NOT EXISTS sc_quiz_player_mode_recent_idx
 ON public.rewarded_quiz_runs(player_id,mode,created_at DESC);

CREATE OR REPLACE FUNCTION public.rewarded_quiz_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();modes jsonb;remaining integer;active_mode text;
BEGIN
 IF uid IS NULL THEN RETURN jsonb_build_object('enabled',true,'signed_in',false,
   'limit_per_mode_hours',24,'remaining_today',4);END IF;
 SELECT jsonb_object_agg(m.mode,jsonb_build_object(
   'available',r.next_at IS NULL,
   'next_available_at',r.next_at
  )),COUNT(*) FILTER(WHERE r.next_at IS NULL)
 INTO modes,remaining
 FROM (VALUES ('poster'),('pixel'),('timeline'),('year')) m(mode)
 LEFT JOIN LATERAL(
   SELECT max(q.created_at)+interval '24 hours' AS next_at
   FROM public.rewarded_quiz_runs q
   WHERE q.player_id=uid AND q.mode=m.mode
     AND q.created_at>now()-interval '24 hours'
 ) r ON TRUE;
 SELECT q.mode INTO active_mode
 FROM public.rewarded_quiz_runs q
 WHERE q.player_id=uid AND q.status='active' AND q.expires_at>now()
 ORDER BY q.created_at DESC LIMIT 1;
 RETURN jsonb_build_object('enabled',true,'signed_in',true,
   'limit_per_mode_hours',24,'remaining_today',remaining,
   'max_daily_credits',320,'modes',coalesce(modes,'{}'::jsonb),
   'active_mode',active_mode);
END $$;
REVOKE ALL ON FUNCTION public.rewarded_quiz_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rewarded_quiz_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.start_rewarded_quiz(p_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();existing public.rewarded_quiz_runs%rowtype;
 result public.rewarded_quiz_runs%rowtype;retry_at timestamptz;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid) THEN
  RETURN jsonb_build_object('status','signin','message','Connecte-toi pour gagner des crédits.');
 END IF;
 IF p_mode NOT IN ('poster','pixel','timeline','year') THEN
  RAISE EXCEPTION 'Défi inconnu';END IF;
 INSERT INTO public.player_wallets(player_id) VALUES(uid)
 ON CONFLICT(player_id) DO NOTHING;
 -- Verrou joueur : empêche deux appareils de démarrer simultanément
 -- le même mode et contourner le délai de 24 heures.
 PERFORM 1 FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 UPDATE public.rewarded_quiz_runs SET status='expired',finished_at=now()
 WHERE player_id=uid AND status='active' AND expires_at<=now();
 SELECT * INTO existing FROM public.rewarded_quiz_runs
 WHERE player_id=uid AND status='active' FOR UPDATE;
 IF FOUND THEN
  RETURN public.rewarded_quiz_snapshot(existing)||jsonb_build_object('resumed',true);
 END IF;
 SELECT max(created_at)+interval '24 hours' INTO retry_at
 FROM public.rewarded_quiz_runs
 WHERE player_id=uid AND mode=p_mode
   AND created_at>now()-interval '24 hours';
 IF retry_at IS NOT NULL THEN
  RETURN jsonb_build_object('status','limit','mode',p_mode,'next_available_at',retry_at,
   'message','Défi déjà joué. Une nouvelle partie sera disponible 24 h après son démarrage.');
 END IF;
 INSERT INTO public.rewarded_quiz_runs(player_id,mode,question)
 VALUES(uid,p_mode,public.make_rewarded_question(p_mode)) RETURNING * INTO result;
 RETURN public.rewarded_quiz_snapshot(result);
END $$;
REVOKE ALL ON FUNCTION public.start_rewarded_quiz(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_rewarded_quiz(text) TO authenticated;
COMMIT;
