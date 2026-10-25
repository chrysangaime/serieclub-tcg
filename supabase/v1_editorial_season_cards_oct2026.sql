-- Éditions éditoriales : identifiant de provenance local négatif, jamais présenté comme ID TVmaze.
-- Les affiches propres à la saison ne sont pas inventées : repli explicite sur l'affiche de série.
WITH verified(series_id,season_number,premiered,episode_count,season_name,source_url) AS (VALUES
(52341,1,'2022-09-21',12,'Andor','https://www.lesnumeriques.com/serie/andor-p76536/list.html'),
(52341,2,'2025-04-22',12,'Andor','https://www.lesnumeriques.com/serie/andor-p76536/list.html'),
(78570,1,'2025-03-13',4,'Adolescence','https://www.netflix.com/fr/title/81756069'),
(46065,1,'2023-08-31',8,'One Piece (Netflix)','https://www.netflix.com/tudum/features/one-piece-season-2-release-date'),
(46065,2,'2026-03-10',8,'One Piece : En route pour Grand Line','https://www.netflix.com/tudum/features/one-piece-season-2-release-date'),
(47549,1,'2021-02-24',10,'Ginny & Georgia','https://www.netflix.com/fr/title/81025696'),
(47549,2,'2023-01-05',10,'Ginny & Georgia','https://www.netflix.com/fr/title/81025696'),
(47549,3,'2025-06-05',10,'Ginny & Georgia','https://media.netflix.com/en/only-on-netflix/81025696'),
(42062,1,'2020-04-15',NULL,'Outer Banks','https://media.netflix.com/en/only-on-netflix/80236318'),
(42062,2,'2021-07-30',NULL,'Outer Banks','https://media.netflix.com/en/only-on-netflix/80236318'),
(42062,3,'2023-02-23',NULL,'Outer Banks','https://media.netflix.com/en/only-on-netflix/80236318'),
(42062,4,'2024-10-10',NULL,'Outer Banks','https://media.netflix.com/en/only-on-netflix/80236318'),
(42062,5,'2026-08-20',10,'Outer Banks : saison finale','https://media.netflix.com/en/only-on-netflix/80236318'),
(41428,1,'2020-10-23',7,'Le Jeu de la dame','https://www.netflix.com/fr/browse/genre/83'),
(49945,1,'2021-10-01',10,'Maid','https://www.netflix.com/fr/browse/genre/83'),
(55905,1,'2022-10-13',7,'The Watcher','https://www.netflix.com/fr/browse/genre/83'),
(47199,1,'2022-01-28',12,'All of Us Are Dead','https://www.netflix.com/fr/browse/genre/83')
)
INSERT INTO public.series_seasons(series_id,season_number,tvmaze_season_id,season_name,premiered,episode_count,image_url,verified_source)
SELECT v.series_id,v.season_number, -(v.series_id*100+v.season_number),v.season_name,v.premiered::date,v.episode_count,s.image_url,'editorial_fr' FROM verified v
JOIN public.series s ON s.id=v.series_id
WHERE s.content_status='series' AND s.fr_verified AND NOT EXISTS(
 SELECT 1 FROM public.series_seasons ss WHERE ss.series_id=v.series_id AND ss.season_number=v.season_number
)
ON CONFLICT DO NOTHING;
SELECT series_id,count(*) n FROM public.series_seasons WHERE series_id IN (52341,78570,46065,47549,42062,41428,49945,55905,47199) GROUP BY series_id ORDER BY series_id;