import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function formatLastRun(value: string | null) {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: modules, error } = await supabase
    .from("modules")
    .select("id, name, status, last_run_at, notes")
    .eq("user_id", user.id)
    .order("name");

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-100">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
          Pike
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Modules</h1>
        <p className="mt-2 text-zinc-400">
          Read-only status for your registered automations.
        </p>

        {error ? (
          <p className="mt-8 rounded-xl border border-red-900 bg-red-950/40 p-4 text-red-300">
            Unable to load modules: {error.message}
          </p>
        ) : null}

        {!error && modules.length === 0 ? (
          <p className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900 p-6 text-zinc-400">
            No modules are registered for this account yet.
          </p>
        ) : null}

        {!error && modules.length > 0 ? (
          <ul className="mt-8 grid gap-4">
            {modules.map((module) => (
              <li
                className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
                key={module.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">{module.name}</h2>
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-emerald-300">
                    {module.status ?? "active"}
                  </span>
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-[8rem_1fr]">
                  <dt className="text-zinc-500">Last run</dt>
                  <dd className="text-zinc-300">
                    {formatLastRun(module.last_run_at)}
                  </dd>
                  <dt className="text-zinc-500">Notes</dt>
                  <dd className="whitespace-pre-wrap text-zinc-300">
                    {module.notes || "None"}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
