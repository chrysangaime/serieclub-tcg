-- Documentation : Netflix France / Netflix newsroom, TVmaze, fiches épisodes.
WITH revisions(series_id,season_number,premiered,episode_count) AS (VALUES (37854,1,'2018-10-05'::date,8),
(37854,2,'2019-09-06'::date,8),
(37854,3,'2020-03-13'::date,8),
(37854,4,'2021-06-18'::date,8),
(37854,5,'2022-04-08'::date,8),
(37854,6,'2022-11-18'::date,8),
(37854,7,'2023-10-20'::date,8),
(37854,8,'2024-07-26'::date,8),
(22127,1,'2017-08-11'::date,8),
(22127,2,'2018-09-07'::date,10),
(22127,3,'2019-11-01'::date,10),
(22127,4,'2021-07-09'::date,10),
(22371,1,'2018-05-04'::date,8),
(22371,2,'2019-05-17'::date,6),
(22371,3,'2020-08-06'::date,6))
INSERT INTO public.series_seasons(series_id,season_number,tvmaze_season_id,season_name,premiered,episode_count,image_url,verified_source)
SELECT v.series_id,v.season_number, -(v.series_id*100+v.season_number),'Saison '||v.season_number,v.premiered,v.episode_count,NULL,'editorial_fr'
FROM revisions v JOIN public.series s ON s.id=v.series_id
WHERE s.fr_verified AND s.content_status='series'
ON CONFLICT(series_id,season_number) DO NOTHING;
