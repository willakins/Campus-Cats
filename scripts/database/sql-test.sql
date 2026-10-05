\set ON_ERROR_STOP on
begin;
insert into app.clubs values ('test-a', 'A', 'demo-test'), ('test-b', 'B', 'demo-test');
insert into app.identities values ('firebase-text-uid'), ('other-text-uid');
insert into app_private.memberships (club_id, user_id, role) values ('test-a', 'firebase-text-uid', 0);
insert into app.catalog (club_id, id, source, name) values
  ('test-a', 'cat', 'campus-cats', 'Alice'), ('test-a', 'cat-2', 'campus-cats', 'Alice'),
  ('test-b', 'other-cat', 'campus-cats', 'Hidden from A');
insert into app.sightings (club_id, id, source, catalog_id, reported_name, observed_at, latitude, longitude)
values ('test-a', 's1', 'campus-cats', 'cat', 'Alice', '2026-10-01Z', 33, -84),
  ('test-a', 's2', 'campus-cats', 'cat', 'Alice', '2026-10-01Z', 33, -84),
  ('test-a', 'dateline', 'campus-cats', 'cat', 'Alice', '2026-09-01Z', 0, 179),
  ('test-b', 'other-s', 'campus-cats', 'other-cat', 'Other', '2026-10-01Z', 33, -84);
insert into app.votes (club_id, id, kind, title, details, audience, created_at, starts_at, ends_at)
values ('test-a', 'v1', 'contest', 'Vote', '', 'all_members', now(), now(), now() + interval '1 day');
insert into app.vote_options values ('test-a', 'v1', 'o1', 0, 'Option', null);
insert into app.vote_ballots values ('test-a', 'v1', 'b1', 'o1', null, now()), ('test-a', 'v1', 'b2', 'o1', null, now());
insert into app_private.vote_receipts values ('test-a', 'v1', 'firebase-text-uid', 'b1');

do $$ begin
  if exists (select 1 from pg_tables t join pg_class c on c.relname = t.tablename
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
    where t.schemaname in ('app', 'app_private') and not c.relrowsecurity) then
    raise exception 'RLS missing';
  end if;
  if has_function_privilege('anon', 'public.cc_catalog_page(text,text,integer,text,text)', 'execute')
    or has_function_privilege('authenticated', 'public.cc_catalog_page(text,text,integer,text,text)', 'execute') then
    raise exception 'Client can invoke service RPC';
  end if;
  begin
    insert into app.sightings (club_id, id, source, catalog_id, reported_name, observed_at)
      values ('test-b', 'bad', 'campus-cats', 'cat', 'Bad', now());
    raise exception 'Cross-club foreign key accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into app_private.vote_receipts values ('test-a', 'v1', 'firebase-text-uid', 'b2');
    raise exception 'Duplicate ballot receipt accepted';
  exception when unique_violation then null; end;
  begin
    insert into app_private.vote_receipts values ('test-a', 'v1', 'other-text-uid', 'b2');
    raise exception 'Receipt for foreign member accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into app.votes (club_id, id, kind, title, details, audience, created_at, starts_at, ends_at)
      values ('test-a', 'bad-election', 'presidential_election', 'Election', '', 'all_members', now(), now(), now() + interval '1 day');
    raise exception 'Election without nomination deadline accepted';
  exception when check_violation then null; end;
  begin
    insert into app.media_references (club_id, owner_kind, owner_id, catalog_id, id, kind, url, role, position)
      values ('test-b', 'catalog', 'cat', 'cat', 'bad-photo', 'firebase', 'https://example.test/photo', 'profile', 0);
    raise exception 'Foreign-club media parent accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into app.profiles (club_id, user_id, display_name, selected_title_id)
      values ('test-a', 'firebase-text-uid', 'Member', 'locked-title');
    set constraints all immediate;
    raise exception 'Locked title accepted';
  exception when foreign_key_violation then null; end;
  begin
    insert into app.comments (club_id, id, target_kind, target_id, source, body, created_at)
      values ('test-a', 'bad-comment', 'sighting', 'missing', 'campus-cats', 'Bad', now());
    raise exception 'Comment without target accepted';
  exception when check_violation then null; end;
  begin
    perform public.cc_catalog_page('test-a', 'demo-test', 100000);
    raise exception 'Unbounded limit accepted';
  exception when invalid_parameter_value then null; end;
end $$;

set local role anon;
do $$ begin
  begin perform * from app_private.vote_receipts;
    raise exception 'Anonymous access to ballot identities';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin perform * from app.sightings;
    raise exception 'Client table access allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$ declare page jsonb; begin
  page := public.cc_catalog_page('test-a', 'demo-test', 1);
  if jsonb_array_length(page) <> 1 or page->0->>'club_id' <> 'test-a' then raise exception 'Page/tenant failure'; end if;
  page := public.cc_catalog_page('test-a', 'demo-test', 1, page->0->>'sort_name', page->0->>'id');
  if jsonb_array_length(page) <> 1 or page->0->>'id' <> 'cat-2' then raise exception 'Cursor skipped tied name'; end if;
  page := public.cc_sightings_in_bounds('test-a', 'demo-test', 32, 34, -85, -83, 1);
  if page->0->>'id' <> 's2' then raise exception 'Date tie ordering failed'; end if;
  page := public.cc_sightings_in_bounds('test-a', 'demo-test', 32, 34, -85, -83, 1, '2026-10-01Z', 's2');
  if page->0->>'id' <> 's1' then raise exception 'Date tie cursor failed'; end if;
  page := public.cc_sightings_in_bounds('test-a', 'demo-test', -1, 1, 170, -170, 1);
  if page->0->>'id' <> 'dateline' then raise exception 'Antimeridian failed'; end if;
  if jsonb_array_length(public.cc_cat_sightings('test-b', 'demo-test', 'cat')) <> 0 then raise exception 'Cross-tenant cat sightings'; end if;
  if (public.cc_catalog_page('test-a', 'demo-test', 1)->0->>'sighting_count')::integer <> 3 then raise exception 'Summary count failed'; end if;
  if jsonb_array_length(public.cc_catalog_page('test-a', 'wrong-project', 1)) <> 0 then raise exception 'Project isolation failed'; end if;
  page := public.cc_catalog_page('import-fixture', 'demo-test');
  if jsonb_array_length(page) <> 1 or page->0->>'id' <> 'inat-guide-123'
    or page->0->>'name' <> 'Cat''); select ''safe' then raise exception 'Linked catalog list behavior changed'; end if;
  if not exists(select 1 from app.media_references where club_id = 'import-fixture' and owner_id = 'inat-guide-123'
    and id = 'photo-2' and role = 'profile' and position = 0) then raise exception 'Cover photo ordering changed'; end if;
end $$;
reset role;
rollback;
