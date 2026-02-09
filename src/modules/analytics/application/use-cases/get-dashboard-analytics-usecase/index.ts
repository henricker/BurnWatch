import type { CloudProvider, PrismaClient } from "@prisma/client";

import type {
  CategoryItem,
  DashboardAnalyticsInput,
  DashboardAnalyticsResult,
  EvolutionDay,
  ProviderBreakdownItem,
  ProviderFilterKey,
} from "../../../domain/types";
import { resolveDateRange } from "../../../domain/dateRange";
import { serviceNameToCategory, type SpendCategory } from "../../../domain/serviceNameToCategory";

const PROVIDER_IDS: Record<string, CloudProvider> = {
  VERCEL: "VERCEL",
  AWS: "AWS",
  GCP: "GCP",
  OTHER: "OTHER",
};

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
  const last = new Date(Date.UTC(year, month + 1, 0));
  return last.getUTCDate();
}

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

function isAnomalyDay(dayCents: number, last7DailyTotals: number[]): boolean {
  if (last7DailyTotals.length < 2) return false;
  const mean = last7DailyTotals.reduce((a, b) => a + b, 0) / last7DailyTotals.length;
  const variance =
    last7DailyTotals.reduce((acc, x) => acc + (x - mean) ** 2, 0) / last7DailyTotals.length;
  const std = Math.sqrt(variance);
  if (std === 0) return false;
  return dayCents > mean + 2 * std;
}

/**
 * Returns dashboard analytics for an organization (totals, trend, evolution, breakdown, categories).
 */
export class GetDashboardAnalyticsUseCase {
  constructor(private readonly prisma: PrismaClient) {}

  async execute(input: DashboardAnalyticsInput): Promise<DashboardAnalyticsResult> {
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
      this.prisma.dailySpend.findMany({
        where,
        select: {
          date: true,
          provider: true,
          serviceName: true,
          amountCents: true,
        },
      }),
      this.prisma.dailySpend.aggregate({
        where: previousWhere,
        _sum: { amountCents: true },
      }),
    ]);

    const totalCents = rows.reduce((s, r) => s + (r.amountCents ?? 0), 0);
    const previousSum = previousAgg._sum.amountCents ?? 0;
    const trendPercent =
      previousSum > 0 ? (totalCents / previousSum - 1) * 100 : totalCents > 0 ? 100 : null;

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

    const yesterday = addDays(today, -1);
    const todayKey = today.toISOString().slice(0, 10);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);
    const todayTotal = dailyTotalsByDate.get(todayKey) ?? 0;
    const yesterdayTotal = dailyTotalsByDate.get(yesterdayKey) ?? 0;
    let anomalies = 0;
    if (isAnomalyDay(todayTotal, last7DailyTotals)) anomalies += 1;
    if (isAnomalyDay(yesterdayTotal, last7DailyTotals)) anomalies += 1;

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

    const byProvider = new Map<string, Map<string, number>>();
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
}
