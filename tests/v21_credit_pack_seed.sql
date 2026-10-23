-- Fixtures exclusivement CI : compléter la couverture française TV et replay.
INSERT INTO public.series(id,name,premiered,genres,image_url,fr_verified,fr_verification_method,fr_evidence_url,fr_verified_at,popularity_weight)
SELECT id,'TV française test '||id,DATE '2023-01-01',ARRAY['Drama']::text[],
 'https://example.org/tv-test-'||id||'.jpg',true,'editorial_fr_history','https://example.org/fr-test',now(),(id%80)+4
FROM unnest(ARRAY[1,19,24,32,48,60,66,68,70,81,89,101,103,106,109,111,116,123,128,133,156,157,158,161]::bigint[]) AS ids(id)
ON CONFLICT(id) DO UPDATE SET
 fr_verified=true,fr_verification_method='editorial_fr_history',
 fr_evidence_url='https://example.org/fr-test',fr_verified_at=now(),
 image_url=EXCLUDED.image_url,popularity_weight=EXCLUDED.popularity_weight;
