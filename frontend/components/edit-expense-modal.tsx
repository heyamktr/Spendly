"use client";

import { useEffect, useState } from "react";

import type { ExpenseResponse, ExpenseUpdateInput } from "@/lib/api";
import { EXPENSE_CATEGORIES } from "@/lib/dashboard";
import { CloseIcon } from "@/components/icons";

type EditExpenseModalProps = {
  expense: ExpenseResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expenseId: number, payload: ExpenseUpdateInput) => Promise<void>;
};

export function EditExpenseModal({
  expense,
  isOpen,
  onClose,
  onSubmit,
}: EditExpenseModalProps) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [note, setNote] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !expense) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [expense, isOpen]);

  useEffect(() => {
    if (!isOpen || !expense) {
      setAmount("");
      setCategory("other");
      setNote("");
      setOccurredAt("");
      setSubmitError(null);
      setIsSubmitting(false);
      return;
    }

    setAmount(String(expense.amount));
    setCategory(expense.category || "other");
    setNote(expense.note ?? "");
    setOccurredAt(toDateTimeLocalValue(expense.occurred_at));
    setSubmitError(null);
    setIsSubmitting(false);
  }, [expense, isOpen]);

  if (!isOpen || !expense) {
    return null;
  }

  async function handleSubmit() {
    if (!expense) {
      return;
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setSubmitError("Amount must be greater than zero.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(expense.id, {
        amount: normalizedAmount,
        category,
        note: note.trim() || null,
        occurred_at: fromDateTimeLocalValue(occurredAt),
      });
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not update expense.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.42)] px-4 py-6 backdrop-blur-sm md:items-center">
      <div className="card-entrance relative w-full max-w-xl overflow-hidden rounded-[32px] border border-[var(--border-strong)] bg-[var(--surface-card)] shadow-[var(--shadow-strong)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-[var(--accent-gradient)]" />

        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Edit expense
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Update transaction details
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Adjust the amount, category, note, or timestamp for this transaction.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label="Close edit expense modal"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 border-t border-[var(--border-subtle)] px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                Amount
              </span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-12 w-full rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)]"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                Category
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="h-12 w-full rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)]"
              >
                {EXPENSE_CATEGORIES.map((option) => (
                  <option key={option} value={option}>
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Merchant or note
            </span>
            <input
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="burger combo"
              className="h-12 w-full rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Occurred at
            </span>
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
              className="h-12 w-full rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)]"
            />
          </label>

          {submitError ? (
            <div className="rounded-[20px] border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-text)]">
              {submitError}
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className="rounded-full bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - offsetMs);
  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}
