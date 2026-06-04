create table if not exists documents (
  id uuid primary key,
  name text not null,
  data jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
