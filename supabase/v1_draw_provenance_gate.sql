-- V1 : filtrage temporaire des nouvelles attributions sur une source indépendante.
-- Ne modifie aucune carte existante, aucun compte, aucun solde.
-- Une origine française TVmaze ne garantit PAS les droits des affiches ; monétisation suspendue.
-- buy_credit_booster : écarter des nouveaux tirages les séries portant une preuve héritée de TMDB.
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
  WHERE m.pack_key=p_pack_key AND m.checked_on>=CURRENT_DATE-90
  AND s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin' AND s.rarity_source<>'pending'
  AND s.image_url LIKE 'https://%')<5 THEN
  RAISE EXCEPTION 'Catalogue France insuffisant ou en actualisation';END IF;
 FOR pos IN 1..5 LOOP
  total:=0;rank_selected:=NULL;
  FOR j IN 1..7 LOOP
   IF EXISTS(SELECT 1 FROM public.credit_booster_members m
    JOIN public.series s ON s.id=m.series_id
    WHERE m.pack_key=p_pack_key AND m.checked_on>=CURRENT_DATE-90
    AND s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin' AND s.rarity_source<>'pending'
    AND s.image_url LIKE 'https://%' AND s.rarity=ranks[j]
    AND NOT(s.id=ANY(used))) THEN total:=total+weights[j];END IF;
  END LOOP;
  IF total<=0 THEN RAISE EXCEPTION 'Plus assez de séries pour ce booster';END IF;
  roll:=random()*total;cursor_weight:=0;
  FOR j IN 1..7 LOOP
   IF EXISTS(SELECT 1 FROM public.credit_booster_members m
    JOIN public.series s ON s.id=m.series_id
    WHERE m.pack_key=p_pack_key AND m.checked_on>=CURRENT_DATE-90
    AND s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin' AND s.rarity_source<>'pending'
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
  WHERE m.pack_key=p_pack_key AND m.checked_on>=CURRENT_DATE-90
   AND s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin' AND s.rarity_source<>'pending'
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

-- list_credit_boosters : écarter des nouveaux tirages les séries portant une preuve héritée de TMDB.
CREATE OR REPLACE FUNCTION public.list_credit_boosters()
 RETURNS TABLE(pack_key text, label text, price_credits integer, eligible_series integer, available boolean, proof_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT p.pack_key,p.label,p.price_credits,count(DISTINCT s.id)::integer,
 (p.enabled AND count(DISTINCT s.id)>=5),max(m.checked_on)
 FROM public.credit_booster_types p
 LEFT JOIN public.credit_booster_members m ON m.pack_key=p.pack_key
  AND m.checked_on>=CURRENT_DATE-90
 LEFT JOIN public.series s ON s.id=m.series_id AND s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin'
  AND s.rarity_source<>'pending' AND s.image_url LIKE 'https://%'
 GROUP BY p.pack_key,p.label,p.price_credits,p.enabled
 ORDER BY CASE p.pack_key WHEN 'netflix' THEN 1 WHEN 'prime' THEN 2
 WHEN 'disney' THEN 3 ELSE 4 END;
$function$
;

-- pick_official_pack : écarter des nouveaux tirages les séries portant une preuve héritée de TMDB.
CREATE OR REPLACE FUNCTION public.pick_official_pack(p_halloween boolean)
 RETURNS TABLE(show_id bigint, show_name text, show_image text, show_rarity text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 used_ids bigint[]:=ARRAY[]::bigint[];
 rank_names text[]:=ARRAY['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
 rank_weights numeric[]:=ARRAY[55,23,12,6,2.5,1.2,0.3];
 rank_position integer;
 pos integer;
 total numeric;
 running numeric;
 drawn numeric;
 chosen_rank text;
 chosen record;
BEGIN
 FOR pos IN 1..5 LOOP
  total:=0;
  chosen_rank:=NULL;
  -- À Halloween, les deux premières positions exigent strictement 'Horror'.
  -- La troisième doit être dans la thématique, et les deux dernières sont libres.
  -- Les sept poids de rareté sont identiques à ceux du paquet Original.
  FOR rank_position IN 1..7 LOOP
   IF EXISTS(
    SELECT 1 FROM public.series s
    WHERE s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin'
      AND s.rarity=rank_names[rank_position]
      AND s.rarity_source<>'pending'
      AND s.image_url LIKE 'https://%'
      AND NOT(s.id=ANY(used_ids))
      AND (
       NOT p_halloween OR pos>3
       OR (pos<=2 AND 'Horror'=ANY(s.genres))
       OR (pos=3 AND s.genres && ARRAY['Horror','Supernatural','Thriller','Mystery']::text[])
      )
   ) THEN
    total:=total+rank_weights[rank_position];
   END IF;
  END LOOP;
  -- Ne jamais compléter un paquet Halloween avec des cartes hors thème
  -- si le catalogue certifié France ne contient pas assez de séries.
  IF total<=0 THEN
   RAISE EXCEPTION 'Catalogue Halloween insuffisant';
  END IF;
  drawn:=random()*total;
  running:=0;
  FOR rank_position IN 1..7 LOOP
   IF EXISTS(
    SELECT 1 FROM public.series s
    WHERE s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin'
      AND s.rarity=rank_names[rank_position]
      AND s.rarity_source<>'pending'
      AND s.image_url LIKE 'https://%'
      AND NOT(s.id=ANY(used_ids))
      AND (
       NOT p_halloween OR pos>3
       OR (pos<=2 AND 'Horror'=ANY(s.genres))
       OR (pos=3 AND s.genres && ARRAY['Horror','Supernatural','Thriller','Mystery']::text[])
      )
   ) THEN
    running:=running+rank_weights[rank_position];
    IF drawn<running THEN
     chosen_rank:=rank_names[rank_position];
     EXIT;
    END IF;
   END IF;
  END LOOP;
  IF chosen_rank IS NULL THEN RAISE EXCEPTION 'Tirage impossible';END IF;

  -- Tirage aléatoire pondéré par popularité *dans le rang sélectionné* :
  -- les séries reconnues ont davantage de chances d'apparaître,
  -- mais leur rareté officielle ne change pas.
  SELECT s.id AS sid,s.name AS title,s.image_url AS artwork,s.rarity AS official
   INTO chosen FROM public.series s
   WHERE s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin'
    AND s.rarity=chosen_rank
    AND s.rarity_source<>'pending'
    AND s.image_url LIKE 'https://%'
    AND NOT(s.id=ANY(used_ids))
    AND (
     NOT p_halloween OR pos>3
     OR (pos<=2 AND 'Horror'=ANY(s.genres))
     OR (pos=3 AND s.genres && ARRAY['Horror','Supernatural','Thriller','Mystery']::text[])
    )
   ORDER BY
    CASE WHEN p_halloween
     THEN -ln(greatest(random(),0.000000000001::double precision))
          / greatest(coalesce(s.popularity_weight,1),1)
     ELSE random()
    END
   LIMIT 1;
  IF chosen.sid IS NULL THEN RAISE EXCEPTION 'Série éligible introuvable';END IF;
  used_ids:=array_append(used_ids,chosen.sid);
  show_id:=chosen.sid;
  show_name:=chosen.title;
  show_image:=chosen.artwork;
  show_rarity:=chosen.official;
  RETURN NEXT;
 END LOOP;
END $function$
;
