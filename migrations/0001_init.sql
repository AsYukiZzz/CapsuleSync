create table if not exists users (
  id text primary key,
  email text not null unique,
  password_salt text not null,
  password_hash text not null,
  role text not null default 'user',
  created_at integer not null
);

create table if not exists docs (
  id text primary key,
  owner_user_id text not null,
  title text not null,
  description text,
  created_at integer not null,
  updated_at integer not null
);

create index if not exists idx_docs_owner_updated on docs(owner_user_id, updated_at desc);

create table if not exists doc_versions (
  id text primary key,
  doc_id text not null,
  version_no integer not null,
  created_by text not null,
  created_at integer not null,
  note text,
  sha256 text not null,
  size_bytes integer not null,
  file_name text not null,
  mime_type text,
  r2_key text not null,
  content_text text
);

create unique index if not exists uq_doc_versions_doc_no on doc_versions(doc_id, version_no);
create index if not exists idx_doc_versions_doc_created on doc_versions(doc_id, created_at desc);

create table if not exists audit_logs (
  id text primary key,
  actor_user_id text,
  actor_email text,
  actor_role text,
  event_type text not null,
  target_type text not null,
  target_id text,
  success integer not null,
  error_code text,
  metadata_json text not null default '{}',
  ip text,
  user_agent text,
  created_at integer not null
);

create index if not exists idx_audit_logs_created on audit_logs(created_at desc);
create index if not exists idx_audit_logs_actor_created on audit_logs(actor_user_id, created_at desc);
create index if not exists idx_audit_logs_event_created on audit_logs(event_type, created_at desc);

