\set ON_ERROR_STOP on
begin;
insert into app.clubs values('favorite-test','Favorite','demo-test'),('favorite-foreign','Foreign','demo-test');
insert into app.catalog(club_id,id,source,name,visible) values
  ('favorite-test','cat','campus-cats','Cat',true),('favorite-test','hidden','campus-cats','Hidden',false),
  ('favorite-foreign','other-cat','campus-cats','Foreign',true);
set local role service_role;
do $$ begin
  begin perform public.cc_set_catalog_favorite('favorite-test','demo-test','favorite-user',0,'op','cat');
    raise exception 'Preview database accepted a write'; exception when object_not_in_prerequisite_state then null; end;
end $$;
reset role;
insert into app_private.domain_backends values('favorite-test','catalog_core','postgres');
set local role service_role;
do $$ declare first jsonb; retry jsonb; begin
  first := public.cc_set_catalog_favorite('favorite-test','demo-test','favorite-user',0,'op','cat');
  retry := public.cc_set_catalog_favorite('favorite-test','demo-test','favorite-user',0,'op','cat');
  if first <> retry or (select count(*) from app.catalog_favorites where club_id='favorite-test') <> 1
    or (select count(*) from app_private.outbox where club_id='favorite-test') <> 1
    or (select count(*) from app_private.mutation_receipts where club_id='favorite-test') <> 1 then
    raise exception 'Retry duplicated mutation'; end if;
  begin perform public.cc_set_catalog_favorite('favorite-test','demo-test','favorite-user',0,'op',null);
    raise exception 'Operation ID reused'; exception when invalid_parameter_value then null; end;
  begin perform public.cc_set_catalog_favorite('favorite-test','different-project','favorite-user',0,'bad-project','cat');
    raise exception 'Foreign project mutation'; exception when insufficient_privilege then null; end;
  begin perform public.cc_set_catalog_favorite('favorite-test','demo-test','favorite-user',0,'bad-tenant','other-cat');
    raise exception 'Foreign-club favorite'; exception when invalid_parameter_value then null; end;
  begin perform public.cc_set_catalog_favorite('favorite-test','demo-test','favorite-user',0,'bad-hidden','hidden');
    raise exception 'Hidden favorite accepted'; exception when invalid_parameter_value then null; end;
  perform public.cc_set_catalog_favorite('favorite-test','demo-test','favorite-user',0,'same-cat','cat');
  if (select count(*) from app_private.outbox where club_id='favorite-test') <> 1 then raise exception 'No-op generated side effect'; end if;
  perform public.cc_set_catalog_favorite('favorite-test','demo-test','favorite-user',0,'clear',null);
  if exists(select 1 from app.catalog_favorites where club_id='favorite-test') then raise exception 'Favorite not cleared'; end if;
  -- Replaying an old accepted operation returns its receipt, without restoring an obsolete favorite.
  retry := public.cc_set_catalog_favorite('favorite-test','demo-test','favorite-user',0,'op','cat');
  if retry <> first or exists(select 1 from app.catalog_favorites where club_id='favorite-test')
    or (select count(*) from app_private.outbox where club_id='favorite-test') <> 2 then raise exception 'Old retry rewrote state'; end if;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin perform public.cc_set_catalog_favorite('favorite-test','demo-test','favorite-user',0,'client','cat');
    raise exception 'Client bypassed live gateway'; exception when insufficient_privilege then null; end;
end $$;
rollback;
