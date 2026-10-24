CREATE OR REPLACE VIEW public.v1_eligible_player_series_badges
WITH (security_invoker=true) AS
SELECT b.player_id,b.series_id,b.unlocked_at,s.name AS series_name
FROM public.player_series_badges b
JOIN public.series s ON s.id=b.series_id
JOIN (
 SELECT series_id FROM public.series_seasons
 WHERE premiered IS NOT NULL AND premiered<=current_date AND season_number>0
 GROUP BY series_id HAVING count(*)>=3
) qualified ON qualified.series_id=b.series_id;
REVOKE ALL ON public.v1_eligible_player_series_badges FROM PUBLIC,anon;
GRANT SELECT ON public.v1_eligible_player_series_badges TO authenticated;
