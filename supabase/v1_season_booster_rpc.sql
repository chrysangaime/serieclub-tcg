-- New cards receive a TVmaze season variant in BEFORE INSERT trigger.
-- RPC signatures, server-side rarity weighting, wallet transactions and Halloween rules unchanged.
CREATE OR REPLACE FUNCTION public.open_starter_booster()
 RETURNS TABLE(card_id uuid, series_id bigint, name text, image_url text, rarity text, credits bigint, experience bigint, next_booster_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 uid uuid:=auth.uid(); w public.player_wallets%rowtype;
 variant_no integer; variant_image text;
 selected record; new_id uuid;n integer:=0;
 steps integer;available integer;base_at timestamptz;now_at timestamptz:=now();
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid)
 THEN RAISE EXCEPTION 'Profil requis';END IF;
 INSERT INTO public.player_wallets(player_id) VALUES(uid)
 ON CONFLICT(player_id) DO NOTHING;
 SELECT * INTO w FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 steps:=greatest(0,floor(extract(epoch FROM(now_at-w.booster_anchor))/600)::integer);
 available:=least(10,w.booster_stock+steps);
 IF available<1 THEN RAISE EXCEPTION 'Réserve vide';END IF;
 base_at:=CASE WHEN available=10 THEN now_at
 ELSE w.booster_anchor+make_interval(secs=>steps*600) END;
 FOR selected IN SELECT * FROM public.pick_official_pack(false) LOOP
  INSERT INTO public.player_cards(owner_id,series_id,rarity)
   VALUES(uid,selected.show_id,selected.show_rarity) RETURNING id INTO new_id;
  SELECT ss.season_number,ss.image_url INTO variant_no,variant_image
   FROM public.player_cards pc
   JOIN public.series_seasons ss ON ss.series_id=pc.series_id
     AND ss.season_number=pc.season_number
   WHERE pc.id=new_id;
  n:=n+1;
  card_id:=new_id;series_id:=selected.show_id;
  name:=selected.show_name||CASE WHEN variant_no IS NOT NULL
    THEN ' · Saison '||variant_no ELSE '' END;
  image_url:=coalesce(variant_image,selected.show_image);rarity:=selected.show_rarity;
  credits:=w.credits+25;experience:=w.experience+50;
  next_booster_at:=CASE WHEN available=1 THEN base_at+interval '10 minutes' ELSE now_at END;
  RETURN NEXT;
 END LOOP;
 IF n<>5 THEN RAISE EXCEPTION 'Paquet incomplet';END IF;
 UPDATE public.player_wallets SET booster_stock=available-1,
  booster_anchor=base_at,last_booster_at=now_at,
  credits=player_wallets.credits+25,experience=player_wallets.experience+50,
  boosters_opened=player_wallets.boosters_opened+1 WHERE player_id=uid;
 INSERT INTO public.game_transactions(player_id,kind,amount) VALUES(uid,'booster',25);
END $function$


CREATE OR REPLACE FUNCTION public.open_halloween_booster()
 RETURNS TABLE(card_id uuid, series_id bigint, name text, image_url text, rarity text, credits bigint, experience bigint, next_booster_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 uid uuid:=auth.uid();w public.player_wallets%rowtype;
 variant_no integer; variant_image text;
 selected record;new_id uuid;n integer:=0;
 steps integer;available integer;base_at timestamptz;now_at timestamptz:=now();
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid)
 THEN RAISE EXCEPTION 'Profil requis';END IF;
 IF extract(month FROM(now_at AT TIME ZONE 'Europe/Paris'))<>10 THEN
  RAISE EXCEPTION 'Halloween est disponible uniquement en octobre';END IF;
 INSERT INTO public.player_wallets(player_id) VALUES(uid)
 ON CONFLICT(player_id) DO NOTHING;
 SELECT * INTO w FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 steps:=greatest(0,floor(extract(epoch FROM(now_at-w.booster_anchor))/600)::integer);
 available:=least(10,w.booster_stock+steps);
 IF available<1 THEN RAISE EXCEPTION 'Réserve vide';END IF;
 base_at:=CASE WHEN available=10 THEN now_at
 ELSE w.booster_anchor+make_interval(secs=>steps*600) END;
 FOR selected IN SELECT * FROM public.pick_official_pack(true) LOOP
  INSERT INTO public.player_cards(owner_id,series_id,rarity)
   VALUES(uid,selected.show_id,selected.show_rarity) RETURNING id INTO new_id;
  SELECT ss.season_number,ss.image_url INTO variant_no,variant_image
   FROM public.player_cards pc
   JOIN public.series_seasons ss ON ss.series_id=pc.series_id
     AND ss.season_number=pc.season_number
   WHERE pc.id=new_id;
  n:=n+1;
  card_id:=new_id;series_id:=selected.show_id;
  name:=selected.show_name||CASE WHEN variant_no IS NOT NULL
    THEN ' · Saison '||variant_no ELSE '' END;
  image_url:=coalesce(variant_image,selected.show_image);rarity:=selected.show_rarity;
  credits:=w.credits+25;experience:=w.experience+50;
  next_booster_at:=CASE WHEN available=1 THEN base_at+interval '10 minutes' ELSE now_at END;
  RETURN NEXT;
 END LOOP;
 IF n<>5 THEN RAISE EXCEPTION 'Paquet incomplet';END IF;
 UPDATE public.player_wallets SET booster_stock=available-1,
  booster_anchor=base_at,last_booster_at=now_at,
  credits=player_wallets.credits+25,experience=player_wallets.experience+50,
  boosters_opened=player_wallets.boosters_opened+1 WHERE player_id=uid;
 INSERT INTO public.game_transactions(player_id,kind,amount) VALUES(uid,'halloween',25);
END $function$

