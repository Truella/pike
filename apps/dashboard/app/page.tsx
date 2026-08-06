import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/StatusTag";

const modules = [
  { name: "Jobs", detail: "Listing and application pipeline" },
  { name: "Hackathons", detail: "Opportunity discovery and tracking" },
  { name: "Study", detail: "Curriculum and daily progress" },
];

export default function Home() {
  return (
    <main className="flex flex-1 bg-background px-6 py-16 text-ink">
      <div className="mx-auto w-full max-w-6xl">
        <p className="font-mono text-xs font-bold uppercase text-signal">
          {"// Dashboard"}
        </p>
        <h1 className="pike-display mt-3 max-w-3xl text-4xl font-bold sm:text-6xl">
          Your daily work, in one place.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
          Pike tracks your jobs, hackathons, study progress, and automation
          health as each module comes online.
        </p>

        <section className="mt-14 grid gap-5 md:grid-cols-3">
          {modules.map((module) => (
            <Card key={module.name}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="pike-display text-lg font-bold">{module.name}</h2>
                <StatusTag>Planned</StatusTag>
              </div>
              <p className="mt-6 font-mono text-xs leading-5 text-muted">
                {module.detail}
              </p>
            </Card>
          ))}
        </section>

        <Link
          className="mt-10 inline-block font-mono text-sm font-bold uppercase text-signal underline-offset-4 hover:underline"
          href="/settings"
        >
          View module registry
        </Link>
      </div>
    </main>
  );
}
