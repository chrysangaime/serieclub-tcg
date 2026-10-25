CREATE OR REPLACE FUNCTION public.list_credit_boosters()
 RETURNS TABLE(pack_key text, label text, price_credits integer, eligible_series integer, available boolean, proof_date date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 SELECT p.pack_key,p.label,p.price_credits,count(DISTINCT s.id)::integer,
 (p.enabled AND count(DISTINCT s.id)>=5),max(m.checked_on)
 FROM public.credit_booster_types p
 LEFT JOIN public.credit_booster_members m ON m.pack_key=p.pack_key
  AND (m.pack_key LIKE 'genre_%' OR m.checked_on>=CURRENT_DATE-90)
 LEFT JOIN public.series s ON s.id=m.series_id AND s.content_status='series' AND s.fr_verified IS TRUE AND s.fr_verification_method = 'tvmaze_fr_origin'
  AND s.rarity_source<>'pending' AND s.image_url LIKE 'https://%'
 GROUP BY p.pack_key,p.label,p.price_credits,p.enabled
 ORDER BY CASE p.pack_key WHEN 'netflix' THEN 1 WHEN 'prime' THEN 2
 WHEN 'disney' THEN 3 ELSE 4 END;
$function$
;
