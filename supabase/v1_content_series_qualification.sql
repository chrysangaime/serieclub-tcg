-- Qualification prudente du catalogue : une présence sur TVmaze n'implique pas qu'il s'agisse d'une série TV.
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS content_status text NOT NULL DEFAULT 'review'
 CHECK (content_status IN ('series','review','excluded'));
UPDATE public.series SET content_status=CASE
 WHEN id IN (7308,14320,12587,12837,12078,25757,10586,27002,54728,48935,18681,55464,76727,82252,83326) THEN 'series'
 WHEN lower(name) ~ '(affaire conclue|koh.lanta|burger quiz|top chef|secret story|drag race|la villa des cœurs brisés|le journal du hard|secrets d.histoire|wheeler dealers)' THEN 'excluded'
 WHEN genres && ARRAY['Reality','Game Show','Talk Show','News','Sports','Food','Travel','Nature','Adult']::text[]
  AND NOT genres && ARRAY['Drama','Comedy','Crime','Thriller','Mystery','Science-Fiction','Fantasy','Horror','Action','Adventure','Romance','Animation','Family','War']::text[] THEN 'excluded'
 WHEN genres && ARRAY['Drama','Comedy','Crime','Thriller','Mystery','Science-Fiction','Fantasy','Horror','Action','Adventure','Romance','Animation','Family','War']::text[] THEN 'series'
 ELSE 'review' END
WHERE fr_verified=true;
