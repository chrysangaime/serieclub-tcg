INSERT INTO public.credit_booster_types(pack_key,label,price_credits,enabled) VALUES
 ('genre_comedy','Comédies',160,true),
 ('genre_crime','Enquêtes',180,true),
 ('genre_thriller','Suspense',200,true),
 ('genre_fantasy','Fantastique',220,true)
ON CONFLICT(pack_key) DO UPDATE SET label=EXCLUDED.label,price_credits=EXCLUDED.price_credits,enabled=true;
INSERT INTO public.credit_booster_members(pack_key,series_id,checked_on)
SELECT CASE g.genre WHEN 'Comedy' THEN 'genre_comedy' WHEN 'Crime' THEN 'genre_crime'
 WHEN 'Thriller' THEN 'genre_thriller' ELSE 'genre_fantasy' END,s.id,CURRENT_DATE
FROM public.series s CROSS JOIN (VALUES ('Comedy'),('Crime'),('Thriller'),('Fantasy')) g(genre)
WHERE g.genre=ANY(s.genres) AND s.fr_verified IS TRUE
 AND s.content_status='series' AND s.fr_verification_method='tvmaze_fr_origin'
 AND s.rarity_source<>'pending' AND s.image_url LIKE 'https://%'
ON CONFLICT(pack_key,series_id) DO UPDATE SET checked_on=EXCLUDED.checked_on;
