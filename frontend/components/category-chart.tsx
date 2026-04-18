"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  formatCurrency,
  toNumber,
  type AnalyticsByCategoryResponse,
  type AnalyticsPeriod,
} from "@/lib/api";

type CategoryChartProps = {
  categoryData: AnalyticsByCategoryResponse | null;
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
  isLoading: boolean;
  error: string | null;
  isDisabled: boolean;
};

const PERIOD_OPTIONS: AnalyticsPeriod[] = ["day", "week", "month"];

export function CategoryChart({
  categoryData,
  period,
  onPeriodChange,
  isLoading,
  error,
  isDisabled,
}: CategoryChartProps) {
  const chartData =
    categoryData?.items.map((item) => ({
      category: item.category,
      total: toNumber(item.total),
      label: formatCurrency(item.total, categoryData.currency),
    })) ?? [];

  return (
    <section className="rounded-3xl border border-slate-800/80 bg-slate-900/75 p-5 shadow-xl shadow-slate-950/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-slate-400">
            Category breakdown
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
            Spending by category
          </h3>
        </div>

        <div className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 p-1">
          {PERIOD_OPTIONS.map((option) => {
            const isActive = option === period;
            return (
              <button
                key={option}
                type="button"
                onClick={() => onPeriodChange(option)}
                disabled={isDisabled}
                className={`rounded-xl px-3 py-2 text-sm font-medium capitalize transition ${
                  isActive
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-300 hover:bg-slate-800"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-medium">Could not load category analytics.</p>
          <p className="mt-1 text-rose-100/80">{error}</p>
        </div>
      ) : isLoading ? (
        <div className="mt-6 h-[320px] animate-pulse rounded-2xl border border-slate-800 bg-slate-950/50" />
      ) : isDisabled || categoryData === null ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm leading-6 text-slate-300">
          Select a Messenger user to view category totals.
        </div>
      ) : chartData.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm leading-6 text-slate-300">
          No transactions yet for this {period}. Once expenses arrive, the chart
          will show how spending is distributed across categories.
        </div>
      ) : (
        <div className="mt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
            >
              <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" vertical={false} />
              <XAxis
                dataKey="category"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#cbd5e1", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                tickFormatter={(value: number) =>
                  formatCurrency(value, categoryData.currency)
                }
              />
              <Tooltip
                cursor={{ fill: "rgba(34, 211, 238, 0.08)" }}
                contentStyle={{
                  borderRadius: "16px",
                  border: "1px solid rgba(51, 65, 85, 1)",
                  backgroundColor: "rgba(2, 6, 23, 0.95)",
                  color: "#f8fafc",
                }}
                formatter={(value) => {
                  const safeValue = Array.isArray(value)
                    ? value[0]
                    : value ?? 0;
                  return formatCurrency(safeValue, categoryData.currency);
                }}
              />
              <Bar
                dataKey="total"
                fill="#22d3ee"
                radius={[10, 10, 0, 0]}
                maxBarSize={64}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
