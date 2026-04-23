"use client";

import { useState } from "react";

import { formatCurrency, toNumber, type AnalyticsByCategoryResponse, type AnalyticsPeriod } from "@/lib/api";
import { getCategoryAccent, getCategoryLabel } from "@/lib/dashboard";

type CategoryChartProps = {
  categoryData: AnalyticsByCategoryResponse | null;
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  isLoading: boolean;
  error: string | null;
  isDisabled: boolean;
  hiddenCategories: string[];
  onToggleCategory: (category: string) => void;
};

const PERIOD_OPTIONS: AnalyticsPeriod[] = ["day", "week", "month"];

export function CategoryChart({
  categoryData,
  period,
  onPeriodChange,
  isLoading,
  error,
  isDisabled,
  hiddenCategories,
  onToggleCategory,
}: CategoryChartProps) {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  const visibleItems =
    categoryData?.items.filter((item) => !hiddenCategories.includes(item.category)) ?? [];
  const total = visibleItems.reduce((sum, item) => sum + toNumber(item.total), 0);
  const hoveredItem = visibleItems.find((item) => item.category === hoveredCategory) ?? null;

  return (
    <section className="surface-panel card-entrance p-5 [animation-delay:220ms]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Category breakdown
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Proportional spend mix
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Toggle categories to isolate trends, then hover any segment to inspect
              its weight in the current window.
            </p>
          </div>

          <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1">
            {PERIOD_OPTIONS.map((option) => {
              const active = option === period;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onPeriodChange(option)}
                  disabled={isDisabled}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                    active
                      ? "bg-[var(--accent-primary)] text-white shadow-[var(--shadow-soft)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-card)]"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="rounded-[24px] border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger-text)]">
            <p className="font-medium">Could not load category analytics.</p>
            <p className="mt-1 text-[var(--text-tertiary)]">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-4">
            <div className="h-5 w-36 rounded-full bg-[var(--skeleton-base)] skeleton-shimmer" />
            <div className="h-24 rounded-[28px] bg-[var(--skeleton-base)] skeleton-shimmer" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-14 rounded-[22px] bg-[var(--skeleton-base)] skeleton-shimmer"
                />
              ))}
            </div>
          </div>
        ) : isDisabled || categoryData === null ? (
          <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 text-sm leading-6 text-[var(--text-tertiary)]">
            Select a Messenger user to inspect category allocation.
          </div>
        ) : categoryData.items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 text-sm leading-6 text-[var(--text-tertiary)]">
            No category totals yet for this {period}. Once new expenses land, Spendly
            will build the distribution automatically.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {categoryData.items.map((item) => {
                const hidden = hiddenCategories.includes(item.category);

                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() => onToggleCategory(item.category)}
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                      hidden
                        ? "border-[var(--border-subtle)] bg-transparent text-[var(--text-tertiary)]"
                        : "border-transparent bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-[var(--shadow-soft)]"
                    }`}
                    style={{
                      boxShadow: hidden
                        ? undefined
                        : `inset 0 0 0 1px ${getCategoryAccent(item.category)}20`,
                    }}
                  >
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: getCategoryAccent(item.category) }}
                    />
                    {getCategoryLabel(item.category)}
                  </button>
                );
              })}
            </div>

            <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
              <div className="overflow-hidden rounded-full bg-[var(--surface-card)] p-2">
                <div className="flex h-16 overflow-hidden rounded-full">
                  {visibleItems.map((item) => {
                    const share = total > 0 ? (toNumber(item.total) / total) * 100 : 0;

                    return (
                      <button
                        key={item.category}
                        type="button"
                        title={`${getCategoryLabel(item.category)} · ${formatCurrency(item.total, categoryData.currency)} · ${share.toFixed(1)}%`}
                        onMouseEnter={() => setHoveredCategory(item.category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className="stacked-bar-segment relative h-full transition-[width,filter] duration-700 hover:brightness-110"
                        style={{
                          width: `${share}%`,
                          backgroundColor: getCategoryAccent(item.category),
                        }}
                      >
                        <span className="sr-only">{getCategoryLabel(item.category)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                    Hover signal
                  </p>
                  {hoveredItem ? (
                    <div className="mt-2 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 shadow-[var(--shadow-soft)]">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {getCategoryLabel(hoveredItem.category)}
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {formatCurrency(hoveredItem.total, categoryData.currency)} ·{" "}
                        {((toNumber(hoveredItem.total) / Math.max(total, 1)) * 100).toFixed(1)}%
                        of visible spend
                      </p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Move across the bar to inspect each category’s share.
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {visibleItems.slice(0, 6).map((item) => (
                    <div
                      key={item.category}
                      className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        {getCategoryLabel(item.category)}
                      </p>
                      <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                        {formatCurrency(item.total, categoryData.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
