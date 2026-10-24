-- Catalogue SVOD V1 reconstruit, isolé des anciens pack-members.
-- Ne modifie aucun compte, aucune carte, aucun solde et n'active aucun paiement.
CREATE TABLE IF NOT EXISTS public.v1_verified_svod_members (
 pack_key text NOT NULL CHECK (pack_key IN ('netflix','prime','disney')),
 series_id bigint NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
 checked_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 source text NOT NULL CHECK(source='movieofthenight'),
 PRIMARY KEY(pack_key,series_id)
);
ALTER TABLE public.v1_verified_svod_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.v1_verified_svod_members FROM PUBLIC,anon,authenticated;
-- Les candidats sont uniquement issus des offres françaises du fournisseur indépendant.
INSERT INTO public.v1_verified_svod_members(pack_key,series_id,checked_at,expires_at,source)
SELECT pack_key,series_id,max(checked_at),max(expires_at),'movieofthenight'
FROM public.v1_svod_rebuild_candidates
GROUP BY pack_key,series_id
ON CONFLICT(pack_key,series_id) DO UPDATE SET
 checked_at=excluded.checked_at,expires_at=excluded.expires_at,source=excluded.source;
-- Consommable uniquement par des fonctions serveur futures après audit des médias.
CREATE INDEX IF NOT EXISTS v1_verified_svod_expiry ON public.v1_verified_svod_members(expires_at);
