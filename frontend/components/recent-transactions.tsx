import {
  formatCurrency,
  formatDateTime,
  type AnalyticsRecentResponse,
} from "@/lib/api";

type RecentTransactionsProps = {
  recent: AnalyticsRecentResponse | null;
  isLoading: boolean;
  error: string | null;
  isDisabled: boolean;
};

export function RecentTransactions({
  recent,
  isLoading,
  error,
  isDisabled,
}: RecentTransactionsProps) {
  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-900/75 p-5 shadow-xl shadow-slate-950/20">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
          Recent transactions
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
          Latest expenses
        </h3>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-medium">Could not load recent transactions.</p>
          <p className="mt-1 text-rose-100/80">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-2xl bg-slate-950/60"
            />
          ))}
        </div>
      ) : isDisabled || recent === null ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm leading-6 text-slate-300">
          Select a Messenger user to view their recent transactions.
        </div>
      ) : recent.items.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm leading-6 text-slate-300">
          No transactions yet. Send a message like <code>coffee 5</code> to your
          Messenger bot and Spendly will start building this list.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {recent.items.map((expense) => (
            <article
              key={expense.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold capitalize text-white">
                      {expense.category}
                    </p>
                    <span className="rounded-full border border-slate-700 px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">
                      {expense.currency}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {expense.note || expense.source_text}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {formatDateTime(expense.occurred_at)}
                  </p>
                </div>

                <p className="shrink-0 text-base font-semibold text-cyan-200">
                  {formatCurrency(expense.amount, expense.currency)}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
