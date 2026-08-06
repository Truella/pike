create table public.pike_preferences (
  user_id uuid references auth.users(id) primary key,
  theme text default 'brutalist'
    check (theme in ('brutalist', 'warm', 'pop', 'sticky')),
  updated_at timestamptz default now()
);

alter table public.pike_preferences enable row level security;

create policy "Users can select their own preferences"
  on public.pike_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own preferences"
  on public.pike_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own preferences"
  on public.pike_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own preferences"
  on public.pike_preferences
  for delete
  to authenticated
  using (user_id = auth.uid());
