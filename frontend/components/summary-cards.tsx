import { formatCurrency, type AnalyticsSummaryResponse } from "@/lib/api";

type SummaryCardsProps = {
  summary: AnalyticsSummaryResponse | null;
  isLoading: boolean;
  error: string | null;
  isDisabled: boolean;
};

const SUMMARY_ITEMS = [
  { key: "day_total", label: "Today" },
  { key: "week_total", label: "This week" },
  { key: "month_total", label: "This month" },
] as const;

export function SummaryCards({
  summary,
  isLoading,
  error,
  isDisabled,
}: SummaryCardsProps) {
  if (error) {
    return (
      <section className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-100 shadow-xl shadow-slate-950/20">
        <p className="font-medium">Could not load spending totals.</p>
        <p className="mt-2 text-rose-100/80">{error}</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {SUMMARY_ITEMS.map((item) => (
        <article
          key={item.key}
          className="rounded-3xl border border-slate-800/80 bg-slate-900/75 p-5 shadow-xl shadow-slate-950/20"
        >
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
            {item.label}
          </p>
          <div className="mt-6">
            {isLoading ? (
              <div className="space-y-3">
                <div className="h-9 w-32 animate-pulse rounded-xl bg-slate-800" />
                <div className="h-4 w-20 animate-pulse rounded bg-slate-800/70" />
              </div>
            ) : isDisabled || summary === null ? (
              <p className="text-sm leading-6 text-slate-400">
                Select a Messenger user to view totals.
              </p>
            ) : (
              <>
                <p className="text-3xl font-semibold tracking-tight text-white">
                  {formatCurrency(summary[item.key], summary.currency)}
                </p>
                <p className="mt-2 text-sm text-slate-400">Current UTC window</p>
              </>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
