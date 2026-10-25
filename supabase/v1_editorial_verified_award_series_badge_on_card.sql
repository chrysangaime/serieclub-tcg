CREATE OR REPLACE FUNCTION public.award_series_badge_on_card()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE total_needed integer; total_owned integer;
BEGIN
 IF NEW.season_number IS NULL THEN RETURN NEW; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.series WHERE id=NEW.series_id AND content_status='series' AND fr_verified IS TRUE AND fr_verification_method IN ('tvmaze_fr_origin','streaming_availability_fr','editorial_fr_history')) THEN RETURN NEW; END IF;
 SELECT count(*) INTO total_needed FROM public.series_seasons
 WHERE series_id=NEW.series_id AND season_number>0 AND premiered IS NOT NULL AND premiered<=current_date;
 IF total_needed<3 THEN RETURN NEW; END IF;
 SELECT count(DISTINCT pc.season_number) INTO total_owned
 FROM public.player_cards pc JOIN public.series_seasons ss
 ON ss.series_id=pc.series_id AND ss.season_number=pc.season_number
 WHERE pc.owner_id=NEW.owner_id AND pc.series_id=NEW.series_id
 AND ss.premiered IS NOT NULL AND ss.premiered<=current_date;
 IF total_owned=total_needed THEN
  INSERT INTO public.player_series_badges(player_id,series_id,required_at_unlock)
  VALUES(NEW.owner_id,NEW.series_id,total_needed) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $function$
;
