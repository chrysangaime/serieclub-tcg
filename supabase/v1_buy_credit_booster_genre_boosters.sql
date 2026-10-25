CREATE OR REPLACE FUNCTION public.buy_credit_booster(p_pack_key text)
 RETURNS TABLE(card_id uuid, series_id bigint, name text, image_url text, rarity text, credits bigint, experience bigint, next_booster_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE uid uuid:=auth.uid();cfg public.credit_booster_types%rowtype;
 wallet public.player_wallets%rowtype;used bigint[]:=ARRAY[]::bigint[];
 ranks text[]:=ARRAY['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
 weights numeric[]:=ARRAY[55,23,12,6,2.5,1.2,0.3];
 j integer;pos integer;total numeric;roll numeric;cursor_weight numeric;
 rank_selected text;show record;generated uuid;variant_no integer;variant_image text;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid) THEN
  RAISE EXCEPTION 'Profil requis pour acheter un paquet';END IF;
 SELECT * INTO cfg FROM public.credit_booster_types p WHERE p.pack_key=p_pack_key AND p.enabled;
 IF NOT FOUND THEN RAISE EXCEPTION 'Booster indisponible';END IF;
 INSERT INTO public.player_wallets(player_id) VALUES(uid) ON CONFLICT DO NOTHING;
 SELECT * INTO wallet FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 IF wallet.credits<cfg.price_credits THEN RAISE EXCEPTION 'Crédits insuffisants';END IF;
 IF (SELECT count(DISTINCT s.id) FROM public.credit_booster_members m
  JOIN public.series s ON s.id=m.series_id
  WHERE m.pack_key=p_pack_key AND (m.pack_key LIKE 'genre_%' OR m.checked_on>=CURRENT_DATE-90)
  AND s.content_status='series' AND s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin' AND s.rarity_source<>'pending'
  AND s.image_url LIKE 'https://%')<5 THEN
  RAISE EXCEPTION 'Catalogue France insuffisant ou en actualisation';END IF;
 FOR pos IN 1..5 LOOP
  total:=0;rank_selected:=NULL;
  FOR j IN 1..7 LOOP
   IF EXISTS(SELECT 1 FROM public.credit_booster_members m
    JOIN public.series s ON s.id=m.series_id
    WHERE m.pack_key=p_pack_key AND (m.pack_key LIKE 'genre_%' OR m.checked_on>=CURRENT_DATE-90)
    AND s.content_status='series' AND s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin' AND s.rarity_source<>'pending'
    AND s.image_url LIKE 'https://%' AND s.rarity=ranks[j]
    AND NOT(s.id=ANY(used))) THEN total:=total+weights[j];END IF;
  END LOOP;
  IF total<=0 THEN RAISE EXCEPTION 'Plus assez de séries pour ce booster';END IF;
  roll:=random()*total;cursor_weight:=0;
  FOR j IN 1..7 LOOP
   IF EXISTS(SELECT 1 FROM public.credit_booster_members m
    JOIN public.series s ON s.id=m.series_id
    WHERE m.pack_key=p_pack_key AND (m.pack_key LIKE 'genre_%' OR m.checked_on>=CURRENT_DATE-90)
    AND s.content_status='series' AND s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin' AND s.rarity_source<>'pending'
    AND s.image_url LIKE 'https://%' AND s.rarity=ranks[j]
    AND NOT(s.id=ANY(used))) THEN
    cursor_weight:=cursor_weight+weights[j];
    IF roll<cursor_weight THEN rank_selected:=ranks[j];EXIT;END IF;
   END IF;
  END LOOP;
  IF rank_selected IS NULL THEN RAISE EXCEPTION 'Rareté indisponible';END IF;
  SELECT s.id AS sid,s.name AS title,s.image_url AS artwork,s.rarity AS official
   INTO show FROM public.credit_booster_members m
   JOIN public.series s ON s.id=m.series_id
  WHERE m.pack_key=p_pack_key AND (m.pack_key LIKE 'genre_%' OR m.checked_on>=CURRENT_DATE-90)
   AND s.content_status='series' AND s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin' AND s.rarity_source<>'pending'
   AND s.image_url LIKE 'https://%' AND s.rarity=rank_selected
   AND NOT (s.id=ANY(used))
  ORDER BY random() LIMIT 1;
  IF show.sid IS NULL THEN RAISE EXCEPTION 'Série indisponible';END IF;
  used:=array_append(used,show.sid);
  INSERT INTO public.player_cards(owner_id,series_id,rarity)
  VALUES(uid,show.sid,show.official) RETURNING id INTO generated;
  SELECT ss.season_number,ss.image_url INTO variant_no,variant_image
   FROM public.player_cards pc JOIN public.series_seasons ss
   ON ss.series_id=pc.series_id AND ss.season_number=pc.season_number
   WHERE pc.id=generated;
  card_id:=generated;series_id:=show.sid;
  name:=show.title||CASE WHEN variant_no IS NOT NULL
   THEN ' · Saison '||variant_no ELSE '' END;
  image_url:=coalesce(variant_image,show.artwork);rarity:=show.official;
  credits:=wallet.credits-cfg.price_credits;experience:=wallet.experience;
  next_booster_at:=NULL;
  RETURN NEXT;
 END LOOP;
 IF cardinality(used)<>5 THEN RAISE EXCEPTION 'Booster incomplet';END IF;
 UPDATE public.player_wallets SET
  credits=player_wallets.credits-cfg.price_credits,
  boosters_opened=player_wallets.boosters_opened+1
 WHERE player_id=uid AND player_wallets.credits>=cfg.price_credits;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant';END IF;
 INSERT INTO public.game_transactions(player_id,kind,amount)
 VALUES(uid,'credit_pack_'||cfg.pack_key,-cfg.price_credits);
END $function$
;
