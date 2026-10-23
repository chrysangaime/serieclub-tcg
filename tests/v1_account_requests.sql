-- V1 : non-régression du recours de suppression, sans supprimer aucun utilisateur.
-- Le scénario est intégralement annulé après exécution (ROLLBACK).
DO $$
BEGIN
 IF has_table_privilege('anon','public.account_deletion_requests','SELECT')
 OR has_table_privilege('authenticated','public.account_deletion_requests','SELECT')
 OR has_function_privilege('anon','public.request_account_deletion()','EXECUTE')
 OR has_function_privilege('anon','public.my_account_deletion_request()','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.request_account_deletion()','EXECUTE')
 OR NOT has_function_privilege('authenticated','public.my_account_deletion_request()','EXECUTE')
 THEN RAISE EXCEPTION 'Confidentialité des demandes de suppression incorrecte';END IF;
END $$;

BEGIN;
-- Deux comptes fictifs sont créés uniquement pour ce test local.
INSERT INTO auth.users(id) VALUES
('10000000-0000-4000-8000-000000000001'),
('10000000-0000-4000-8000-000000000002')
ON CONFLICT DO NOTHING;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
DO $$
DECLARE first_request timestamptz;second_request timestamptz;item_count integer;st text;
BEGIN
 first_request:=public.request_account_deletion();
 IF first_request IS NULL THEN RAISE EXCEPTION 'Demande non horodatée';END IF;
 SELECT count(*),max(status) INTO item_count,st FROM public.my_account_deletion_request();
 IF item_count<>1 OR st<>'pending' THEN RAISE EXCEPTION 'Demande personnelle introuvable';END IF;
 second_request:=public.request_account_deletion();
 SELECT count(*) INTO item_count FROM public.my_account_deletion_request();
 IF item_count<>1 OR second_request IS NULL THEN
  RAISE EXCEPTION 'Demande répétée non idempotente';END IF;

 -- Une autre session ne récupère que ses propres demandes (aucune ici).
 PERFORM set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
 SELECT count(*) INTO item_count FROM public.my_account_deletion_request();
 IF item_count<>0 THEN RAISE EXCEPTION 'Fuite entre comptes';END IF;
END $$;
ROLLBACK;
SELECT 'Demande de suppression et séparation utilisateurs : validées' AS resultat;
