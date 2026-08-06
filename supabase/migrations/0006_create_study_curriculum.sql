create table public.study_curriculum (
  id text primary key,
  order_index integer not null unique,
  title text not null,
  section text not null,
  url text not null
);

alter table public.study_curriculum enable row level security;

create policy "Authenticated users can select study curriculum"
  on public.study_curriculum
  for select
  to authenticated
  using (true);
