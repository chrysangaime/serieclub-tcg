-- Fixtures isolées à la base PostgreSQL de CI. Pas d'insertion en production.
-- Construit un jeu de séries françaises assez large pour chaque Top20.
INSERT INTO public.series(id,name,premiered,genres,image_url,fr_verified,fr_verification_method,fr_evidence_url,fr_verified_at,popularity_weight)
SELECT id,'Offre France '||id,DATE '2021-01-01',ARRAY['Drama']::text[],
       'https://example.org/top20-'||id||'.jpg',true,'editorial_fr_history',
       'https://example.org/ci-fr-proof',now(),(id % 95)+5
FROM unnest(ARRAY[2,4,6,7,8,10,13,19,20,22,24,27,29,30,31,32,41,43,49,52,56,57,58,59,60,62,63,65,67,68,69,72,73,76,77,80,81,83,84,89,98,100,101,103,106,107,111,115,116,118,123,124,128,130,133,134,150,157,158,160,164,167,169,170,171,172,175,177,180,184,204,215,216,251,269,302,305,315,318,321,323,335]::bigint[]) AS ids(id)
ON CONFLICT(id) DO UPDATE SET
 fr_verified=true,fr_verification_method='editorial_fr_history',
 fr_evidence_url='https://example.org/ci-fr-proof',fr_verified_at=now(),
 image_url=EXCLUDED.image_url,popularity_weight=EXCLUDED.popularity_weight;

-- Séries synthétiques réservées aux classements éditoriaux (sans source plateforme).
INSERT INTO public.series(id,name,premiered,genres,image_url,fr_verified,fr_verification_method,fr_evidence_url,fr_verified_at,popularity_weight)
SELECT 992000+i,'Édition Top20 thème '+i,
 CASE WHEN i<=25 THEN DATE '1988-01-01' WHEN i<=50 THEN DATE '2014-06-01' ELSE DATE '2022-06-01' END,
 CASE WHEN i<=25 THEN ARRAY['Drama']::text[]
      WHEN i<=50 THEN ARRAY['Science-Fiction','Fantasy']::text[]
      ELSE ARRAY['Crime','Thriller']::text[] END,
 'https://example.org/theme-'||i||'.jpg',true,'editorial_fr_history',
 'https://example.org/ci-fr-proof',now(),(i+30)::numeric
FROM generate_series(1,75) AS g(i)
ON CONFLICT(id) DO NOTHING;
