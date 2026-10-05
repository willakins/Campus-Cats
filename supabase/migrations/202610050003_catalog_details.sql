-- Catalog details, media and favorites use service RPCs with bounded pages.
begin;
create index media_catalog_page_idx on app.media_references(club_id,owner_id,position,id)
  where owner_kind='catalog';

create function public.cc_catalog_record(p_club text,p_project text,p_catalog_id text)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if p_club is null or p_project is null or p_catalog_id is null or length(p_catalog_id) not between 1 and 200 then
    raise exception 'Invalid catalog ID' using errcode='22023'; end if;
  if not exists(select 1 from app.clubs where id=p_club and firebase_project_id=p_project) then return null; end if;
  select to_jsonb(c) into result from app.effective_catalog c where c.club_id=p_club and c.id=p_catalog_id;
  if result is not null then return result; end if;
  -- Linked local entries remain addressable for local editing and existing deep links.
  select to_jsonb(c)||jsonb_build_object('local_created_at',null,'local_credits',null) into result
    from app.catalog c where c.club_id=p_club and c.id=p_catalog_id and c.source='campus-cats' and c.visible;
  return result;
end $$;

create function public.cc_catalog_media_page(p_club text,p_project text,p_catalog_id text,p_limit integer default 100,
  p_after_position integer default null,p_after_id text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare owner text; result jsonb;
begin
  if p_limit is null or p_limit not between 1 and 100
    or ((p_after_position is null) <> (p_after_id is null)) or p_after_position < 0 then
    raise exception 'Invalid media page' using errcode='22023'; end if;
  if public.cc_catalog_record(p_club,p_project,p_catalog_id) is null then return '[]'::jsonb; end if;
  select case when c.linked_local_catalog_id is not null and exists(
    select 1 from app.media_references m where m.club_id=p_club and m.owner_kind='catalog' and m.owner_id=c.linked_local_catalog_id)
    then c.linked_local_catalog_id else c.id end into owner from app.catalog c where c.club_id=p_club and c.id=p_catalog_id;
  select coalesce(jsonb_agg(to_jsonb(page) order by page.position,page.id),'[]'::jsonb) into result from (
    select m.id,m.kind,m.url,m.role,m.position,m.metadata from app.media_references m
    where m.club_id=p_club and m.owner_kind='catalog' and m.owner_id=owner
      and (p_after_position is null or (m.position,m.id) > (p_after_position,p_after_id))
    order by m.position,m.id limit p_limit
  ) page;
  return result;
end $$;

create function public.cc_catalog_favorite(p_club text,p_project text,p_user_id text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('user_id',f.user_id,'catalog_id',f.catalog_id,'created_at',f.created_at)
  from app.catalog_favorites f where f.club_id=p_club and f.user_id=p_user_id
    and exists(select 1 from app.clubs where id=p_club and firebase_project_id=p_project);
$$;

create function public.cc_catalog_favorite_counts(p_club text,p_project text,p_user_id text,p_limit integer default 100,
  p_after_id text default null)
returns jsonb language plpgsql stable security invoker set search_path = '' as $$
declare result jsonb;
begin
  if p_club is null or p_project is null or p_user_id is null or p_limit is null or p_limit not between 1 and 100 then
    raise exception 'Invalid favorite page' using errcode='22023'; end if;
  if not exists(select 1 from app.clubs where id=p_club and firebase_project_id=p_project) then
    return jsonb_build_object('items','[]'::jsonb,'selected_catalog_id',null); end if;
  select jsonb_build_object('items',coalesce(jsonb_agg(to_jsonb(page) order by page.catalog_id),'[]'::jsonb),
    'selected_catalog_id',(select catalog_id from app.catalog_favorites where club_id=p_club and user_id=p_user_id)) into result
  from (
    select catalog_id,count(*) as heart_count from app.catalog_favorites where club_id=p_club
      and (p_after_id is null or catalog_id > p_after_id)
    group by catalog_id order by catalog_id limit p_limit
  ) page;
  return result;
end $$;

revoke all on function public.cc_catalog_record(text,text,text) from public,anon,authenticated;
revoke all on function public.cc_catalog_media_page(text,text,text,integer,integer,text) from public,anon,authenticated;
revoke all on function public.cc_catalog_favorite(text,text,text) from public,anon,authenticated;
revoke all on function public.cc_catalog_favorite_counts(text,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.cc_catalog_record(text,text,text) to service_role;
grant execute on function public.cc_catalog_media_page(text,text,text,integer,integer,text) to service_role;
grant execute on function public.cc_catalog_favorite(text,text,text) to service_role;
grant execute on function public.cc_catalog_favorite_counts(text,text,text,integer,text) to service_role;
commit;
