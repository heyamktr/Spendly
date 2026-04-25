"use client";

import { useEffect, useState } from "react";

import { formatCurrency, type ReceiptScanResponse } from "@/lib/api";
import { EXPENSE_CATEGORIES, getCategoryLabel } from "@/lib/dashboard";
import { CloseIcon, ReceiptIcon } from "@/components/icons";

type ReceiptScanModalProps = {
  isOpen: boolean;
  selectedUserLabel: string | null;
  onAnalyze: (file: File) => Promise<ReceiptScanResponse>;
  onClose: () => void;
  onSubmit: (payload: {
    amount: number;
    category: string;
    note: string | null;
    source_text: string | null;
  }) => Promise<void>;
};

export function ReceiptScanModal({
  isOpen,
  selectedUserLabel,
  onAnalyze,
  onClose,
  onSubmit,
}: ReceiptScanModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ReceiptScanResponse | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [note, setNote] = useState("");
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (previewUrl) {
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setScanResult(null);
      setAmount("");
      setCategory("other");
      setNote("");
      setSourceText(null);
      setErrorMessage(null);
      setIsAnalyzing(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const hasSuccessfulScan = scanResult?.success === true;

  async function handleAnalyze() {
    if (!selectedFile) {
      setErrorMessage("Choose a receipt image before scanning.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const result = await onAnalyze(selectedFile);
      setScanResult(result);

      if (!result.success) {
        setAmount("");
        setCategory("other");
        setNote(result.note ?? "");
        setSourceText(result.source_text ?? null);
        setErrorMessage(result.reason ?? "Spendly could not read that receipt.");
        return;
      }

      setAmount(result.amount !== null ? String(result.amount) : "");
      setCategory(result.category ?? "other");
      setNote(result.note ?? "");
      setSourceText(result.source_text ?? null);
    } catch (error) {
      setScanResult(null);
      setErrorMessage(error instanceof Error ? error.message : "Could not scan that receipt.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSubmit() {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setErrorMessage("Amount must be greater than zero before saving.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await onSubmit({
        amount: normalizedAmount,
        category,
        note: note.trim() || null,
        source_text: sourceText,
      });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not save that receipt.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.42)] px-4 py-6 backdrop-blur-sm md:items-center">
      <div className="card-entrance relative w-full max-w-5xl overflow-hidden rounded-[32px] border border-[var(--border-strong)] bg-[var(--surface-card)] shadow-[var(--shadow-strong)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-[var(--accent-gradient)]" />

        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Scan receipt
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              Turn a receipt photo into an expense
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Upload a clear receipt image, let Spendly extract the total, then
              confirm the category before it lands in the database.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            aria-label="Close receipt scan modal"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 border-t border-[var(--border-subtle)] px-6 py-6 lg:grid-cols-[minmax(0,1.15fr)_360px]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                Receipt image
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/bmp,image/tiff"
                onChange={(event) => {
                  const nextFile = event.target.files?.[0] ?? null;
                  setSelectedFile(nextFile);
                  setScanResult(null);
                  setAmount("");
                  setCategory("other");
                  setNote("");
                  setSourceText(null);
                  setErrorMessage(null);

                  if (previewUrl) {
                    URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }

                  if (nextFile) {
                    setPreviewUrl(URL.createObjectURL(nextFile));
                  }
                }}
                className="block w-full rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)] file:mr-4 file:rounded-full file:border-0 file:bg-[var(--accent-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
              />
            </label>

            <div className="overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="h-[320px] w-full bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_60%)] object-contain p-4"
                />
              ) : (
                <div className="flex h-[320px] flex-col items-center justify-center gap-4 px-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-card)] text-[var(--accent-primary)]">
                    <ReceiptIcon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      Waiting for a receipt image
                    </p>
                    <p className="mx-auto max-w-md text-sm leading-6 text-[var(--text-secondary)]">
                      JPG, PNG, WEBP, BMP, and TIFF images work best. Keep the total
                      line visible and avoid heavy shadows.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={!selectedFile || !selectedUserLabel || isAnalyzing}
                className="rounded-full bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isAnalyzing ? "Scanning receipt..." : "Analyze receipt"}
              </button>
              <p className="text-xs leading-5 text-[var(--text-tertiary)]">
                {selectedUserLabel
                  ? `This receipt will be prepared for ${selectedUserLabel}.`
                  : "Choose a Messenger user first so Spendly knows where to save this expense."}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
              Scan preview
            </p>

            <div className="mt-5 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
              {hasSuccessfulScan ? (
                <div className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Amount
                    </span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)]"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Category
                    </span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="h-12 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)]"
                    >
                      {EXPENSE_CATEGORIES.map((option) => (
                        <option key={option} value={option}>
                          {getCategoryLabel(option)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Merchant or note
                    </span>
                    <input
                      type="text"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Merchant name"
                      className="h-12 w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)]"
                    />
                  </label>

                  <PreviewRow
                    label="Recipient"
                    value={selectedUserLabel ?? "Choose a Messenger user first"}
                  />
                  <PreviewRow
                    label="Confidence"
                    value={scanResult?.confidence ? getCategoryLabel(scanResult.confidence) : "Medium"}
                  />
                  <PreviewRow
                    label="Detected total"
                    value={formatCurrency(amount || 0, scanResult?.currency ?? "USD")}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-elevated)] text-[var(--accent-primary)]">
                    <ReceiptIcon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    Waiting for a scan
                  </p>
                  <p className="text-sm leading-6 text-[var(--text-secondary)]">
                    Spendly will preview the extracted total, detected category, and
                    merchant before saving anything.
                  </p>
                </div>
              )}
            </div>

            {scanResult?.ocr_text ? (
              <div className="mt-4 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-card)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                  OCR text
                </p>
                <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap text-xs leading-5 text-[var(--text-secondary)]">
                  {scanResult.ocr_text}
                </pre>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-4 rounded-[20px] border border-[var(--danger-soft)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger-text)]">
                {errorMessage}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!hasSuccessfulScan || !selectedUserLabel || isSubmitting}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving receipt..." : "Confirm and log receipt"}
            </button>

            <p className="mt-3 text-xs leading-5 text-[var(--text-tertiary)]">
              This keeps the normal manual expense endpoint as the final write step,
              so receipt scans and typed expenses stay in the same data flow.
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
