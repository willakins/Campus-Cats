-- Aggregate-only capacity report; no user content or credentials.
select jsonb_pretty(jsonb_build_object(
  'postgres_version', current_setting('server_version'),
  'database_bytes', pg_database_size(current_database()),
  'application_table_and_index_bytes', (select coalesce(sum(pg_total_relation_size(c.oid)), 0)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('app', 'app_private') and c.relkind = 'r'),
  'application_index_bytes', (select coalesce(sum(pg_indexes_size(c.oid)), 0)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('app', 'app_private') and c.relkind = 'r'),
  'sightings', (select count(*) from app.sightings),
  'catalog_entries', (select count(*) from app.catalog),
  'effective_catalog_entries', (select count(*) from app.effective_catalog),
  'linked_catalog_entries', (select count(*) from app.catalog where linked_local_catalog_id is not null),
  'comments', (select count(*) from app.comments),
  'media_references', (select count(*) from app.media_references),
  'memberships_enabled', (select count(*) from app_private.memberships where access_enabled)
  ,'schema_migration_count', (select count(*) from app_private.schema_migrations)
));
