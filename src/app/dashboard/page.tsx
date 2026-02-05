export default function DashboardPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-50">
      <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          BurnWatch Dashboard (placeholder)
        </h1>
        <p className="text-sm text-zinc-400">
          You&apos;re signed in. This dashboard will show spend, projections and
          anomalies in the next milestones.
        </p>
      </div>
    </div>
  );
}

