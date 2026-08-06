create table public.jobs_listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  title text not null,
  company text not null,
  link text not null,
  source text not null,
  found_at timestamptz not null default now(),
  status text not null default 'saved'
    check (status in ('saved', 'applied', 'follow-up', 'interview', 'offer', 'closed')),
  applied_at timestamptz,
  follow_up_at timestamptz,
  notes text,
  unique (user_id, link)
);

alter table public.jobs_listings enable row level security;

create policy "Users can select their own job listings"
  on public.jobs_listings
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own job listings"
  on public.jobs_listings
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own job listings"
  on public.jobs_listings
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own job listings"
  on public.jobs_listings
  for delete
  to authenticated
  using (user_id = auth.uid());
