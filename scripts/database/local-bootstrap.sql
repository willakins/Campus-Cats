-- Local PostgreSQL only. Hosted Supabase already provides these roles.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
