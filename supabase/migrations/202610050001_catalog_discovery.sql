-- Catalog cards are one bounded query, including metrics, tags and cover references.
begin;
-- An explicit empty assignment/configuration differs from an absent default.
create table app.catalog_tag_configuration (
  club_id text primary key references app.clubs(id)
);
create table app.catalog_tag_sets (
  club_id text not null,
  catalog_id text not null,
  primary key (club_id, catalog_id),
  foreign key (club_id, catalog_id) references app.catalog(club_id, id) on delete cascade
);
insert into app.catalog_tag_configuration select distinct club_id from app.catalog_tags;
insert into app.catalog_tag_sets select distinct club_id, catalog_id from app.catalog_tag_assignments;
alter table app.catalog_tag_configuration enable row level security;
alter table app.catalog_tag_sets enable row level security;
revoke all on app.catalog_tag_configuration, app.catalog_tag_sets from public, anon, authenticated;
grant select, insert, update, delete on app.catalog_tag_configuration, app.catalog_tag_sets to service_role;
create index sightings_local_name_date_idx on app.sightings(club_id, reported_name, observed_at)
  where visible and source = 'campus-cats';

create function app_private.catalog_tags_for_club(p_club text)
returns table(id text, label text) language sql stable security invoker set search_path = '' as $$
  select t.id, t.label from app.catalog_tags t where t.club_id = p_club
  union all
  select defaults.* from (values
    ('adopted','Adopted'), ('feral','Feral'), ('frat-cat','Frat Cat'), ('deceased','Deceased'),
    ('tnr-complete','TNR complete'), ('needs-tnr','Needs TNR'), ('female','Female'), ('male','Male'),
    ('short-hair','Short hair'), ('medium-hair','Medium hair'), ('long-hair','Long hair')
  ) defaults(id, label)
  where not exists(select 1 from app.catalog_tag_configuration config where config.club_id = p_club);
$$;
revoke all on function app_private.catalog_tags_for_club(text) from public, anon, authenticated;
grant execute on function app_private.catalog_tags_for_club(text) to service_role;

create function public.cc_catalog_discovery(p_club text, p_project text, p_user_id text,
  p_search text default '', p_sort text default 'name-asc', p_tag_ids text[] default '{}',
  p_limit integer default 40, p_after jsonb default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if p_club is null or p_project is null or p_user_id is null or p_search is null or length(p_search) > 200
    or p_sort is null or p_sort not in ('name-asc','name-desc','sightings','recent','hearts')
    or p_tag_ids is null or cardinality(p_tag_ids) > 50 or array_position(p_tag_ids,null) is not null
    or p_limit is null or p_limit not between 1 and 100 then
    raise exception 'Invalid catalog query' using errcode = '22023';
  end if;
  if p_after is not null and (jsonb_typeof(p_after) <> 'object'
    or coalesce(jsonb_typeof(p_after->'name'),'null') <> 'string'
    or coalesce(jsonb_typeof(p_after->'id'),'null') <> 'string'
    or not (p_after ? 'metric')
    or p_after->>'sort' is distinct from p_sort
    or p_after->>'search' is distinct from p_search
    or p_after->'tagIds' is distinct from to_jsonb(p_tag_ids)) then
    raise exception 'Cursor does not match catalog query' using errcode = '22023';
  end if;
  if not exists(select 1 from app.clubs where id = p_club and firebase_project_id = p_project) then
    return jsonb_build_object('items','[]'::jsonb,'total',0,'available_tags','[]'::jsonb,'selected_catalog_id',null);
  end if;
  with configured as materialized (
    select * from app_private.catalog_tags_for_club(p_club)
  ), cards as materialized (
    select c.*, lower(c.name) as sort_name, stats.sighting_count, stats.first_sighting_at, stats.latest_sighting_at,
      (select count(*) from app.catalog_favorites f where f.club_id = p_club and f.catalog_id = c.id) as heart_count,
      coalesce(tags.value,'[]'::jsonb) as tags,
      (select to_jsonb(m) from app.media_references m
        where m.club_id = p_club and m.owner_kind = 'catalog' and m.role = 'profile'
          and m.owner_id = case when c.linked_local_catalog_id is not null and exists(
            select 1 from app.media_references local_media where local_media.club_id = p_club
              and local_media.owner_kind = 'catalog' and local_media.owner_id = c.linked_local_catalog_id)
            then c.linked_local_catalog_id else c.id end
        order by m.position, m.id limit 1) as cover
    from app.effective_catalog c
    cross join lateral (
      select count(*) as sighting_count, min(s.observed_at) as first_sighting_at, max(s.observed_at) as latest_sighting_at
      from app.sightings s where s.club_id = p_club and s.visible and (
        -- Match the existing display-name counting behavior without inventing entity links.
        (s.source = 'campus-cats' and s.reported_name = c.name and (c.source = 'campus-cats' or c.linked_local_catalog_id is not null))
        or (c.source = 'inaturalist' and s.source = 'inaturalist' and s.guide_taxon_id = c.source_id))
    ) stats
    left join lateral (
      select jsonb_agg(to_jsonb(t) order by t.label, t.id) as value from configured t where
        case when exists(select 1 from app.catalog_tag_sets sets where sets.club_id = p_club and sets.catalog_id = c.id)
        then exists(select 1 from app.catalog_tag_assignments a where a.club_id = p_club and a.catalog_id = c.id and a.tag_id = t.id)
        else t.id = any(array[
          case c.current_status when 'Adopted' then 'adopted' when 'Feral' then 'feral' when 'Frat Cat' then 'frat-cat' when 'Deceased' then 'deceased' end,
          case c.tnr when 'Yes' then 'tnr-complete' when 'No' then 'needs-tnr' end,
          case c.sex when 'Female' then 'female' when 'Male' then 'male' end,
          case c.fur_length when 'Short' then 'short-hair' when 'Medium' then 'medium-hair' when 'Long' then 'long-hair' end
        ]) end
    ) tags on true
    where c.club_id = p_club
  ), filtered as materialized (
    select *, case p_sort when 'sightings' then sighting_count::numeric
      when 'hearts' then heart_count::numeric when 'recent' then extract(epoch from latest_sighting_at) end as sort_metric
    from cards c where strpos(lower(concat_ws(' ', c.name,c.description_short,c.description_long,c.color_pattern,c.behavior,
      c.years_recorded,c.area_of_residence,c.current_status,c.fur_length,c.fur_pattern,c.tnr,c.sex,
      (select string_agg(t->>'label',' ') from jsonb_array_elements(c.tags) t))),lower(trim(p_search))) > 0
      and not exists(select 1 from unnest(p_tag_ids) wanted where not exists(
        select 1 from jsonb_array_elements(c.tags) tag where tag->>'id' = wanted))
  ), page as (
    select * from filtered where p_after is null or
      case p_sort
        when 'name-asc' then (sort_name,id) > (p_after->>'name',p_after->>'id')
        when 'name-desc' then (sort_name,id) < (p_after->>'name',p_after->>'id')
        else (sort_metric < (p_after->>'metric')::numeric
          or (sort_metric is null and p_after->>'metric' is not null)
          or (sort_metric is not distinct from (p_after->>'metric')::numeric
            and (sort_name,id) > (p_after->>'name',p_after->>'id'))) end
    order by case when p_sort = 'name-desc' then sort_name end desc,
      case when p_sort = 'name-desc' then id end desc,
      sort_metric desc nulls last, sort_name, id limit p_limit
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(page) || jsonb_build_object('cursor',jsonb_build_object(
      'name',sort_name,'id',id,'metric',sort_metric::text,'sort',p_sort,'search',p_search,'tagIds',to_jsonb(p_tag_ids)))
      order by case when p_sort = 'name-desc' then sort_name end desc,
        case when p_sort = 'name-desc' then id end desc,sort_metric desc nulls last,sort_name,id) from page),'[]'::jsonb),
    'total',(select count(*) from filtered),
    'available_tags',coalesce((select jsonb_agg(to_jsonb(configured) order by label,id) from configured),'[]'::jsonb),
    'selected_catalog_id',(select catalog_id from app.catalog_favorites where club_id = p_club and user_id = p_user_id)
  ) into result;
  return result;
end $$;
revoke all on function public.cc_catalog_discovery(text,text,text,text,text,text[],integer,jsonb) from public, anon, authenticated;
grant execute on function public.cc_catalog_discovery(text,text,text,text,text,text[],integer,jsonb) to service_role;
commit;
