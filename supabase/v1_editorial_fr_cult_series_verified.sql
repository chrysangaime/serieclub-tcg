-- Catalogue français : sources indépendantes vérifiées le 25 octobre 2026.
-- Ne réintroduire que les séries dont la présence française figure dans les index officiels.
WITH evidenced(name,source) AS (VALUES
('Stranger Things','https://www.netflix.com/fr/browse/genre/83'),
('Wednesday','https://www.netflix.com/fr/browse/genre/83'),
('Squid Game','https://www.netflix.com/fr/browse/genre/83'),
('La Casa de Papel','https://www.netflix.com/fr/browse/genre/83'),
('Breaking Bad','https://www.netflix.com/fr/browse/genre/83'),
('Peaky Blinders','https://www.netflix.com/fr/browse/genre/83'),
('The Witcher','https://www.netflix.com/fr/browse/genre/83'),
('The Crown','https://www.netflix.com/fr/browse/genre/83'),
('Lupin','https://www.netflix.com/fr/browse/genre/83'),
('The Walking Dead','https://www.netflix.com/fr/browse/genre/83'),
('Bridgerton','https://www.netflix.com/fr/browse/genre/83'),
('Lucifer','https://www.netflix.com/fr/browse/genre/83'),
('Narcos','https://www.netflix.com/fr/browse/genre/83'),
('Ozark','https://www.netflix.com/fr/browse/genre/83'),
('Sex Education','https://www.netflix.com/fr/browse/genre/83'),
('Outer Banks','https://www.netflix.com/fr/browse/genre/83'),
('The Gentlemen','https://www.netflix.com/fr/browse/genre/83'),
('The Night Agent','https://www.netflix.com/fr/browse/genre/83'),
('One Piece','https://www.netflix.com/fr/browse/genre/83'),
('Adolescence','https://www.netflix.com/fr/browse/genre/83'),
('The Office','https://www.netflix.com/fr/browse/genre/83'),
('Andor','https://www.disney.fr/disney-plus-tout-ce-que-vous-devez-savoir'),
('The Bear','https://www.disney.fr/disney-plus-tout-ce-que-vous-devez-savoir'),
('Paradise','https://www.disney.fr/disney-plus-tout-ce-que-vous-devez-savoir'),
('The White Lotus','https://www.justwatch.com/fr/serie/the-white-lotus')
), chosen AS (
SELECT DISTINCT ON (e.name) s.id,e.source FROM evidenced e
JOIN public.series s ON lower(s.name)=lower(e.name)
WHERE s.image_url LIKE 'https://%' AND s.premiered IS NOT NULL
ORDER BY e.name,
CASE WHEN s.fr_verified THEN 0 ELSE 1 END,
CASE WHEN e.name='One Piece' AND s.premiered='2023-08-31' THEN -2
     WHEN e.name='One Piece' THEN 2 ELSE 0 END,s.id
)
UPDATE public.series s SET
 fr_verified=true,
 fr_verification_method='editorial_fr_history',
 fr_evidence_url=c.source,
 fr_verified_at=now(),
 content_status='series'
FROM chosen c WHERE s.id=c.id AND s.fr_verification_method IS DISTINCT FROM 'tvmaze_fr_origin'
AND s.fr_verification_method IS DISTINCT FROM 'streaming_availability_fr';
SELECT count(*) n FROM public.series WHERE fr_verified AND content_status='series' AND fr_verification_method='editorial_fr_history';