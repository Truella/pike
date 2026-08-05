# User Scoping

Every Pike table that contains user-owned data must use the same ownership model as `public.modules`. This applies to every Jobs, Study, Hackathons, Content, and future module migration.

## Schema

Add a required foreign key to the Supabase Auth user. The default attaches the current authenticated user to inserts, while the application must also send the current user's ID explicitly.

```sql
user_id uuid default auth.uid() references auth.users(id) not null
```

Enable row-level security on every user-owned table and create one policy for each operation. Replace `<table>` with the table name and give each policy a unique descriptive name.

```sql
alter table public.<table> enable row level security;

create policy "Users can select their own <table>"
  on public.<table> for select to authenticated
  using (user_id = auth.uid());

create policy "Users can insert their own <table>"
  on public.<table> for insert to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own <table>"
  on public.<table> for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete their own <table>"
  on public.<table> for delete to authenticated
  using (user_id = auth.uid());
```

Do not create broad policies for `anon` or use conditions that omit `user_id = auth.uid()`. Service-role automation bypasses RLS and must always provide the intended owner's `user_id` explicitly.

## Dashboard Queries

Get the authenticated user with `supabase.auth.getUser()` before accessing user-owned data. Do not accept a user ID from form data, route parameters, or other client-controlled input.

Every query must include the authenticated user's ID even though RLS independently enforces the same boundary:

```ts
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) throw new Error("Authentication required");

const { data } = await supabase
  .from("modules")
  .select("id, name, status, last_run_at, notes")
  .eq("user_id", user.id);

await supabase.from("modules").insert({
  user_id: user.id,
  id: "example",
  name: "Example",
});

await supabase
  .from("modules")
  .update({ status: "paused" })
  .eq("id", "example")
  .eq("user_id", user.id);

await supabase
  .from("modules")
  .delete()
  .eq("id", "example")
  .eq("user_id", user.id);
```

The required pattern for every table is therefore: a `user_id` column, operation-specific RLS policies comparing it to `auth.uid()`, and explicit query filtering or assignment using the server-verified authenticated user.
