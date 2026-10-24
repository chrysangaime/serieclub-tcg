-- V1 — candidats SVOD indépendants, privés et reconstruits depuis le cache sous licence.
-- Ne publie ni n'active aucun paquet : les droits des images restent à contrôler.
-- SECURITY INVOKER évite de contourner la RLS de fr_streaming_cache.
CREATE OR REPLACE VIEW public.v1_svod_rebuild_candidates
WITH (security_invoker = true)
AS
SELECT c.series_id,
       s.name AS series_name,
       o.item->>'id' AS pack_key,
       o.item->>'type' AS offer_type,
       c.checked_at,
       c.expires_at,
       s.fr_verification_method AS historical_proof,
       (s.fr_verification_method = 'tvmaze_fr_origin') AS independently_fr_origin
FROM public.fr_streaming_cache AS c
JOIN public.series AS s ON s.id = c.series_id
CROSS JOIN LATERAL jsonb_array_elements(
 CASE WHEN jsonb_typeof(c.offers)='array' THEN c.offers ELSE '[]'::jsonb END
) AS o(item)
WHERE c.country = 'FR'
  AND c.source = 'movieofthenight'
  AND c.expires_at > now()
  AND c.checked_at <= now()
  AND o.item->>'id' IN ('netflix','prime','disney')
  AND o.item->>'type' IN ('flatrate','free','addon')
  AND s.rarity_source <> 'pending';
-- Vue strictement réservée à l'administration : pas d'accès depuis le navigateur.
REVOKE ALL ON public.v1_svod_rebuild_candidates FROM PUBLIC, anon, authenticated;
