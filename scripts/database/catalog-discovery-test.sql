\set ON_ERROR_STOP on
begin;
insert into app.clubs values ('discovery', 'Discovery', 'demo-test'),('foreign-discovery','Foreign','different-project');
insert into app.identities values ('discovery-member');
insert into app_private.memberships(club_id,user_id,role) values ('discovery','discovery-member',0);
insert into app.catalog(club_id,id,source,name,current_status,description_short) values
  ('discovery','a','campus-cats','Alice','Feral','distinct search'),
  ('discovery','b','campus-cats','Alice','Feral',''),
  ('discovery','c','campus-cats','Charlie','Unknown',''),
  ('foreign-discovery','secret','campus-cats','Alice','Feral','');
insert into app.sightings(club_id,id,source,reported_name,observed_at,visible) values
  ('discovery','one','campus-cats','Alice','2026-10-02T12:00:00.123456Z',true),
  ('discovery','two','campus-cats','Alice','2026-10-01Z',true),
  ('discovery','hidden','campus-cats','Alice','2026-10-03Z',false);
insert into app.catalog_favorites values ('discovery','discovery-member','b',now());
insert into app.catalog_tag_sets values ('discovery','b'); -- Explicitly empty, not the default Feral tag.

set local role service_role;
do $$ declare page jsonb; second jsonb; names text[]; ordering text; begin
  page := public.cc_catalog_discovery('discovery','demo-test','discovery-member');
  if (page->>'total')::int <> 3 or jsonb_array_length(page->'available_tags') <> 11 then raise exception 'Default tags/count changed'; end if;
  if page->'items'->0->>'sighting_count' <> '2' or (page->'items'->0->>'first_sighting_at')::timestamptz <> '2026-10-01Z'::timestamptz
    or (page->'items'->0->>'latest_sighting_at')::timestamptz <> '2026-10-02T12:00:00.123456Z'::timestamptz then raise exception 'Metrics or precision changed'; end if;
  if page->>'selected_catalog_id' <> 'b' then raise exception 'Favorite lookup failed'; end if;
  page := public.cc_catalog_discovery('discovery','demo-test','discovery-member','', 'name-asc',array['feral']);
  if page->>'total' <> '1' or page->'items'->0->>'id' <> 'a' then raise exception 'Explicit empty assignment/default tags changed'; end if;
  if public.cc_catalog_discovery('discovery','demo-test','discovery-member','distinct')->>'total' <> '1'
    or public.cc_catalog_discovery('discovery','demo-test','discovery-member','%')->>'total' <> '0' then raise exception 'Search literal behavior changed'; end if;
  foreach ordering in array array['name-asc','name-desc','sightings','recent','hearts'] loop
    page := public.cc_catalog_discovery('discovery','demo-test','discovery-member','',ordering,'{}',1);
    names := array[page->'items'->0->>'id'];
    second := public.cc_catalog_discovery('discovery','demo-test','discovery-member','',ordering,'{}',1,page->'items'->0->'cursor');
    names := array_append(names,second->'items'->0->>'id');
    second := public.cc_catalog_discovery('discovery','demo-test','discovery-member','',ordering,'{}',1,second->'items'->0->'cursor');
    names := array_append(names,second->'items'->0->>'id');
    if ordering='name-desc' and names <> array['c','b','a'] then raise exception 'Descending page boundary failure'; end if;
    if ordering='hearts' and names <> array['b','a','c'] then raise exception 'Heart page boundary failure'; end if;
    if ordering in ('name-asc','sightings','recent') and names <> array['a','b','c'] then raise exception 'Tied or null metric page boundary failure'; end if;
    page := public.cc_catalog_discovery('discovery','demo-test','discovery-member','',ordering,'{}',1,second->'items'->0->'cursor');
    if jsonb_array_length(page->'items') <> 0 then raise exception 'Paging did not end'; end if;
  end loop;
  if public.cc_catalog_discovery('foreign-discovery','demo-test','discovery-member')->>'total' <> '0' then raise exception 'Cross-project query accepted'; end if;
  page := public.cc_catalog_discovery('import-fixture','demo-test','fixture-user');
  if page->'items'->0->'cover'->>'id' <> 'photo-2' then raise exception 'Imported cover precedence changed'; end if;
  begin
    perform public.cc_catalog_discovery('discovery','demo-test','discovery-member','', 'name-asc','{}',101);
    raise exception 'Unbounded page accepted';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.cc_catalog_discovery('discovery','demo-test','discovery-member','other','name-asc','{}',1,second->'items'->0->'cursor');
    raise exception 'Cursor from different query accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
insert into app.catalog_tag_configuration values ('discovery'); -- Deliberately no configured tags.
set local role service_role;
do $$ begin
  if jsonb_array_length(public.cc_catalog_discovery('discovery','demo-test','discovery-member')->'available_tags') <> 0 then
    raise exception 'Empty configuration replaced by defaults'; end if;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin perform public.cc_catalog_discovery('discovery','demo-test','discovery-member'); raise exception 'Client RPC access';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
