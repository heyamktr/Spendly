"use client";

import { CategoryChart } from "@/components/category-chart";
import { InsightsPanel } from "@/components/insights-panel";
import { SummaryCards } from "@/components/summary-cards";
import {
  formatCurrency,
  getUserLabel,
  toNumber,
  type AnalyticsByCategoryResponse,
  type AnalyticsPeriod,
  type ExpenseResponse,
  type UserListItem,
} from "@/lib/api";
import {
  formatAbsoluteTime,
  formatCompactCurrency,
  formatRelativeTime,
  getCategoryAccent,
  getCategoryEmoji,
  getCategoryLabel,
  getTransactionTitle,
  type DashboardStat,
  type InsightItem,
  type ThemeMode,
} from "@/lib/dashboard";

type AnalyticsWorkspaceProps = {
  activePeriod: AnalyticsPeriod;
  categoryData: AnalyticsByCategoryResponse | null;
  categoryError: string | null;
  categoryStatus: "idle" | "loading" | "success" | "error";
  currency: string;
  currentPeriodExpenses: ExpenseResponse[];
  detailsError: string | null;
  detailsStatus: "idle" | "loading" | "success" | "error";
  hiddenCategories: string[];
  insights: InsightItem[];
  isDisabled: boolean;
  onSelectPeriod: (period: AnalyticsPeriod) => void;
  onToggleCategory: (category: string) => void;
  searchQuery: string;
  stats: DashboardStat[];
};

type CategoriesWorkspaceProps = {
  activePeriod: AnalyticsPeriod;
  categoryData: AnalyticsByCategoryResponse | null;
  categoryError: string | null;
  categoryStatus: "idle" | "loading" | "success" | "error";
  currentPeriodExpenses: ExpenseResponse[];
  hiddenCategories: string[];
  isDisabled: boolean;
  onResetHiddenCategories: () => void;
  onSelectPeriod: (period: AnalyticsPeriod) => void;
  onToggleCategory: (category: string) => void;
  searchQuery: string;
};

type SettingsWorkspaceProps = {
  activePeriod: AnalyticsPeriod;
  apiBaseUrl: string;
  currency: string;
  expenseCount: number;
  hiddenCategoriesCount: number;
  lastSyncedAt: string | null;
  onClearSearch: () => void;
  onOpenLogModal: () => void;
  onRefreshNow: () => void;
  onResetHiddenCategories: () => void;
  onSelectTheme: (theme: ThemeMode) => void;
  onToggleSidebar: () => void;
  refreshIntervalSeconds: number;
  searchQuery: string;
  selectedUser: UserListItem | null;
  sidebarCollapsed: boolean;
  theme: ThemeMode;
  usersCount: number;
};

type MerchantRow = {
  id: string;
  label: string;
  category: string;
  count: number;
  latestAt: string;
  total: number;
};

type CategoryCard = {
  averageTicket: number;
  category: string;
  count: number;
  hidden: boolean;
  lastExpense: ExpenseResponse | null;
  share: number;
  total: number;
};

export function AnalyticsWorkspace({
  activePeriod,
  categoryData,
  categoryError,
  categoryStatus,
  currency,
  currentPeriodExpenses,
  detailsError,
  detailsStatus,
  hiddenCategories,
  insights,
  isDisabled,
  onSelectPeriod,
  onToggleCategory,
  searchQuery,
  stats,
}: AnalyticsWorkspaceProps) {
  const totalAmount = currentPeriodExpenses.reduce(
    (sum, expense) => sum + toNumber(expense.amount),
    0,
  );
  const transactionCount = currentPeriodExpenses.length;
  const averageTicket = transactionCount > 0 ? totalAmount / transactionCount : 0;
  const largestExpense =
    currentPeriodExpenses.reduce<ExpenseResponse | null>((largest, expense) => {
      if (!largest || toNumber(expense.amount) > toNumber(largest.amount)) {
        return expense;
      }
      return largest;
    }, null) ?? null;
  const activeDays = new Set(
    currentPeriodExpenses.map((expense) => expense.occurred_at.slice(0, 10)),
  ).size;
  const categoryTotal = (categoryData?.items ?? []).reduce(
    (sum, item) => sum + toNumber(item.total),
    0,
  );
  const topCategory = categoryData?.items[0] ?? null;
  const topCategoryShare =
    topCategory && categoryTotal > 0
      ? (toNumber(topCategory.total) / categoryTotal) * 100
      : 0;
  const merchantRows = buildMerchantRows(currentPeriodExpenses, searchQuery);

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards
        stats={stats}
        activePeriod={activePeriod}
        currency={currency}
        isLoading={detailsStatus === "loading"}
        error={detailsStatus === "error" ? detailsError : null}
        isDisabled={isDisabled}
        onSelectPeriod={onSelectPeriod}
      />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <InsightsPanel
          insights={insights}
          isLoading={
            detailsStatus === "loading" ||
            (categoryStatus === "loading" && activePeriod === categoryData?.period)
          }
          error={
            detailsStatus === "error"
              ? detailsError
              : categoryStatus === "error"
                ? categoryError
                : null
          }
          isDisabled={isDisabled}
        />

        <section className="surface-panel card-entrance p-5 [animation-delay:160ms]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Decision deck
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Current period signals
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Spendly distills velocity, ticket size, and concentration into a quick
            read for the current {activePeriod} window.
          </p>

          {detailsStatus === "error" ? (
            <InlineError
              title="Could not build analytics signals."
              message={detailsError}
            />
          ) : detailsStatus === "loading" ? (
            <MetricSkeleton />
          ) : isDisabled ? (
            <DisabledMessage message="Select a Messenger user to unlock deeper analytics." />
          ) : transactionCount === 0 ? (
            <DisabledMessage
              message={`No expenses have landed in this ${activePeriod} window yet, so Spendly has nothing to compare.`}
            />
          ) : (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  label="Entries logged"
                  value={String(transactionCount)}
                  caption={`Across ${activeDays} active day${activeDays === 1 ? "" : "s"}`}
                />
                <MetricTile
                  label="Average ticket"
                  value={formatCurrency(averageTicket, currency)}
                  caption="Typical spend size in the selected window"
                />
                <MetricTile
                  label="Largest charge"
                  value={
                    largestExpense
                      ? formatCurrency(largestExpense.amount, largestExpense.currency)
                      : formatCurrency(0, currency)
                  }
                  caption={
                    largestExpense
                      ? `${getTransactionTitle(largestExpense)} at ${formatAbsoluteTime(largestExpense.occurred_at)}`
                      : "No spend recorded yet"
                  }
                />
                <MetricTile
                  label="Top category share"
                  value={topCategory ? `${Math.round(topCategoryShare)}%` : "--"}
                  caption={
                    topCategory
                      ? `${getCategoryLabel(topCategory.category)} leads ${activePeriod} spend`
                      : "Waiting for category data"
                  }
                />
              </div>

              <div className="mt-5 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
                      Concentration signal
                    </p>
                    <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">
                      {topCategory
                        ? `${getCategoryLabel(topCategory.category)} is carrying ${Math.round(topCategoryShare)}% of visible spend.`
                        : "Spend will cluster here once enough data has landed."}
                    </p>
                  </div>
                  <div className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2 text-sm text-[var(--text-secondary)]">
                    {formatCompactCurrency(totalAmount, currency)} in total flow
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <CategoryChart
          categoryData={categoryData}
          period={activePeriod}
          onPeriodChange={onSelectPeriod}
          isLoading={categoryStatus === "loading"}
          error={categoryStatus === "error" ? categoryError : null}
          isDisabled={isDisabled}
          hiddenCategories={hiddenCategories}
          onToggleCategory={onToggleCategory}
        />

        <section className="surface-panel card-entrance p-5 [animation-delay:240ms]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                Merchant concentration
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Highest-volume spend sources
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Search narrows this list so you can audit which merchants or notes
                are driving the selected window.
              </p>
            </div>
            <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {merchantRows.length} match{merchantRows.length === 1 ? "" : "es"}
            </span>
          </div>

          {detailsStatus === "error" ? (
            <InlineError
              title="Could not build merchant analytics."
              message={detailsError}
            />
          ) : detailsStatus === "loading" ? (
            <ListSkeleton count={5} />
          ) : isDisabled ? (
            <DisabledMessage message="Choose a user to see merchant concentration." />
          ) : merchantRows.length === 0 ? (
            <DisabledMessage
              message={
                searchQuery
                  ? `No merchants or notes match "${searchQuery}" in this ${activePeriod} window.`
                  : `No merchant patterns are available for this ${activePeriod} window yet.`
              }
            />
          ) : (
            <div className="mt-6 space-y-3">
              {merchantRows.slice(0, 8).map((row) => (
                <div
                  key={row.id}
                  className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {row.label}
                        </p>
                        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                          {getCategoryLabel(row.category)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {row.count} transaction{row.count === 1 ? "" : "s"} logged,
                        last seen {formatRelativeTime(row.latestAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {formatCurrency(row.total, currency)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {formatAbsoluteTime(row.latestAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function CategoriesWorkspace({
  activePeriod,
  categoryData,
  categoryError,
  categoryStatus,
  currentPeriodExpenses,
  hiddenCategories,
  isDisabled,
  onResetHiddenCategories,
  onSelectPeriod,
  onToggleCategory,
  searchQuery,
}: CategoriesWorkspaceProps) {
  const categoryCurrency =
    categoryData?.currency ?? currentPeriodExpenses[0]?.currency ?? "USD";
  const categoryCards = buildCategoryCards(
    categoryData,
    currentPeriodExpenses,
    hiddenCategories,
    searchQuery,
  );
  const visibleActivity = currentPeriodExpenses
    .filter((expense) => !hiddenCategories.includes(expense.category))
    .filter((expense) =>
      matchesWorkspaceQuery(searchQuery, [
        expense.category,
        expense.note,
        expense.source_text,
        getTransactionTitle(expense),
      ]),
    )
    .slice()
    .sort(
      (left, right) =>
        new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime(),
    )
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <CategoryChart
        categoryData={categoryData}
        period={activePeriod}
        onPeriodChange={onSelectPeriod}
        isLoading={categoryStatus === "loading"}
        error={categoryStatus === "error" ? categoryError : null}
        isDisabled={isDisabled}
        hiddenCategories={hiddenCategories}
        onToggleCategory={onToggleCategory}
      />

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <section className="surface-panel card-entrance p-5 [animation-delay:160ms]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                Category workbench
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                Tune the spend mix
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Filter categories on and off, then inspect frequency, share, and
                recent activity for each lane.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                {categoryCards.length} category{categoryCards.length === 1 ? "" : "ies"}
              </span>
              {hiddenCategories.length > 0 ? (
                <button
                  type="button"
                  onClick={onResetHiddenCategories}
                  className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                >
                  Show all
                </button>
              ) : null}
            </div>
          </div>

          {categoryStatus === "error" ? (
            <InlineError
              title="Could not assemble category cards."
              message={categoryError}
            />
          ) : categoryStatus === "loading" ? (
            <ListSkeleton count={4} />
          ) : isDisabled ? (
            <DisabledMessage message="Select a Messenger user to inspect category behavior." />
          ) : categoryCards.length === 0 ? (
            <DisabledMessage
              message={
                searchQuery
                  ? `No categories match "${searchQuery}" in this ${activePeriod} view.`
                  : `Spendly has not seen any category totals for this ${activePeriod} view yet.`
              }
            />
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {categoryCards.map((item) => (
                <article
                  key={item.category}
                  className={`rounded-[24px] border px-4 py-4 transition ${
                    item.hidden
                      ? "border-[var(--border-subtle)] bg-[var(--surface-elevated)] opacity-70"
                      : "border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-soft)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-xl"
                        style={{
                          backgroundColor: `${getCategoryAccent(item.category)}20`,
                          color: getCategoryAccent(item.category),
                        }}
                      >
                        {getCategoryEmoji(item.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {getCategoryLabel(item.category)}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {item.count} transaction{item.count === 1 ? "" : "s"} in
                          this window
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleCategory(item.category)}
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
                    >
                      {item.hidden ? "Show" : "Hide"}
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <MetricTile
                      label="Total"
                      value={formatCurrency(item.total, categoryCurrency)}
                      caption={`${Math.round(item.share)}% of visible category spend`}
                    />
                    <MetricTile
                      label="Avg ticket"
                      value={formatCurrency(item.averageTicket, categoryCurrency)}
                      caption="Mean expense size in this lane"
                    />
                  </div>

                  <div className="mt-4 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {item.lastExpense ? (
                      <>
                        <p className="font-medium text-[var(--text-primary)]">
                          Last activity: {getTransactionTitle(item.lastExpense)}
                        </p>
                        <p className="mt-1">
                          {formatRelativeTime(item.lastExpense.occurred_at)} at{" "}
                          {formatAbsoluteTime(item.lastExpense.occurred_at)}
                        </p>
                      </>
                    ) : (
                      <p>No activity in this category yet.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="surface-panel card-entrance p-5 [animation-delay:240ms]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Visible activity
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Recent spend in active categories
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            This stream respects your hidden category filters, so it acts like a live
            preview of the mix you are studying.
          </p>

          {categoryStatus === "loading" ? (
            <ListSkeleton count={5} />
          ) : isDisabled ? (
            <DisabledMessage message="Choose a user to inspect category activity." />
          ) : visibleActivity.length === 0 ? (
            <DisabledMessage
              message={
                searchQuery
                  ? `No visible activity matches "${searchQuery}" right now.`
                  : "No visible activity yet for the currently shown categories."
              }
            />
          ) : (
            <div className="mt-6 space-y-3">
              {visibleActivity.map((expense) => (
                <div
                  key={expense.id}
                  className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg">{getCategoryEmoji(expense.category)}</span>
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {getTransactionTitle(expense)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {getCategoryLabel(expense.category)} from{" "}
                        {formatRelativeTime(expense.occurred_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-[var(--text-primary)]">
                        {formatCurrency(expense.amount, expense.currency)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {formatAbsoluteTime(expense.occurred_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function SettingsWorkspace({
  activePeriod,
  apiBaseUrl,
  currency,
  expenseCount,
  hiddenCategoriesCount,
  lastSyncedAt,
  onClearSearch,
  onOpenLogModal,
  onRefreshNow,
  onResetHiddenCategories,
  onSelectTheme,
  onToggleSidebar,
  refreshIntervalSeconds,
  searchQuery,
  selectedUser,
  sidebarCollapsed,
  theme,
  usersCount,
}: SettingsWorkspaceProps) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const showAppearance = matchesWorkspaceQuery(normalizedQuery, [
    "appearance",
    "theme",
    "light",
    "dark",
    "sidebar",
    "navigation",
  ]);
  const showSync = matchesWorkspaceQuery(normalizedQuery, [
    "sync",
    "refresh",
    "api",
    "workspace",
    "backend",
    "polling",
  ]);
  const showActions = matchesWorkspaceQuery(normalizedQuery, [
    "actions",
    "search",
    "filters",
    "categories",
    "log expense",
    "messenger",
  ]);
  const showProfile = matchesWorkspaceQuery(normalizedQuery, [
    "profile",
    "user",
    "messenger",
    "workspace stats",
    "connected account",
  ]);
  const visibleCards = [showAppearance, showSync, showActions, showProfile].filter(
    Boolean,
  ).length;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {visibleCards === 0 ? (
        <section className="surface-panel col-span-full p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            No settings match
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Nothing matched "{searchQuery}"
          </h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
            Try searching for theme, refresh, profile, or filters to narrow the
            workspace controls.
          </p>
        </section>
      ) : null}

      {showAppearance ? (
        <section className="surface-panel card-entrance p-5 [animation-delay:120ms]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Appearance
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Theme and navigation
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Dial the workspace between light and dark mode, then adjust whether the
            sidebar stays compact or fully expanded.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ThemeOption
              active={theme === "dark"}
              description="Deep navy surfaces with glassy cards and grain texture."
              label="Dark mode"
              onClick={() => onSelectTheme("dark")}
            />
            <ThemeOption
              active={theme === "light"}
              description="Warm off-white canvas with softer contrast and airy cards."
              label="Light mode"
              onClick={() => onSelectTheme("light")}
            />
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              Sidebar density
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {sidebarCollapsed
                ? "Navigation is currently condensed to icon-first mode."
                : "Navigation is expanded with full labels and profile details."}
            </p>
            <button
              type="button"
              onClick={onToggleSidebar}
              className="mt-4 rounded-full bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-white shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
            >
              {sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </button>
          </div>
        </section>
      ) : null}

      {showSync ? (
        <section className="surface-panel card-entrance p-5 [animation-delay:180ms]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Live sync
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Workspace heartbeat
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Spendly is polling the backend continuously so Messenger events and manual
            edits land in the UI without a page refresh.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <MetricTile
              label="Refresh cadence"
              value={`${refreshIntervalSeconds}s`}
              caption="Automatic sync interval"
            />
            <MetricTile
              label="Current period"
              value={activePeriod}
              caption="Shared across dashboard analytics"
            />
            <MetricTile
              label="Last sync"
              value={lastSyncedAt ? formatRelativeTime(lastSyncedAt) : "Waiting"}
              caption={
                lastSyncedAt ? formatAbsoluteTime(lastSyncedAt) : "No successful sync yet"
              }
            />
            <MetricTile
              label="Currency context"
              value={currency}
              caption="Default formatting for this workspace"
            />
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              API base
            </p>
            <code className="mt-2 block overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[var(--text-primary)]">
              {apiBaseUrl}
            </code>
            <button
              type="button"
              onClick={onRefreshNow}
              className="mt-4 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:-translate-y-0.5"
            >
              Refresh analytics now
            </button>
          </div>
        </section>
      ) : null}

      {showActions ? (
        <section className="surface-panel card-entrance p-5 [animation-delay:240ms]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Workspace actions
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Quick controls
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            Reset filters, open the log modal, and keep the workspace clean without
            leaving the current page.
          </p>

          <div className="mt-6 space-y-3">
            <ActionRow
              description={
                searchQuery
                  ? `Clear the active search query "${searchQuery}".`
                  : "The workspace search is already empty."
              }
              disabled={!searchQuery}
              label="Clear search query"
              onClick={onClearSearch}
            />
            <ActionRow
              description={
                hiddenCategoriesCount > 0
                  ? `Reveal ${hiddenCategoriesCount} hidden category filter${hiddenCategoriesCount === 1 ? "" : "s"}.`
                  : "All categories are currently visible."
              }
              disabled={hiddenCategoriesCount === 0}
              label="Reveal hidden categories"
              onClick={onResetHiddenCategories}
            />
            <ActionRow
              description="Open the Messenger-style modal to simulate or log a new expense."
              label="Open log expense modal"
              onClick={onOpenLogModal}
            />
          </div>
        </section>
      ) : null}

      {showProfile ? (
        <section className="surface-panel card-entrance p-5 [animation-delay:300ms]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Connected profile
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
            Workspace context
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            This card keeps the active Messenger profile and the local workspace cache
            in view while you tune preferences.
          </p>

          <div className="mt-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {selectedUser ? getUserLabel(selectedUser) : "No Messenger user selected"}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {selectedUser
                ? "Live profile currently driving the analytics workspace."
                : "Send a message to your connected Page to create the first live profile."}
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <MetricTile
              label="Profiles observed"
              value={String(usersCount)}
              caption="Messenger users in local cache"
            />
            <MetricTile
              label="Cached expenses"
              value={String(expenseCount)}
              caption="Records already loaded into the app"
            />
            <MetricTile
              label="Hidden categories"
              value={String(hiddenCategoriesCount)}
              caption="Chart filters currently tucked away"
            />
            <MetricTile
              label="Theme mode"
              value={theme === "dark" ? "Dark" : "Light"}
              caption="Applies instantly across the dashboard"
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function buildMerchantRows(expenses: ExpenseResponse[], searchQuery: string): MerchantRow[] {
  const merchants = new Map<string, MerchantRow>();

  for (const expense of expenses) {
    const label = getTransactionTitle(expense);
    const key = `${label.toLowerCase()}::${expense.category}`;
    const existing = merchants.get(key);

    if (existing) {
      existing.count += 1;
      existing.total += toNumber(expense.amount);
      if (new Date(expense.occurred_at) > new Date(existing.latestAt)) {
        existing.latestAt = expense.occurred_at;
      }
      continue;
    }

    merchants.set(key, {
      id: key,
      label,
      category: expense.category,
      count: 1,
      latestAt: expense.occurred_at,
      total: toNumber(expense.amount),
    });
  }

  return Array.from(merchants.values())
    .filter((row) =>
      matchesWorkspaceQuery(searchQuery, [row.label, row.category, getCategoryLabel(row.category)]),
    )
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total;
      }
      return new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime();
    });
}

function buildCategoryCards(
  categoryData: AnalyticsByCategoryResponse | null,
  expenses: ExpenseResponse[],
  hiddenCategories: string[],
  searchQuery: string,
): CategoryCard[] {
  const total = (categoryData?.items ?? []).reduce(
    (sum, item) => sum + toNumber(item.total),
    0,
  );

  return (categoryData?.items ?? [])
    .map((item) => {
      const categoryExpenses = expenses.filter((expense) => expense.category === item.category);
      const lastExpense =
        categoryExpenses
          .slice()
          .sort(
            (left, right) =>
              new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime(),
          )[0] ?? null;
      const count = categoryExpenses.length;
      const itemTotal = toNumber(item.total);

      return {
        averageTicket: count > 0 ? itemTotal / count : 0,
        category: item.category,
        count,
        hidden: hiddenCategories.includes(item.category),
        lastExpense,
        share: total > 0 ? (itemTotal / total) * 100 : 0,
        total: itemTotal,
      };
    })
    .filter((item) =>
      matchesWorkspaceQuery(searchQuery, [
        item.category,
        getCategoryLabel(item.category),
        item.lastExpense?.note,
        item.lastExpense?.source_text,
      ]),
    );
}

function matchesWorkspaceQuery(
  query: string,
  values: Array<string | null | undefined>,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function MetricTile({
  caption,
  label,
  value,
}: {
  caption: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
        {label}
      </p>
      <p className="mt-3 text-xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {caption}
      </p>
    </div>
  );
}

function ThemeOption({
  active,
  description,
  label,
  onClick,
}: {
  active: boolean;
  description: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[24px] border px-4 py-4 text-left transition ${
        active
          ? "border-[var(--accent-primary)] bg-[var(--accent-soft)] shadow-[var(--shadow-soft)]"
          : "border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-[var(--border-strong)]"
      }`}
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </button>
  );
}

function ActionRow({
  description,
  disabled = false,
  label,
  onClick,
}: {
  description: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Run
      </button>
    </div>
  );
}

function InlineError({
  message,
  title,
}: {
  message: string | null;
  title: string;
}) {
  return (
    <div className="mt-6 rounded-[24px] border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-4 text-sm text-[var(--danger-text)]">
      <p className="font-medium">{title}</p>
      {message ? <p className="mt-1 text-[var(--text-tertiary)]">{message}</p> : null}
    </div>
  );
}

function DisabledMessage({ message }: { message: string }) {
  return (
    <div className="mt-6 rounded-[24px] border border-dashed border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 text-sm leading-6 text-[var(--text-tertiary)]">
      {message}
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-36 rounded-[22px] bg-[var(--skeleton-base)] skeleton-shimmer"
        />
      ))}
    </div>
  );
}

function ListSkeleton({ count }: { count: number }) {
  return (
    <div className="mt-6 space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-24 rounded-[22px] bg-[var(--skeleton-base)] skeleton-shimmer"
        />
      ))}
    </div>
  );
}
