CREATE OR REPLACE VIEW public.v1_catalog_integrity_report WITH (security_invoker=true) AS
SELECT
 (SELECT count(*) FROM public.series s WHERE s.fr_verified AND s.content_status='series'
   AND s.fr_verification_method IN('tvmaze_fr_origin','streaming_availability_fr','editorial_fr_history')) AS eligible_series,
 (SELECT count(*) FROM public.series s WHERE s.fr_verified AND s.content_status='series'
   AND s.fr_verification_method IN('tvmaze_fr_origin','streaming_availability_fr','editorial_fr_history')
   AND NOT EXISTS(SELECT 1 FROM public.series_seasons ss WHERE ss.series_id=s.id)) AS missing_seasons,
 (SELECT count(*) FROM public.series_seasons ss JOIN public.series s ON s.id=ss.series_id
   WHERE s.fr_verified AND s.content_status='series' AND s.fr_verification_method IN('tvmaze_fr_origin','streaming_availability_fr','editorial_fr_history')
    AND ss.season_number>0 AND ss.premiered<=current_date) AS eligible_aired_seasons,
 (SELECT count(*) FROM public.series_seasons ss JOIN public.series s ON s.id=ss.series_id
   WHERE s.fr_verified AND s.content_status='series' AND s.fr_verification_method IN('tvmaze_fr_origin','streaming_availability_fr','editorial_fr_history')
   AND ss.season_number>0 AND ss.image_url IS NULL) AS season_posters_missing,
 (SELECT cursor_id FROM public.catalog_sync_state WHERE sync_key='tvmaze_seasons') AS sync_cursor;
REVOKE ALL ON public.v1_catalog_integrity_report FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.v1_catalog_integrity_report TO service_role;
