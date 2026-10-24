-- V1.0 : couvrir la clé étrangère des appels fournisseur SVOD.
-- Une consultation ou suppression côté série n'impose plus un parcours complet
-- du journal des requêtes pour retrouver les enregistrements liés.
-- Réexécution sans effet si l'index existe déjà.
CREATE INDEX IF NOT EXISTS idx_fr_streaming_api_usage_series_id
ON public.fr_streaming_api_usage (series_id);
