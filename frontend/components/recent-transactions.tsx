import type { ReactNode } from "react";

import { formatCurrency, type AnalyticsPeriod, type ExpenseResponse } from "@/lib/api";
import {
  formatAbsoluteTime,
  formatRelativeTime,
  getCategoryEmoji,
  getCategoryLabel,
  getTransactionTitle,
  type TransactionGroup,
} from "@/lib/dashboard";
import { DeleteIcon, EditIcon, SearchIcon } from "@/components/icons";

type RecentTransactionsProps = {
  groups: TransactionGroup[];
  isLoading: boolean;
  error: string | null;
  isDisabled: boolean;
  period: AnalyticsPeriod;
  query: string;
  onQueryChange: (value: string) => void;
  busyExpenseId: number | null;
  onEditExpense: (expense: ExpenseResponse) => void;
  onDeleteExpense: (expense: ExpenseResponse) => void;
};

export function RecentTransactions({
  groups,
  isLoading,
  error,
  isDisabled,
  period,
  query,
  onQueryChange,
  busyExpenseId,
  onEditExpense,
  onDeleteExpense,
}: RecentTransactionsProps) {
  const itemCount = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <section className="surface-panel card-entrance flex min-h-[680px] flex-col p-5 [animation-delay:300ms]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Transactions
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Premium activity feed
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Reviewing the {period} window with grouped dates, contextual metadata,
              and live filtering.
            </p>
          </div>

          <div className="relative w-full max-w-sm">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search this feed"
              className="h-12 w-full rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)]"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-[24px] border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger-text)]">
            <p className="font-medium">Could not load transactions.</p>
            <p className="mt-1 text-[var(--text-tertiary)]">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-20 rounded-[24px] bg-[var(--skeleton-base)] skeleton-shimmer"
              />
            ))}
          </div>
        ) : isDisabled ? (
          <div className="flex flex-1 items-center justify-center rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-elevated)] p-8 text-center text-sm leading-6 text-[var(--text-tertiary)]">
            Select a Messenger user to inspect the live transaction feed.
          </div>
        ) : itemCount === 0 ? (
          <EmptyState query={query} />
        ) : (
          <div className="mt-2 flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              <span>{itemCount} rows visible</span>
              <span>Hover a row for quick actions</span>
            </div>

            <div className="hide-scrollbar flex-1 space-y-4 overflow-y-auto pr-1">
              {groups.map((group) => (
                <section key={group.id}>
                  <div className="sticky top-0 z-10 mb-3 flex items-center justify-between rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-card)_88%,transparent)] px-4 py-2 backdrop-blur">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      {group.label}
                    </h4>
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {group.items.length} item{group.items.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((expense) => (
                      <TransactionRow
                        key={expense.id}
                        expense={expense}
                        isBusy={busyExpenseId === expense.id}
                        onEditExpense={onEditExpense}
                        onDeleteExpense={onDeleteExpense}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function TransactionRow({
  expense,
  isBusy,
  onEditExpense,
  onDeleteExpense,
}: {
  expense: ExpenseResponse;
  isBusy: boolean;
  onEditExpense: (expense: ExpenseResponse) => void;
  onDeleteExpense: (expense: ExpenseResponse) => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 shadow-[var(--shadow-soft)] transition hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-strong)]">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface-card)] text-xl">
          {getCategoryEmoji(expense.category)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {getTransactionTitle(expense)}
            </p>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {getCategoryLabel(expense.category)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-secondary)]">
            <span>{formatRelativeTime(expense.occurred_at)}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--text-quaternary)]" />
            <span>{formatAbsoluteTime(expense.occurred_at)}</span>
            <span className="h-1 w-1 rounded-full bg-[var(--text-quaternary)]" />
            <span className="truncate text-[var(--text-tertiary)]">{expense.source_text}</span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-semibold text-[var(--text-primary)]">
            {formatCurrency(expense.amount, expense.currency)}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
            {expense.currency}
          </p>
        </div>
      </div>

      <div className="absolute inset-y-0 right-0 flex translate-x-6 items-center gap-2 pr-4 opacity-0 transition duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        <ActionHint
          icon={<EditIcon className="h-4 w-4" />}
          label={isBusy ? "Working..." : "Edit"}
          onClick={() => onEditExpense(expense)}
          disabled={isBusy}
        />
        <ActionHint
          icon={<DeleteIcon className="h-4 w-4" />}
          label={isBusy ? "Working..." : "Delete"}
          onClick={() => onDeleteExpense(expense)}
          disabled={isBusy}
        />
      </div>
    </article>
  );
}

function ActionHint({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-card)_88%,transparent)] px-3 py-1 text-xs font-medium text-[var(--text-tertiary)] backdrop-blur transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-[28px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-elevated)] px-8 py-12 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--surface-card)] text-4xl shadow-[var(--shadow-soft)]">
        {"\u2615"}
      </div>
      <h4 className="mt-6 text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        {query ? "No matches in this feed" : "No transactions yet"}
      </h4>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--text-secondary)]">
        {query
          ? "Try a different merchant, note, or category keyword and Spendly will filter results as you type."
          : "Send 'coffee 5' to your bot to get started. New entries will land here automatically with the live refresh loop."}
      </p>
      {!query ? (
        <button
          type="button"
          className="mt-6 rounded-full bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)]"
        >
          Send "coffee 5" to your bot to get started
        </button>
      ) : null}
    </div>
  );
}
