-- V1 : badge de série calculé sur toutes les saisons effectivement diffusées.
-- Une saison annoncée sans date ou dans le futur ne bloque pas la complétion.
-- Une saison possédée en plusieurs exemplaires ne compte qu'une fois.
CREATE OR REPLACE FUNCTION public.my_series_completion_badges()
RETURNS TABLE(series_id bigint, title text, owned_seasons integer, required_seasons integer, unlocked boolean)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public,pg_temp
AS $$
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
 WHERE o.series_id IS NOT NULL
 ORDER BY (coalesce(o.owned_seasons,0)=t.required_seasons) DESC,
  coalesce(o.owned_seasons,0) DESC,s.name;
$$;
REVOKE ALL ON FUNCTION public.my_series_completion_badges() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_series_completion_badges() TO authenticated;
