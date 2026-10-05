\set ON_ERROR_STOP on
begin;
insert into app.clubs values('detail-test','Details','demo-test'),('detail-foreign','Foreign','demo-test');
insert into app.identities values('detail-member'),('detail-other');
insert into app_private.memberships(club_id,user_id,role) values('detail-test','detail-member',0),('detail-test','detail-other',0);
insert into app.catalog(club_id,id,source,source_id,name,credits,created_at,linked_local_catalog_id,visible) values
  ('detail-test','local','campus-cats',null,'Local name','Local credits','2026-01-01',null,true),
  ('detail-test','inat-guide-5','inaturalist',5,'Source name','Imported credits',null,'local',true),
  ('detail-test','hidden','campus-cats',null,'Hidden','',null,null,false),
  ('detail-foreign','foreign','campus-cats',null,'Foreign','',null,null,true);
insert into app.media_references(club_id,owner_kind,owner_id,catalog_id,id,kind,url,role,position,metadata) values
  ('detail-test','catalog','local','local','a','firebase','https://example.com/a','profile',0,'{}'),
  ('detail-test','catalog','local','local','b','firebase','https://example.com/b','gallery',0,'{}'),
  ('detail-test','catalog','inat-guide-5','inat-guide-5','imported','external','https://example.com/imported','profile',0,'{"licenseCode":"cc-by"}'),
  ('detail-test','catalog','hidden','hidden','private','firebase','https://example.com/private','profile',0,'{}');
insert into app.catalog_favorites values
  ('detail-test','detail-member','local',now()),('detail-test','detail-other','inat-guide-5',now());
set local role service_role;
do $$ declare entry jsonb; media jsonb; counts jsonb; begin
  entry := public.cc_catalog_record('detail-test','demo-test','inat-guide-5');
  if entry->>'name' <> 'Local name' or entry->>'local_credits' <> 'Local credits'
    or entry ? 'user_id' or entry ? 'created_by' or entry ? 'contributor_id' then raise exception 'Linked detail/privacy mismatch'; end if;
  if public.cc_catalog_record('detail-test','demo-test','local')->>'name' <> 'Local name' then raise exception 'Linked local deep link lost'; end if;
  if public.cc_catalog_record('detail-test','demo-test','hidden') is not null
    or public.cc_catalog_record('detail-test','wrong-project','local') is not null
    or public.cc_catalog_record('detail-test','demo-test','foreign') is not null then raise exception 'Detail scope leaked'; end if;
  media := public.cc_catalog_media_page('detail-test','demo-test','inat-guide-5',1);
  if jsonb_array_length(media) <> 1 or media->0->>'id' <> 'a' then raise exception 'Linked local media precedence lost'; end if;
  media := public.cc_catalog_media_page('detail-test','demo-test','inat-guide-5',1,0,'a');
  if jsonb_array_length(media) <> 1 or media->0->>'id' <> 'b' then raise exception 'Tied media position cursor lost'; end if;
  if public.cc_catalog_media_page('detail-test','demo-test','hidden') <> '[]'::jsonb
    or public.cc_catalog_media_page('detail-test','wrong-project','local') <> '[]'::jsonb then raise exception 'Hidden media leaked'; end if;
  -- Imported media, including licenses, is used only if there are no local references.
  delete from app.media_references where club_id='detail-test' and owner_id='local';
  media := public.cc_catalog_media_page('detail-test','demo-test','inat-guide-5');
  if media->0->>'id' <> 'imported' or media->0->'metadata'->>'licenseCode' <> 'cc-by' then raise exception 'Imported photo/license lost'; end if;
  counts := public.cc_catalog_favorite_counts('detail-test','demo-test','detail-member',1);
  if counts->>'selected_catalog_id' <> 'local' or jsonb_array_length(counts->'items') <> 1
    or counts->'items'->0 ? 'user_id' then raise exception 'Favorite counts leaked identities'; end if;
  counts := public.cc_catalog_favorite_counts('detail-test','demo-test','detail-member',1,counts->'items'->0->>'catalog_id');
  if counts->'items'->0->>'catalog_id' <> 'local' then raise exception 'Favorite count pagination lost'; end if;
  if public.cc_catalog_favorite('detail-test','demo-test','detail-member')->>'catalog_id' <> 'local'
    or public.cc_catalog_favorite('detail-foreign','demo-test','detail-member') is not null
    or public.cc_catalog_favorite_counts('detail-test','wrong-project','detail-member')->'items' <> '[]'::jsonb then raise exception 'Favorite scope leaked'; end if;
  begin perform public.cc_catalog_media_page('detail-test','demo-test','local',1000);
    raise exception 'Unbounded media request'; exception when invalid_parameter_value then null; end;
  begin perform public.cc_catalog_media_page('detail-test','demo-test','local',1,0,null);
    raise exception 'Partial media cursor'; exception when invalid_parameter_value then null; end;
  insert into app.catalog(club_id,id,source,name) values
    ('detail-test','long-a','campus-cats',repeat('z',1000)),('detail-test','long-b','campus-cats',repeat('z',1000));
  entry := public.cc_catalog_page('detail-test','demo-test',2);
  if length(entry->1->>'sort_name') <> 1000 then raise exception 'Long name fixture missing'; end if;
  entry := public.cc_catalog_page('detail-test','demo-test',2,entry->1->>'sort_name',entry->1->>'id');
  if jsonb_array_length(entry) <> 1 or entry->0->>'id' <> 'long-b' then raise exception 'Long-name keyset lost tied row'; end if;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin perform public.cc_catalog_record('detail-test','demo-test','local');
    raise exception 'Direct client detail access'; exception when insufficient_privilege then null; end;
  begin perform public.cc_catalog_media_page('detail-test','demo-test','local');
    raise exception 'Direct client media access'; exception when insufficient_privilege then null; end;
  begin perform public.cc_catalog_favorite('detail-test','demo-test','detail-member');
    raise exception 'Direct client favorite access'; exception when insufficient_privilege then null; end;
  begin perform public.cc_catalog_favorite_counts('detail-test','demo-test','detail-member');
    raise exception 'Direct client count access'; exception when insufficient_privilege then null; end;
end $$;
rollback;
