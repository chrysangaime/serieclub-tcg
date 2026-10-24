CREATE OR REPLACE FUNCTION public.award_series_badge_on_card()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE total_needed integer; total_owned integer;
BEGIN
 IF NEW.season_number IS NULL THEN RETURN NEW; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.series WHERE id=NEW.series_id AND content_status='series' AND fr_verified IS TRUE AND fr_verification_method IN ('tvmaze_fr_origin','streaming_availability_fr')) THEN RETURN NEW; END IF;
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
CREATE OR REPLACE FUNCTION public.my_series_completion_badges()
 RETURNS TABLE(series_id bigint, title text, owned_seasons integer, required_seasons integer, unlocked boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
 WITH eligible AS (
  SELECT ss.series_id,ss.season_number
  FROM public.series_seasons ss
  WHERE ss.premiered IS NOT NULL AND ss.premiered <= current_date
    AND ss.season_number>0
 ), totals AS (
  SELECT e.series_id,count(*)::integer required_seasons FROM eligible e GROUP BY e.series_id
 ), owned AS (
  SELECT pc.series_id,count(DISTINCT pc.season_number)::integer owned_seasons
  FROM public.player_cards pc JOIN eligible e
   ON e.series_id=pc.series_id AND e.season_number=pc.season_number
  WHERE pc.owner_id=auth.uid()
  GROUP BY pc.series_id
 )
 SELECT s.id,s.name,coalesce(o.owned_seasons,0),t.required_seasons,
  coalesce(o.owned_seasons,0)=t.required_seasons
 FROM totals t JOIN public.series s ON s.id=t.series_id
 LEFT JOIN owned o ON o.series_id=t.series_id
 WHERE o.series_id IS NOT NULL AND t.required_seasons>=3 AND s.content_status='series' AND s.fr_verified IS TRUE AND s.fr_verification_method IN ('tvmaze_fr_origin','streaming_availability_fr')
 ORDER BY (coalesce(o.owned_seasons,0)=t.required_seasons) DESC,
  coalesce(o.owned_seasons,0) DESC,s.name;
$function$
;
