-- SérieClub V7 : tests SQL réels dans PostgreSQL éphémère de GitHub Actions.
-- Catalogue supplémentaire fictif, jamais en production.
INSERT INTO public.series(id,name,premiered,genres,image_url,fr_verified,fr_verification_method,fr_evidence_url,fr_verified_at)
VALUES
 (989101,'Épreuve 1996','1996-04-09',ARRAY['Drama'],'https://example.org/v7a.jpg',true,'editorial_fr_history','https://example.org/fr-v7',now()),
 (989102,'Épreuve 1999','1999-04-09',ARRAY['Drama'],'https://example.org/v7b.jpg',true,'editorial_fr_history','https://example.org/fr-v7',now()),
 (989103,'Épreuve 2002','2002-04-09',ARRAY['Drama'],'https://example.org/v7c.jpg',true,'editorial_fr_history','https://example.org/fr-v7',now()),
 (989104,'Épreuve 2008','2008-04-09',ARRAY['Drama'],'https://example.org/v7d.jpg',true,'editorial_fr_history','https://example.org/fr-v7',now()),
 (989105,'Épreuve 2014','2014-04-09',ARRAY['Drama'],'https://example.org/v7e.jpg',true,'editorial_fr_history','https://example.org/fr-v7',now()),
 (989106,'Épreuve 2018','2018-04-09',ARRAY['Drama'],'https://example.org/v7f.jpg',true,'editorial_fr_history','https://example.org/fr-v7',now())
ON CONFLICT(id) DO NOTHING;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE s jsonb;r jsonb;chosen bigint;game_id uuid;
 starts int;bonus bigint;first_credit bigint;last_credit bigint;after_credit bigint;
BEGIN
 SELECT credits INTO first_credit FROM public.player_wallets WHERE player_id=auth.uid();
 IF public.rewarded_quiz_status()->>'enabled'<>'true' THEN RAISE EXCEPTION 'Arène non activée';END IF;
 FOR starts IN 1..3 LOOP
  s:=public.start_rewarded_quiz(CASE WHEN starts=1 THEN 'poster' WHEN starts=2 THEN 'pixel' ELSE 'timeline' END);
  IF s->>'status'<>'active' OR s?'answer' OR (s->'question')?'answer'
    OR jsonb_array_length(s->'question'->'options')<>4 THEN
   RAISE EXCEPTION 'Le serveur a dévoilé une réponse ou une partie invalide';
  END IF;
  game_id:=(s->>'session_id')::uuid;
  IF (public.start_rewarded_quiz('year')->>'session_id')::uuid<>game_id THEN
   RAISE EXCEPTION 'Une partie active peut être doublée';END IF;
  FOR i IN 1..5 LOOP
   chosen:=(s->'question'->'options'->0->>'id')::bigint;
   r:=public.submit_rewarded_quiz_answer(game_id,chosen);
   IF r->>'status' NOT IN ('active','completed') THEN RAISE EXCEPTION 'Résultat non reçu';END IF;
   IF i<5 THEN
    s:=r;
    IF s?'correct_answer' AND (s->'question')?'answer' THEN
     RAISE EXCEPTION 'Réponse de la manche suivante exposée';
    END IF;
   END IF;
  END LOOP;
  IF (public.submit_rewarded_quiz_answer(game_id,chosen)->>'earned')::integer<>0 THEN
   RAISE EXCEPTION 'Une réponse a été récompensée deux fois';
  END IF;
 END LOOP;
 IF public.start_rewarded_quiz('year')->>'status'<>'limit' THEN
  RAISE EXCEPTION 'Quatrième partie acceptée dans la même journée';END IF;
 IF (public.rewarded_quiz_status()->>'remaining_today')::integer<>0 THEN
  RAISE EXCEPTION 'Quota quotidien erroné';END IF;
 SELECT credits INTO last_credit FROM public.player_wallets WHERE player_id=auth.uid();
 IF last_credit<first_credit OR last_credit-first_credit>240 THEN
  RAISE EXCEPTION 'Récompenses incompatibles avec le plafond de 240 crédits';END IF;
 -- Les entrées restent serveur, pas d'UPDATE public du portefeuille.
END $$;
RESET ROLE;

-- Aucun rôle client ne peut consulter les réponses cachées dans le stockage.
SET ROLE authenticated;
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  PERFORM question FROM public.rewarded_quiz_runs LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'La table des réponses est visible du client';END IF;
END $$;
RESET ROLE;
SELECT 'V7 vérifiée : cinq manches, points serveur, quota quotidien, non-rejeu et secret' AS resultat;
