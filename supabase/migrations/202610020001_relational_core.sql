-- Initial server-only relational core. Firebase remains authoritative until cutover.
-- Stable Firebase IDs and Storage paths are retained. No auth.users dependency.
begin;
create schema if not exists app;
create schema if not exists app_private;
revoke all on schema app, app_private from public, anon, authenticated;
grant usage on schema app, app_private to service_role;

create table app.clubs (
  id text primary key,
  name text not null,
  firebase_project_id text not null
);
create table app.identities (
  firebase_uid text primary key
);
create table app_private.memberships (
  club_id text not null references app.clubs(id),
  user_id text not null references app.identities(firebase_uid),
  role smallint not null check (role between 0 and 4),
  access_enabled boolean not null default false,
  version bigint not null default 0,
  verified_at timestamptz,
  primary key (club_id, user_id)
);
create table app.profiles (
  club_id text not null references app.clubs(id),
  user_id text not null references app.identities(firebase_uid),
  display_name text not null check (length(display_name) between 1 and 60),
  bio text not null default '' check (length(bio) <= 500),
  profile_photo_url text not null default '',
  selected_title_id text,
  primary key (club_id, user_id),
  foreign key (club_id, user_id) references app_private.memberships(club_id, user_id)
);
create table app.profile_achievements (
  club_id text not null,
  user_id text not null,
  achievement_id text not null,
  primary key (club_id, user_id, achievement_id),
  foreign key (club_id, user_id) references app.profiles(club_id, user_id) on delete cascade
);
alter table app.profiles add foreign key (club_id, user_id, selected_title_id)
  references app.profile_achievements(club_id, user_id, achievement_id) deferrable initially deferred;
create table app.catalog (
  club_id text not null references app.clubs(id),
  id text not null,
  source text not null check (source in ('campus-cats', 'inaturalist')),
  source_id bigint,
  name text not null,
  description_short text not null default '',
  description_long text not null default '',
  color_pattern text,
  behavior text,
  years_recorded text,
  area_of_residence text,
  current_status text check (current_status in ('Feral', 'Adopted', 'Deceased', 'Frat Cat', 'Unknown')),
  fur_length text check (fur_length in ('Short', 'Medium', 'Long', 'Unknown')),
  fur_pattern text,
  tnr text check (tnr in ('Yes', 'No', 'Unknown')),
  sex text check (sex in ('Male', 'Female', 'Unknown')),
  credits text not null default '',
  created_at timestamptz,
  source_url text,
  source_updated_at timestamptz,
  linked_local_catalog_id text,
  match_status text check (match_status in ('unlinked', 'linked', 'ambiguous')),
  source_active boolean not null default true,
  visible boolean not null default true,
  primary key (club_id, id),
  unique (club_id, source, source_id),
  foreign key (club_id, linked_local_catalog_id) references app.catalog(club_id, id),
  check ((source = 'inaturalist' and source_id is not null) or (source = 'campus-cats' and source_id is null))
);
create index catalog_name_idx on app.catalog(club_id, lower(name), id) where visible;
create index catalog_local_link_idx on app.catalog(club_id, linked_local_catalog_id) where linked_local_catalog_id is not null;

create table app.sightings (
  club_id text not null references app.clubs(id),
  id text not null,
  source text not null check (source in ('campus-cats', 'inaturalist')),
  source_id bigint,
  catalog_id text,
  reported_name text not null,
  info text not null default '',
  created_at timestamptz,
  observed_at timestamptz not null,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  fed boolean,
  healthy boolean,
  time_of_day text,
  observed_on date,
  time_precision text check (time_precision in ('exact', 'date')),
  quality_grade text check (quality_grade in ('casual', 'needs_id', 'research')),
  positional_accuracy double precision check (positional_accuracy >= 0),
  observer_id bigint,
  observer_login text,
  observer_display_name text,
  guide_taxon_id bigint,
  source_url text,
  source_updated_at timestamptz,
  source_active boolean not null default true,
  visible boolean not null default true,
  primary key (club_id, id),
  unique (club_id, source, source_id),
  foreign key (club_id, catalog_id) references app.catalog(club_id, id),
  check ((latitude is null) = (longitude is null)),
  check ((source = 'inaturalist' and source_id is not null) or (source = 'campus-cats' and source_id is null))
);
create index sightings_recent_idx on app.sightings(club_id, observed_at desc, id desc) where visible;
create index sightings_catalog_date_idx on app.sightings(club_id, catalog_id, observed_at desc, id desc);
create index sightings_bounds_idx on app.sightings(club_id, latitude, longitude) where visible;
create index sightings_guide_idx on app.sightings(club_id, guide_taxon_id, observed_at desc) where visible and guide_taxon_id is not null;

create table app_private.contributors (
  club_id text not null references app.clubs(id),
  kind text not null check (kind in ('sighting', 'catalog')),
  content_id text not null,
  user_id text not null references app.identities(firebase_uid),
  primary key (club_id, kind, content_id)
);
create index contributors_user_idx on app_private.contributors(club_id, user_id, kind, content_id);
-- Contributor targets are verified by the importer/server; identities never live on public rows.
create table app.catalog_tags (
  club_id text not null references app.clubs(id),
  id text not null,
  label text not null check (length(label) between 1 and 40),
  primary key (club_id, id),
  unique (club_id, label)
);
create table app.catalog_tag_assignments (
  club_id text not null,
  catalog_id text not null,
  tag_id text not null,
  primary key (club_id, catalog_id, tag_id),
  foreign key (club_id, catalog_id) references app.catalog(club_id, id) on delete cascade,
  foreign key (club_id, tag_id) references app.catalog_tags(club_id, id) on delete cascade
);
create index catalog_tags_filter_idx on app.catalog_tag_assignments(club_id, tag_id, catalog_id);
create table app.catalog_favorites (
  club_id text not null,
  user_id text not null references app.identities(firebase_uid),
  catalog_id text not null,
  created_at timestamptz not null,
  primary key (club_id, user_id),
  foreign key (club_id, catalog_id) references app.catalog(club_id, id) on delete cascade
);
create index catalog_favorites_count_idx on app.catalog_favorites(club_id, catalog_id);

create table app.stations (
  club_id text not null references app.clubs(id),
  id text not null,
  name text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  last_stocked timestamptz not null,
  stocking_frequency double precision not null check (stocking_frequency > 0),
  known_cats text not null default '',
  primary key (club_id, id)
);
create table app.comments (
  club_id text not null references app.clubs(id),
  id text not null,
  target_kind text not null check (target_kind in ('sighting', 'catalog', 'station')),
  target_id text not null,
  sighting_id text,
  catalog_id text,
  station_id text,
  source text not null check (source in ('campus-cats', 'inaturalist')),
  body text not null check (length(body) between 1 and 10000),
  created_at timestamptz not null,
  author_user_id text references app.identities(firebase_uid),
  external_author jsonb,
  source_metadata jsonb not null default '{}',
  primary key (club_id, target_kind, id),
  foreign key (club_id, sighting_id) references app.sightings(club_id, id) on delete cascade,
  foreign key (club_id, catalog_id) references app.catalog(club_id, id) on delete cascade,
  foreign key (club_id, station_id) references app.stations(club_id, id) on delete cascade,
  check (num_nonnulls(sighting_id, catalog_id, station_id) = 1),
  check ((target_kind = 'sighting' and sighting_id = target_id and catalog_id is null and station_id is null)
      or (target_kind = 'catalog' and catalog_id = target_id and sighting_id is null and station_id is null)
      or (target_kind = 'station' and station_id = target_id and sighting_id is null and catalog_id is null))
);
create index comments_target_date_idx on app.comments(club_id, target_kind, target_id, created_at, id);
create index comments_author_idx on app.comments(author_user_id) where author_user_id is not null;

create table app.announcements (
  club_id text not null references app.clubs(id),
  id text not null,
  kind text not null check (kind in ('alert', 'event')),
  title text not null,
  details text not null,
  created_at timestamptz not null,
  author_alias text,
  location text,
  starts_at timestamptz,
  expires_at timestamptz,
  image_url text,
  primary key (club_id, kind, id),
  check (kind <> 'event' or (starts_at is not null and expires_at is not null and expires_at >= starts_at and image_url is not null))
);
create index announcements_date_idx on app.announcements(club_id, kind, created_at desc, id desc);
create table app.announcement_reads (
  club_id text not null,
  kind text not null,
  announcement_id text not null,
  user_id text not null references app.identities(firebase_uid),
  read_at timestamptz not null,
  primary key (club_id, kind, announcement_id, user_id),
  foreign key (club_id, kind, announcement_id) references app.announcements(club_id, kind, id) on delete cascade
);
create index announcement_reads_user_idx on app.announcement_reads(club_id, user_id, kind, announcement_id);

create table app.surveys (
  club_id text not null references app.clubs(id),
  id text not null,
  title text not null,
  details text not null,
  anonymous boolean not null,
  audience text not null check (audience in ('all_members', 'officers_only')),
  status text not null check (status in ('open', 'closed')),
  created_at timestamptz not null,
  closed_at timestamptz,
  primary key (club_id, id),
  check ((status = 'closed') = (closed_at is not null))
);
create index surveys_date_idx on app.surveys(club_id, created_at desc, id desc);
create table app.survey_questions (
  club_id text not null,
  survey_id text not null,
  id text not null,
  position integer not null check (position >= 0),
  kind text not null check (kind in ('single_choice', 'multi_select', 'short_text', 'long_text')),
  prompt text not null,
  primary key (club_id, survey_id, id),
  unique (club_id, survey_id, position),
  foreign key (club_id, survey_id) references app.surveys(club_id, id) on delete cascade
);
create table app.survey_options (
  club_id text not null,
  survey_id text not null,
  question_id text not null,
  id text not null,
  position integer not null check (position >= 0),
  label text not null,
  primary key (club_id, survey_id, question_id, id),
  unique (club_id, survey_id, question_id, position),
  foreign key (club_id, survey_id, question_id) references app.survey_questions(club_id, survey_id, id) on delete cascade
);
create table app.survey_responses (
  club_id text not null,
  survey_id text not null,
  id text not null,
  submitted_at timestamptz not null,
  primary key (club_id, survey_id, id),
  foreign key (club_id, survey_id) references app.surveys(club_id, id) on delete cascade
);
create table app.survey_answers (
  club_id text not null,
  survey_id text not null,
  response_id text not null,
  question_id text not null,
  text_value text,
  primary key (club_id, survey_id, response_id, question_id),
  foreign key (club_id, survey_id, response_id) references app.survey_responses(club_id, survey_id, id) on delete cascade,
  foreign key (club_id, survey_id, question_id) references app.survey_questions(club_id, survey_id, id)
);
create table app.survey_answer_options (
  club_id text not null,
  survey_id text not null,
  response_id text not null,
  question_id text not null,
  option_id text not null,
  primary key (club_id, survey_id, response_id, question_id, option_id),
  foreign key (club_id, survey_id, response_id, question_id) references app.survey_answers(club_id, survey_id, response_id, question_id) on delete cascade,
  foreign key (club_id, survey_id, question_id, option_id) references app.survey_options(club_id, survey_id, question_id, id)
);
create table app_private.survey_receipts (
  club_id text not null,
  survey_id text not null,
  user_id text not null references app.identities(firebase_uid),
  response_id text not null,
  primary key (club_id, survey_id, user_id),
  unique (club_id, survey_id, response_id),
  foreign key (club_id, survey_id, response_id) references app.survey_responses(club_id, survey_id, id) on delete cascade
);
create index survey_receipts_user_idx on app_private.survey_receipts(user_id, club_id, survey_id);

create table app.votes (
  club_id text not null references app.clubs(id),
  id text not null,
  kind text not null check (kind in ('contest', 'presidential_election')),
  title text not null,
  details text not null,
  audience text not null check (audience in ('all_members', 'officers_only')),
  created_at timestamptz not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  nomination_ends_at timestamptz,
  primary key (club_id, id),
  check (ends_at > starts_at),
  check ((kind = 'contest' and nomination_ends_at is null) or
    (kind = 'presidential_election' and nomination_ends_at is not null and nomination_ends_at = starts_at))
);
create index votes_date_idx on app.votes(club_id, created_at desc, id desc);
create table app.vote_options (
  club_id text not null,
  vote_id text not null,
  id text not null,
  position integer not null check (position >= 0),
  label text not null,
  image_url text,
  primary key (club_id, vote_id, id),
  unique (club_id, vote_id, position),
  foreign key (club_id, vote_id) references app.votes(club_id, id) on delete cascade
);
create table app.vote_nominees (
  club_id text not null,
  vote_id text not null,
  user_id text not null references app.identities(firebase_uid),
  display_name text not null,
  pitch text,
  nominated_at timestamptz not null,
  primary key (club_id, vote_id, user_id),
  foreign key (club_id, vote_id) references app.votes(club_id, id) on delete cascade
);
create table app.vote_ballots (
  club_id text not null,
  vote_id text not null,
  id text not null,
  option_id text,
  nominee_user_id text,
  submitted_at timestamptz not null,
  primary key (club_id, vote_id, id),
  foreign key (club_id, vote_id) references app.votes(club_id, id) on delete cascade,
  foreign key (club_id, vote_id, option_id) references app.vote_options(club_id, vote_id, id),
  foreign key (club_id, vote_id, nominee_user_id) references app.vote_nominees(club_id, vote_id, user_id),
  check ((option_id is null) <> (nominee_user_id is null))
);
create index ballots_option_count_idx on app.vote_ballots(club_id, vote_id, option_id);
create index ballots_nominee_count_idx on app.vote_ballots(club_id, vote_id, nominee_user_id);
create table app_private.vote_receipts (
  club_id text not null,
  vote_id text not null,
  user_id text not null references app.identities(firebase_uid),
  ballot_id text not null,
  primary key (club_id, vote_id, user_id),
  unique (club_id, vote_id, ballot_id),
  foreign key (club_id, vote_id, ballot_id) references app.vote_ballots(club_id, vote_id, id) on delete cascade
);
create index vote_receipts_user_idx on app_private.vote_receipts(user_id, club_id, vote_id);

create table app.media_references (
  club_id text not null references app.clubs(id),
  owner_kind text not null check (owner_kind in ('catalog', 'sighting', 'station', 'profile', 'event')),
  owner_id text not null,
  catalog_id text,
  sighting_id text,
  station_id text,
  profile_user_id text,
  event_kind text check (event_kind = 'event'),
  event_id text,
  id text not null,
  kind text not null check (kind in ('firebase', 'external')),
  url text not null,
  role text not null check (role in ('profile', 'gallery')),
  position integer not null check (position >= 0),
  metadata jsonb not null default '{}',
  primary key (club_id, owner_kind, owner_id, id),
  foreign key (club_id, catalog_id) references app.catalog(club_id, id) on delete cascade,
  foreign key (club_id, sighting_id) references app.sightings(club_id, id) on delete cascade,
  foreign key (club_id, station_id) references app.stations(club_id, id) on delete cascade,
  foreign key (club_id, profile_user_id) references app.profiles(club_id, user_id) on delete cascade,
  foreign key (club_id, event_kind, event_id) references app.announcements(club_id, kind, id) on delete cascade,
  check (num_nonnulls(catalog_id, sighting_id, station_id, profile_user_id, event_id) = 1),
  check ((owner_kind = 'catalog' and catalog_id is not null and catalog_id = owner_id)
    or (owner_kind = 'sighting' and sighting_id is not null and sighting_id = owner_id)
    or (owner_kind = 'station' and station_id is not null and station_id = owner_id)
    or (owner_kind = 'profile' and profile_user_id is not null and profile_user_id = owner_id)
    or (owner_kind = 'event' and event_id is not null and event_kind is not null and event_id = owner_id))
);
create table app_private.import_metadata (
  club_id text not null references app.clubs(id),
  kind text not null,
  id text not null,
  metadata jsonb not null,
  primary key (club_id, kind, id)
);
create table app.inaturalist_public_links (
  club_id text not null references app.clubs(id),
  inaturalist_user_id bigint not null check (inaturalist_user_id > 0),
  user_id text not null references app.identities(firebase_uid),
  login text not null,
  linked_at timestamptz not null,
  primary key (club_id, inaturalist_user_id),
  unique (club_id, user_id)
);
create table app_private.migration_sources (
  source_project text not null,
  source_path text not null,
  source_update_time timestamptz,
  club_id text not null references app.clubs(id),
  target_table text not null,
  target_id text not null,
  content_hash text not null,
  primary key (source_project, source_path)
);
create table app_private.outbox (
  id bigint generated always as identity primary key,
  club_id text not null references app.clubs(id),
  idempotency_key text not null unique,
  kind text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now()
);
create index outbox_pending_idx on app_private.outbox(next_attempt_at, id) where processed_at is null;

-- Participation is club-scoped; historical authors may still have only a global UID.
alter table app.catalog_favorites add foreign key (club_id, user_id) references app_private.memberships(club_id, user_id);
alter table app.announcement_reads add foreign key (club_id, user_id) references app_private.memberships(club_id, user_id);
alter table app.vote_nominees add foreign key (club_id, user_id) references app_private.memberships(club_id, user_id);
alter table app_private.survey_receipts add foreign key (club_id, user_id) references app_private.memberships(club_id, user_id);
alter table app_private.vote_receipts add foreign key (club_id, user_id) references app_private.memberships(club_id, user_id);
alter table app.inaturalist_public_links add foreign key (club_id, user_id) references app_private.memberships(club_id, user_id);

-- Support account cleanup and foreign-key checks, including hidden content.
create index memberships_user_idx on app_private.memberships(user_id, club_id);
create index profiles_user_idx on app.profiles(user_id, club_id);
create index contributors_identity_idx on app_private.contributors(user_id, club_id);
create index favorites_user_idx on app.catalog_favorites(user_id, club_id);
create index announcement_reads_identity_idx on app.announcement_reads(user_id, club_id);
create index nominees_user_idx on app.vote_nominees(user_id, club_id);
create index public_links_user_idx on app.inaturalist_public_links(user_id, club_id);
create index survey_answers_question_idx on app.survey_answers(club_id, survey_id, question_id);
create index survey_answer_options_option_idx on app.survey_answer_options(club_id, survey_id, question_id, option_id);
create index media_catalog_idx on app.media_references(club_id, catalog_id) where catalog_id is not null;
create index media_sighting_idx on app.media_references(club_id, sighting_id) where sighting_id is not null;
create index media_station_idx on app.media_references(club_id, station_id) where station_id is not null;
create index media_profile_idx on app.media_references(club_id, profile_user_id) where profile_user_id is not null;
create index media_event_idx on app.media_references(club_id, event_kind, event_id) where event_id is not null;

-- Fail closed: neither public tables nor private identity maps have client policies.
-- Gateway transactions use the service role after checking live Firebase authorization.
do $$
declare relation record;
begin
  for relation in select schemaname, tablename from pg_tables where schemaname in ('app', 'app_private') loop
    execute format('alter table %I.%I enable row level security', relation.schemaname, relation.tablename);
    execute format('revoke all on %I.%I from public, anon, authenticated', relation.schemaname, relation.tablename);
  end loop;
end $$;
grant select, insert, update, delete on all tables in schema app, app_private to service_role;
grant usage, select on all sequences in schema app_private to service_role;
alter default privileges in schema app, app_private revoke all on tables from public, anon, authenticated;
commit;
