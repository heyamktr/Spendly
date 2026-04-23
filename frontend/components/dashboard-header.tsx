"use client";

import { useEffect, useRef } from "react";

import type { ThemeMode } from "@/lib/dashboard";
import { BellIcon, MoonIcon, SearchIcon, SidebarToggleIcon, SunIcon } from "@/components/icons";

type DashboardHeaderProps = {
  apiBaseUrl: string;
  pageDescription: string;
  pageTitle: string;
  refreshIntervalSeconds: number;
  searchQuery: string;
  searchPlaceholder?: string;
  onSearchQueryChange: (value: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
};

export function DashboardHeader({
  apiBaseUrl,
  pageDescription,
  pageTitle,
  refreshIntervalSeconds,
  searchQuery,
  searchPlaceholder = "Search merchants, notes, categories",
  onSearchQueryChange,
  theme,
  onToggleTheme,
  onToggleSidebar,
}: DashboardHeaderProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--app-bg)_76%,transparent)] px-4 py-4 backdrop-blur md:px-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] xl:flex"
              aria-label="Toggle sidebar"
            >
              <SidebarToggleIcon className="h-5 w-5" />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                  Live workspace
                </span>
                <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
                  Sync {refreshIntervalSeconds}s
                </span>
              </div>
              <h1 className="mt-3 truncate text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] md:text-[2rem]">
                {pageTitle}
              </h1>
              <p className="mt-1 truncate text-sm text-[var(--text-tertiary)]">
                {pageDescription}
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 shadow-[var(--shadow-soft)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                API
              </p>
              <code className="mt-1 block text-xs text-[var(--text-secondary)]">
                {apiBaseUrl}
              </code>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full max-w-2xl">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => onSearchQueryChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-14 w-full rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-card)] pl-12 pr-24 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:shadow-[0_0_0_4px_var(--accent-ring)]"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              Cmd K
            </span>
          </label>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              type="button"
              className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
              <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-[var(--accent-coral)]" />
            </button>

            <button
              type="button"
              onClick={onToggleTheme}
              className="theme-toggle group flex h-12 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              <span className="relative flex h-7 w-12 items-center rounded-full bg-[var(--surface-elevated)]">
                <span
                  className={`absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white transition-transform duration-300 ${
                    theme === "light" ? "translate-x-5" : "translate-x-0"
                  }`}
                >
                  {theme === "dark" ? (
                    <MoonIcon className="h-3.5 w-3.5" />
                  ) : (
                    <SunIcon className="h-3.5 w-3.5" />
                  )}
                </span>
              </span>
              <span className="hidden text-sm font-medium sm:inline">
                {theme === "dark" ? "Dark" : "Light"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
