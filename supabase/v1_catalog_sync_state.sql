CREATE TABLE IF NOT EXISTS public.catalog_sync_state(
 sync_key text PRIMARY KEY,
 cursor_id bigint NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (cursor_id>=0)
);
ALTER TABLE public.catalog_sync_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalog_sync_state FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.catalog_sync_state TO service_role;
INSERT INTO public.catalog_sync_state(sync_key,cursor_id)VALUES('tvmaze_seasons',0) ON CONFLICT DO NOTHING;
