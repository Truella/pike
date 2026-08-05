create table modules (
  id text primary key,
  name text not null,
  status text default 'active',
  last_run_at timestamptz,
  notes text
);
