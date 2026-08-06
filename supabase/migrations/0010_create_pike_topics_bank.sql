create table public.pike_topics_bank (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  topic text not null,
  notes text,
  source text not null check (source in ('manual', 'groq_suggested')),
  used boolean not null default false,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pike_topics_bank enable row level security;

create policy "Users can select their own topics bank entries"
  on public.pike_topics_bank
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own topics bank entries"
  on public.pike_topics_bank
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own topics bank entries"
  on public.pike_topics_bank
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own topics bank entries"
  on public.pike_topics_bank
  for delete
  to authenticated
  using (user_id = auth.uid());
