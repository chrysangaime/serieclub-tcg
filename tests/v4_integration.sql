-- Test d'intégration réel PostgreSQL 16, sans service Supabase ni secrets.
-- S'exécute après toutes les migrations, dont game_v4.sql.
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002'),
 ('00000000-0000-4000-8000-000000000003');
insert into public.profiles(id,username) values
 ('00000000-0000-4000-8000-000000000001','seller_test'),
 ('00000000-0000-4000-8000-000000000002','buyer_test'),
 ('00000000-0000-4000-8000-000000000003','third_test');
insert into public.series(id,name,premiered,genres,image_url) values
 (101,'From','2022-02-01',array['Horror'],'https://example.org/from.jpg'),
 (102,'Sherlock','2010-07-01',array['Drama'],'https://example.org/sherlock.jpg'),
 (103,'Lost','2004-09-01',array['Mystery'],'https://example.org/lost.jpg'),
 (104,'Wednesday','2022-11-01',array['Horror'],'https://example.org/wednesday.jpg'),
 (105,'Friends','1994-09-01',array['Comedy'],'https://example.org/friends.jpg');
insert into public.player_wallets(player_id,credits) values
 ('00000000-0000-4000-8000-000000000001',0),
 ('00000000-0000-4000-8000-000000000002',400),
 ('00000000-0000-4000-8000-000000000003',0);
insert into public.player_cards(id,owner_id,series_id,rarity) values
 ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001',101,'Commune'),
 ('10000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',102,'Rare'),
 ('10000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000002',103,'Rare');
-- Les tables Supabase standards disposent normalement des grants créés par Supabase.
grant select on public.profiles,public.series,public.player_cards,public.player_wallets to authenticated;
grant select on public.game_transactions,public.player_quest_claims to authenticated;

set role authenticated;
do $$
declare
 seller constant uuid:='00000000-0000-4000-8000-000000000001';
 buyer constant uuid:='00000000-0000-4000-8000-000000000002';
 listing1 uuid;listing2 uuid;offer uuid;moved uuid; follows_count bigint;
 is_following boolean; erroneous_success boolean;
begin
 perform set_config('request.jwt.claim.sub',seller::text,false);
 listing1:=public.create_card_listing('10000000-0000-4000-8000-000000000001',100);
 if listing1 is null then raise exception 'Création d’annonce échouée';end if;
 perform set_config('request.jwt.claim.sub',buyer::text,false);
 moved:=public.buy_card_listing(listing1);
 if moved<>'10000000-0000-4000-8000-000000000001'::uuid then
  raise exception 'Carte achetée inattendue';end if;
 -- L'annonce vendue ne doit pas être achetable une seconde fois.
 erroneous_success:=false;
 begin
  perform public.buy_card_listing(listing1);
  erroneous_success:=true;
 exception when others then null;end;
 if erroneous_success then raise exception 'Double achat accepté';end if;
 -- Échange carte contre carte depuis une nouvelle annonce.
 perform set_config('request.jwt.claim.sub',seller::text,false);
 listing2:=public.create_card_listing('10000000-0000-4000-8000-000000000002',250);
 perform set_config('request.jwt.claim.sub',buyer::text,false);
 offer:=public.propose_card_trade(listing2,'10000000-0000-4000-8000-000000000003');
 if offer is null then raise exception 'Offre non créée';end if;
 -- La carte proposée est réservée et non revendable.
 erroneous_success:=false;
 begin
  perform public.create_card_listing('10000000-0000-4000-8000-000000000003',400);
  erroneous_success:=true;
 exception when others then null;end;
 if erroneous_success then raise exception 'Carte réservée remise en vente';end if;
 perform set_config('request.jwt.claim.sub',seller::text,false);
 if not public.respond_card_trade(offer,true) then raise exception 'Échange refusé';end if;
 -- Suivre un joueur, puis se désabonner.
 if not public.toggle_player_follow(buyer) then raise exception 'Abonnement impossible';end if;
 if public.toggle_player_follow(buyer) then raise exception 'Désabonnement impossible';end if;
 select count(*) into follows_count from public.player_directory();
 if follows_count<2 then raise exception 'Annuaire des joueurs indisponible';end if;
end $$;
reset role;

do $$
declare seller constant uuid:='00000000-0000-4000-8000-000000000001';
 buyer constant uuid:='00000000-0000-4000-8000-000000000002';
 balance_buyer bigint;balance_seller bigint;owner_1 uuid;owner_2 uuid;owner_3 uuid;
begin
 select credits into balance_buyer from public.player_wallets where player_id=buyer;
 select credits into balance_seller from public.player_wallets where player_id=seller;
 if balance_buyer<>300 or balance_seller<>100 then
  raise exception 'Transfert de crédits incorrect (%/% attendu 300/100)',balance_buyer,balance_seller;end if;
 select owner_id into owner_1 from public.player_cards where id='10000000-0000-4000-8000-000000000001';
 select owner_id into owner_2 from public.player_cards where id='10000000-0000-4000-8000-000000000002';
 select owner_id into owner_3 from public.player_cards where id='10000000-0000-4000-8000-000000000003';
 if owner_1<>buyer or owner_2<>buyer or owner_3<>seller then
  raise exception 'Propriété des cartes incorrecte';end if;
end $$;

-- Simulation de trois boosters réellement journalisés (opérations admin de test).
insert into public.game_transactions(player_id,kind,amount)
values
 ('00000000-0000-4000-8000-000000000002','booster',25),
 ('00000000-0000-4000-8000-000000000002','halloween',25),
 ('00000000-0000-4000-8000-000000000002','booster',25);
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
do $$
declare packs_today bigint;bonus integer;blocked boolean:=false;
begin
 select p.packs_today into packs_today from public.get_daily_progress() p;
 if packs_today<>3 then raise exception 'Missions : trois paquets non détectés';end if;
 bonus:=public.claim_quest_reward('pack1');
 if bonus<>35 then raise exception 'Mission 1 : bonus incorrect';end if;
 bonus:=public.claim_quest_reward('pack3');
 if bonus<>100 then raise exception 'Mission 3 : bonus incorrect';end if;
 begin
  perform public.claim_quest_reward('pack1');
 exception when others then blocked:=true;end;
 if not blocked then raise exception 'Une quête a été payée deux fois';end if;
end $$;
reset role;

do $$
declare b bigint; claimed_count integer;
begin
 select credits into b from public.player_wallets
 where player_id='00000000-0000-4000-8000-000000000002';
 if b<>435 then raise exception 'Solde après missions incorrect : %',b;end if;
 select count(*) into claimed_count from public.player_quest_claims
 where player_id='00000000-0000-4000-8000-000000000002';
 if claimed_count<>2 then raise exception 'Décompte des quêtes incorrect';end if;
end $$;
select 'OK : ventes, achat unique, offre réservée, échange, abonnements et quêtes validés.' as validation;
