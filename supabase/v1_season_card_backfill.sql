-- V1: issued cards are season-specific, not generic series placeholders.
-- Aired seasons without unique TVmaze poster still work: the UI shows a clear season badge over series art.
CREATE OR REPLACE FUNCTION public.assign_card_season_variant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public,pg_temp AS $$
BEGIN
 IF NEW.season_number IS NULL THEN
  SELECT ss.season_number INTO NEW.season_number
  FROM public.series_seasons ss
  WHERE ss.series_id=NEW.series_id
    AND ss.premiered IS NOT NULL AND ss.premiered<=CURRENT_DATE
  ORDER BY random() LIMIT 1;
 END IF;
 RETURN NEW;
END $$;

-- Controlled prelaunch conversion of generic cards; ownership, rarity,
-- balances, locking and transaction history remain untouched.
UPDATE public.player_cards pc
 SET season_number=(
  SELECT ss.season_number FROM public.series_seasons ss
  WHERE ss.series_id=pc.series_id
    AND ss.premiered IS NOT NULL AND ss.premiered<=CURRENT_DATE
  ORDER BY random() LIMIT 1
 )
 WHERE pc.season_number IS NULL
   AND EXISTS (
    SELECT 1 FROM public.series_seasons ss
    WHERE ss.series_id=pc.series_id
      AND ss.premiered IS NOT NULL AND ss.premiered<=CURRENT_DATE
   );
