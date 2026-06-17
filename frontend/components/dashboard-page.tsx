"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { CategoryChart } from "@/components/category-chart";
import { DashboardHeader } from "@/components/dashboard-header";
import { DateWindowControls } from "@/components/date-window-controls";
import { EditExpenseModal } from "@/components/edit-expense-modal";
import { InsightsPanel } from "@/components/insights-panel";
import { LogExpenseModal } from "@/components/log-expense-modal";
import { ReceiptScanModal } from "@/components/receipt-scan-modal";
import { RecentTransactions } from "@/components/recent-transactions";
import { SpendlySidebar, type AppSection } from "@/components/spendly-sidebar";
import { SummaryCards } from "@/components/summary-cards";
import { UserSelector } from "@/components/user-selector";
import {
  AnalyticsWorkspace,
  CategoriesWorkspace,
  SettingsWorkspace,
} from "@/components/workspace-sections";
import {
  createExpense,
  deleteExpense,
  fetchAnalyticsByCategory,
  fetchAnalyticsSummary,
  fetchExpenses,
  fetchUsers,
  exportExpensesCsv,
  getErrorMessage,
  scanReceiptExpense,
  updateExpense,
  type AnalyticsByCategoryResponse,
  type AnalyticsPeriod,
  type AnalyticsSummaryResponse,
  type ExpenseResponse,
  type ReceiptScanResponse,
  type UserListItem,
} from "@/lib/api";
import {
  buildDashboardStats,
  buildCategoryDataFromExpenses,
  buildCategoryOptions,
  buildInsights,
  filterExpensesForDateWindow,
  getDefaultCustomDateRange,
  groupTransactionsByDate,
  normalizeCategoryInput,
  parseExpenseDraft,
  resolveDateWindow,
  type CustomDateRange,
  type DateWindowMode,
  type ThemeMode,
} from "@/lib/dashboard";
import { PlusIcon, ReceiptIcon } from "@/components/icons";
import { MobileNav } from "@/components/mobile-nav";

type DashboardPageProps = {
  apiBaseUrl: string;
};

type LoadStatus = "idle" | "loading" | "success" | "error";

const DASHBOARD_REFRESH_INTERVAL_MS = 3_000;

type RefreshOptions = {
  showLoading?: boolean;
};

const SECTION_TITLES: Record<AppSection, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  categories: "Categories",
  settings: "Settings",
};

const SECTION_SEARCH_PLACEHOLDERS: Record<AppSection, string> = {
  dashboard: "Search merchants, notes, categories",
  analytics: "Search merchants and spend signals",
  categories: "Search categories and recent activity",
  settings: "Search settings and workspace actions",
};

export function DashboardPage({ apiBaseUrl }: DashboardPageProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersStatus, setUsersStatus] = useState<LoadStatus>("loading");
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const [activePeriod, setActivePeriod] = useState<AnalyticsPeriod>("month");
  const [dateWindowMode, setDateWindowMode] = useState<DateWindowMode>("month");
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>(() =>
    getDefaultCustomDateRange(new Date()),
  );
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseResponse[]>([]);
  const [detailsStatus, setDetailsStatus] = useState<LoadStatus>("idle");
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [categoryData, setCategoryData] =
    useState<AnalyticsByCategoryResponse | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<LoadStatus>("idle");
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [hiddenCategories, setHiddenCategories] = useState<string[]>([]);

  const [activeSection, setActiveSection] = useState<AppSection>("dashboard");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | null>(null);
  const [busyExpenseId, setBusyExpenseId] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [manualRefreshVersion, setManualRefreshVersion] = useState(0);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [hasLoadedCustomCategories, setHasLoadedCustomCategories] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const deferredSearchQuery = useDeferredValue(searchQuery);
  const now = new Date();

  useEffect(() => {
    const storedTheme =
      typeof window !== "undefined" ? window.localStorage.getItem("spendly-theme") : null;

    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
      return;
    }

    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: light)").matches
    ) {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("spendly-theme", theme);
  }, [theme]);

  useEffect(() => {
    const storedCategories = window.localStorage.getItem("spendly-custom-categories");
    if (storedCategories) {
      try {
        const parsedCategories = JSON.parse(storedCategories) as unknown;
        if (Array.isArray(parsedCategories)) {
          setCustomCategories(
            parsedCategories
              .filter((category): category is string => typeof category === "string")
              .map(normalizeCategoryInput)
              .filter(Boolean),
          );
        }
      } catch {
        setCustomCategories([]);
      }
    }

    setHasLoadedCustomCategories(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedCustomCategories) {
      return;
    }

    window.localStorage.setItem(
      "spendly-custom-categories",
      JSON.stringify(customCategories),
    );
  }, [customCategories, hasLoadedCustomCategories]);

  useEffect(() => {
    if (!successToast) {
      return;
    }

    const timeoutId = window.setTimeout(() => setSuccessToast(null), 2600);
    return () => window.clearTimeout(timeoutId);
  }, [successToast]);

  useEffect(() => {
    const controller = new AbortController();
    let isRefreshing = false;

    async function loadUsers({ showLoading = false }: RefreshOptions = {}) {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;
      if (showLoading) {
        setUsersStatus("loading");
      }
      setUsersError(null);

      try {
        const nextUsers = await fetchUsers(controller.signal);
        setUsers(nextUsers);
        setUsersStatus("success");
        setLastSyncedAt(new Date().toISOString());
        setSelectedUserId((currentUserId) => {
          if (nextUsers.length === 0) {
            return null;
          }
          if (
            currentUserId !== null &&
            nextUsers.some((user) => user.id === currentUserId)
          ) {
            return currentUserId;
          }
          return nextUsers[0].id;
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        if (showLoading) {
          setUsers([]);
          setSelectedUserId(null);
        }
        setUsersStatus("error");
        setUsersError(getErrorMessage(error));
      } finally {
        isRefreshing = false;
      }
    }

    void loadUsers({ showLoading: true });
    const intervalId = window.setInterval(() => {
      void loadUsers();
    }, DASHBOARD_REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (selectedUserId === null) {
      setSummary(null);
      setExpenses([]);
      setDetailsStatus("idle");
      setDetailsError(null);
      return;
    }

    const currentUserId = selectedUserId;
    const controller = new AbortController();
    let isRefreshing = false;

    async function loadDetails({ showLoading = false }: RefreshOptions = {}) {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;
      if (showLoading) {
        setDetailsStatus("loading");
        setSummary(null);
        setExpenses([]);
      }
      setDetailsError(null);

      try {
        const [nextSummary, nextExpenses] = await Promise.all([
          fetchAnalyticsSummary(currentUserId, controller.signal),
          fetchExpenses(currentUserId, 100, 0, controller.signal),
        ]);

        setSummary(nextSummary);
        setExpenses(nextExpenses);
        setDetailsStatus("success");
        setLastSyncedAt(new Date().toISOString());
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setDetailsStatus("error");
        setDetailsError(getErrorMessage(error));
      } finally {
        isRefreshing = false;
      }
    }

    void loadDetails({ showLoading: true });
    const intervalId = window.setInterval(() => {
      void loadDetails();
    }, DASHBOARD_REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [selectedUserId, manualRefreshVersion]);

  useEffect(() => {
    if (selectedUserId === null) {
      setCategoryData(null);
      setCategoryStatus("idle");
      setCategoryError(null);
      return;
    }

    const currentUserId = selectedUserId;
    const controller = new AbortController();
    let isRefreshing = false;

    async function loadCategoryData({ showLoading = false }: RefreshOptions = {}) {
      if (isRefreshing) {
        return;
      }

      isRefreshing = true;
      if (showLoading) {
        setCategoryStatus("loading");
        setCategoryData(null);
      }
      setCategoryError(null);

      try {
        const nextCategoryData = await fetchAnalyticsByCategory(
          currentUserId,
          activePeriod,
          controller.signal,
        );
        setCategoryData(nextCategoryData);
        setCategoryStatus("success");
        setLastSyncedAt(new Date().toISOString());
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setCategoryStatus("error");
        setCategoryError(getErrorMessage(error));
      } finally {
        isRefreshing = false;
      }
    }

    void loadCategoryData({ showLoading: true });
    const intervalId = window.setInterval(() => {
      void loadCategoryData();
    }, DASHBOARD_REFRESH_INTERVAL_MS);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
    };
  }, [selectedUserId, activePeriod, manualRefreshVersion]);

  useEffect(() => {
    if (!categoryData) {
      return;
    }

    setHiddenCategories((current) =>
      current.filter((category) =>
        categoryData.items.some((item) => item.category === category),
      ),
    );
  }, [categoryData]);

  const selectedUser =
    users.find((user) => user.id === selectedUserId) ?? null;
  const hasUsers = users.length > 0;
  const stats = buildDashboardStats(summary, expenses, now);
  const dateWindow = resolveDateWindow({
    customRange: customDateRange,
    mode: dateWindowMode,
    now,
    period: activePeriod,
  });
  const currentPeriodExpenses = filterExpensesForDateWindow(expenses, dateWindow, "");
  const filteredExpenses = filterExpensesForDateWindow(
    expenses,
    dateWindow,
    deferredSearchQuery,
  );
  const groupedTransactions = groupTransactionsByDate(filteredExpenses);
  const currency =
    summary?.currency ?? categoryData?.currency ?? expenses[0]?.currency ?? "USD";
  const displayCategoryData =
    dateWindowMode === "custom" && selectedUserId !== null
      ? buildCategoryDataFromExpenses({
          currency,
          expenses: currentPeriodExpenses,
          period: activePeriod,
          userId: selectedUserId,
        })
      : categoryData;
  const insights = buildInsights(
    summary,
    displayCategoryData,
    expenses,
    dateWindowMode === "custom" ? "month" : activePeriod,
    now,
  );
  const categoryOptions = buildCategoryOptions({
    customCategories,
    observedCategories: [
      ...expenses.map((expense) => expense.category),
      ...(categoryData?.items.map((item) => item.category) ?? []),
    ],
  });
  const pageTitle = SECTION_TITLES[activeSection];
  const pageDescription = getPageDescription(activeSection, selectedUser);
  const searchPlaceholder = SECTION_SEARCH_PLACEHOLDERS[activeSection];

  async function handleLogExpense(message: string, selectedCategory: string) {
    if (selectedUserId === null) {
      throw new Error("Select a Messenger user before logging an expense.");
    }

    const preview = parseExpenseDraft(
      message,
      categoryOptions.map((option) => option.value),
    );
    if (!preview.success || preview.amount === null || preview.category === null) {
      throw new Error(preview.reason ?? "Spendly could not parse that message.");
    }
    const category = normalizeCategoryInput(selectedCategory) || preview.category;

    await createExpense({
      user_id: selectedUserId,
      amount: preview.amount,
      currency: "USD",
      category,
      note: preview.note,
      source_text: message,
      occurred_at: new Date().toISOString(),
    });

    setSuccessToast(`Logged "${message}" for ${selectedUser?.display_name?.trim() || selectedUser?.messenger_psid || "the selected user"}.`);
    setManualRefreshVersion((current) => current + 1);
  }

  async function handleExportCsv() {
    if (selectedUserId === null) {
      setSuccessToast("Select a Messenger user before exporting CSV.");
      return;
    }

    setIsExportingCsv(true);

    try {
      const { blob, fileName } = await exportExpensesCsv(selectedUserId);
      downloadBlob(blob, fileName);
      setSuccessToast(`Exported ${fileName}.`);
    } catch (error) {
      setSuccessToast(`Could not export CSV: ${getErrorMessage(error)}`);
    } finally {
      setIsExportingCsv(false);
    }
  }

  async function handleAnalyzeReceipt(file: File): Promise<ReceiptScanResponse> {
    if (selectedUserId === null) {
      throw new Error("Select a Messenger user before scanning a receipt.");
    }

    const imageBase64 = await readFileAsDataUrl(file);
    return scanReceiptExpense({
      user_id: selectedUserId,
      file_name: file.name,
      content_type: file.type || null,
      image_base64: imageBase64,
    });
  }

  async function handleSaveReceiptExpense(payload: {
    amount: number;
    category: string;
    note: string | null;
    source_text: string | null;
  }) {
    if (selectedUserId === null) {
      throw new Error("Select a Messenger user before saving a receipt expense.");
    }

    await createExpense({
      user_id: selectedUserId,
      amount: payload.amount,
      currency: "USD",
      category: payload.category,
      note: payload.note,
      source_text: payload.source_text,
      occurred_at: new Date().toISOString(),
    });

    setSuccessToast(
      `Logged receipt${payload.note ? ` from "${payload.note}"` : ""} for ${
        selectedUser?.display_name?.trim() || selectedUser?.messenger_psid || "the selected user"
      }.`,
    );
    setManualRefreshVersion((current) => current + 1);
  }

  async function handleUpdateExpense(
    expenseId: number,
    payload: {
      amount?: string | number;
      currency?: string;
      category?: string;
      note?: string | null;
      occurred_at?: string;
    },
  ) {
    setBusyExpenseId(expenseId);

    try {
      await updateExpense(expenseId, payload);
      setSuccessToast("Expense updated.");
      setManualRefreshVersion((current) => current + 1);
    } finally {
      setBusyExpenseId(null);
    }
  }

  async function handleDeleteExpense(expense: ExpenseResponse) {
    setBusyExpenseId(expense.id);

    try {
      await deleteExpense(expense.id);
      setSuccessToast("Expense deleted.");
      setManualRefreshVersion((current) => current + 1);
    } finally {
      setBusyExpenseId(null);
    }
  }

  function handleSelectPeriod(nextPeriod: AnalyticsPeriod) {
    startTransition(() => {
      setActivePeriod(nextPeriod);
      setDateWindowMode(nextPeriod);
    });
  }

  function handleSelectDateWindowMode(nextMode: DateWindowMode) {
    startTransition(() => {
      setDateWindowMode(nextMode);
    });
  }

  function handleSelectSection(nextSection: AppSection) {
    startTransition(() => {
      setActiveSection(nextSection);
    });
  }

  function handleRefreshNow() {
    setManualRefreshVersion((current) => current + 1);
  }

  function handleResetHiddenCategories() {
    setHiddenCategories([]);
  }

  function handleAddCustomCategory(value: string) {
    const normalized = normalizeCategoryInput(value);
    if (!normalized) {
      return;
    }

    setCustomCategories((current) =>
      current.includes(normalized) ? current : [...current, normalized],
    );
    setSuccessToast(`Added ${getCategoryLabelForToast(normalized)} category.`);
  }

  function handleDeleteCustomCategory(category: string) {
    const normalized = normalizeCategoryInput(category);
    setCustomCategories((current) => current.filter((item) => item !== normalized));
    setSuccessToast(`Removed ${getCategoryLabelForToast(normalized)} from custom categories.`);
  }

  let sectionContent: ReactNode;

  if (activeSection === "dashboard") {
    sectionContent = (
      <>
        <SummaryCards
          stats={stats}
          activePeriod={dateWindowMode}
          currency={currency}
          isLoading={detailsStatus === "loading"}
          error={detailsStatus === "error" ? detailsError : null}
          isDisabled={!hasUsers}
          onSelectPeriod={handleSelectPeriod}
        />

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
          isDisabled={!hasUsers}
        />

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <CategoryChart
            categoryData={displayCategoryData}
            period={dateWindowMode}
            periodLabel={dateWindow.label}
            onPeriodChange={handleSelectPeriod}
            isLoading={categoryStatus === "loading"}
            error={categoryStatus === "error" ? categoryError : null}
            isDisabled={!hasUsers}
            hiddenCategories={hiddenCategories}
            onToggleCategory={(category) => {
              setHiddenCategories((current) =>
                current.includes(category)
                  ? current.filter((item) => item !== category)
                  : [...current, category],
              );
            }}
          />

          <RecentTransactions
            groups={groupedTransactions}
            isLoading={detailsStatus === "loading"}
            error={detailsStatus === "error" ? detailsError : null}
            isDisabled={!hasUsers}
            period={dateWindowMode}
            periodLabel={dateWindow.label}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            busyExpenseId={busyExpenseId}
            onEditExpense={setEditingExpense}
            onDeleteExpense={(expense) => {
              void handleDeleteExpense(expense);
            }}
            onLogExpense={() => setIsLogModalOpen(true)}
          />
        </div>
      </>
    );
  } else if (activeSection === "analytics") {
    sectionContent = (
      <AnalyticsWorkspace
        activePeriod={activePeriod}
        dateWindowLabel={dateWindow.label}
        dateWindowMode={dateWindowMode}
        categoryData={displayCategoryData}
        categoryError={categoryStatus === "error" ? categoryError : null}
        categoryStatus={categoryStatus}
        currency={currency}
        currentPeriodExpenses={currentPeriodExpenses}
        detailsError={detailsStatus === "error" ? detailsError : null}
        detailsStatus={detailsStatus}
        hiddenCategories={hiddenCategories}
        insights={insights}
        isDisabled={!hasUsers}
        onSelectPeriod={handleSelectPeriod}
        onToggleCategory={(category) => {
          setHiddenCategories((current) =>
            current.includes(category)
              ? current.filter((item) => item !== category)
              : [...current, category],
          );
        }}
        searchQuery={searchQuery}
        stats={stats}
      />
    );
  } else if (activeSection === "categories") {
    sectionContent = (
      <CategoriesWorkspace
        activePeriod={activePeriod}
        dateWindowLabel={dateWindow.label}
        dateWindowMode={dateWindowMode}
        categoryData={displayCategoryData}
        categoryError={categoryStatus === "error" ? categoryError : null}
        categoryStatus={categoryStatus}
        categoryOptions={categoryOptions}
        customCategories={customCategories}
        currentPeriodExpenses={currentPeriodExpenses}
        hiddenCategories={hiddenCategories}
        isDisabled={!hasUsers}
        onAddCustomCategory={handleAddCustomCategory}
        onDeleteCustomCategory={handleDeleteCustomCategory}
        onResetHiddenCategories={handleResetHiddenCategories}
        onSelectPeriod={handleSelectPeriod}
        onToggleCategory={(category) => {
          setHiddenCategories((current) =>
            current.includes(category)
              ? current.filter((item) => item !== category)
              : [...current, category],
          );
        }}
        searchQuery={searchQuery}
      />
    );
  } else {
    sectionContent = (
      <SettingsWorkspace
        activePeriod={activePeriod}
        apiBaseUrl={apiBaseUrl}
        currency={currency}
        expenseCount={expenses.length}
        hiddenCategoriesCount={hiddenCategories.length}
        lastSyncedAt={lastSyncedAt}
        isExportingCsv={isExportingCsv}
        onClearSearch={() => setSearchQuery("")}
        onExportCsv={() => void handleExportCsv()}
        onOpenLogModal={() => setIsLogModalOpen(true)}
        onRefreshNow={handleRefreshNow}
        onResetHiddenCategories={handleResetHiddenCategories}
        onSelectTheme={setTheme}
        onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
        refreshIntervalSeconds={DASHBOARD_REFRESH_INTERVAL_MS / 1_000}
        searchQuery={searchQuery}
        selectedUser={selectedUser}
        sidebarCollapsed={sidebarCollapsed}
        theme={theme}
        usersCount={users.length}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="grain-layer pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10 flex min-h-screen">
        <SpendlySidebar
          activeSection={activeSection}
          collapsed={sidebarCollapsed}
          onSelectSection={handleSelectSection}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
          selectedUser={selectedUser}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <DashboardHeader
            pageDescription={pageDescription}
            pageTitle={pageTitle}
            refreshIntervalSeconds={DASHBOARD_REFRESH_INTERVAL_MS / 1_000}
            searchQuery={searchQuery}
            searchPlaceholder={searchPlaceholder}
            onSearchQueryChange={setSearchQuery}
            theme={theme}
            onToggleTheme={() =>
              setTheme((currentTheme) =>
                currentTheme === "dark" ? "light" : "dark",
              )
            }
            onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
          />

          <main className="flex-1 px-4 pb-40 pt-6 md:px-8 xl:pb-24">
            <div className="mx-auto flex max-w-[1480px] flex-col gap-6">
              <UserSelector
                users={users}
                selectedUserId={selectedUserId}
                onChange={(nextUserId) => {
                  startTransition(() => {
                    setSelectedUserId(nextUserId);
                  });
                }}
                isLoading={usersStatus === "loading"}
                isDisabled={!hasUsers}
              />

              <DateWindowControls
                customRange={customDateRange}
                disabled={!hasUsers}
                mode={dateWindowMode}
                windowLabel={dateWindow.label}
                onCustomRangeChange={setCustomDateRange}
                onModeChange={handleSelectDateWindowMode}
                onPeriodChange={handleSelectPeriod}
              />

              {usersStatus === "error" ? (
                <section className="surface-panel p-5 text-sm text-[var(--danger-text)]">
                  <p className="font-medium">Could not load Messenger users.</p>
                  <p className="mt-2 text-[var(--text-tertiary)]">{usersError}</p>
                </section>
              ) : null}

              {usersStatus === "success" && !hasUsers ? (
                <section className="surface-panel p-8 text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
                    Empty workspace
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    No Messenger users have landed yet
                  </h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                    Send a test message to your connected Facebook Page and Spendly
                    will create the first profile automatically.
                  </p>
                </section>
              ) : null}

              {sectionContent}
            </div>
          </main>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setIsReceiptModalOpen(true)}
          className="flex h-14 items-center gap-3 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-5 text-sm font-semibold text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[var(--accent-primary)]">
            <ReceiptIcon className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline">Scan receipt</span>
        </button>

        <button
          type="button"
          onClick={() => setIsLogModalOpen(true)}
          className="flex h-16 items-center gap-3 rounded-full bg-[var(--accent-primary)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-strong)] transition hover:-translate-y-0.5 hover:brightness-105"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/16">
            <PlusIcon className="h-5 w-5" />
          </span>
          <span className="hidden sm:inline">Log expense</span>
        </button>
      </div>

      {successToast ? (
        <div className="fixed bottom-40 right-6 z-40 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-soft)]">
          {successToast}
        </div>
      ) : null}

      <LogExpenseModal
        categoryOptions={categoryOptions}
        isOpen={isLogModalOpen}
        selectedUserLabel={
          selectedUser?.display_name?.trim() || selectedUser?.messenger_psid || null
        }
        onClose={() => setIsLogModalOpen(false)}
        onSubmit={handleLogExpense}
      />

      <ReceiptScanModal
        categoryOptions={categoryOptions}
        isOpen={isReceiptModalOpen}
        selectedUserLabel={
          selectedUser?.display_name?.trim() || selectedUser?.messenger_psid || null
        }
        onAnalyze={handleAnalyzeReceipt}
        onClose={() => setIsReceiptModalOpen(false)}
        onSubmit={handleSaveReceiptExpense}
      />

      <EditExpenseModal
        categoryOptions={categoryOptions}
        expense={editingExpense}
        isOpen={editingExpense !== null}
        onClose={() => {
          if (busyExpenseId === editingExpense?.id) {
            return;
          }
          setEditingExpense(null);
        }}
        onSubmit={async (expenseId, payload) => {
          await handleUpdateExpense(expenseId, payload);
          setEditingExpense(null);
        }}
      />

      <MobileNav activeSection={activeSection} onSelectSection={handleSelectSection} />
    </div>
  );
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function getCategoryLabelForToast(category: string): string {
  return category
    .split(/([\s_-]+)/)
    .map((part) =>
      /^[\s_-]+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}

function getPageDescription(
  section: AppSection,
  selectedUser: UserListItem | null,
): string {
  const selectedUserLabel =
    selectedUser?.display_name?.trim() || selectedUser?.messenger_psid || null;

  if (section === "dashboard") {
    return selectedUserLabel
      ? `Tracking live Messenger activity for ${selectedUserLabel}.`
      : "Choose a Messenger user to drill into live expense activity.";
  }

  if (section === "analytics") {
    return selectedUserLabel
      ? `Comparing spend velocity, category mix, and merchant concentration for ${selectedUserLabel}.`
      : "Choose a Messenger user to unlock spend analysis and period signals.";
  }

  if (section === "categories") {
    return selectedUserLabel
      ? `Inspecting how ${selectedUserLabel} allocates spend across categories and filters.`
      : "Choose a Messenger user to inspect category allocation and filter behavior.";
  }

  return selectedUserLabel
    ? `Managing workspace preferences and live sync details for ${selectedUserLabel}.`
    : "Tune workspace preferences, sync behavior, and layout controls.";
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string" && reader.result) {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read that receipt image."));
    };

    reader.onerror = () => {
      reject(new Error("Could not read that receipt image."));
    };

    reader.readAsDataURL(file);
  });
}
