-- SérieClub TCG V5.4 — Jeu limité aux séries ayant une preuve de diffusion FR.
-- NE PAS considérer une absence d'information comme une preuve de non-diffusion.
-- Les anciennes cartes restent dans les collections : seules les nouvelles
-- distributions de boosters et fusions sont strictement filtrées.
-- Exécuter après la V5. La V5.3 est facultative.
BEGIN;
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
SET search_path=public,pg_temp AS $
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.series s WHERE s.id=NEW.series_id
  AND s.fr_verified IS TRUE AND s.rarity_source<>'pending') THEN
  RAISE EXCEPTION 'Série à vérifier pour une diffusion en France';
 END IF;
 RETURN NEW;
END $;
DROP TRIGGER IF EXISTS sc_enforce_new_wishlist_fr ON public.player_wishlist;
CREATE TRIGGER sc_enforce_new_wishlist_fr
 BEFORE INSERT ON public.player_wishlist FOR EACH ROW
 EXECUTE FUNCTION public.enforce_new_wishlist_fr();

-- Vue non destructive du catalogue jouable.
CREATE OR REPLACE VIEW public.playable_fr_series
WITH (security_invoker=true) AS
 SELECT s.id,s.name,s.premiered,s.genres,s.image_url,s.rarity,
        s.rarity_source,s.fr_verification_method,s.fr_evidence_url
 FROM public.series s
 WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending'
   AND s.image_url IS NOT NULL;
GRANT SELECT ON public.playable_fr_series TO anon,authenticated;

COMMIT;
