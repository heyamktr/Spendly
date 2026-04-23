"use client";

import { useEffect, useState } from "react";

import { formatCurrency } from "@/lib/api";
import {
  buildSparklinePath,
  type DashboardStat,
  type StatTone,
} from "@/lib/dashboard";

type SummaryCardsProps = {
  stats: DashboardStat[];
  activePeriod: "day" | "week" | "month";
  currency: string;
  isLoading: boolean;
  error: string | null;
  isDisabled: boolean;
  onSelectPeriod: (period: "day" | "week" | "month") => void;
};

export function SummaryCards({
  stats,
  activePeriod,
  currency,
  isLoading,
  error,
  isDisabled,
  onSelectPeriod,
}: SummaryCardsProps) {
  if (error) {
    return (
      <section className="surface-panel p-5 text-sm text-[var(--danger-text)] shadow-[var(--shadow-soft)]">
        <p className="font-medium">Could not load spending totals.</p>
        <p className="mt-2 text-[var(--text-tertiary)]">{error}</p>
      </section>
    );
  }

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      {stats.map((stat, index) => {
        const active = stat.period === activePeriod;
        const toneClassName = resolveToneClasses(stat.tone);

        return (
          <button
            key={stat.period}
            type="button"
            disabled={isDisabled}
            onClick={() => onSelectPeriod(stat.period)}
            className={`surface-panel card-entrance group relative overflow-hidden p-5 text-left transition duration-300 ${
              active
                ? "border-[var(--accent-primary)] shadow-[var(--shadow-strong)]"
                : "hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
            } disabled:cursor-not-allowed disabled:opacity-70`}
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent-primary),transparent)] opacity-70" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                  {stat.label}
                </p>
                <p className="mt-4 text-sm text-[var(--text-tertiary)]">
                  Click to drill into this window
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${toneClassName}`}
              >
                {stat.toneLabel}
              </span>
            </div>

            <div className="mt-8">
              {isLoading ? (
                <CardSkeleton />
              ) : isDisabled ? (
                <p className="text-sm leading-6 text-[var(--text-tertiary)]">
                  Select a Messenger user to unlock period intelligence.
                </p>
              ) : (
                <>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <AnimatedCurrencyValue
                        value={stat.amount}
                        currency={currency}
                        className="text-4xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]"
                      />
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {stat.comparisonLabel}
                      </p>
                    </div>

                    <Sparkline values={stat.sparkline} tone={stat.tone} />
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/80 px-4 py-3">
                    <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Prior period signal
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      {stat.comparisonLabel}
                    </span>
                  </div>
                </>
              )}
            </div>
          </button>
        );
      })}
    </section>
  );
}

function AnimatedCurrencyValue({
  value,
  currency,
  className,
}: {
  value: number;
  currency: string;
  className?: string;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 900;
    const initial = animatedValue;

    function step(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(initial + (value - initial) * eased);

      if (progress < 1) {
        frame = window.requestAnimationFrame(step);
      }
    }

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return (
    <p className={className}>
      {formatCurrency(animatedValue, currency)}
    </p>
  );
}

function Sparkline({
  values,
  tone,
}: {
  values: number[];
  tone: StatTone;
}) {
  const path = buildSparklinePath(values, 140, 52);
  const stroke = resolveSparklineColor(tone);

  return (
    <svg
      viewBox="0 0 140 52"
      className="h-16 w-36 shrink-0 text-[var(--text-primary)]"
      role="presentation"
    >
      <defs>
        <linearGradient id={`spark-${tone}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.15" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path
        d={path}
        className="sparkline-path"
        stroke={`url(#spark-${tone})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function CardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-12 w-40 rounded-2xl bg-[var(--skeleton-base)] skeleton-shimmer" />
      <div className="h-4 w-36 rounded-xl bg-[var(--skeleton-base)] skeleton-shimmer" />
      <div className="h-16 rounded-[24px] bg-[var(--skeleton-base)] skeleton-shimmer" />
    </div>
  );
}

function resolveToneClasses(tone: StatTone): string {
  if (tone === "positive") {
    return "bg-[var(--success-soft)] text-[var(--success-text)]";
  }
  if (tone === "warning") {
    return "bg-[var(--warning-soft)] text-[var(--warning-text)]";
  }
  if (tone === "danger") {
    return "bg-[var(--danger-soft)] text-[var(--danger-text)]";
  }
  return "bg-[var(--accent-soft)] text-[var(--accent-primary)]";
}

function resolveSparklineColor(tone: StatTone): string {
  if (tone === "positive") {
    return "var(--accent-emerald)";
  }
  if (tone === "warning") {
    return "var(--accent-amber)";
  }
  if (tone === "danger") {
    return "var(--accent-coral)";
  }
  return "var(--accent-primary)";
}
