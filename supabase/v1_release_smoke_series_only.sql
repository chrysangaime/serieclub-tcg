-- Read-only production smoke checks. These tests never grant or revoke player cards.
DO $$
DECLARE v_total int; v_distinct int; v_invalid int;
BEGIN
 SELECT count(*),count(DISTINCT p.show_id),count(*) FILTER(WHERE s.content_status<>'series')
 INTO v_total,v_distinct,v_invalid
 FROM public.pick_official_pack(false) p JOIN public.series s ON s.id=p.show_id;
 IF v_total<>5 OR v_distinct<>5 OR v_invalid<>0 THEN
  RAISE EXCEPTION 'Original booster failed: %, %, %',v_total,v_distinct,v_invalid;
 END IF;
 SELECT count(*),count(DISTINCT p.show_id),count(*) FILTER(WHERE s.content_status<>'series')
 INTO v_total,v_distinct,v_invalid
 FROM public.pick_official_pack(true) p JOIN public.series s ON s.id=p.show_id;
 IF v_total<>5 OR v_distinct<>5 OR v_invalid<>0 THEN
  RAISE EXCEPTION 'Halloween booster failed: %, %, %',v_total,v_distinct,v_invalid;
 END IF;
 IF EXISTS(SELECT 1 FROM public.v1_eligible_player_series_badges b
   JOIN public.series s ON s.id=b.series_id WHERE s.content_status<>'series') THEN
  RAISE EXCEPTION 'Invalid earned badge visible';
 END IF;
END $$;