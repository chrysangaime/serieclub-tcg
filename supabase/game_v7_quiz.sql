-- SérieClub TCG V7 : arène de culture séries récompensée.
-- Activation : exécuter dans le SQL Editor Supabase, après les migrations V5 France.
-- Toutes les réponses et attributions de crédits restent exclusivement au serveur.
BEGIN;
CREATE TABLE IF NOT EXISTS public.rewarded_quiz_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 mode text NOT NULL CHECK(mode IN ('poster','pixel','timeline','year')),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','expired')),
 round integer NOT NULL DEFAULT 1 CHECK(round BETWEEN 1 AND 5),
 correct_count integer NOT NULL DEFAULT 0 CHECK(correct_count BETWEEN 0 AND 5),
 credits_awarded bigint NOT NULL DEFAULT 0 CHECK(credits_awarded>=0),
 question jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now()+interval '20 minutes'),
 finished_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS rewarded_quiz_one_active
 ON public.rewarded_quiz_runs(player_id) WHERE status='active';
CREATE INDEX IF NOT EXISTS rewarded_quiz_daily
 ON public.rewarded_quiz_runs(player_id,created_at DESC);
ALTER TABLE public.rewarded_quiz_runs ENABLE ROW LEVEL SECURITY;
-- Ne jamais exposer la table : question contient la bonne réponse.
REVOKE ALL ON TABLE public.rewarded_quiz_runs FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.make_rewarded_question(p_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE options jsonb;target jsonb;prompt text;poster text;yr integer;
BEGIN
 IF p_mode NOT IN ('poster','pixel','timeline','year') THEN
  RAISE EXCEPTION 'Jeu inconnu';END IF;
 IF p_mode IN ('year','timeline') THEN
  SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'poster',image_url,'year',extract(year FROM premiered)::int))
   INTO options FROM (
    SELECT * FROM(
     SELECT DISTINCT ON(extract(year FROM premiered)) id,name,image_url,premiered
     FROM public.series
     WHERE fr_verified IS TRUE AND rarity_source<>'pending'
       AND image_url LIKE 'https://%' AND premiered<=current_date AND premiered IS NOT NULL
     ORDER BY extract(year FROM premiered),random()
    ) years ORDER BY random() LIMIT 4
   ) selection;
 ELSE
  SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'poster',image_url,'year',extract(year FROM premiered)::int))
   INTO options FROM(
    SELECT id,name,image_url,premiered FROM public.series
    WHERE fr_verified IS TRUE AND rarity_source<>'pending'
     AND image_url LIKE 'https://%' AND premiered<=current_date AND premiered IS NOT NULL
    ORDER BY random() LIMIT 4
   ) selection;
 END IF;
 IF options IS NULL OR jsonb_array_length(options)<>4 THEN
  RAISE EXCEPTION 'Catalogue France insuffisant pour ce défi';
 END IF;
 IF p_mode='timeline' THEN
  SELECT value INTO target FROM jsonb_array_elements(options)
   ORDER BY (value->>'year')::integer ASC LIMIT 1;
  prompt:='Laquelle de ces séries a commencé en premier ?';
 ELSE
  SELECT value INTO target FROM jsonb_array_elements(options) ORDER BY random() LIMIT 1;
  IF p_mode='year' THEN
   prompt:='Quelle série a débuté en '||(target->>'year')||' ?';
  ELSE prompt:='À quelle série appartient cette affiche ?';
  END IF;
 END IF;
 poster:=CASE WHEN p_mode IN ('poster','pixel') THEN target->>'poster' ELSE NULL END;
 -- La réponse n'est présente QUE dans la table privée.
 RETURN jsonb_build_object('options',options,'answer',target->'id',
   'prompt',prompt,'poster',poster);
END $$;
REVOKE ALL ON FUNCTION public.make_rewarded_question(text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.rewarded_quiz_snapshot(p_run public.rewarded_quiz_runs)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE opts jsonb;res jsonb;
BEGIN
 SELECT jsonb_agg(jsonb_build_object('id',obj.value->'id','name',obj.value->'name',
  'image_url',CASE WHEN p_run.mode='timeline' THEN obj.value->'poster' ELSE 'null'::jsonb END))
 INTO opts FROM jsonb_array_elements(p_run.question->'options') obj;
 res:=jsonb_build_object('status','active','session_id',p_run.id,'mode',p_run.mode,
   'round',p_run.round,'total',5,'score',p_run.correct_count,
   'credits_earned',p_run.credits_awarded,'expires_at',p_run.expires_at,
   'question',jsonb_build_object('description',p_run.question->'prompt',
     'poster',p_run.question->'poster','options',opts));
 RETURN res;
END $$;
REVOKE ALL ON FUNCTION public.rewarded_quiz_snapshot(public.rewarded_quiz_runs) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.rewarded_quiz_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();used integer;
BEGIN
 IF uid IS NULL THEN RETURN jsonb_build_object('enabled',true,'signed_in',false);END IF;
 SELECT count(*) INTO used FROM public.rewarded_quiz_runs
 WHERE player_id=uid AND (created_at AT TIME ZONE 'Europe/Paris')::date =
  (now() AT TIME ZONE 'Europe/Paris')::date;
 RETURN jsonb_build_object('enabled',true,'signed_in',true,
  'played_today',used,'remaining_today',greatest(0,3-used),
  'max_daily_credits',240);
END $$;
REVOKE ALL ON FUNCTION public.rewarded_quiz_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rewarded_quiz_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.start_rewarded_quiz(p_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();existing public.rewarded_quiz_runs%rowtype;
 starts integer;result public.rewarded_quiz_runs%rowtype;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid) THEN
  RETURN jsonb_build_object('status','signin','message','Connecte-toi pour gagner des crédits.');END IF;
 IF p_mode NOT IN ('poster','pixel','timeline','year') THEN RAISE EXCEPTION 'Défi inconnu';END IF;
 INSERT INTO public.player_wallets(player_id) VALUES(uid) ON CONFLICT(player_id) DO NOTHING;
 PERFORM 1 FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 UPDATE public.rewarded_quiz_runs SET status='expired',finished_at=now()
 WHERE player_id=uid AND status='active' AND expires_at<=now();
 SELECT * INTO existing FROM public.rewarded_quiz_runs
  WHERE player_id=uid AND status='active' FOR UPDATE;
 IF FOUND THEN
  RETURN public.rewarded_quiz_snapshot(existing) || jsonb_build_object('resumed',true);
 END IF;
 SELECT count(*) INTO starts FROM public.rewarded_quiz_runs
 WHERE player_id=uid AND (created_at AT TIME ZONE 'Europe/Paris')::date =
  (now() AT TIME ZONE 'Europe/Paris')::date;
 IF starts>=3 THEN RETURN jsonb_build_object('status','limit',
  'message','Tu as terminé tes trois parties récompensées du jour. Reviens demain.');END IF;
 INSERT INTO public.rewarded_quiz_runs(player_id,mode,question)
 VALUES(uid,p_mode,public.make_rewarded_question(p_mode)) RETURNING * INTO result;
 RETURN public.rewarded_quiz_snapshot(result);
END $$;
REVOKE ALL ON FUNCTION public.start_rewarded_quiz(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.start_rewarded_quiz(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_rewarded_quiz_answer(p_session uuid,p_choice bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();r public.rewarded_quiz_runs%rowtype;
 correct_id bigint;right_answer boolean;award integer;new_score integer;
 next_question jsonb;result jsonb;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Connexion requise';END IF;
 PERFORM 1 FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 SELECT * INTO r FROM public.rewarded_quiz_runs
 WHERE id=p_session AND player_id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Partie introuvable';END IF;
 IF r.status<>'active' THEN RETURN jsonb_build_object('status',r.status,'earned',0);END IF;
 IF r.expires_at<=now() THEN
  UPDATE public.rewarded_quiz_runs SET status='expired',finished_at=now() WHERE id=r.id;
  RETURN jsonb_build_object('status','expired','earned',0,'message','Partie expirée.');
 END IF;
 IF p_choice IS NULL OR NOT EXISTS(
  SELECT 1 FROM jsonb_array_elements(r.question->'options') x
  WHERE (x->>'id')::bigint=p_choice
 ) THEN RAISE EXCEPTION 'Réponse non proposée';END IF;
 correct_id:=(r.question->>'answer')::bigint;
 right_answer:=p_choice=correct_id;
 new_score:=r.correct_count+CASE WHEN right_answer THEN 1 ELSE 0 END;
 award:=CASE WHEN right_answer THEN 10 ELSE 0 END;
 IF r.round=5 AND new_score=5 THEN award:=award+30;END IF;
 IF award>0 THEN
  UPDATE public.player_wallets SET credits=credits+award WHERE player_id=uid;
  INSERT INTO public.game_transactions(player_id,kind,amount)
   VALUES(uid,'quiz',award);
 END IF;
 IF r.round=5 THEN
  UPDATE public.rewarded_quiz_runs SET status='completed',
   correct_count=new_score,credits_awarded=credits_awarded+award,
   finished_at=now() WHERE id=r.id;
  result:=jsonb_build_object('status','completed','score',new_score,'total',5,
   'credits_earned',r.credits_awarded+award);
 ELSE
  next_question:=public.make_rewarded_question(r.mode);
  UPDATE public.rewarded_quiz_runs SET question=next_question,round=round+1,
   correct_count=new_score,credits_awarded=credits_awarded+award WHERE id=r.id;
  SELECT * INTO r FROM public.rewarded_quiz_runs WHERE id=r.id;
  result:=public.rewarded_quiz_snapshot(r);
 END IF;
 RETURN result||jsonb_build_object('correct',right_answer,'correct_answer',correct_id,
  'earned',award,'answered_round',CASE WHEN result->>'status'='completed' THEN 5 ELSE r.round-1 END);
END $$;
REVOKE ALL ON FUNCTION public.submit_rewarded_quiz_answer(uuid,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_rewarded_quiz_answer(uuid,bigint) TO authenticated;
COMMIT;
