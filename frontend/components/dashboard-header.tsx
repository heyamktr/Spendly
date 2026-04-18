type DashboardHeaderProps = {
  apiBaseUrl: string;
};

export function DashboardHeader({ apiBaseUrl }: DashboardHeaderProps) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950/80 shadow-2xl shadow-slate-950/30">
      <div className="grid gap-6 px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-300">
            Spendly
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Messenger expense dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Internal admin view for watching how Messenger messages turn into
            expenses, category totals, and recent transaction activity.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
            Backend URL
          </p>
          <code className="mt-2 block text-sm text-cyan-200">{apiBaseUrl}</code>
        </div>
      </div>
    </section>
  );
}
