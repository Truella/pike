create table public.pike_content (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  post_type text not null check (post_type in ('build_update', 'trend')),
  source_type text not null check (source_type in ('manual', 'activity_scan', 'topics_bank')),
  source_ref text,
  draft_text text not null,
  media_urls text[] default '{}'::text[] not null,
  status text not null default 'needs_review'
    check (status in ('needs_review', 'approved', 'scheduled', 'published', 'rejected')),
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pike_content enable row level security;

create policy "Users can select their own pike content"
  on public.pike_content
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own pike content"
  on public.pike_content
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own pike content"
  on public.pike_content
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own pike content"
  on public.pike_content
  for delete
  to authenticated
  using (user_id = auth.uid());
