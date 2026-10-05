begin;
-- A server-controlled switch prevents preview reads from accepting SQL writes.
create table app_private.domain_backends (
  club_id text not null references app.clubs(id),
  domain text not null check (domain in ('catalog_core','community')),
  backend text not null default 'firebase' check (backend in ('firebase','postgres')),
  primary key (club_id,domain)
);
create table app_private.mutation_receipts (
  club_id text not null,
  user_id text not null,
  operation_id text not null check (length(operation_id) between 1 and 200),
  kind text not null,
  request jsonb not null,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (club_id,user_id,operation_id),
  foreign key (club_id,user_id) references app_private.memberships(club_id,user_id)
);
alter table app_private.domain_backends enable row level security;
alter table app_private.mutation_receipts enable row level security;
revoke all on app_private.domain_backends, app_private.mutation_receipts from public,anon,authenticated;
grant select,insert,update,delete on app_private.domain_backends,app_private.mutation_receipts to service_role;
create index mutation_receipts_identity_idx on app_private.mutation_receipts(user_id,club_id);

create function public.cc_set_catalog_favorite(p_club text,p_project text,p_user_id text,p_role integer,
  p_operation_id text,p_catalog_id text default null)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare previous app_private.mutation_receipts%rowtype; requested jsonb; result jsonb; changed boolean;
begin
  if p_club is null or p_project is null or p_user_id is null or p_user_id = '' or p_role is null or p_role not between 0 and 4
    or p_operation_id is null or length(p_operation_id) not between 1 and 200
    or (p_catalog_id is not null and length(p_catalog_id) not between 1 and 200) then
    raise exception 'Invalid favorite request' using errcode='22023'; end if;
  if not exists(select 1 from app.clubs where id=p_club and firebase_project_id=p_project) then
    raise exception 'Project access denied' using errcode='42501'; end if;
  -- Lock the switch while writing so pausing/cutover cannot race an accepted mutation.
  perform 1 from app_private.domain_backends where club_id=p_club and domain='catalog_core' and backend='postgres' for share;
  if not found then raise exception 'SQL catalog writes are not enabled' using errcode='55000'; end if;
  perform pg_advisory_xact_lock(hashtextextended('cc-favorite:'||p_club||':'||p_user_id,0));
  requested := jsonb_build_object('catalogId',p_catalog_id);
  select * into previous from app_private.mutation_receipts where club_id=p_club and user_id=p_user_id and operation_id=p_operation_id;
  if found then
    if previous.kind <> 'catalog.favorite' or previous.request <> requested then
      raise exception 'Operation ID reused for different mutation' using errcode='22023'; end if;
    return previous.response;
  end if;
  if p_catalog_id is not null and not exists(select 1 from app.catalog where club_id=p_club and id=p_catalog_id and visible) then
    raise exception 'Catalog entry not found' using errcode='22023'; end if;
  -- The caller's identity and role are supplied only after live Firebase verification.
  insert into app.identities values(p_user_id) on conflict do nothing;
  insert into app_private.memberships(club_id,user_id,role,verified_at) values(p_club,p_user_id,p_role,now())
    on conflict(club_id,user_id) do update set role=excluded.role,verified_at=excluded.verified_at;
  changed := (select catalog_id from app.catalog_favorites where club_id=p_club and user_id=p_user_id) is distinct from p_catalog_id;
  if p_catalog_id is null then
    delete from app.catalog_favorites where club_id=p_club and user_id=p_user_id;
    result := null;
  else
    insert into app.catalog_favorites values(p_club,p_user_id,p_catalog_id,now())
      on conflict(club_id,user_id) do update set catalog_id=excluded.catalog_id,
        created_at=case when app.catalog_favorites.catalog_id=excluded.catalog_id then app.catalog_favorites.created_at else excluded.created_at end;
    select jsonb_build_object('user_id',user_id,'catalog_id',catalog_id,'created_at',created_at) into result
      from app.catalog_favorites where club_id=p_club and user_id=p_user_id;
  end if;
  insert into app_private.mutation_receipts(club_id,user_id,operation_id,kind,request,response)
    values(p_club,p_user_id,p_operation_id,'catalog.favorite',requested,result);
  if changed then
    insert into app_private.outbox(club_id,idempotency_key,kind,payload) values(p_club,
      jsonb_build_array(p_club,p_user_id,p_operation_id)::text,'catalog.favorite.changed',
      jsonb_build_object('userId',p_user_id,'catalogId',p_catalog_id));
  end if;
  return result;
end $$;
revoke all on function public.cc_set_catalog_favorite(text,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.cc_set_catalog_favorite(text,text,text,integer,text,text) to service_role;
commit;
