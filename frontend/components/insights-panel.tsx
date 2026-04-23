import { SparkleIcon } from "@/components/icons";
import type { InsightItem } from "@/lib/dashboard";

type InsightsPanelProps = {
  insights: InsightItem[];
  isLoading: boolean;
  error: string | null;
  isDisabled: boolean;
};

export function InsightsPanel({
  insights,
  isLoading,
  error,
  isDisabled,
}: InsightsPanelProps) {
  return (
    <section className="surface-panel card-entrance p-5 [animation-delay:120ms]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
            Insights
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Spending intelligence
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
          <SparkleIcon className="h-4 w-4 text-[var(--accent-primary)]" />
          AI-style readout
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-[24px] border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger-text)]">
          <p className="font-medium">Could not generate insights.</p>
          <p className="mt-1 text-[var(--text-tertiary)]">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-[24px] bg-[var(--skeleton-base)] skeleton-shimmer"
            />
          ))}
        </div>
      ) : isDisabled ? (
        <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 text-sm leading-6 text-[var(--text-tertiary)]">
          Spendly will generate narrative insights once a Messenger profile is selected.
        </div>
      ) : (
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {insights.map((insight, index) => (
            <article
              key={insight.id}
              className="card-entrance rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-[var(--shadow-soft)]"
              style={{
                animationDelay: `${180 + index * 80}ms`,
                borderLeftColor: resolveToneColor(insight.tone),
                borderLeftWidth: "4px",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-[0.2em]"
                style={{ color: resolveToneColor(insight.tone) }}
              >
                {resolveToneLabel(insight.tone)}
              </p>
              <h3 className="mt-3 text-lg font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                {insight.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {insight.body}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function resolveToneColor(tone: InsightItem["tone"]): string {
  if (tone === "positive") {
    return "var(--accent-emerald)";
  }
  if (tone === "warning") {
    return "var(--accent-amber)";
  }
  return "var(--accent-coral)";
}

function resolveToneLabel(tone: InsightItem["tone"]): string {
  if (tone === "positive") {
    return "Positive";
  }
  if (tone === "warning") {
    return "Watchlist";
  }
  return "Alert";
}
