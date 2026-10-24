-- Synchronisation automatique du catalogue candidat V1 lors de l'import fournisseur.
-- Un cache expiré ou erroné retire uniquement les associations du catalogue provisoire.
-- Aucun compte, carte, portefeuille ou ancien booster n'est touché.
CREATE OR REPLACE FUNCTION public.v1_sync_verified_svod_members()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.v1_verified_svod_members WHERE series_id = NEW.series_id;
  IF NEW.country = 'FR' AND NEW.source = 'movieofthenight'
     AND NEW.checked_at <= now() AND NEW.expires_at > now()
     AND jsonb_typeof(NEW.offers) = 'array' THEN
    INSERT INTO public.v1_verified_svod_members
      (pack_key, series_id, checked_at, expires_at, source)
    SELECT DISTINCT x.item->>'id', NEW.series_id, NEW.checked_at, NEW.expires_at,
      'movieofthenight'
    FROM jsonb_array_elements(NEW.offers) AS x(item)
    WHERE x.item->>'id' IN ('netflix','prime','disney')
      AND x.item->>'type' IN ('flatrate','free','addon')
      AND EXISTS(SELECT 1 FROM public.series s WHERE s.id = NEW.series_id
                 AND s.rarity_source <> 'pending')
    ON CONFLICT (pack_key,series_id) DO UPDATE
    SET checked_at = excluded.checked_at, expires_at = excluded.expires_at;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.v1_sync_verified_svod_members() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS v1_cache_to_svod_members ON public.fr_streaming_cache;
CREATE TRIGGER v1_cache_to_svod_members
AFTER INSERT OR UPDATE OF offers,checked_at,expires_at,country,source
ON public.fr_streaming_cache
FOR EACH ROW EXECUTE FUNCTION public.v1_sync_verified_svod_members();
