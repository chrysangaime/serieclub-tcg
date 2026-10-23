-- SériesClubTCG V1.0 : codes d'invitation publics (pseudonymes, sans e-mail).
-- Un code permet uniquement de suivre un autre joueur, jamais de se connecter.
BEGIN;
CREATE TABLE IF NOT EXISTS public.player_invite_codes(
 owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 invite_code text UNIQUE NOT NULL CHECK(invite_code ~ '^[A-F0-9]{10}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.player_invite_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_invite_codes FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.my_club_invite_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();existing text;attempt integer;choice text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Connexion nécessaire';END IF;
 -- Éviter deux codes créés simultanément pour un même compte.
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable';END IF;
 SELECT invite_code INTO existing FROM public.player_invite_codes WHERE owner_id=uid;
 IF existing IS NOT NULL THEN RETURN existing;END IF;
 FOR attempt IN 1..12 LOOP
  choice:=upper(encode(gen_random_bytes(5),'hex'));
  INSERT INTO public.player_invite_codes(owner_id,invite_code)
  VALUES(uid,choice) ON CONFLICT DO NOTHING;
  IF FOUND THEN RETURN choice;END IF;
 END LOOP;
 RAISE EXCEPTION 'Impossible de créer un code pour le moment';
END $$;
REVOKE ALL ON FUNCTION public.my_club_invite_code() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_club_invite_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.follow_player_by_code(p_code text)
RETURNS TABLE(username text,added boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();target uuid;nickname text;inserted integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Connexion nécessaire';END IF;
 IF p_code IS NULL OR upper(trim(p_code)) !~ '^[A-F0-9]{10}$' THEN
  RAISE EXCEPTION 'Code d’invitation invalide';END IF;
 SELECT c.owner_id,p.username INTO target,nickname
 FROM public.player_invite_codes c JOIN public.profiles p ON p.id=c.owner_id
 WHERE c.invite_code=upper(trim(p_code));
 IF target IS NULL THEN RAISE EXCEPTION 'Code d’invitation introuvable';END IF;
 IF target=uid THEN RAISE EXCEPTION 'Impossible de se suivre soi-même';END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profil introuvable';END IF;
 IF (SELECT count(*) FROM public.player_follows f WHERE f.follower_id=uid)>=100
 AND NOT EXISTS(SELECT 1 FROM public.player_follows f
  WHERE f.follower_id=uid AND f.followed_id=target) THEN
  RAISE EXCEPTION 'Limite de 100 abonnements atteinte';END IF;
 INSERT INTO public.player_follows(follower_id,followed_id)
 VALUES(uid,target) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 username:=nickname;added:=inserted=1;
 RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.follow_player_by_code(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.follow_player_by_code(text) TO authenticated;
COMMIT;
