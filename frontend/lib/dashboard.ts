import {
  type AnalyticsByCategoryResponse,
  type AnalyticsPeriod,
  type AnalyticsSummaryResponse,
  type ExpenseResponse,
  type MoneyValue,
} from "@/lib/api";

export type ThemeMode = "light" | "dark";

export type InsightTone = "positive" | "warning" | "danger";

export type StatTone = "positive" | "warning" | "danger" | "neutral";

export type DashboardStat = {
  period: AnalyticsPeriod;
  label: string;
  amount: number;
  comparisonLabel: string;
  tone: StatTone;
  toneLabel: string;
  sparkline: number[];
};

export type InsightItem = {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
};

export type TransactionGroup = {
  id: string;
  label: string;
  items: ExpenseResponse[];
};

export type ParsedExpenseDraft = {
  success: boolean;
  amount: number | null;
  category: string | null;
  note: string | null;
  reason: string | null;
};

export const EXPENSE_CATEGORIES = [
  "food",
  "transport",
  "groceries",
  "shopping",
  "entertainment",
  "bills",
  "health",
  "education",
  "travel",
  "other",
] as const;

type PeriodRange = {
  currentStart: Date;
  previousStart: Date;
  currentLabel: string;
  previousLabel: string;
};

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
};

const CATEGORY_EMOJI: Record<string, string> = {
  bills: "\u{1F9FE}",
  education: "\u{1F4DA}",
  entertainment: "\u{1F3AC}",
  food: "\u{1F37D}\u{FE0F}",
  groceries: "\u{1F6D2}",
  health: "\u{1FA7A}",
  other: "\u{1F4B3}",
  shopping: "\u{1F6CD}\u{FE0F}",
  transport: "\u{1F695}",
  travel: "\u{2708}\u{FE0F}",
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    "coffee",
    "breakfast",
    "lunch",
    "dinner",
    "food",
    "meal",
    "restaurant",
    "cafe",
    "snack",
    "tea",
    "pizza",
    "burger",
    "sushi",
  ],
  transport: [
    "uber",
    "lyft",
    "taxi",
    "bus",
    "train",
    "metro",
    "subway",
    "parking",
    "commute",
    "gas",
    "fuel",
  ],
  groceries: ["grocery", "groceries", "supermarket", "market", "produce"],
  shopping: ["shopping", "shop", "clothes", "clothing", "shoes", "amazon", "store"],
  entertainment: ["movie", "cinema", "netflix", "spotify", "game", "concert", "show"],
  bills: ["bill", "bills", "rent", "internet", "phone", "electricity", "water", "utility"],
  health: ["doctor", "dentist", "hospital", "pharmacy", "medicine", "medical", "gym"],
  education: ["tuition", "book", "books", "course", "class", "school", "education"],
  travel: ["flight", "hotel", "trip", "travel", "airbnb", "vacation"],
};

const AMOUNT_PATTERN = /(?:^|[^\w])(?:\$)?(\d+(?:\.\d+)?)(?!\w)/;

export function buildDashboardStats(
  summary: AnalyticsSummaryResponse | null,
  expenses: ExpenseResponse[],
  now: Date,
): DashboardStat[] {
  const currentTotals: Record<AnalyticsPeriod, number> = {
    day: toNumber(summary?.day_total ?? 0),
    week: toNumber(summary?.week_total ?? 0),
    month: toNumber(summary?.month_total ?? 0),
  };

  return (Object.keys(PERIOD_LABELS) as AnalyticsPeriod[]).map((period) => {
    const range = getPeriodRange(period, now);
    const previousTotal = sumExpensesWithin(expenses, range.previousStart, range.currentStart);
    const changePercent =
      previousTotal > 0
        ? ((currentTotals[period] - previousTotal) / previousTotal) * 100
        : null;

    return {
      period,
      label: PERIOD_LABELS[period],
      amount: currentTotals[period],
      comparisonLabel: buildComparisonLabel(changePercent, range.previousLabel),
      tone: resolveStatTone(currentTotals[period], previousTotal, changePercent),
      toneLabel: resolveStatToneLabel(currentTotals[period], previousTotal, changePercent),
      sparkline: buildSparkline(period, expenses, now),
    };
  });
}

export function buildInsights(
  summary: AnalyticsSummaryResponse | null,
  categoryData: AnalyticsByCategoryResponse | null,
  expenses: ExpenseResponse[],
  period: AnalyticsPeriod,
  now: Date,
): InsightItem[] {
  const range = getPeriodRange(period, now);
  const currentExpenses = filterExpensesForRange(expenses, range.currentStart, now);
  const previousExpenses = filterExpensesForRange(
    expenses,
    range.previousStart,
    range.currentStart,
  );
  const currentTotal = getSummaryAmount(summary, period);
  const previousTotal = sumExpensesWithin(expenses, range.previousStart, range.currentStart);

  const insights: InsightItem[] = [];

  const totalChange =
    previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null;
  if (totalChange !== null) {
    const rounded = Math.round(Math.abs(totalChange));
    if (totalChange > 12) {
      insights.push({
        id: "pace-up",
        tone: totalChange > 30 ? "danger" : "warning",
        title: `Spending is up ${rounded}% ${range.currentLabel.toLowerCase()}`,
        body: `You have logged ${rounded}% more than ${range.previousLabel.toLowerCase()}, so this window is pacing hotter than usual.`,
      });
    } else if (totalChange < -8) {
      insights.push({
        id: "pace-down",
        tone: "positive",
        title: `You are ${rounded}% under your prior pace`,
        body: `Spendly is tracking lighter spend than ${range.previousLabel.toLowerCase()}, which is a healthy budget signal.`,
      });
    }
  }

  const todayRange = getPeriodRange("day", now);
  const todayExpenses = filterExpensesForRange(expenses, todayRange.currentStart, now);
  const biggestToday = todayExpenses
    .slice()
    .sort((left, right) => toNumber(right.amount) - toNumber(left.amount))[0];

  if (biggestToday) {
    insights.push({
      id: "biggest-today",
      tone: toNumber(biggestToday.amount) >= 25 ? "warning" : "positive",
      title: `Biggest expense today: ${getTransactionTitle(biggestToday)}`,
      body: `${formatCompactCurrency(biggestToday.amount)} is the highest single charge so far today, logged at ${formatAbsoluteTime(biggestToday.occurred_at)}.`,
    });
  }

  const categoryInsights = buildCategoryInsight(categoryData, previousExpenses);
  if (categoryInsights) {
    insights.push(categoryInsights);
  }

  if (insights.length === 0 && currentExpenses.length > 0) {
    const averageTicket = currentTotal / currentExpenses.length;
    insights.push({
      id: "average-ticket",
      tone: "positive",
      title: `${currentExpenses.length} expenses logged ${range.currentLabel.toLowerCase()}`,
      body: `Average ticket size is ${formatCompactCurrency(averageTicket)}, keeping the feed active even without a strong trend signal yet.`,
    });
  }

  return insights.slice(0, 3);
}

export function filterExpensesForPeriod(
  expenses: ExpenseResponse[],
  period: AnalyticsPeriod,
  query: string,
  now: Date,
): ExpenseResponse[] {
  const range = getPeriodRange(period, now);
  const normalizedQuery = query.trim().toLowerCase();

  return expenses.filter((expense) => {
    const occurredAt = new Date(expense.occurred_at);
    if (occurredAt < range.currentStart || occurredAt > now) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      expense.category,
      expense.note ?? "",
      expense.source_text,
      getTransactionTitle(expense),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

export function groupTransactionsByDate(expenses: ExpenseResponse[]): TransactionGroup[] {
  const groups = new Map<string, TransactionGroup>();

  for (const expense of expenses) {
    const date = new Date(expense.occurred_at);
    const id = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");

    const existing = groups.get(id);
    if (existing) {
      existing.items.push(expense);
      continue;
    }

    groups.set(id, {
      id,
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(date),
      items: [expense],
    });
  }

  return Array.from(groups.values());
}

export function parseExpenseDraft(text: string): ParsedExpenseDraft {
  const sourceText = text.trim();
  if (!sourceText) {
    return {
      success: false,
      amount: null,
      category: null,
      note: null,
      reason: "Start with something like coffee 5 or uber 12 to campus.",
    };
  }

  const match = sourceText.match(AMOUNT_PATTERN);
  const amountText = match?.[1];
  if (!amountText) {
    return {
      success: false,
      amount: null,
      category: null,
      note: null,
      reason: "I can preview this once there is an amount in the message.",
    };
  }

  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      success: false,
      amount: null,
      category: null,
      note: null,
      reason: "Amounts need to be positive, like 4.50 or 18.",
    };
  }

  const amountIndex = sourceText.indexOf(amountText);
  const note = `${sourceText.slice(0, amountIndex)} ${sourceText.slice(amountIndex + match[0].length)}`
    .replace(/\s+/g, " ")
    .trim();
  const category = inferCategory(sourceText);

  return {
    success: true,
    amount,
    category,
    note: note || null,
    reason: null,
  };
}

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? CATEGORY_EMOJI.other;
}

export function getCategoryLabel(category: string): string {
  if (!category) {
    return "Other";
  }

  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function getCategoryAccent(category: string): string {
  const accents: Record<string, string> = {
    bills: "var(--accent-amber)",
    education: "var(--accent-teal)",
    entertainment: "var(--accent-coral)",
    food: "var(--accent-emerald)",
    groceries: "var(--accent-teal)",
    health: "var(--accent-coral)",
    other: "var(--accent-muted)",
    shopping: "var(--accent-amber)",
    transport: "var(--accent-indigo)",
    travel: "var(--accent-violet)",
  };

  return accents[category] ?? accents.other;
}

export function getTransactionTitle(expense: ExpenseResponse): string {
  return expense.note?.trim() || expense.source_text.trim() || getCategoryLabel(expense.category);
}

export function formatRelativeTime(value: string, now = new Date()): string {
  const date = new Date(value);
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

export function formatAbsoluteTime(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function buildSparklinePath(
  values: number[],
  width: number,
  height: number,
): string {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function formatCompactCurrency(value: MoneyValue, currency = "USD"): string {
  const amount = toNumber(value);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount >= 100 ? 0 : 2,
  }).format(amount);
}

function buildSparkline(
  period: AnalyticsPeriod,
  expenses: ExpenseResponse[],
  now: Date,
): number[] {
  if (period === "day") {
    return buildDayBuckets(expenses, now, 7);
  }
  if (period === "week") {
    return buildWeekBuckets(expenses, now, 8);
  }
  return buildMonthBuckets(expenses, now, 6);
}

function buildDayBuckets(expenses: ExpenseResponse[], now: Date, days: number): number[] {
  const dayStart = startOfUtcDay(now);

  return Array.from({ length: days }, (_, index) => {
    const start = addUtcDays(dayStart, index - (days - 1));
    const end = addUtcDays(start, 1);
    return sumExpensesWithin(expenses, start, end);
  });
}

function buildWeekBuckets(expenses: ExpenseResponse[], now: Date, weeks: number): number[] {
  const weekStart = startOfUtcWeek(now);

  return Array.from({ length: weeks }, (_, index) => {
    const start = addUtcDays(weekStart, (index - (weeks - 1)) * 7);
    const end = addUtcDays(start, 7);
    return sumExpensesWithin(expenses, start, end);
  });
}

function buildMonthBuckets(expenses: ExpenseResponse[], now: Date, months: number): number[] {
  const monthStart = startOfUtcMonth(now);

  return Array.from({ length: months }, (_, index) => {
    const start = addUtcMonths(monthStart, index - (months - 1));
    const end = addUtcMonths(start, 1);
    return sumExpensesWithin(expenses, start, end);
  });
}

function buildCategoryInsight(
  categoryData: AnalyticsByCategoryResponse | null,
  previousExpenses: ExpenseResponse[],
): InsightItem | null {
  if (!categoryData || categoryData.items.length === 0) {
    return null;
  }

  const topCategory = categoryData.items[0];
  const previousTotals = previousExpenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.category] = (totals[expense.category] ?? 0) + toNumber(expense.amount);
    return totals;
  }, {});
  const currentValue = toNumber(topCategory.total);
  const previousValue = previousTotals[topCategory.category] ?? 0;

  if (previousValue > 0) {
    const change = ((currentValue - previousValue) / previousValue) * 100;
    const rounded = Math.round(Math.abs(change));

    return {
      id: `category-${topCategory.category}`,
      tone: change > 20 ? "warning" : change < -5 ? "positive" : "danger",
      title:
        change >= 0
          ? `${getCategoryLabel(topCategory.category)} is up ${rounded}%`
          : `${getCategoryLabel(topCategory.category)} cooled by ${rounded}%`,
      body:
        change >= 0
          ? `${getCategoryLabel(topCategory.category)} now leads the mix at ${formatCompactCurrency(topCategory.total, categoryData.currency)}, making it the primary driver this period.`
          : `${getCategoryLabel(topCategory.category)} is still your top category, but it softened compared with the prior window.`,
    };
  }

  return {
    id: `category-${topCategory.category}`,
    tone: "positive",
    title: `${getCategoryLabel(topCategory.category)} leads this window`,
    body: `${formatCompactCurrency(topCategory.total, categoryData.currency)} is concentrated in ${getCategoryLabel(topCategory.category)}, giving you a clear dominant spending lane.`,
  };
}

function buildComparisonLabel(changePercent: number | null, previousLabel: string): string {
  if (changePercent === null) {
    return `No ${previousLabel.toLowerCase()} baseline yet`;
  }

  const rounded = Math.round(Math.abs(changePercent));
  if (rounded === 0) {
    return `Flat versus ${previousLabel.toLowerCase()}`;
  }

  return changePercent > 0
    ? `+${rounded}% vs ${previousLabel.toLowerCase()}`
    : `-${rounded}% vs ${previousLabel.toLowerCase()}`;
}

function resolveStatTone(
  currentTotal: number,
  previousTotal: number,
  changePercent: number | null,
): StatTone {
  if (currentTotal === 0 && previousTotal === 0) {
    return "neutral";
  }
  if (changePercent === null) {
    return "warning";
  }
  if (changePercent <= -10) {
    return "positive";
  }
  if (changePercent <= 15) {
    return "warning";
  }
  return "danger";
}

function resolveStatToneLabel(
  currentTotal: number,
  previousTotal: number,
  changePercent: number | null,
): string {
  if (currentTotal === 0 && previousTotal === 0) {
    return "No spend yet";
  }
  if (changePercent === null) {
    return "New budget signal";
  }
  if (changePercent <= -10) {
    return "Under budget";
  }
  if (changePercent <= 15) {
    return "Near limit";
  }
  return "Over budget";
}

function getSummaryAmount(
  summary: AnalyticsSummaryResponse | null,
  period: AnalyticsPeriod,
): number {
  if (!summary) {
    return 0;
  }

  if (period === "day") {
    return toNumber(summary.day_total);
  }
  if (period === "week") {
    return toNumber(summary.week_total);
  }
  return toNumber(summary.month_total);
}

function getPeriodRange(period: AnalyticsPeriod, now: Date): PeriodRange {
  if (period === "day") {
    const currentStart = startOfUtcDay(now);
    return {
      currentStart,
      previousStart: addUtcDays(currentStart, -1),
      currentLabel: "today",
      previousLabel: "yesterday",
    };
  }
  if (period === "week") {
    const currentStart = startOfUtcWeek(now);
    return {
      currentStart,
      previousStart: addUtcDays(currentStart, -7),
      currentLabel: "this week",
      previousLabel: "last week",
    };
  }

  const currentStart = startOfUtcMonth(now);
  return {
    currentStart,
    previousStart: addUtcMonths(currentStart, -1),
    currentLabel: "this month",
    previousLabel: "last month",
  };
}

function filterExpensesForRange(
  expenses: ExpenseResponse[],
  start: Date,
  end: Date,
): ExpenseResponse[] {
  return expenses.filter((expense) => {
    const occurredAt = new Date(expense.occurred_at);
    return occurredAt >= start && occurredAt < end;
  });
}

function sumExpensesWithin(expenses: ExpenseResponse[], start: Date, end: Date): number {
  return filterExpensesForRange(expenses, start, end).reduce(
    (total, expense) => total + toNumber(expense.amount),
    0,
  );
}

function inferCategory(sourceText: string): string {
  const lowered = sourceText.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      const keywordPattern = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
      if (keywordPattern.test(lowered)) {
        return category;
      }
    }
  }

  return "other";
}

function startOfUtcDay(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function startOfUtcWeek(value: Date): Date {
  const dayStart = startOfUtcDay(value);
  const weekday = dayStart.getUTCDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  return addUtcDays(dayStart, -offset);
}

function startOfUtcMonth(value: Date): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1));
}

function addUtcDays(value: Date, days: number): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate() + days),
  );
}

function addUtcMonths(value: Date, months: number): Date {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toNumber(value: MoneyValue): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
