-- V1: true TVmaze season variants without deleting old cards or renaming series.
CREATE TABLE IF NOT EXISTS public.series_seasons (
 series_id bigint NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
 season_number integer NOT NULL CHECK (season_number BETWEEN 1 AND 100),
 tvmaze_season_id bigint NOT NULL UNIQUE,
 season_name text,
 premiered date,
 ended date,
 episode_count integer,
 image_url text,
 summary text,
 verified_source text NOT NULL DEFAULT 'tvmaze',
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (series_id, season_number),
 CONSTRAINT series_seasons_image_https CHECK (image_url IS NULL OR image_url LIKE 'https://static.tvmaze.com/uploads/images/%')
);
CREATE INDEX IF NOT EXISTS idx_series_seasons_series_art ON public.series_seasons(series_id, season_number) WHERE image_url IS NOT NULL;
ALTER TABLE public.series_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY season_catalog_fr_read ON public.series_seasons FOR SELECT TO anon,authenticated USING (
 EXISTS (SELECT 1 FROM public.series s WHERE s.id=series_id AND s.fr_verified IS TRUE AND s.rarity_source<>'pending')
);
GRANT SELECT ON public.series_seasons TO anon,authenticated;
ALTER TABLE public.player_cards ADD COLUMN IF NOT EXISTS season_number integer;
ALTER TABLE public.player_cards ADD CONSTRAINT player_cards_season_ref_fk
 FOREIGN KEY(series_id,season_number) REFERENCES public.series_seasons(series_id,season_number);
CREATE INDEX IF NOT EXISTS idx_player_cards_season_number ON public.player_cards(series_id,season_number) WHERE season_number IS NOT NULL;

-- Server-side assignment, respecting the existing France and rarity validation.
CREATE OR REPLACE FUNCTION public.assign_card_season_variant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
BEGIN
 IF NEW.season_number IS NULL THEN
  SELECT ss.season_number INTO NEW.season_number
   FROM public.series_seasons ss
   WHERE ss.series_id=NEW.series_id
     AND ss.image_url LIKE 'https://static.tvmaze.com/uploads/images/%'
   ORDER BY random() LIMIT 1;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS zz_assign_card_season_variant ON public.player_cards;
CREATE TRIGGER zz_assign_card_season_variant BEFORE INSERT ON public.player_cards
 FOR EACH ROW EXECUTE FUNCTION public.assign_card_season_variant();

COMMENT ON TABLE public.series_seasons IS
 'Season artwork / dates/synopsis from TVmaze; card ownership is player_cards and keeps immutable series_id.';
COMMENT ON COLUMN public.player_cards.season_number IS
 'TVmaze season variant, nullable for historical cards; rarity and series_id keep all marketplace / booster contracts.';
