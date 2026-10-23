-- Aucun compte réel n'est supprimé par ce scénario.
DO $$
DECLARE fn oid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='card_listings_buyer_id_fkey'
  AND confdeltype='n' AND conrelid='public.card_listings'::regclass) THEN
  RAISE EXCEPTION 'Le compte acheteur pourrait bloquer la suppression';
 END IF;
 SELECT 'public.export_my_account_data()'::regprocedure::oid INTO fn;
 IF has_function_privilege('anon',fn,'EXECUTE') OR NOT has_function_privilege('authenticated',fn,'EXECUTE')
 THEN RAISE EXCEPTION 'Export utilisateur exposé sans compte';END IF;
 SELECT 'public.submit_player_report(text,text,text,text)'::regprocedure::oid INTO fn;
 IF has_function_privilege('anon',fn,'EXECUTE') OR NOT has_function_privilege('authenticated',fn,'EXECUTE')
 THEN RAISE EXCEPTION 'Signalement exposé sans compte';END IF;
 IF has_table_privilege('anon','public.player_reports','SELECT') OR
    has_table_privilege('authenticated','public.player_reports','SELECT') THEN
  RAISE EXCEPTION 'Signalements lisibles par les joueurs';END IF;
END $$;
-- Test du filtrage individuel, sans aucun identifiant externe.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE doc jsonb;failed boolean:=false;
BEGIN
 doc:=public.export_my_account_data();
 IF doc->>'account_id'<>'00000000-0000-4000-8000-000000000002'
 OR NOT doc ? 'cards' OR NOT doc ? 'transactions' OR NOT doc ? 'wishlist'
 THEN RAISE EXCEPTION 'Export incomplet';END IF;
 BEGIN
  PERFORM public.submit_player_report('player',
   '00000000-0000-4000-8000-000000000002','abuse','Signalement fictif interdit');
 EXCEPTION WHEN OTHERS THEN failed:=true;END;
 IF NOT failed THEN RAISE EXCEPTION 'Auto-signalement accepté';END IF;
END $$;
RESET ROLE;
SELECT 'Protection effacement, export et signalement validée' AS resultat;
