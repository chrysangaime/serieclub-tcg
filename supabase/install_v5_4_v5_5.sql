-- SérieClub TCG — INSTALLATION UNIQUE FRANCE V5.4 + CORRECTIF V5.5
-- Le script est transactionnel : si une erreur survient, aucune modification
-- n'est validée. Compatible avec une V5.4 déjà partiellement installée.
-- Les anciennes cartes non éligibles ne sont JAMAIS supprimées :
-- elles sortent du classement/jeu et restent sauvegardées en base.
-- Les annonces et propositions encore ouvertes de séries exclues sont annulées.
-- PRÉREQUIS : V4 et V5 raretés fixes déjà installées.
BEGIN;

-- ===== FILTRE FRANCE ET PREMIÈRES PREUVES =====
ALTER TABLE public.series
 ADD COLUMN IF NOT EXISTS fr_verified boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS fr_verification_method text,
 ADD COLUMN IF NOT EXISTS fr_evidence_url text,
 ADD COLUMN IF NOT EXISTS fr_verified_at timestamptz;

DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sc_fr_evidence_check'
   AND conrelid='public.series'::regclass) THEN
  ALTER TABLE public.series ADD CONSTRAINT sc_fr_evidence_check
  CHECK(
   NOT fr_verified
   OR (
     fr_verification_method IS NOT NULL
     AND fr_verification_method IN
       ('editorial_fr_history','tmdb_fr_offer','tvmaze_fr_origin')
     AND fr_evidence_url IS NOT NULL
     AND left(fr_evidence_url,8)='https://'
     AND length(fr_evidence_url) BETWEEN 13 AND 512
     AND fr_verified_at IS NOT NULL
   )
  );
 END IF;
END $$;

CREATE INDEX IF NOT EXISTS sc_fr_playable_series_idx
 ON public.series(rarity,id) WHERE fr_verified IS TRUE
 AND rarity_source<>'pending' AND image_url IS NOT NULL;

-- Une première sélection de séries identifiées avec une véritable fiche
-- sur un service en France. Année obligatoire pour les homonymes : ex. Lost.
-- Ces liens établissent qu'une série a été proposée en FR, pas qu'elle
-- y est toujours disponible. Les autres séries restent « à vérifier ».
WITH editorial(name,release_year,official_source) AS (
 VALUES
  ('lost',2004,'https://www.disneyplus.com/fr-fr/browse/entity-466b3994-b574-44f1-88bc-63707507a6cb'),
  ('stranger things',2016,'https://www.netflix.com/fr/title/80057281'),
  ('the x-files',1993,'https://www.disneyplus.com/fr-fr/browse/entity-d6a7aec6-72d2-46bb-b337-2cb412df64c8'),
  ('x-files',1993,'https://www.disneyplus.com/fr-fr/browse/entity-d6a7aec6-72d2-46bb-b337-2cb412df64c8'),
  ('how i met your mother',2005,'https://www.disneyplus.com/fr-fr/browse/entity-bc68ac79-3ace-4427-9ec0-5ee6f314d194'),
  ('dark',2017,'https://www.netflix.com/fr/title/80100172'),
  ('better call saul',2015,'https://www.netflix.com/fr/title/80021955'),
  ('the haunting of hill house',2018,'https://www.netflix.com/fr/title/80189221'),
  ('the haunting of bly manor',2020,'https://www.netflix.com/fr/title/81237854'),
  ('midnight mass',2021,'https://www.netflix.com/fr/title/81083626')
)
UPDATE public.series s
 SET fr_verified=true,
     fr_verification_method='editorial_fr_history',
     fr_evidence_url=editorial.official_source,
     fr_verified_at=now()
FROM editorial
WHERE lower(btrim(s.name))=editorial.name
 AND extract(year FROM s.premiered)::int=editorial.release_year
 AND NOT s.fr_verified;

-- Toute attribution de nouvel exemplaire hors périmètre français est refusée.
-- Les anciennes cartes ne sont ni effacées ni converties en crédits.
CREATE OR REPLACE FUNCTION public.enforce_new_card_fr_origin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.series s
   WHERE s.id=NEW.series_id
     AND s.fr_verified IS TRUE
     AND s.rarity_source<>'pending') THEN
  RAISE EXCEPTION USING
   ERRCODE='check_violation',
   MESSAGE='Cette série ne dispose pas encore d’une diffusion française vérifiée.',
   HINT='Conserver les anciennes cartes ; ne créer de nouvelles cartes que pour des séries vérifiées FR.';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_enforce_new_card_fr_origin ON public.player_cards;
CREATE TRIGGER sc_enforce_new_card_fr_origin
 BEFORE INSERT ON public.player_cards
 FOR EACH ROW EXECUTE FUNCTION public.enforce_new_card_fr_origin();

-- Tirage serveur : séries vérifiées seulement, rareté unique inchangée.

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
    WHERE s.fr_verified IS TRUE AND s.rarity=rank_names[rank_position] AND s.rarity_source<>'pending'
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
    WHERE s.fr_verified IS TRUE AND s.rarity=rank_names[rank_position] AND s.rarity_source<>'pending'
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
  WHERE s.fr_verified IS TRUE AND s.rarity=chosen_rank AND s.rarity_source<>'pending'
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

-- La fusion ne peut créer qu'une série ayant une diffusion française prouvée.

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
  INTO chosen FROM public.series s WHERE s.fr_verified IS TRUE AND s.rarity=target_rank
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

-- Les souhaits historiques sont conservés, mais une nouvelle liste
-- de souhaits n'admet que des titres français vérifiés.
CREATE OR REPLACE FUNCTION public.enforce_new_wishlist_fr()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.series s WHERE s.id=NEW.series_id
  AND s.fr_verified IS TRUE AND s.rarity_source<>'pending') THEN
  RAISE EXCEPTION 'Série à vérifier pour une diffusion en France';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_enforce_new_wishlist_fr ON public.player_wishlist;
CREATE TRIGGER sc_enforce_new_wishlist_fr
 BEFORE INSERT ON public.player_wishlist FOR EACH ROW
 EXECUTE FUNCTION public.enforce_new_wishlist_fr();

-- Les anciennes cartes restent consultables, mais aucune nouvelle annonce
-- ni proposition d'échange ne peut porter sur une série non vérifiée.
-- Les transactions existantes ne sont pas modifiées rétroactivement.
CREATE OR REPLACE FUNCTION public.enforce_new_listing_fr()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
   WHERE c.id=NEW.card_id AND s.fr_verified IS TRUE
 ) THEN
  RAISE EXCEPTION 'Annonce refusée : diffusion française de la série non vérifiée';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_fr_new_listings ON public.card_listings;
CREATE TRIGGER sc_fr_new_listings
 BEFORE INSERT ON public.card_listings FOR EACH ROW
 EXECUTE FUNCTION public.enforce_new_listing_fr();

CREATE OR REPLACE FUNCTION public.enforce_new_offer_fr()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
   WHERE c.id=NEW.offered_card_id AND s.fr_verified IS TRUE
 ) THEN
  RAISE EXCEPTION 'Proposition refusée : la carte offerte attend une preuve de diffusion française';
 END IF;
 IF NOT EXISTS (
   SELECT 1 FROM public.card_listings l
   JOIN public.player_cards c ON c.id=l.card_id
   JOIN public.series s ON s.id=c.series_id
   WHERE l.id=NEW.listing_id AND s.fr_verified IS TRUE
 ) THEN
  RAISE EXCEPTION 'Proposition refusée : la série recherchée attend une preuve de diffusion française';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_fr_new_offers ON public.card_trade_offers;
CREATE TRIGGER sc_fr_new_offers
 BEFORE INSERT ON public.card_trade_offers FOR EACH ROW
 EXECUTE FUNCTION public.enforce_new_offer_fr();

-- Vue non destructive du catalogue jouable.
CREATE OR REPLACE VIEW public.playable_fr_series
WITH (security_invoker=true) AS
 SELECT s.id,s.name,s.premiered,s.genres,s.image_url,s.rarity,
        s.rarity_source,s.fr_verification_method,s.fr_evidence_url
 FROM public.series s
 WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending'
   AND s.image_url IS NOT NULL;
GRANT SELECT ON public.playable_fr_series TO anon,authenticated;

-- ===== X-FILES (JUSTWATCH FR) ET EXCLUSION DU JEU DES ANCIENNES CARTES =====
DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='series' AND column_name='fr_verified'
 ) THEN
  RAISE EXCEPTION 'Installer game_v5_4_fr.sql avant game_v5_5_fr_fix.sql';
 END IF;
END $$;

-- Source JustWatch, région France, série 1993 et identifiant TVmaze 430.
-- Dernier relevé public observé : 10/09/2026.
-- Attention au remake : ne JAMAIS valider un titre par son seul nom.
UPDATE public.series s
SET fr_verified=true,
    fr_verification_method='editorial_fr_history',
    fr_evidence_url='https://www.justwatch.com/fr/serie/the-x-files',
    fr_verified_at=now()
WHERE s.id=430
  AND lower(btrim(s.name))='the x-files'
  AND EXTRACT(YEAR FROM s.premiered)=1993
  AND s.fr_verified IS DISTINCT FROM true;

-- Les classements comptent UNIQUEMENT les séries jouables en France.
-- Les anciennes cartes restent stockées mais ne donnent plus de points
-- au palmarès tant que leur diffusion FR n'est pas documentée.
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(username text,card_count bigint,unique_series bigint)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p.username,
  count(s.id)::bigint,
  count(DISTINCT s.id)::bigint
 FROM public.profiles p
 LEFT JOIN public.player_cards c ON c.owner_id=p.id
 LEFT JOIN public.series s ON s.id=c.series_id
  AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
 GROUP BY p.id,p.username
 ORDER BY count(s.id) DESC,p.username LIMIT 30;
$$;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.player_directory()
RETURNS TABLE(player_id uuid,username text,bio text,favorite_genre text,
 cards_count bigint,followers_count bigint,is_following boolean)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p.id,p.username,p.bio,p.favorite_genre,
  (SELECT count(*) FROM public.player_cards c
   JOIN public.series s ON s.id=c.series_id
   WHERE c.owner_id=p.id AND s.fr_verified IS TRUE
     AND s.rarity_source<>'pending')::bigint,
  (SELECT count(*) FROM public.player_follows f WHERE f.followed_id=p.id)::bigint,
  EXISTS(SELECT 1 FROM public.player_follows f
    WHERE f.follower_id=auth.uid() AND f.followed_id=p.id)
 FROM public.profiles p
 ORDER BY (SELECT count(*) FROM public.player_cards c
   JOIN public.series s ON s.id=c.series_id
   WHERE c.owner_id=p.id AND s.fr_verified IS TRUE
     AND s.rarity_source<>'pending') DESC,
   p.created_at DESC
 LIMIT 40;
$$;
REVOKE ALL ON FUNCTION public.player_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_directory() TO authenticated;

-- Nettoyage NON destructeur des offres qui ne devraient plus pouvoir
-- être conclues avec des cartes sans preuve de diffusion France.
-- Les cartes et les comptes restent intacts.
WITH revoked AS (
 UPDATE public.card_trade_offers o
 SET status='declined',closed_at=now()
 WHERE o.status='pending' AND (
  NOT EXISTS (
   SELECT 1 FROM public.player_cards c
   JOIN public.series s ON s.id=c.series_id
   WHERE c.id=o.offered_card_id AND s.fr_verified IS TRUE
  )
  OR NOT EXISTS (
   SELECT 1 FROM public.card_listings l
   JOIN public.player_cards c ON c.id=l.card_id
   JOIN public.series s ON s.id=c.series_id
   WHERE l.id=o.listing_id AND s.fr_verified IS TRUE
  )
 )
 RETURNING o.id
)
UPDATE public.player_cards c
SET reserved_trade_id=NULL
WHERE c.reserved_trade_id IN (SELECT id FROM revoked);

UPDATE public.card_listings l
SET status='cancelled',closed_at=now()
WHERE l.status='active'
 AND NOT EXISTS (
  SELECT 1 FROM public.player_cards c
  JOIN public.series s ON s.id=c.series_id
  WHERE c.id=l.card_id AND s.fr_verified IS TRUE
 );

-- Une ancienne annonce encore visible dans un vieux navigateur ne peut
-- pas aboutir à un changement de propriétaire international.
CREATE OR REPLACE FUNCTION public.enforce_fr_card_transfer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
BEGIN
 IF OLD.owner_id IS DISTINCT FROM NEW.owner_id
  AND NOT EXISTS(
   SELECT 1 FROM public.series s
   WHERE s.id=NEW.series_id AND s.fr_verified IS TRUE
  ) THEN
  RAISE EXCEPTION 'Transfert impossible : série non vérifiée en France';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_enforce_fr_card_transfer ON public.player_cards;
CREATE TRIGGER sc_enforce_fr_card_transfer
 BEFORE UPDATE OF owner_id ON public.player_cards
 FOR EACH ROW
 WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
 EXECUTE FUNCTION public.enforce_fr_card_transfer();

-- Le Comptoir public ne publie plus d'annonces pour des séries
-- non certifiées françaises. Les historiques privés restent consultables.
CREATE OR REPLACE FUNCTION public.marketplace_feed()
RETURNS TABLE(
 listing_id uuid,seller_id uuid,seller_username text,card_id uuid,
 series_id bigint,series_name text,image_url text,rarity text,
 price integer,created_at timestamptz
) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT l.id,l.seller_id,p.username,l.card_id,c.series_id,s.name,s.image_url,s.rarity,
  l.price,l.created_at
 FROM public.card_listings l
 JOIN public.player_cards c ON c.id=l.card_id AND c.owner_id=l.seller_id
 JOIN public.series s ON s.id=c.series_id
 JOIN public.profiles p ON p.id=l.seller_id
 WHERE l.status='active' AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
 ORDER BY l.created_at DESC LIMIT 80;
$$;
REVOKE ALL ON FUNCTION public.marketplace_feed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketplace_feed() TO authenticated;

COMMIT;
