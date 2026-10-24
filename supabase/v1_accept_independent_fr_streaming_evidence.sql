ALTER TABLE public.series DROP CONSTRAINT sc_fr_evidence_check;
ALTER TABLE public.series ADD CONSTRAINT sc_fr_evidence_check CHECK (
 NOT fr_verified OR (
 fr_verification_method IN ('editorial_fr_history','tmdb_fr_offer','tvmaze_fr_origin','streaming_availability_fr')
 AND fr_evidence_url IS NOT NULL AND left(fr_evidence_url,8)='https://'
 AND length(fr_evidence_url) BETWEEN 13 AND 512 AND fr_verified_at IS NOT NULL
));