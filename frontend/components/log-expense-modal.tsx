"use client";

import { useEffect, useState } from "react";

import { formatCurrency } from "@/lib/api";
import { getCategoryLabel, parseExpenseDraft } from "@/lib/dashboard";
import { CloseIcon, PlusIcon } from "@/components/icons";

type LogExpenseModalProps = {
  isOpen: boolean;
  selectedUserLabel: string | null;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
};

export function LogExpenseModal({
  isOpen,
  selectedUserLabel,
  onClose,
  onSubmit,
}: LogExpenseModalProps) {
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDraft("");
      setSubmitError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const preview = parseExpenseDraft(draft);

  async function handleSubmit() {
    if (!preview.success || !draft.trim()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(draft.trim());
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not log expense.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.42)] px-4 py-6 backdrop-blur-sm md:items-center">
      <div className="card-entrance relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-[var(--border-strong)] bg-[var(--surface-card)] shadow-[var(--shadow-strong)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-[var(--accent-gradient)]" />

        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Log expense
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Simulate the Messenger bot flow
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Type the same compact message you would send in Messenger. Spendly will
              preview how it parses before saving.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label="Close log expense modal"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 border-t border-[var(--border-subtle)] px-6 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                Messenger-style input
              </span>
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="coffee 5"
                rows={5}
                className="w-full rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 text-base text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)]"
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              {["coffee 5", "uber 12 to campus", "pizza 19"].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setDraft(suggestion)}
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {submitError ? (
              <div className="mt-4 rounded-[20px] border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-text)]">
                {submitError}
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Parse preview
            </p>

            <div className="mt-5 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
              {preview.success ? (
                <div className="space-y-4">
                  <PreviewRow label="Category" value={getCategoryLabel(preview.category ?? "other")} />
                  <PreviewRow
                    label="Amount"
                    value={formatCurrency(preview.amount ?? 0, "USD")}
                  />
                  <PreviewRow label="Note" value={preview.note ?? "No note extracted"} />
                  <PreviewRow
                    label="Recipient"
                    value={selectedUserLabel ?? "Choose a Messenger user first"}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--accent-primary)]">
                    <PlusIcon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Waiting for a valid bot message
                  </p>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    {preview.reason}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!preview.success || !selectedUserLabel || isSubmitting}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending to Spendly..." : "Confirm and log expense"}
            </button>

            <p className="mt-3 text-xs leading-5 text-[var(--text-tertiary)]">
              This uses the existing manual expense endpoint, while keeping the same
              natural-language entry style as Messenger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
