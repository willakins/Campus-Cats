-- Purpose-built, bounded reads for the Firebase gateway. No client EXECUTE grants.
begin;

-- A linked guide entry uses the local cat fields, and replaces its local list row.
create view app.effective_catalog with (security_invoker = true) as
select c.club_id, c.id, c.source, c.source_id,
  case when local.id is not null then local.name else c.name end as name,
  case when local.id is not null then local.description_short else c.description_short end as description_short,
  case when local.id is not null then local.description_long else c.description_long end as description_long,
  case when local.id is not null then local.color_pattern else c.color_pattern end as color_pattern,
  case when local.id is not null then local.behavior else c.behavior end as behavior,
  case when local.id is not null then local.years_recorded else c.years_recorded end as years_recorded,
  case when local.id is not null then local.area_of_residence else c.area_of_residence end as area_of_residence,
  case when local.id is not null then local.current_status else c.current_status end as current_status,
  case when local.id is not null then local.fur_length else c.fur_length end as fur_length,
  case when local.id is not null then local.fur_pattern else c.fur_pattern end as fur_pattern,
  case when local.id is not null then local.tnr else c.tnr end as tnr,
  case when local.id is not null then local.sex else c.sex end as sex,
  case when local.id is not null then local.credits || case when local.credits <> '' then E'\n' else '' end || 'iNaturalist source: ' || c.source_url else c.credits end as credits,
  c.created_at, c.source_url, c.source_updated_at, c.linked_local_catalog_id,
  c.match_status, c.source_active, c.visible,
  local.created_at as local_created_at, local.credits as local_credits
from app.catalog c left join app.catalog local
  on local.club_id = c.club_id and local.id = c.linked_local_catalog_id
where c.visible and not exists (
  select 1 from app.catalog linked where linked.club_id = c.club_id
    and linked.linked_local_catalog_id = c.id and linked.visible
);
revoke all on app.effective_catalog from public, anon, authenticated;
grant select on app.effective_catalog to service_role;

create function public.cc_catalog_page(p_club text, p_project text, p_limit integer default 40,
  p_after_name text default null, p_after_id text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if p_club is null or p_project is null or p_limit is null or p_limit not between 1 and 100
     or ((p_after_name is null) <> (p_after_id is null)) then
    raise exception 'Invalid page arguments' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(to_jsonb(page) order by page.sort_name, page.id), '[]'::jsonb) into result
  from (
    select c.*, lower(c.name) as sort_name,
      (select count(*) from app.sightings s where s.club_id = c.club_id and s.visible and
        (s.catalog_id = c.id or (c.source = 'inaturalist' and
          (s.guide_taxon_id = c.source_id or s.catalog_id = c.linked_local_catalog_id)))) as sighting_count,
      (select max(s.observed_at) from app.sightings s where s.club_id = c.club_id and s.visible and
        (s.catalog_id = c.id or (c.source = 'inaturalist' and
          (s.guide_taxon_id = c.source_id or s.catalog_id = c.linked_local_catalog_id)))) as latest_sighting_at,
      (select count(*) from app.catalog_favorites f where f.club_id = c.club_id and f.catalog_id = c.id) as heart_count
    from app.effective_catalog c where c.club_id = p_club and c.visible
      and exists (select 1 from app.clubs tenant where tenant.id = p_club and tenant.firebase_project_id = p_project)
      and (p_after_name is null or (lower(c.name), c.id) > (p_after_name, p_after_id))
    order by lower(c.name), c.id limit p_limit
  ) page;
  return result;
end $$;

create function public.cc_sightings_in_bounds(p_club text, p_project text, p_south double precision,
  p_north double precision, p_west double precision, p_east double precision,
  p_limit integer default 100, p_before_date timestamptz default null, p_before_id text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if p_club is null or p_project is null or p_limit is null or p_limit not between 1 and 200
     or p_south is null or p_north is null or p_west is null or p_east is null
     or p_south not between -90 and 90 or p_north not between p_south and 90
     or p_west not between -180 and 180 or p_east not between -180 and 180
     or ((p_before_date is null) <> (p_before_id is null)) then
    raise exception 'Invalid bounds/page arguments' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(to_jsonb(page) order by page.observed_at desc, page.id desc), '[]'::jsonb) into result
  from (
    select s.* from app.sightings s where s.club_id = p_club and s.visible
      and exists (select 1 from app.clubs tenant where tenant.id = p_club and tenant.firebase_project_id = p_project)
      and s.latitude between p_south and p_north
      and ((p_west <= p_east and s.longitude between p_west and p_east)
        or (p_west > p_east and (s.longitude >= p_west or s.longitude <= p_east)))
      and (p_before_date is null or (s.observed_at, s.id) < (p_before_date, p_before_id))
    order by s.observed_at desc, s.id desc limit p_limit
  ) page;
  return result;
end $$;

create function public.cc_cat_sightings(p_club text, p_project text, p_catalog_id text, p_limit integer default 40,
  p_before_date timestamptz default null, p_before_id text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if p_club is null or p_project is null or p_catalog_id is null or p_limit is null or p_limit not between 1 and 100
    or ((p_before_date is null) <> (p_before_id is null)) then
    raise exception 'Invalid cat/page arguments' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(to_jsonb(page) order by page.observed_at desc, page.id desc), '[]'::jsonb) into result
  from (
    select s.* from app.sightings s join app.catalog c on c.club_id = s.club_id and c.id = p_catalog_id
    where s.club_id = p_club and c.visible
      and exists (select 1 from app.clubs tenant where tenant.id = p_club and tenant.firebase_project_id = p_project) and s.visible
      and (s.catalog_id = c.id or (c.source = 'inaturalist' and
        (s.guide_taxon_id = c.source_id or s.catalog_id = c.linked_local_catalog_id)))
      and (p_before_date is null or (s.observed_at, s.id) < (p_before_date, p_before_id))
    order by s.observed_at desc, s.id desc limit p_limit
  ) page;
  return result;
end $$;

create function public.cc_member_profile(p_club text, p_project text, p_user_id text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select to_jsonb(p) || jsonb_build_object('role', m.role, 'achievement_ids',
    coalesce((select jsonb_agg(a.achievement_id order by a.achievement_id) from app.profile_achievements a
      where a.club_id = p.club_id and a.user_id = p.user_id), '[]'::jsonb))
  from app.profiles p join app_private.memberships m on m.club_id = p.club_id and m.user_id = p.user_id
  where p.club_id = p_club and p.user_id = p_user_id
    and exists (select 1 from app.clubs tenant where tenant.id = p_club and tenant.firebase_project_id = p_project);
$$;

create function public.cc_community_summary(p_club text, p_project text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'alerts', (select count(*) from app.announcements where club_id = p_club and kind = 'alert'),
    'events', (select count(*) from app.announcements where club_id = p_club and kind = 'event' and expires_at > now()),
    'open_surveys', (select count(*) from app.surveys where club_id = p_club and status = 'open' and audience = 'all_members'),
    'active_votes', (select count(*) from app.votes where club_id = p_club and ends_at > now() and audience = 'all_members'))
  where exists (select 1 from app.clubs tenant where tenant.id = p_club and tenant.firebase_project_id = p_project);
$$;

revoke all on function public.cc_catalog_page(text, text, integer, text, text) from public, anon, authenticated;
revoke all on function public.cc_sightings_in_bounds(text, text, double precision, double precision, double precision, double precision, integer, timestamptz, text) from public, anon, authenticated;
revoke all on function public.cc_cat_sightings(text, text, text, integer, timestamptz, text) from public, anon, authenticated;
revoke all on function public.cc_member_profile(text, text, text) from public, anon, authenticated;
revoke all on function public.cc_community_summary(text, text) from public, anon, authenticated;
grant execute on function public.cc_catalog_page(text, text, integer, text, text) to service_role;
grant execute on function public.cc_sightings_in_bounds(text, text, double precision, double precision, double precision, double precision, integer, timestamptz, text) to service_role;
grant execute on function public.cc_cat_sightings(text, text, text, integer, timestamptz, text) to service_role;
grant execute on function public.cc_member_profile(text, text, text) to service_role;
grant execute on function public.cc_community_summary(text, text) to service_role;
commit;
