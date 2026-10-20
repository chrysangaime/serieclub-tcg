-- SERIECLUB V5 : UNE RARETÉ PAR SÉRIE, JAMAIS PAR EXEMPLAIRE.
-- Exécuter APRÈS game_v4.sql (et ses prérequis). Aucune clé secrète requise.
-- TVmaze weight : indicateur de popularité, pas une audience TV certifiée.
-- Les trois références exigées : Lost (2004), Stranger Things et
-- The X-Files (1993) sont toutes LÉGENDAIRES (ni Commune ni Mythique).
-- Les cartes existantes sont uniformisées. Les annonces d'une carte dont la
-- rareté change sont annulées et les propositions associées libérées.
BEGIN;
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'Commune';
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS popularity_weight numeric(7,2);
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS rating_average numeric(4,2);
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS rarity_source text NOT NULL DEFAULT 'pending';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='sc_series_rarity_check') THEN
  ALTER TABLE public.series ADD CONSTRAINT sc_series_rarity_check
  CHECK(rarity IN ('Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='sc_rarity_source_check') THEN
  ALTER TABLE public.series ADD CONSTRAINT sc_rarity_source_check
  CHECK(rarity_source IN ('pending','popularity','editorial','manual'));
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS sc_series_rarity_index
 ON public.series(rarity,rarity_source) WHERE image_url IS NOT NULL;

-- Exceptions limitées AUX 3 SÉRIES DEMANDÉES.
-- Les années empêchent de classer un remake/homonyme par erreur.
CREATE OR REPLACE FUNCTION public.official_iconic_rarity(p_name text,p_premiered date)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT CASE
 WHEN lower(trim(p_name))='lost' AND
      extract(year FROM p_premiered) BETWEEN 2004 AND 2005 THEN 'Légendaire'
 WHEN lower(trim(p_name))='stranger things' AND
      extract(year FROM p_premiered) BETWEEN 2016 AND 2017 THEN 'Légendaire'
 WHEN lower(trim(p_name)) IN
    ('the x-files','the x files','x-files','x files','xfiles') AND
      extract(year FROM p_premiered) BETWEEN 1993 AND 1994 THEN 'Légendaire'
 ELSE NULL END;
$$;

-- Barème déterministe fondé sur le poids de popularité TVmaze (0 à 100).
-- La note artistique est conservée dans le catalogue, mais n'invente
-- ni audiences ni célébrité. Un rang est FIGÉ après classement.
CREATE OR REPLACE FUNCTION public.popularity_to_rarity(p_weight numeric)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT CASE
 WHEN p_weight>=99 THEN 'Unique'
 WHEN p_weight>=95 THEN 'Mythique'
 WHEN p_weight>=87 THEN 'Légendaire'
 WHEN p_weight>=75 THEN 'Épique'
 WHEN p_weight>=60 THEN 'Rare'
 WHEN p_weight>=40 THEN 'Peu commune'
 ELSE 'Commune' END;
$$;

CREATE OR REPLACE FUNCTION public.assign_series_official_rarity()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE iconic text;
BEGIN
 iconic:=public.official_iconic_rarity(NEW.name,NEW.premiered);
 IF TG_OP='INSERT' THEN
  IF iconic IS NOT NULL THEN
   NEW.rarity:=iconic;
   NEW.rarity_source:='editorial';
  ELSE
   NEW.rarity:=public.popularity_to_rarity(NEW.popularity_weight);
   NEW.rarity_source:=CASE WHEN NEW.popularity_weight IS NULL
    THEN 'pending' ELSE 'popularity' END;
  END IF;
  RETURN NEW;
 END IF;
 -- OLD n'est consulté que pour une opération UPDATE.
 IF OLD.rarity_source='manual' THEN
  NEW.rarity:=OLD.rarity;NEW.rarity_source:='manual';
 ELSIF iconic IS NOT NULL THEN
  NEW.rarity:=iconic;NEW.rarity_source:='editorial';
 ELSIF OLD.rarity_source='pending' AND NEW.popularity_weight IS NOT NULL THEN
  NEW.rarity:=public.popularity_to_rarity(NEW.popularity_weight);
  NEW.rarity_source:='popularity';
 ELSE
  NEW.rarity:=OLD.rarity;NEW.rarity_source:=OLD.rarity_source;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_assign_series_official_rarity ON public.series;
CREATE TRIGGER sc_assign_series_official_rarity
 BEFORE INSERT OR UPDATE OF name,premiered,popularity_weight,rating_average
 ON public.series FOR EACH ROW EXECUTE FUNCTION public.assign_series_official_rarity();

-- Premier classement : les titres sans score restent marqués 'pending'.
-- Ils ne peuvent pas être tirés avant le prochain import TVmaze.
UPDATE public.series s
 SET rarity=CASE WHEN public.official_iconic_rarity(s.name,s.premiered) IS NOT NULL
    THEN 'Légendaire'
    ELSE public.popularity_to_rarity(s.popularity_weight) END,
 rarity_source=CASE WHEN public.official_iconic_rarity(s.name,s.premiered) IS NOT NULL
    THEN 'editorial'
    WHEN s.popularity_weight IS NULL THEN 'pending'
    ELSE 'popularity' END
 WHERE s.rarity_source='pending'
   OR (s.rarity_source='editorial'
      AND public.official_iconic_rarity(s.name,s.premiered) IS NOT NULL);

-- Lors d'une reclassification : libérer les cartes en échange et annuler
-- les annonces qui concernaient une série dont le rang a changé.
CREATE OR REPLACE FUNCTION public.reclassify_owned_cards()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 -- Annuler les offres sur l'annonce impactée OU utilisant la carte impactée.
 UPDATE public.card_trade_offers o
 SET status='declined',closed_at=now()
 WHERE o.status='pending' AND (
   o.offered_card_id IN (SELECT c.id FROM public.player_cards c WHERE c.series_id=NEW.id)
   OR o.listing_id IN (
     SELECT l.id FROM public.card_listings l
     JOIN public.player_cards c ON c.id=l.card_id WHERE c.series_id=NEW.id
   )
 );
 -- Annuler uniquement les annonces de la série modifiée.
 UPDATE public.card_listings l SET status='cancelled',closed_at=now()
 WHERE l.status='active' AND l.card_id IN
   (SELECT c.id FROM public.player_cards c WHERE c.series_id=NEW.id);
 UPDATE public.player_cards c SET reserved_trade_id=NULL
 WHERE c.reserved_trade_id IN (SELECT o.id FROM public.card_trade_offers o
  WHERE o.status='declined' AND o.closed_at=now());
 UPDATE public.player_cards SET rarity=NEW.rarity WHERE series_id=NEW.id;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS sc_sync_series_rarity ON public.series;
CREATE TRIGGER sc_sync_series_rarity
 AFTER UPDATE OF rarity ON public.series FOR EACH ROW
 WHEN (OLD.rarity IS DISTINCT FROM NEW.rarity)
 EXECUTE FUNCTION public.reclassify_owned_cards();

-- Anciens exemplaires : un rang unique à partir de maintenant.
-- Annuler les transactions en cours pour ne pas changer leur valeur
-- alors que l'offre est déjà diffusée.
DO $$
BEGIN
 IF EXISTS(
   SELECT 1 FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
   WHERE c.rarity IS DISTINCT FROM s.rarity
 ) THEN
  UPDATE public.card_trade_offers SET status='declined',closed_at=now()
   WHERE status='pending';
  UPDATE public.card_listings SET status='cancelled',closed_at=now()
   WHERE status='active';
  UPDATE public.player_cards SET reserved_trade_id=NULL
   WHERE reserved_trade_id IS NOT NULL;
 END IF;
END $$;
UPDATE public.player_cards c SET rarity=s.rarity
FROM public.series s WHERE c.series_id=s.id AND c.rarity IS DISTINCT FROM s.rarity;

-- Même une ancienne RPC de tirage ne peut plus créer des versions multiples
-- d'une série : la BDD écrase le rang de l'exemplaire avec l'officiel.
CREATE OR REPLACE FUNCTION public.enforce_card_series_rarity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE official text;
BEGIN
 SELECT s.rarity INTO official FROM public.series s WHERE s.id=NEW.series_id;
 IF official IS NULL THEN RAISE EXCEPTION 'Série inconnue'; END IF;
 NEW.rarity:=official;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_enforce_card_series_rarity ON public.player_cards;
CREATE TRIGGER sc_enforce_card_series_rarity
 BEFORE INSERT OR UPDATE OF series_id,rarity ON public.player_cards
 FOR EACH ROW EXECUTE FUNCTION public.enforce_card_series_rarity();

-- Tirage par rang disponible puis série de ce rang.
-- Tirage aléatoire de la SÉRIE uniquement, pas de rareté de la carte.
-- Seules les séries définitivement classées sont éligibles.
CREATE OR REPLACE FUNCTION public.pick_official_pack(p_halloween boolean)
RETURNS TABLE(show_id bigint,show_name text,show_image text,show_rarity text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 used_ids bigint[]:=ARRAY[]::bigint[];
 rank_names text[]:=ARRAY['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
 rank_weights numeric[]:=ARRAY[55,23,12,6,2.5,1.2,0.3];
 rank_position integer; pos integer; total numeric; running numeric;
 drawn numeric; chosen_rank text; chosen record;
BEGIN
 FOR pos IN 1..5 LOOP
  total:=0; chosen_rank:=NULL;
  FOR rank_position IN 1..7 LOOP
   IF EXISTS(SELECT 1 FROM public.series s
    WHERE s.rarity=rank_names[rank_position] AND s.rarity_source<>'pending'
     AND s.image_url IS NOT NULL AND NOT (s.id=ANY(used_ids))
     AND (NOT (p_halloween AND pos=1)
      OR s.genres&&ARRAY['Horror','Thriller','Supernatural']::text[])) THEN
    total:=total+rank_weights[rank_position];
   END IF;
  END LOOP;
  IF total<=0 THEN
   RAISE EXCEPTION 'Catalogue classé insuffisant : synchronise TVmaze';
  END IF;
  drawn:=random()*total;running:=0;
  FOR rank_position IN 1..7 LOOP
   IF EXISTS(SELECT 1 FROM public.series s
    WHERE s.rarity=rank_names[rank_position] AND s.rarity_source<>'pending'
     AND s.image_url IS NOT NULL AND NOT (s.id=ANY(used_ids))
     AND (NOT (p_halloween AND pos=1)
      OR s.genres&&ARRAY['Horror','Thriller','Supernatural']::text[])) THEN
    running:=running+rank_weights[rank_position];
    IF drawn<running THEN chosen_rank:=rank_names[rank_position];EXIT;END IF;
   END IF;
  END LOOP;
  IF chosen_rank IS NULL THEN RAISE EXCEPTION 'Tirage impossible'; END IF;
  SELECT s.id AS sid,s.name AS title,s.image_url AS artwork,s.rarity AS official
   INTO chosen FROM public.series s
  WHERE s.rarity=chosen_rank AND s.rarity_source<>'pending'
   AND s.image_url IS NOT NULL AND NOT(s.id=ANY(used_ids))
   AND (NOT (p_halloween AND pos=1)
    OR s.genres&&ARRAY['Horror','Thriller','Supernatural']::text[])
  ORDER BY random() LIMIT 1;
  IF chosen.sid IS NULL THEN RAISE EXCEPTION 'Série indisponible';END IF;
  used_ids:=array_append(used_ids,chosen.sid);
  show_id:=chosen.sid;show_name:=chosen.title;
  show_image:=chosen.artwork;show_rarity:=chosen.official;
  RETURN NEXT;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.pick_official_pack(boolean) FROM PUBLIC;

-- Booster classique : le serveur renvoie exactement le rang fixé sur la série.
CREATE OR REPLACE FUNCTION public.open_starter_booster()
RETURNS TABLE(card_id uuid,series_id bigint,name text,image_url text,rarity text,
 credits bigint,experience bigint,next_booster_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 uid uuid:=auth.uid(); w public.player_wallets%rowtype;
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
  n:=n+1;
  card_id:=new_id;series_id:=selected.show_id;name:=selected.show_name;
  image_url:=selected.show_image;rarity:=selected.show_rarity;
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
END $$;
REVOKE ALL ON FUNCTION public.open_starter_booster() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_starter_booster() TO authenticated;

-- Booster Halloween : mêmes rangs officiels, première série Horror garantie.
CREATE OR REPLACE FUNCTION public.open_halloween_booster()
RETURNS TABLE(card_id uuid,series_id bigint,name text,image_url text,rarity text,
 credits bigint,experience bigint,next_booster_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 uid uuid:=auth.uid();w public.player_wallets%rowtype;
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
  n:=n+1;
  card_id:=new_id;series_id:=selected.show_id;name:=selected.show_name;
  image_url:=selected.show_image;rarity:=selected.show_rarity;
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
END $$;
REVOKE ALL ON FUNCTION public.open_halloween_booster() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_halloween_booster() TO authenticated;

-- Fusion : 10 cartes d'un même rang donnent UNE AUTRE série déjà classée
-- au rang supérieur. La série obtenue n'a jamais de version de rang inférieur.
CREATE OR REPLACE FUNCTION public.fuse_cards(p_card_ids uuid[])
RETURNS TABLE(card_id uuid,series_id bigint,name text,image_url text,rarity text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 uid uuid:=auth.uid();source_rank text;target_rank text;
 ranks text[]:=ARRAY['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
 idx integer;chosen record;new_id uuid;n integer;removed integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Connexion requise';END IF;
 IF p_card_ids IS NULL OR coalesce(array_length(p_card_ids,1),0)<>10 OR
   (SELECT count(DISTINCT v) FROM unnest(p_card_ids) v)<>10 THEN
  RAISE EXCEPTION 'Sélectionne dix cartes distinctes';END IF;
 PERFORM 1 FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 PERFORM 1 FROM public.player_cards c WHERE c.id=ANY(p_card_ids)
  AND c.owner_id=uid ORDER BY c.id FOR UPDATE;
 SELECT count(*),min(c.rarity) INTO n,source_rank FROM public.player_cards c
 WHERE c.id=ANY(p_card_ids) AND c.owner_id=uid AND NOT c.locked
  AND c.reserved_trade_id IS NULL
  AND NOT EXISTS(SELECT 1 FROM public.card_listings l
   WHERE l.card_id=c.id AND l.status='active');
 IF n<>10 THEN RAISE EXCEPTION 'Cartes protégées ou réservées';END IF;
 IF (SELECT count(DISTINCT c.rarity) FROM public.player_cards c
  WHERE c.id=ANY(p_card_ids) AND c.owner_id=uid)<>1 THEN
  RAISE EXCEPTION 'Les dix cartes doivent avoir la même rareté';END IF;
 idx:=array_position(ranks,source_rank);
 IF idx IS NULL OR idx>=7 THEN RAISE EXCEPTION 'Fusion impossible pour ce rang';END IF;
 target_rank:=ranks[idx+1];
 SELECT s.id AS sid,s.name AS title,s.image_url AS artwork,s.rarity AS official
  INTO chosen FROM public.series s WHERE s.rarity=target_rank
  AND s.rarity_source<>'pending' AND s.image_url IS NOT NULL
  ORDER BY random() LIMIT 1;
 IF chosen.sid IS NULL THEN RAISE EXCEPTION 'Pas de série du rang supérieur';END IF;
 DELETE FROM public.player_cards c
  WHERE c.id=ANY(p_card_ids) AND c.owner_id=uid AND NOT c.locked
  AND c.reserved_trade_id IS NULL;
 GET DIAGNOSTICS removed=ROW_COUNT;
 IF removed<>10 THEN RAISE EXCEPTION 'Fusion annulée';END IF;
 INSERT INTO public.player_cards(owner_id,series_id,rarity)
  VALUES(uid,chosen.sid,chosen.official) RETURNING id INTO new_id;
 UPDATE public.player_wallets SET fusion_count=fusion_count+1,
  experience=experience+100 WHERE player_id=uid;
 INSERT INTO public.game_transactions(player_id,kind,amount) VALUES(uid,'fusion',0);
 card_id:=new_id;series_id:=chosen.sid;name:=chosen.title;
 image_url:=chosen.artwork;rarity:=chosen.official;RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.fuse_cards(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fuse_cards(uuid[]) TO authenticated;

-- Lecture uniquement : fiches, tri, catalogue et vérifications.
CREATE OR REPLACE FUNCTION public.get_series_rarity(p_show_id bigint)
RETURNS TABLE(official_rarity text,source text,popularity numeric)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT s.rarity,s.rarity_source,s.popularity_weight
 FROM public.series s WHERE s.id=p_show_id;
$$;
REVOKE ALL ON FUNCTION public.get_series_rarity(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_series_rarity(bigint) TO authenticated,anon;

COMMIT;
