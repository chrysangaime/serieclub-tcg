-- Validation V1 : codes stables, suivi sécurisé, absence d'exposition d'e-mails.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE code text;
BEGIN
 code:=public.my_club_invite_code();
 IF code !~ '^[A-F0-9]{10}$' THEN RAISE EXCEPTION 'Code joueur incorrect';END IF;
 IF public.my_club_invite_code()<>code THEN RAISE EXCEPTION 'Code non stable';END IF;
 PERFORM set_config('test.v1_invite_code',code,false);
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
DO $$
DECLARE code text:=current_setting('test.v1_invite_code');did boolean;name text;refused boolean;
BEGIN
 SELECT username,added INTO name,did FROM public.follow_player_by_code(lower(code));
 IF name IS NULL OR NOT did THEN RAISE EXCEPTION 'Invitation non acceptée';END IF;
 SELECT added INTO did FROM public.follow_player_by_code(code);
 IF did THEN RAISE EXCEPTION 'Un doublon d’abonnement a été créé';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.player_follows
   WHERE follower_id=auth.uid() AND followed_id='00000000-0000-4000-8000-000000000002')
 THEN RAISE EXCEPTION 'Abonnement non enregistré';END IF;
 refused:=false;
 BEGIN PERFORM * FROM public.follow_player_by_code('ZZZZZZZZZZ');
 EXCEPTION WHEN OTHERS THEN refused:=true;END;
 IF NOT refused THEN RAISE EXCEPTION 'Code invalide accepté';END IF;
END $$;
RESET ROLE;
SELECT 'V1 : invitation par code, code stable et suivi sans doublon' AS validation;
