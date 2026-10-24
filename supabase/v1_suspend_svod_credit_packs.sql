-- V1 : suspendre les packs SVOD dont les compositions ont une provenance historique
-- non intégralement revalidée. Réversible après audit, sans toucher aux cartes/crédits.
UPDATE public.credit_booster_types
SET enabled = false
WHERE pack_key IN ('netflix','prime','disney','television')
  AND enabled IS DISTINCT FROM false;
