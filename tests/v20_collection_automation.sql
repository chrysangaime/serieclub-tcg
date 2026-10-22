-- V20 : test complet SQL, authentification simulée, jeu de cartes isolé.
-- Vérifie opt-in, idempotence, propriétaire, protection et remise dans souhaits.
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE s record;before_count integer;after_count integer;candidate bigint;
 album uuid;denied boolean:=false;
BEGIN
 SELECT * INTO s FROM public.sync_official_collection('top20_netflix_2026');
 IF s.seasons_followed<>1 THEN RAISE EXCEPTION 'Suivi Netflix non activé';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.my_tracked_seasons() WHERE season_id='top20_netflix_2026')
 THEN RAISE EXCEPTION 'Suivi non enregistré';END IF;
 SELECT count(*) INTO before_count FROM public.player_wishlist w WHERE w.owner_id=auth.uid();
 IF before_count<15 THEN RAISE EXCEPTION 'Souhaits manquants après suivi: %',before_count;END IF;
 SELECT * INTO s FROM public.sync_official_collection('top20_netflix_2026');
 SELECT count(*) INTO after_count FROM public.player_wishlist w WHERE w.owner_id=auth.uid();
 IF before_count<>after_count OR s.wishes_added<>0 OR s.seasons_followed<>0
 THEN RAISE EXCEPTION 'Synchronisation non idempotente';END IF;
 BEGIN
  PERFORM public.sync_official_collection('nineties');
 EXCEPTION WHEN OTHERS THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Suivi non-TOP20 accepté';END IF;
 -- Ajouter un objectif d'album sans carte déjà possédée.
 album:=public.create_personal_album('Mes futurs coups de coeur','Titres pas encore tirés',false);
 SELECT t.series_id INTO candidate
 FROM public.official_season_titles t
 WHERE t.season_id='top20_disney_2026'
 AND NOT EXISTS(SELECT 1 FROM public.player_cards c WHERE c.owner_id=auth.uid() AND c.series_id=t.series_id)
 LIMIT 1;
 IF candidate IS NULL THEN RAISE EXCEPTION 'Aucun titre disponible';END IF;
 IF NOT public.add_series_to_personal_album(album,candidate) THEN
  RAISE EXCEPTION 'Série absente des objectifs album';END IF;
 IF (SELECT count(*) FROM public.personal_album_targets(album))<>1 THEN
  RAISE EXCEPTION 'Album personnel incomplet';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.player_wishlist WHERE owner_id=auth.uid() AND series_id=candidate)
 THEN RAISE EXCEPTION 'Ajout automatique aux souhaits échoué';END IF;
 IF (SELECT count(*) FROM public.search_personal_album_series('of'))>12 THEN
  RAISE EXCEPTION 'Recherche albums non plafonnée';END IF;
 -- Un autre joueur ne peut ni modifier ni lire un album privé.
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
 denied:=false;
 BEGIN
  PERFORM public.add_series_to_personal_album(album,candidate);
 EXCEPTION WHEN OTHERS THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Album personnel d’autrui modifiable';END IF;
 denied:=false;
 BEGIN PERFORM 1 FROM public.personal_album_targets(album);
 EXCEPTION WHEN OTHERS THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Album privé lisible sans autorisation';END IF;
END $$;
RESET ROLE;

-- Tirage serveur d’une nouvelle carte suivie : souhait retiré, carte bloquée.
DO $$
DECLARE target bigint;id_first uuid;id_second uuid;islocked boolean;
BEGIN
 SELECT w.series_id INTO target
 FROM public.player_wishlist w
 JOIN public.official_season_titles t ON t.series_id=w.series_id
 WHERE w.owner_id='00000000-0000-4000-8000-000000000002'
 AND t.season_id='top20_netflix_2026' LIMIT 1;
 IF target IS NULL THEN RAISE EXCEPTION 'Aucun titre manquant au Top20';END IF;
 INSERT INTO public.player_cards(owner_id,series_id,rarity)
 SELECT '00000000-0000-4000-8000-000000000002',s.id,s.rarity
 FROM public.series s WHERE s.id=target RETURNING id INTO id_first;
 SELECT locked INTO islocked FROM public.player_cards WHERE id=id_first;
 IF NOT islocked THEN RAISE EXCEPTION 'Le premier exemplaire acquis doit être protégé';END IF;
 IF EXISTS(SELECT 1 FROM public.player_wishlist
 WHERE owner_id='00000000-0000-4000-8000-000000000002' AND series_id=target)
 THEN RAISE EXCEPTION 'Le souhait acquis aurait dû disparaître';END IF;
 INSERT INTO public.player_cards(owner_id,series_id,rarity)
 SELECT '00000000-0000-4000-8000-000000000002',s.id,s.rarity
 FROM public.series s WHERE s.id=target RETURNING id INTO id_second;
 SELECT locked INTO islocked FROM public.player_cards WHERE id=id_second;
 IF islocked THEN RAISE EXCEPTION 'Le doublon doit rester libre';END IF;
 -- Dernier exemplaire retiré : le titre redevient un souhait automatiquement.
 DELETE FROM public.player_cards WHERE id=id_second;
 DELETE FROM public.player_cards WHERE id=id_first;
 IF NOT EXISTS(SELECT 1 FROM public.player_wishlist
 WHERE owner_id='00000000-0000-4000-8000-000000000002' AND series_id=target)
 THEN RAISE EXCEPTION 'Perte du dernier exemplaire non détectée';END IF;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE n integer;
BEGIN
 IF NOT public.unfollow_official_collection('top20_netflix_2026') THEN
  RAISE EXCEPTION 'Désabonnement impossible';END IF;
 SELECT count(*) INTO n FROM public.my_tracked_seasons();
 IF n<>0 THEN RAISE EXCEPTION 'Suivi présent après retrait';END IF;
END $$;
RESET ROLE;
SELECT 'V20 OK : souhaits, cible album, protection unique, perte et contrôle d’accès' AS validation;
