-- Second lot : séries explicitement présentées dans les index français Netflix
UPDATE public.series SET fr_verified=true,fr_verification_method='editorial_fr_history',
 fr_evidence_url='https://www.netflix.com/fr/browse/genre/83',fr_verified_at=now(),content_status='series'
WHERE id IN (7194,47199,22127,37854,47549,567,175,31365,45840,170,5262,21532,150,435,172,60213,21845,16579,29191,2759,116,41428,22371,32938,63,55905,38893,27848,26020,49945) AND image_url LIKE 'https://%' AND premiered IS NOT NULL
AND fr_verification_method IS DISTINCT FROM 'tvmaze_fr_origin'
AND fr_verification_method IS DISTINCT FROM 'streaming_availability_fr';
SELECT count(*) n FROM public.series WHERE fr_verified AND content_status='series'
AND fr_verification_method IN('tvmaze_fr_origin','streaming_availability_fr','editorial_fr_history');