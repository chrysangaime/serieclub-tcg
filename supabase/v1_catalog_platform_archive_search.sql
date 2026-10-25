CREATE OR REPLACE FUNCTION public.catalog_provider_series_ids(p_platform text)
RETURNS bigint[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp
AS $$
 SELECT coalesce(array_agg(DISTINCT m.series_id ORDER BY m.series_id),ARRAY[]::bigint[])
 FROM public.v1_verified_svod_members m JOIN public.series s ON s.id=m.series_id
 WHERE p_platform IN ('netflix','prime','disney') AND m.pack_key=p_platform
 AND s.content_status='series' AND s.fr_verified=true
 AND s.fr_verification_method IN ('tvmaze_fr_origin','streaming_availability_fr');
$$;
REVOKE ALL ON FUNCTION public.catalog_provider_series_ids(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.catalog_provider_series_ids(text) TO anon,authenticated;