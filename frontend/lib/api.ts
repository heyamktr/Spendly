export type MoneyValue = number | string;

export type AnalyticsPeriod = "day" | "week" | "month";

export type UserListItem = {
  id: number;
  display_name: string | null;
  messenger_psid: string;
  created_at: string;
};

export type ExpenseResponse = {
  id: number;
  user_id: number;
  amount: MoneyValue;
  currency: string;
  category: string;
  note: string | null;
  source_text: string;
  occurred_at: string;
  created_at: string;
};

export type ExpenseCreateInput = {
  user_id: number;
  amount: MoneyValue;
  currency?: string;
  category: string;
  note?: string | null;
  source_text?: string | null;
  occurred_at?: string | null;
};

export type ExpenseUpdateInput = {
  amount?: MoneyValue;
  currency?: string;
  category?: string;
  note?: string | null;
  occurred_at?: string;
};

export type AnalyticsSummaryResponse = {
  user_id: number;
  currency: string;
  day_total: MoneyValue;
  week_total: MoneyValue;
  month_total: MoneyValue;
};

export type AnalyticsCategoryItem = {
  category: string;
  total: MoneyValue;
};

export type AnalyticsByCategoryResponse = {
  user_id: number;
  period: AnalyticsPeriod;
  currency: string;
  items: AnalyticsCategoryItem[];
};

export type AnalyticsRecentResponse = {
  user_id: number;
  items: ExpenseResponse[];
};

export type ReceiptScanResponse = {
  success: boolean;
  amount: MoneyValue | null;
  currency: string;
  category: string | null;
  note: string | null;
  source_text: string | null;
  confidence: "high" | "medium" | null;
  reason: string | null;
  ocr_text: string | null;
};

const DEFAULT_API_BASE_URL = "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(
    /\/$/,
    "",
  );
}

export async function fetchUsers(
  signal?: AbortSignal,
): Promise<UserListItem[]> {
  return fetchJson<UserListItem[]>("/api/users", { signal });
}

export async function fetchAnalyticsSummary(
  userId: number,
  signal?: AbortSignal,
): Promise<AnalyticsSummaryResponse> {
  return fetchJson<AnalyticsSummaryResponse>(
    `/api/analytics/summary${buildQuery({ user_id: userId })}`,
    { signal },
  );
}

export async function fetchAnalyticsByCategory(
  userId: number,
  period: AnalyticsPeriod,
  signal?: AbortSignal,
): Promise<AnalyticsByCategoryResponse> {
  return fetchJson<AnalyticsByCategoryResponse>(
    `/api/analytics/by-category${buildQuery({ user_id: userId, period })}`,
    { signal },
  );
}

export async function fetchRecentTransactions(
  userId: number,
  limit = 8,
  signal?: AbortSignal,
): Promise<AnalyticsRecentResponse> {
  return fetchJson<AnalyticsRecentResponse>(
    `/api/analytics/recent${buildQuery({ user_id: userId, limit })}`,
    { signal },
  );
}

export async function fetchExpenses(
  userId: number,
  limit = 40,
  offset = 0,
  signal?: AbortSignal,
): Promise<ExpenseResponse[]> {
  return fetchJson<ExpenseResponse[]>(
    `/api/expenses${buildQuery({ user_id: userId, limit, offset })}`,
    { signal },
  );
}

export async function createExpense(
  expense: ExpenseCreateInput,
): Promise<ExpenseResponse> {
  return fetchJson<ExpenseResponse>("/api/expenses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(expense),
  });
}

export async function scanReceiptExpense(payload: {
  user_id: number;
  file_name: string;
  content_type?: string | null;
  image_base64: string;
}): Promise<ReceiptScanResponse> {
  return fetchJson<ReceiptScanResponse>("/api/expenses/scan-receipt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function updateExpense(
  expenseId: number,
  expense: ExpenseUpdateInput,
): Promise<ExpenseResponse> {
  return fetchJson<ExpenseResponse>(`/api/expenses/${expenseId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(expense),
  });
}

export async function deleteExpense(expenseId: number): Promise<void> {
  await fetchJson<null>(`/api/expenses/${expenseId}`, {
    method: "DELETE",
  });
}

export function toNumber(value: MoneyValue): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value: MoneyValue, currency = "USD"): string {
  const amount = toNumber(value);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getUserLabel(user: UserListItem): string {
  const displayName = user.display_name?.trim();
  return displayName ? `${displayName} (${user.messenger_psid})` : user.messenger_psid;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong while loading dashboard data.";
}

async function fetchJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  const response = await fetch(new URL(path, `${getApiBaseUrl()}/`), {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await readErrorMessage(response), response.status);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();

  try {
    const payload = JSON.parse(text) as { detail?: unknown };
    if (typeof payload.detail === "string" && payload.detail) {
      return payload.detail;
    }
  } catch {
    // Fall through to raw text.
  }

  return text || `Request failed with status ${response.status}`;
}

function buildQuery(
  params: Record<string, string | number | undefined>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}
