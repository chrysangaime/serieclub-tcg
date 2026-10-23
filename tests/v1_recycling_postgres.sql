-- V1.0 : recyclage de doublons, contrôles de propriété et atomicité.
-- Précondition : migrations V1 + données de tests historiques.
DO $$
DECLARE sid bigint; i uuid; j uuid; k uuid; bad uuid;
BEGIN
 SELECT id INTO sid FROM public.series
 WHERE fr_verified IS TRUE AND rarity_source<>'pending'
  AND rarity IN ('Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique')
  AND NOT EXISTS(SELECT 1 FROM public.player_cards c
   WHERE c.series_id=series.id AND c.owner_id='00000000-0000-4000-8000-000000000002')
 ORDER BY id LIMIT 1;
 IF sid IS NULL THEN RAISE EXCEPTION 'Aucune série certifiée disponible pour les tests';END IF;
 INSERT INTO public.player_cards(owner_id,series_id,rarity)
 SELECT '00000000-0000-4000-8000-000000000002',sid,s.rarity
 FROM public.series s WHERE s.id=sid RETURNING id INTO i;
 INSERT INTO public.player_cards(owner_id,series_id,rarity)
 SELECT '00000000-0000-4000-8000-000000000002',sid,s.rarity
 FROM public.series s WHERE s.id=sid RETURNING id INTO j;
 INSERT INTO public.player_cards(owner_id,series_id,rarity)
 SELECT '00000000-0000-4000-8000-000000000002',sid,s.rarity
 FROM public.series s WHERE s.id=sid RETURNING id INTO k;
 UPDATE public.player_cards SET locked=true WHERE id=k;
 INSERT INTO public.player_cards(owner_id,series_id,rarity)
 SELECT '00000000-0000-4000-8000-000000000003',sid,s.rarity
 FROM public.series s WHERE s.id=sid RETURNING id INTO bad;
 PERFORM set_config('test.v1_recycle_first',i::text,false);
 PERFORM set_config('test.v1_recycle_second',j::text,false);
 PERFORM set_config('test.v1_recycle_locked',k::text,false);
 PERFORM set_config('test.v1_recycle_other',bad::text,false);
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE first_id uuid:=current_setting('test.v1_recycle_first')::uuid;
 second_id uuid:=current_setting('test.v1_recycle_second')::uuid;
 locked_id uuid:=current_setting('test.v1_recycle_locked')::uuid;
 other_id uuid:=current_setting('test.v1_recycle_other')::uuid;
 n integer;gained bigint;old_balance bigint;new_balance bigint;
 refused boolean;
BEGIN
 IF (SELECT cards_remaining FROM public.my_recycling_status())<>60
 THEN RAISE EXCEPTION 'Quota initial invalide';END IF;
 SELECT credits INTO old_balance FROM public.player_wallets WHERE player_id=auth.uid();
 -- Les cartes protégées et celles d'autres joueurs sont refusées sans perte.
 refused:=false;
 BEGIN PERFORM * FROM public.recycle_duplicate_cards(ARRAY[first_id,locked_id]);
 EXCEPTION WHEN OTHERS THEN refused:=true;END;
 IF NOT refused THEN RAISE EXCEPTION 'Carte verrouillée recyclable';END IF;
 refused:=false;
 BEGIN PERFORM * FROM public.recycle_duplicate_cards(ARRAY[first_id,other_id]);
 EXCEPTION WHEN OTHERS THEN refused:=true;END;
 IF NOT refused THEN RAISE EXCEPTION 'Carte d’autrui recyclable';END IF;
 refused:=false;
 BEGIN PERFORM * FROM public.recycle_duplicate_cards(ARRAY[first_id,first_id]);
 EXCEPTION WHEN OTHERS THEN refused:=true;END;
 IF NOT refused THEN RAISE EXCEPTION 'Double identifiant accepté';END IF;
 -- 2 sur 3 exemplaires : l'exemplaire protégé reste.
 SELECT cards_recycled,credits_earned INTO n,gained FROM
 public.recycle_duplicate_cards(ARRAY[first_id,second_id]);
 IF n<>2 OR gained<6 THEN RAISE EXCEPTION 'Récompense incorrecte';END IF;
 SELECT credits INTO new_balance FROM public.player_wallets WHERE player_id=auth.uid();
 IF new_balance-old_balance<>gained THEN RAISE EXCEPTION 'Crédits non atomiques';END IF;
 IF EXISTS(SELECT 1 FROM public.player_cards WHERE id=first_id OR id=second_id)
 THEN RAISE EXCEPTION 'Cartes non retirées';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.player_cards WHERE id=locked_id AND locked)
 THEN RAISE EXCEPTION 'Dernier exemplaire perdu';END IF;
 IF (SELECT cards_remaining FROM public.my_recycling_status())<>58
 THEN RAISE EXCEPTION 'Quota non décrémenté';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.game_transactions
  WHERE player_id=auth.uid() AND kind='duplicate_recycle' AND amount=gained)
 THEN RAISE EXCEPTION 'Écriture comptable absente';END IF;
 -- Refuser suppression de la dernière copie (même si déverrouillée).
 UPDATE public.player_cards SET locked=false WHERE id=locked_id;
 refused:=false;
 BEGIN PERFORM * FROM public.recycle_duplicate_cards(ARRAY[locked_id]);
 EXCEPTION WHEN OTHERS THEN refused:=true;END;
 IF NOT refused THEN RAISE EXCEPTION 'Dernier exemplaire recyclable';END IF;
END $$;
RESET ROLE;

UPDATE public.player_recycle_daily SET cards_used=60
WHERE player_id='00000000-0000-4000-8000-000000000002';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE refused boolean:=false;
BEGIN
 IF (SELECT cards_remaining FROM public.my_recycling_status())<>0 THEN
  RAISE EXCEPTION 'Quota journalier ignoré';END IF;
 BEGIN
  PERFORM * FROM public.recycle_duplicate_cards(ARRAY[current_setting('test.v1_recycle_locked')::uuid]);
 EXCEPTION WHEN OTHERS THEN refused:=true;END;
 IF NOT refused THEN RAISE EXCEPTION 'Recyclage accepté au-delà de la limite';END IF;
END $$;
RESET ROLE;
SELECT 'V1.0 : recyclage atomique, quotas, propriété et dernière copie vérifiés' AS resultat;
