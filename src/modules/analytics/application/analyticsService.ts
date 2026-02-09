import type { CloudProvider, PrismaClient } from "@prisma/client";

import { serviceNameToCategory, type SpendCategory } from "./serviceNameToCategory";

export type DateRangeKey = "7D" | "30D" | "MTD";
export type ProviderFilterKey = "ALL" | "VERCEL" | "AWS" | "GCP";

/** Start of day in UTC (00:00:00.000). */
function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function daysInMonth(d: Date): number {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(year, month + 1, 0));
  return last.getUTCDate();
}

export interface DateRangeResult {
  start: Date;
  end: Date;
  /** Previous equivalent period (same number of days) for trend. */
  previousStart: Date;
  previousEnd: Date;
}

export function resolveDateRange(range: DateRangeKey, now: Date = new Date()): DateRangeResult {
  const today = startOfDayUTC(now);
  let start: Date;
  const end: Date = today;

  if (range === "MTD") {
    start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  } else if (range === "7D") {
    start = addDays(today, -6);
  } else {
    // 30D
    start = addDays(today, -29);
  }

  const numDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -numDays + 1);

  return { start, end, previousStart, previousEnd };
}

export interface DashboardAnalyticsInput {
  organizationId: string;
  dateRange: DateRangeKey;
  providerFilter: ProviderFilterKey;
}

export interface EvolutionDay {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "01/02" for display
  aws: number;
  vercel: number;
  gcp: number;
  total: number;
}

export interface ProviderBreakdownItem {
  id: string;
  name: string;
  total: number; // cents
  services: { name: string; cents: number }[];
}

export interface CategoryItem {
  label: SpendCategory;
  cents: number;
}

export interface DashboardAnalyticsResult {
  /** Total spend in selected range (cents). */
  totalCents: number;
  /** Trend vs previous equivalent period: ((current/previous) - 1) * 100, or null if no previous. */
  trendPercent: number | null;
  /** End-of-month projection (cents). Formula: (totalMTD / daysElapsed) * totalDaysInMonth. */
  forecastCents: number | null;
  /** Daily burn: average of last 7 days total daily spend (cents per day). */
  dailyBurnCents: number;
  /** Number of anomaly days in the last 48h window (0 or 1). */
  anomalies: number;
  /** Daily evolution for chart: one point per day, by provider (cents). */
  evolution: EvolutionDay[];
  /** Resource breakdown: provider -> services (cents). */
  providerBreakdown: ProviderBreakdownItem[];
  /** Spend by category (Compute, Network, etc.) in cents. */
  categories: CategoryItem[];
}

const PROVIDER_IDS: Record<string, CloudProvider> = {
  VERCEL: "VERCEL",
  AWS: "AWS",
  GCP: "GCP",
  OTHER: "OTHER",
};

function buildWhere(
  organizationId: string,
  start: Date,
  end: Date,
  providerFilter: ProviderFilterKey
) {
  const where: {
    organizationId: string;
    date: { gte: Date; lte: Date };
    provider?: CloudProvider;
  } = {
    organizationId,
    date: { gte: start, lte: end },
  };
  if (providerFilter !== "ALL") {
    where.provider = PROVIDER_IDS[providerFilter] ?? "OTHER";
  }
  return where;
}

/** Z-score anomaly: day is anomaly if value > mean + 2 * std. */
function isAnomalyDay(dayCents: number, last7DailyTotals: number[]): boolean {
  if (last7DailyTotals.length < 2) return false;
  const mean = last7DailyTotals.reduce((a, b) => a + b, 0) / last7DailyTotals.length;
  const variance =
    last7DailyTotals.reduce((acc, x) => acc + (x - mean) ** 2, 0) / last7DailyTotals.length;
  const std = Math.sqrt(variance);
  if (std === 0) return false;
  return dayCents > mean + 2 * std;
}

export async function getDashboardAnalytics(
  prisma: PrismaClient,
  input: DashboardAnalyticsInput
): Promise<DashboardAnalyticsResult> {
  const now = new Date();
  const { start, end, previousStart, previousEnd } = resolveDateRange(input.dateRange, now);
  const where = buildWhere(input.organizationId, start, end, input.providerFilter);
  const previousWhere = buildWhere(
    input.organizationId,
    previousStart,
    previousEnd,
    input.providerFilter
  );

  const [rows, previousAgg] = await Promise.all([
    prisma.dailySpend.findMany({
      where,
      select: {
        date: true,
        provider: true,
        serviceName: true,
        amountCents: true,
      },
    }),
    prisma.dailySpend.aggregate({
      where: previousWhere,
      _sum: { amountCents: true },
    }),
  ]);

  const totalCents = rows.reduce((s, r) => s + (r.amountCents ?? 0), 0);
  const previousSum = previousAgg._sum.amountCents ?? 0;
  const trendPercent =
    previousSum > 0 ? (totalCents / previousSum - 1) * 100 : totalCents > 0 ? 100 : null;

  // Forecast: (totalMTD / daysElapsedInMonth) * totalDaysInMonth (only for MTD)
  let forecastCents: number | null = null;
  if (input.dateRange === "MTD") {
    const today = startOfDayUTC(now);
    const firstOfMonth = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)
    );
    const daysElapsed =
      Math.round((today.getTime() - firstOfMonth.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    const totalDays = daysInMonth(now);
    if (daysElapsed > 0 && totalCents >= 0) {
      forecastCents = Math.round((totalCents / daysElapsed) * totalDays);
    }
  }

  // Daily burn: average of last 7 days (by calendar day)
  const today = startOfDayUTC(now);
  const sevenDaysAgo = addDays(today, -6);
  const dailyTotalsByDate = new Map<string, number>();
  for (const r of rows) {
    const d = startOfDayUTC(r.date);
    if (d >= sevenDaysAgo && d <= today) {
      const key = d.toISOString().slice(0, 10);
      dailyTotalsByDate.set(key, (dailyTotalsByDate.get(key) ?? 0) + (r.amountCents ?? 0));
    }
  }
  const last7Days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    last7Days.push(addDays(sevenDaysAgo, i));
  }
  const last7DailyTotals = last7Days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return dailyTotalsByDate.get(key) ?? 0;
  });
  const dailyBurnCents =
    last7DailyTotals.reduce((a, b) => a + b, 0) / 7;

  // Anomaly: last 48h = today and yesterday. If today (or yesterday) is anomaly vs last 7 days, count 1.
  const yesterday = addDays(today, -1);
  const todayKey = today.toISOString().slice(0, 10);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const todayTotal = dailyTotalsByDate.get(todayKey) ?? 0;
  const yesterdayTotal = dailyTotalsByDate.get(yesterdayKey) ?? 0;
  const last7ForAnomaly = last7DailyTotals;
  let anomalies = 0;
  if (isAnomalyDay(todayTotal, last7ForAnomaly)) anomalies += 1;
  if (isAnomalyDay(yesterdayTotal, last7ForAnomaly)) anomalies += 1;

  // Evolution: group by date, then by provider
  const evolutionByDate = new Map<
    string,
    { aws: number; vercel: number; gcp: number; other: number }
  >();
  const allDates: Date[] = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    allDates.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  for (const d of allDates) {
    const key = d.toISOString().slice(0, 10);
    evolutionByDate.set(key, { aws: 0, vercel: 0, gcp: 0, other: 0 });
  }
  for (const r of rows) {
    const key = startOfDayUTC(r.date).toISOString().slice(0, 10);
    const entry = evolutionByDate.get(key);
    if (!entry) continue;
    const c = r.amountCents ?? 0;
    if (r.provider === "AWS") entry.aws += c;
    else if (r.provider === "VERCEL") entry.vercel += c;
    else if (r.provider === "GCP") entry.gcp += c;
    else entry.other += c;
  }
  const evolution: EvolutionDay[] = allDates.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const e = evolutionByDate.get(key) ?? {
      aws: 0,
      vercel: 0,
      gcp: 0,
      other: 0,
    };
    const day = d.getUTCDate();
    const month = d.getUTCMonth() + 1;
    const label = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
    return {
      date: key,
      label,
      aws: e.aws,
      vercel: e.vercel,
      gcp: e.gcp,
      total: e.aws + e.vercel + e.gcp + e.other,
    };
  });

  // Resource breakdown: by provider, then by serviceName (sorted by cents desc)
  const byProvider = new Map<
    string,
    Map<string, number>
  >();
  for (const r of rows) {
    const prov = r.provider;
    if (!byProvider.has(prov)) byProvider.set(prov, new Map());
    const byService = byProvider.get(prov)!;
    byService.set(r.serviceName, (byService.get(r.serviceName) ?? 0) + (r.amountCents ?? 0));
  }
  const providerNames: Record<string, string> = {
    VERCEL: "Vercel",
    AWS: "AWS",
    GCP: "GCP",
    OTHER: "Other",
  };
  const providerBreakdown: ProviderBreakdownItem[] = [];
  for (const [prov, byService] of byProvider) {
    const services = Array.from(byService.entries())
      .map(([name, cents]) => ({ name, cents }))
      .sort((a, b) => b.cents - a.cents);
    const total = services.reduce((s, x) => s + x.cents, 0);
    providerBreakdown.push({
      id: prov.toLowerCase(),
      name: providerNames[prov] ?? prov,
      total,
      services,
    });
  }
  providerBreakdown.sort((a, b) => b.total - a.total);

  // Categories: map serviceName -> category, aggregate
  const byCategory = new Map<SpendCategory, number>();
  const categoriesOrder: SpendCategory[] = [
    "Compute",
    "Network",
    "Database",
    "Storage",
    "Observability",
    "Automation",
    "Other",
  ];
  for (const cat of categoriesOrder) {
    byCategory.set(cat, 0);
  }
  for (const r of rows) {
    const cat = serviceNameToCategory(r.serviceName);
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + (r.amountCents ?? 0));
  }
  const categories: CategoryItem[] = categoriesOrder
    .map((label) => ({ label, cents: byCategory.get(label) ?? 0 }))
    .filter((c) => c.cents > 0);

  return {
    totalCents,
    trendPercent,
    forecastCents,
    dailyBurnCents: Math.round(dailyBurnCents),
    anomalies,
    evolution,
    providerBreakdown,
    categories,
  };
}
