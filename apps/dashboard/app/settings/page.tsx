import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/StatusTag";

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
    <main className="min-h-screen bg-background px-6 py-12 text-ink">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs font-bold uppercase text-signal">
          {"// Settings"}
        </p>
        <h1 className="pike-display mt-2 text-4xl font-bold">Modules</h1>
        <p className="mt-2 text-muted">
          Read-only status for your registered automations.
        </p>

        {error ? (
          <p className="pike-border mt-8 rounded-token border-alert p-4 text-alert">
            Unable to load modules: {error.message}
          </p>
        ) : null}

        {!error && modules.length === 0 ? (
          <Card className="mt-8 text-muted">
            No modules are registered for this account yet.
          </Card>
        ) : null}

        {!error && modules.length > 0 ? (
          <ul className="pike-card-list mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {modules.map((module, i) => (
              <li key={module.id}>
                <Card index={i}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="pike-display text-lg font-bold">{module.name}</h2>
                  <StatusTag variant="live">
                    {module.status ?? "active"}
                  </StatusTag>
                </div>
                <dl className="mt-4 grid gap-3 font-mono text-xs sm:grid-cols-[8rem_1fr]">
                  <dt className="uppercase text-muted">Last run</dt>
                  <dd className="text-ink">
                    {formatLastRun(module.last_run_at)}
                  </dd>
                  <dt className="uppercase text-muted">Notes</dt>
                  <dd className="whitespace-pre-wrap text-ink">
                    {module.notes || "None"}
                  </dd>
                </dl>
                </Card>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
