-- Exécuté uniquement dans PostgreSQL de CI, après V5.4 puis V5.5.
-- Aucune donnée de production n'est touchée par ce test.
DO $$
DECLARE expected bigint;actual bigint;directory_count bigint;
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM public.series s WHERE s.id=430 AND s.fr_verified IS TRUE
   AND s.fr_verification_method='editorial_fr_history'
   AND s.fr_evidence_url='https://www.justwatch.com/fr/serie/the-x-files'
 ) THEN
  RAISE EXCEPTION 'X-Files 1993 (TVMaze 430) non reconnu en France';
 END IF;

 SELECT count(*) INTO expected
 FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
 WHERE c.owner_id='00000000-0000-4000-8000-000000000001'::uuid
  AND s.fr_verified IS TRUE AND s.rarity_source<>'pending';

 SELECT b.card_count INTO actual FROM public.get_leaderboard() b
 JOIN public.profiles p ON p.username=b.username
 WHERE p.id='00000000-0000-4000-8000-000000000001'::uuid;
 IF expected IS DISTINCT FROM actual THEN
  RAISE EXCEPTION 'Classement compte les cartes hors France : % contre %',actual,expected;
 END IF;

 SELECT d.cards_count INTO directory_count FROM public.player_directory() d
 WHERE d.player_id='00000000-0000-4000-8000-000000000001'::uuid;
 IF expected IS DISTINCT FROM directory_count THEN
  RAISE EXCEPTION 'Annuaire compte les cartes hors France : % contre %',directory_count,expected;
 END IF;
END $$;

-- Un changement de propriétaire d'une carte non FR doit échouer même si
-- une ancienne annonce demeurait encore ouverte dans un navigateur.
UPDATE public.series SET fr_verified=false WHERE id=203;
DO $$
DECLARE blocked boolean:=false;
BEGIN
 BEGIN
  UPDATE public.player_cards c
  SET owner_id='00000000-0000-4000-8000-000000000002'::uuid
  WHERE c.id=(
    SELECT id FROM public.player_cards
    WHERE owner_id='00000000-0000-4000-8000-000000000001'::uuid
      AND series_id=203 LIMIT 1
  );
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'Transfert impossible : série non vérifiée en France%' THEN
   blocked:=true;
  ELSE
   RAISE;
  END IF;
 END;
 IF NOT blocked THEN
  RAISE EXCEPTION 'Le transfert d une carte exclue n a pas été bloqué';
 END IF;
END $$;
UPDATE public.series SET fr_verified=true WHERE id=203;

DO $$
BEGIN
 IF EXISTS (
  SELECT 1 FROM public.marketplace_feed() f
  JOIN public.series s ON s.id=f.series_id
  WHERE NOT s.fr_verified OR s.rarity_source='pending'
 ) THEN RAISE EXCEPTION 'Annonce non française affichée au Comptoir';END IF;
 IF EXISTS (
  SELECT 1 FROM public.series s
  WHERE s.fr_verified AND s.fr_evidence_url IS NULL
 ) THEN RAISE EXCEPTION 'Certification France sans preuve';END IF;
END $$;

SELECT 'V5.5 validée : X-Files, classement France, conservation des cartes, Comptoir et transferts' AS resultat;
