-- SériesClubTCG V1.0 - INSTALLATION PRELANCEMENT
-- À exécuter une seule fois dans l'éditeur SQL Supabase.
-- Prérequis : migrations historique V4 (Comptoir + Le Signal) et V20 (collection).
-- N'écrase ni les cartes ni les crédits existants ; n'ouvre aucun paiement en euros.
-- Les opérations de recyclage resteront désactivées dans l'interface tant
-- que cette migration n'aura pas été exécutée avec succès.

-- SériesClubTCG V1.0 : recyclage groupé sécurisé, exclusivement en crédits virtuels.
-- Migration additive : ne modifie ni les cartes ni le solde préexistants.
BEGIN;
CREATE TABLE IF NOT EXISTS public.player_recycle_daily (
 player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 paris_day date NOT NULL,
 cards_used integer NOT NULL DEFAULT 0 CHECK(cards_used BETWEEN 0 AND 60),
 PRIMARY KEY(player_id,paris_day)
);
ALTER TABLE public.player_recycle_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_recycle_daily FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.recycle_duplicate_cards(p_card_ids uuid[])
RETURNS TABLE(cards_recycled integer,credits_earned bigint,credits_balance bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 uid uuid:=auth.uid();
 n integer;actual integer;used_today integer;reward bigint:=0;balance bigint;
 item record;
 today_paris date:=(now() AT TIME ZONE 'Europe/Paris')::date;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid) THEN
  RAISE EXCEPTION 'Profil requis';END IF;
 n:=COALESCE(cardinality(p_card_ids),0);
 IF n<1 OR n>20 OR EXISTS(SELECT 1 FROM unnest(p_card_ids) AS x(id) WHERE id IS NULL)
  OR (SELECT count(DISTINCT id) FROM unnest(p_card_ids) AS x(id))<>n THEN
  RAISE EXCEPTION 'Sélection invalide : 1 à 20 exemplaires distincts';END IF;

 -- Le portefeuille sérialise les recyclages concurrents (même avec deux onglets).
 INSERT INTO public.player_wallets(player_id) VALUES(uid) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 INSERT INTO public.player_recycle_daily(player_id,paris_day,cards_used)
 VALUES(uid,today_paris,0) ON CONFLICT DO NOTHING;
 SELECT cards_used INTO used_today FROM public.player_recycle_daily
 WHERE player_id=uid AND paris_day=today_paris FOR UPDATE;
 IF used_today+n>60 THEN RAISE EXCEPTION 'Quota de recyclage journalier atteint';END IF;

 -- Verrouiller les lignes avant de valider leur propriétaire et leur disponibilité.
 PERFORM 1 FROM public.player_cards c WHERE c.id=ANY(p_card_ids)
 ORDER BY c.id FOR UPDATE OF c;
 SELECT count(*),COALESCE(sum(
  CASE c.rarity WHEN 'Commune' THEN 3 WHEN 'Peu commune' THEN 5
   WHEN 'Rare' THEN 8 WHEN 'Épique' THEN 12 WHEN 'Légendaire' THEN 20
   WHEN 'Mythique' THEN 25 WHEN 'Unique' THEN 35 ELSE 0 END),0)
 INTO actual,reward
 FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
 WHERE c.id=ANY(p_card_ids) AND c.owner_id=uid
  AND NOT c.locked AND c.reserved_trade_id IS NULL
  AND s.fr_verified IS TRUE AND s.rarity_source<>'pending' AND s.rarity=c.rarity
  AND NOT EXISTS(SELECT 1 FROM public.card_listings l
                 WHERE l.card_id=c.id AND l.status='active');
 IF actual<>n OR reward<=0 THEN
  RAISE EXCEPTION 'Une carte est protégée, engagée, étrangère ou non admissible';END IF;

 -- Une série doit toujours posséder au moins un exemplaire APRÈS le recyclage.
 FOR item IN
  SELECT c.series_id,count(*) AS recycled FROM public.player_cards c
  WHERE c.id=ANY(p_card_ids) GROUP BY c.series_id
 LOOP
  IF (SELECT count(*) FROM public.player_cards c
      WHERE c.owner_id=uid AND c.series_id=item.series_id)<=item.recycled THEN
    RAISE EXCEPTION 'Le dernier exemplaire d’une série ne peut pas être recyclé';
  END IF;
 END LOOP;

 DELETE FROM public.player_cards c WHERE c.id=ANY(p_card_ids) AND c.owner_id=uid;
 GET DIAGNOSTICS actual=ROW_COUNT;
 IF actual<>n THEN RAISE EXCEPTION 'Recyclage incomplet : transaction annulée';END IF;
 UPDATE public.player_wallets w SET credits=w.credits+reward
 WHERE w.player_id=uid RETURNING w.credits INTO balance;
 UPDATE public.player_recycle_daily SET cards_used=cards_used+n
 WHERE player_id=uid AND paris_day=today_paris;
 INSERT INTO public.game_transactions(player_id,kind,amount)
 VALUES(uid,'duplicate_recycle',reward);
 RETURN QUERY SELECT n,reward,balance;
END $$;
REVOKE ALL ON FUNCTION public.recycle_duplicate_cards(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.recycle_duplicate_cards(uuid[]) TO authenticated;

-- L'interface active la sélection uniquement après confirmation par le serveur.
CREATE OR REPLACE FUNCTION public.my_recycling_status()
RETURNS TABLE(cards_used integer,cards_remaining integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT COALESCE((SELECT d.cards_used FROM public.player_recycle_daily d
   WHERE d.player_id=auth.uid()
    AND d.paris_day=(now() AT TIME ZONE 'Europe/Paris')::date),0)::integer,
 (60-COALESCE((SELECT d.cards_used FROM public.player_recycle_daily d
   WHERE d.player_id=auth.uid()
    AND d.paris_day=(now() AT TIME ZONE 'Europe/Paris')::date),0))::integer
 WHERE auth.uid() IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.my_recycling_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_recycling_status() TO authenticated;
COMMIT;


-- Étape 2 : code d'invitation et abonnements.
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
