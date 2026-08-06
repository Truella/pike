create table public.hackathons_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  organizer text,
  link text not null,
  prize text,
  deadline timestamptz,
  found_at timestamptz not null default now(),
  status text not null default 'saved'
    check (status in ('saved', 'registered', 'in-progress', 'submitted', 'closed')),
  notes text,
  unique (user_id, link)
);

alter table public.hackathons_entries enable row level security;

create policy "Users can select their own hackathon entries"
  on public.hackathons_entries
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own hackathon entries"
  on public.hackathons_entries
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own hackathon entries"
  on public.hackathons_entries
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own hackathon entries"
  on public.hackathons_entries
  for delete
  to authenticated
  using (user_id = auth.uid());
