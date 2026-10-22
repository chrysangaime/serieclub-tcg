-- SériesClubTCG V20 : suivi des saisons et collection intelligente.
-- Prérequis : game_v19_top20.sql et game_v4.sql déjà installés.
-- Aucun crédit ni carte nouvelle n'est créé par cette migration.
BEGIN;

-- Seul le propriétaire peut consulter ses suivis. Aucune écriture directe du client.
CREATE TABLE IF NOT EXISTS public.player_tracked_seasons(
 owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 season_id text NOT NULL REFERENCES public.official_seasons(id) ON DELETE CASCADE,
 tracked_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(owner_id,season_id)
);
CREATE INDEX IF NOT EXISTS sc20_tracking_by_season ON public.player_tracked_seasons(season_id,owner_id);
ALTER TABLE public.player_tracked_seasons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_tracked_seasons FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.player_tracked_seasons TO authenticated;
DROP POLICY IF EXISTS "Own tracked seasons" ON public.player_tracked_seasons;
CREATE POLICY "Own tracked seasons" ON public.player_tracked_seasons
 FOR SELECT TO authenticated USING(owner_id=auth.uid());

-- Les albums personnels peuvent désormais inclure une série sans carte.
CREATE TABLE IF NOT EXISTS public.player_album_targets(
 album_id uuid NOT NULL REFERENCES public.player_albums(id) ON DELETE CASCADE,
 series_id bigint NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(album_id,series_id)
);
CREATE INDEX IF NOT EXISTS sc20_album_targets_series ON public.player_album_targets(series_id,album_id);
ALTER TABLE public.player_album_targets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_album_targets FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.player_album_targets TO authenticated;
DROP POLICY IF EXISTS "Visible album targets" ON public.player_album_targets;
CREATE POLICY "Visible album targets" ON public.player_album_targets
 FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.player_albums a WHERE a.id=album_id
 AND (a.owner_id=auth.uid() OR a.visibility='public')));

-- Test d'appartenance à un objectif suivi (saisons officielles et personnelles).
CREATE OR REPLACE FUNCTION public.is_collection_target(p_owner uuid,p_series bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.player_tracked_seasons x
  JOIN public.official_season_titles t ON t.season_id=x.season_id
  WHERE x.owner_id=p_owner AND t.series_id=p_series
 ) OR EXISTS (
  SELECT 1 FROM public.player_album_targets t
  JOIN public.player_albums a ON a.id=t.album_id
  WHERE a.owner_id=p_owner AND t.series_id=p_series
 );
$$;
REVOKE ALL ON FUNCTION public.is_collection_target(uuid,bigint) FROM PUBLIC,anon,authenticated;

-- Protège au plus un exemplaire disponible par série ; ne touche jamais aux
-- cartes engagées dans une vente ou un échange, ni aux doublons déjà libres.
CREATE OR REPLACE FUNCTION public.protect_collection_copy(p_owner uuid,p_series bigint)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE candidate uuid; affected integer:=0;
BEGIN
 IF EXISTS(SELECT 1 FROM public.player_cards c
  WHERE c.owner_id=p_owner AND c.series_id=p_series AND c.locked) THEN RETURN 0;END IF;
 SELECT c.id INTO candidate FROM public.player_cards c
 WHERE c.owner_id=p_owner AND c.series_id=p_series
 AND NOT c.locked AND c.reserved_trade_id IS NULL
 AND NOT EXISTS(SELECT 1 FROM public.card_listings l
  WHERE l.card_id=c.id AND l.status='active')
 ORDER BY c.obtained_at,c.id
 FOR UPDATE OF c SKIP LOCKED LIMIT 1;
 IF candidate IS NULL THEN RETURN 0;END IF;
 -- Cette mise à jour ne déclenche pas le trigger de transfert de propriétaire.
 UPDATE public.player_cards c SET locked=true
 WHERE c.id=candidate AND c.owner_id=p_owner AND c.series_id=p_series
 AND NOT c.locked AND c.reserved_trade_id IS NULL
 AND NOT EXISTS(SELECT 1 FROM public.card_listings l WHERE l.card_id=c.id AND l.status='active');
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.protect_collection_copy(uuid,bigint) FROM PUBLIC,anon,authenticated;

-- Abonnement au suivi : synchronisation en un clic. NULL suit les six Top20.
CREATE OR REPLACE FUNCTION public.sync_official_collection(p_season_id text DEFAULT NULL)
RETURNS TABLE(wishes_added integer,cards_protected integer,series_owned integer,seasons_followed integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();item record;added integer; changed integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Connexion requise';END IF;
 IF p_season_id IS NOT NULL AND NOT EXISTS(
  SELECT 1 FROM public.official_seasons WHERE id=p_season_id AND left(id,6)='top20_'
 ) THEN RAISE EXCEPTION 'Seules les saisons Top20 ont une liste fixe de séries';END IF;
 -- Sérialise les actions du compte pour empêcher les collisions entre clics.
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 20));
 IF EXISTS(SELECT 1 FROM public.official_seasons s
  WHERE left(s.id,6)='top20_' AND (p_season_id IS NULL OR s.id=p_season_id)
  AND (SELECT count(*) FROM public.official_season_titles t WHERE t.season_id=s.id)<>20)
 THEN RAISE EXCEPTION 'Une liste Top20 est incomplète';END IF;
 INSERT INTO public.player_tracked_seasons(owner_id,season_id)
 SELECT uid,s.id FROM public.official_seasons s WHERE left(s.id,6)='top20_'
 AND (p_season_id IS NULL OR s.id=p_season_id)
 AND (SELECT count(*) FROM public.official_season_titles t WHERE t.season_id=s.id)=20
 ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS seasons_followed=ROW_COUNT;
 wishes_added:=0;cards_protected:=0;series_owned:=0;
 FOR item IN SELECT DISTINCT t.series_id FROM public.player_tracked_seasons x
 JOIN public.official_season_titles t ON t.season_id=x.season_id
 JOIN public.series s ON s.id=t.series_id
 WHERE x.owner_id=uid AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
 AND (p_season_id IS NULL OR x.season_id=p_season_id)
 LOOP
  IF EXISTS(SELECT 1 FROM public.player_cards c WHERE c.owner_id=uid AND c.series_id=item.series_id) THEN
   series_owned:=series_owned+1;
   DELETE FROM public.player_wishlist WHERE owner_id=uid AND series_id=item.series_id;
   changed:=public.protect_collection_copy(uid,item.series_id);
   cards_protected:=cards_protected+changed;
  ELSE
   INSERT INTO public.player_wishlist(owner_id,series_id) VALUES(uid,item.series_id)
   ON CONFLICT DO NOTHING;
   GET DIAGNOSTICS added=ROW_COUNT;
   wishes_added:=wishes_added+added;
  END IF;
 END LOOP;
 RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.sync_official_collection(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sync_official_collection(text) TO authenticated;

-- Arrêter le suivi ne retire jamais la protection manuelle des cartes.
CREATE OR REPLACE FUNCTION public.unfollow_official_collection(p_season_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise';END IF;
 DELETE FROM public.player_tracked_seasons
 WHERE owner_id=auth.uid() AND season_id=p_season_id;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n>0;
END $$;
REVOKE ALL ON FUNCTION public.unfollow_official_collection(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.unfollow_official_collection(text) TO authenticated;

-- Etat du suivi côté joueur ; pas de suivi supposé en cas de RPC indisponible.
CREATE OR REPLACE FUNCTION public.my_tracked_seasons()
RETURNS TABLE(season_id text) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=public,pg_temp AS $$
 SELECT x.season_id FROM public.player_tracked_seasons x WHERE x.owner_id=auth.uid()
 ORDER BY x.tracked_at;
$$;
REVOKE ALL ON FUNCTION public.my_tracked_seasons() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_tracked_seasons() TO authenticated;

-- Ajouter une série certifiée en France à une saison personnelle, même sans carte.
CREATE OR REPLACE FUNCTION public.add_series_to_personal_album(p_album_id uuid,p_series_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();n integer;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.player_albums
  WHERE id=p_album_id AND owner_id=uid) THEN RAISE EXCEPTION 'Album inaccessible'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.series s WHERE s.id=p_series_id
  AND s.fr_verified IS TRUE AND s.rarity_source<>'pending') THEN
  RAISE EXCEPTION 'Série non éligible au catalogue France';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,20));
 IF (SELECT count(*) FROM public.player_album_targets WHERE album_id=p_album_id)>=100 THEN
  RAISE EXCEPTION 'Maximum 100 séries par album';END IF;
 INSERT INTO public.player_album_targets(album_id,series_id)
 VALUES(p_album_id,p_series_id) ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF EXISTS(SELECT 1 FROM public.player_cards WHERE owner_id=uid AND series_id=p_series_id) THEN
  DELETE FROM public.player_wishlist WHERE owner_id=uid AND series_id=p_series_id;
  PERFORM public.protect_collection_copy(uid,p_series_id);
 ELSE
  INSERT INTO public.player_wishlist(owner_id,series_id)
  VALUES(uid,p_series_id) ON CONFLICT DO NOTHING;
 END IF;
 RETURN n>0;
END $$;
REVOKE ALL ON FUNCTION public.add_series_to_personal_album(uuid,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_series_to_personal_album(uuid,bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.remove_series_from_personal_album(p_album_id uuid,p_series_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.player_albums
 WHERE id=p_album_id AND owner_id=auth.uid()) THEN RAISE EXCEPTION 'Album inaccessible';END IF;
 DELETE FROM public.player_album_targets WHERE album_id=p_album_id AND series_id=p_series_id;
 GET DIAGNOSTICS n=ROW_COUNT;
 RETURN n>0;
END $$;
REVOKE ALL ON FUNCTION public.remove_series_from_personal_album(uuid,bigint) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.remove_series_from_personal_album(uuid,bigint) TO authenticated;

-- La liste des cibles est limitée aux albums appartenant au joueur ou publics.
CREATE OR REPLACE FUNCTION public.personal_album_targets(p_album_id uuid)
RETURNS TABLE(series_id bigint,name text,image_url text,owned boolean,locked boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.player_albums a
 WHERE a.id=p_album_id AND (a.owner_id=auth.uid() OR a.visibility='public')) THEN
  RAISE EXCEPTION 'Album inaccessible';END IF;
 RETURN QUERY
 SELECT t.series_id,s.name,s.image_url,
 EXISTS(SELECT 1 FROM public.player_cards c WHERE c.owner_id=auth.uid() AND c.series_id=t.series_id),
 EXISTS(SELECT 1 FROM public.player_cards c WHERE c.owner_id=auth.uid()
   AND c.series_id=t.series_id AND c.locked)
 FROM public.player_album_targets t JOIN public.series s ON s.id=t.series_id
 WHERE t.album_id=p_album_id ORDER BY t.created_at,t.series_id LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION public.personal_album_targets(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.personal_album_targets(uuid) TO authenticated;

-- Recherche sans dévoiler de données de joueur, uniquement titres France.
CREATE OR REPLACE FUNCTION public.search_personal_album_series(p_search text)
RETURNS TABLE(series_id bigint,name text,image_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT s.id,s.name,s.image_url FROM public.series s
 WHERE auth.uid() IS NOT NULL AND char_length(trim(coalesce(p_search,''))) BETWEEN 2 AND 80
 AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
 AND s.name ILIKE '%'||replace(replace(replace(trim(p_search),'!','!!'),'%','!%'),'_','!_')||'%' ESCAPE '!'
 ORDER BY s.popularity_weight DESC NULLS LAST,s.name,s.id LIMIT 12;
$$;
REVOKE ALL ON FUNCTION public.search_personal_album_series(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.search_personal_album_series(text) TO authenticated;


-- Protection groupée des cartes d'un album personnel, y compris les anciens
-- albums où les séries n'étaient enregistrées que via des cartes possédées.
CREATE OR REPLACE FUNCTION public.sync_personal_album_collection(p_album_id uuid)
RETURNS TABLE(wishes_added integer,cards_protected integer,series_owned integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $
DECLARE uid uuid:=auth.uid();r record;n integer;
BEGIN
 IF uid IS NULL OR NOT EXISTS(
 SELECT 1 FROM public.player_albums WHERE id=p_album_id AND owner_id=uid
 ) THEN RAISE EXCEPTION 'Album inaccessible';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text,20));
 wishes_added:=0;cards_protected:=0;series_owned:=0;
 FOR r IN
 SELECT DISTINCT series_id FROM (
  SELECT t.series_id FROM public.player_album_targets t WHERE t.album_id=p_album_id
  UNION
  SELECT c.series_id FROM public.player_album_cards a
  JOIN public.player_cards c ON c.id=a.card_id
  WHERE a.album_id=p_album_id AND c.owner_id=uid
 ) all_series
 LOOP
  IF EXISTS(SELECT 1 FROM public.player_cards c WHERE c.owner_id=uid AND c.series_id=r.series_id) THEN
   series_owned:=series_owned+1;
   DELETE FROM public.player_wishlist WHERE owner_id=uid AND series_id=r.series_id;
   cards_protected:=cards_protected+public.protect_collection_copy(uid,r.series_id);
  ELSE
   INSERT INTO public.player_wishlist(owner_id,series_id) VALUES(uid,r.series_id) ON CONFLICT DO NOTHING;
   GET DIAGNOSTICS n=ROW_COUNT;
   wishes_added:=wishes_added+n;
  END IF;
 END LOOP;
 RETURN NEXT;
END $;
REVOKE ALL ON FUNCTION public.sync_personal_album_collection(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sync_personal_album_collection(uuid) TO authenticated;

-- Les acquisitions retirent automatiquement les souhaits.
-- Un seul exemplaire est verrouillé si la série appartient à une saison suivie
-- ou à une saison personnelle, même si elle arrive via booster ou échange.
CREATE OR REPLACE FUNCTION public.on_collection_ownership_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='INSERT' OR TG_OP='UPDATE' THEN
  DELETE FROM public.player_wishlist w WHERE w.owner_id=NEW.owner_id AND w.series_id=NEW.series_id;
  IF public.is_collection_target(NEW.owner_id,NEW.series_id) THEN
   PERFORM public.protect_collection_copy(NEW.owner_id,NEW.series_id);
  END IF;
 END IF;
 IF TG_OP='DELETE' OR TG_OP='UPDATE' THEN
  -- Au transfert du dernier exemplaire, un titre suivi redevient un souhait.
  IF (TG_OP='DELETE' OR OLD.owner_id IS DISTINCT FROM NEW.owner_id)
   AND public.is_collection_target(OLD.owner_id,OLD.series_id)
   AND NOT EXISTS(SELECT 1 FROM public.player_cards c
     WHERE c.owner_id=OLD.owner_id AND c.series_id=OLD.series_id)
   AND EXISTS(SELECT 1 FROM public.series s WHERE s.id=OLD.series_id
    AND s.fr_verified IS TRUE AND s.rarity_source<>'pending')
  THEN
   INSERT INTO public.player_wishlist(owner_id,series_id)
   VALUES(OLD.owner_id,OLD.series_id) ON CONFLICT DO NOTHING;
  END IF;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.on_collection_ownership_change() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS sc20_cards_acquired ON public.player_cards;
CREATE TRIGGER sc20_cards_acquired AFTER INSERT OR UPDATE OF owner_id OR DELETE
 ON public.player_cards FOR EACH ROW EXECUTE FUNCTION public.on_collection_ownership_change();

COMMIT;