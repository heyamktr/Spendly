"use client";

import type { AnalyticsPeriod } from "@/lib/api";
import type { CustomDateRange, DateWindowMode } from "@/lib/dashboard";

type DateWindowControlsProps = {
  customRange: CustomDateRange;
  disabled: boolean;
  mode: DateWindowMode;
  windowLabel: string;
  onCustomRangeChange: (range: CustomDateRange) => void;
  onModeChange: (mode: DateWindowMode) => void;
  onPeriodChange: (period: AnalyticsPeriod) => void;
};

const WINDOW_OPTIONS: Array<{ label: string; value: DateWindowMode }> = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Custom", value: "custom" },
];

export function DateWindowControls({
  customRange,
  disabled,
  mode,
  windowLabel,
  onCustomRangeChange,
  onModeChange,
  onPeriodChange,
}: DateWindowControlsProps) {
  function handleModeChange(nextMode: DateWindowMode) {
    onModeChange(nextMode);
    if (nextMode !== "custom") {
      onPeriodChange(nextMode);
    }
  }

  return (
    <section className="surface-panel card-entrance p-4 [animation-delay:80ms]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Date window
          </p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
            {mode === "custom" ? windowLabel : `Showing ${windowLabel}`}
          </p>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-1">
            {WINDOW_OPTIONS.map((option) => {
              const active = option.value === mode;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleModeChange(option.value)}
                  disabled={disabled}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[var(--accent-primary)] text-white shadow-[var(--shadow-soft)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-card)]"
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {mode === "custom" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <DateInput
                label="From"
                value={customRange.start}
                disabled={disabled}
                onChange={(start) => onCustomRangeChange({ ...customRange, start })}
              />
              <DateInput
                label="To"
                value={customRange.end}
                disabled={disabled}
                onChange={(end) => onCustomRangeChange({ ...customRange, end })}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function DateInput({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type="date"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-60"
        aria-label={label}
      />
    </label>
  );
}
