create table public.study_progress (
  user_id uuid default auth.uid() references auth.users(id) not null,
  topic_id text references public.study_curriculum(id) on delete restrict not null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'done')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  primary key (user_id, topic_id)
);

alter table public.study_progress enable row level security;

create policy "Users can select their own study progress"
  on public.study_progress
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own study progress"
  on public.study_progress
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own study progress"
  on public.study_progress
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own study progress"
  on public.study_progress
  for delete
  to authenticated
  using (user_id = auth.uid());
