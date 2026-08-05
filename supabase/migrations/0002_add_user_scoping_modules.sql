alter table public.modules
  add column user_id uuid default auth.uid() references auth.users(id) not null;

alter table public.modules enable row level security;

create policy "Users can select their own modules"
  on public.modules
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own modules"
  on public.modules
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own modules"
  on public.modules
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own modules"
  on public.modules
  for delete
  to authenticated
  using (user_id = auth.uid());
