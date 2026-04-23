"use client";

import { startTransition, useEffect, useState } from "react";

import { CategoryChart } from "@/components/category-chart";
import { DashboardHeader } from "@/components/dashboard-header";
import { RecentTransactions } from "@/components/recent-transactions";
import { SummaryCards } from "@/components/summary-cards";
import { UserSelector } from "@/components/user-selector";
import {
  type AnalyticsByCategoryResponse,
  type AnalyticsPeriod,
  type AnalyticsRecentResponse,
  type AnalyticsSummaryResponse,
  type UserListItem,
  fetchAnalyticsByCategory,
  fetchAnalyticsSummary,
  fetchRecentTransactions,
  fetchUsers,
  getErrorMessage,
} from "@/lib/api";

type DashboardPageProps = {
  apiBaseUrl: string;
};

type LoadStatus = "idle" | "loading" | "success" | "error";

const DASHBOARD_REFRESH_INTERVAL_MS = 3_000;

type RefreshOptions = {
  showLoading?: boolean;
};

export function DashboardPage({ apiBaseUrl }: DashboardPageProps) {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersStatus, setUsersStatus] = useState<LoadStatus>("loading");
  const [usersError, setUsersError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [categoryPeriod, setCategoryPeriod] =
    useState<AnalyticsPeriod>("month");

  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [recent, setRecent] = useState<AnalyticsRecentResponse | null>(null);
  const [detailsStatus, setDetailsStatus] = useState<LoadStatus>("idle");
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [categoryData, setCategoryData] =
    useState<AnalyticsByCategoryResponse | null>(null);
  const [categoryStatus, setCategoryStatus] = useState<LoadStatus>("idle");
  const [categoryError, setCategoryError] = useState<string | null>(null);

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
      setRecent(null);
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
        setRecent(null);
      }
      setDetailsError(null);

      try {
        const [nextSummary, nextRecent] = await Promise.all([
          fetchAnalyticsSummary(currentUserId, controller.signal),
          fetchRecentTransactions(currentUserId, 8, controller.signal),
        ]);

        setSummary(nextSummary);
        setRecent(nextRecent);
        setDetailsStatus("success");
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
  }, [selectedUserId]);

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
          categoryPeriod,
          controller.signal,
        );
        setCategoryData(nextCategoryData);
        setCategoryStatus("success");
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
  }, [selectedUserId, categoryPeriod]);

  const hasUsers = users.length > 0;

  return (
    <main className="min-h-screen px-4 py-8 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <DashboardHeader
          apiBaseUrl={apiBaseUrl}
          refreshIntervalSeconds={DASHBOARD_REFRESH_INTERVAL_MS / 1_000}
        />

        <section className="rounded-3xl border border-slate-800/80 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/30 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-cyan-300">
                Dashboard
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Spending overview
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Choose a Messenger user to inspect their recent spending totals,
                category mix, and latest transactions.
              </p>
            </div>

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
          </div>

          {usersStatus === "error" ? (
            <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
              <p className="font-medium">Could not load Messenger users.</p>
              <p className="mt-1 text-rose-100/80">{usersError}</p>
            </div>
          ) : null}

          {usersStatus === "success" && !hasUsers ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-300">
              <p className="font-medium text-white">No Messenger users yet</p>
              <p className="mt-2 max-w-2xl leading-6">
                Spendly has not received any Messenger users yet. Send a test
                message to your Page, or seed the backend with a user before
                opening the dashboard again.
              </p>
            </div>
          ) : null}
        </section>

        <SummaryCards
          summary={summary}
          isLoading={detailsStatus === "loading"}
          error={detailsStatus === "error" ? detailsError : null}
          isDisabled={!hasUsers}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <CategoryChart
            categoryData={categoryData}
            period={categoryPeriod}
            onPeriodChange={(nextPeriod) => {
              startTransition(() => {
                setCategoryPeriod(nextPeriod);
              });
            }}
            isLoading={categoryStatus === "loading"}
            error={categoryStatus === "error" ? categoryError : null}
            isDisabled={!hasUsers}
          />

          <RecentTransactions
            recent={recent}
            isLoading={detailsStatus === "loading"}
            error={detailsStatus === "error" ? detailsError : null}
            isDisabled={!hasUsers}
          />
        </div>
      </div>
    </main>
  );
}
