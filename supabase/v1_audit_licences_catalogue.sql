-- Diagnostic V1 : vérification des sources sans mutation.
-- Les cartes possédées restent inchangées, même quand une preuve d'origine
-- TMDB doit être remplacée pour de futurs tirages commerciaux.
SELECT s.fr_verification_method,
       COUNT(DISTINCT s.id) AS series_validees,
       COUNT(DISTINCT c.id) AS cartes_existantes,
       COUNT(DISTINCT m.series_id) AS titres_dans_packs
FROM public.series s
LEFT JOIN public.player_cards c ON c.series_id=s.id
LEFT JOIN public.credit_booster_members m ON m.series_id=s.id
WHERE s.fr_verified IS TRUE
GROUP BY s.fr_verification_method
ORDER BY series_validees DESC;

-- L'existence d'une ligne en cache n'est PAS synonyme de disponibilité.
SELECT COUNT(*) AS releves,
       COUNT(*) FILTER (WHERE expires_at>now()) AS releves_valides,
       COUNT(*) FILTER (
         WHERE expires_at>now()
           AND jsonb_typeof(offers)='array'
           AND jsonb_array_length(offers)>0
       ) AS releves_avec_offres
FROM public.fr_streaming_cache;

-- Séries présentes dans les boosters à revoir AVANT commercialisation.
-- Un relevé Movie of the Night ne régularise pas automatiquement les droits
-- de réutilisation des preuves TMDB historiques.
SELECT m.pack_key,
       COUNT(DISTINCT m.series_id) AS titres_a_reverifier
FROM public.credit_booster_members m
JOIN public.series s ON s.id=m.series_id
WHERE s.fr_verification_method='tmdb_fr_offer'
GROUP BY m.pack_key
ORDER BY m.pack_key;
