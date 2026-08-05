export default function Home() {
  return (
    <main className="flex flex-1 bg-zinc-950 px-6 py-16 text-zinc-100">
      <div className="mx-auto w-full max-w-6xl">
        <p className="text-sm font-medium uppercase text-emerald-400">Dashboard</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-semibold sm:text-5xl">
          Your daily work, in one place.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-400">
          Pike tracks your jobs, hackathons, study progress, and automation
          health as each module comes online.
        </p>
      </div>
    </main>
  );
}
