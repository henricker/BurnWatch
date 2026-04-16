import type { PrismaClient } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GetDashboardAnalyticsUseCase } from "./index";

describe("GetDashboardAnalyticsUseCase", () => {
  const orgId = "org-123";
  const fixedNow = new Date(Date.UTC(2025, 1, 5, 12, 0, 0)); // 2025-02-05

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createPrismaMock(rows: Array<{ date: Date; provider: string; serviceName: string; amountCents: number }>, previousSum: number) {
    const findMany = vi.fn().mockResolvedValue(rows);
    const aggregate = vi.fn().mockResolvedValue({
      _sum: { amountCents: previousSum },
    });
    return {
      dailySpend: {
        findMany,
        aggregate,
      },
    } as unknown as Pick<PrismaClient, "dailySpend">;
  }

  function runUseCase(
    prisma: ReturnType<typeof createPrismaMock>,
    input: {
      organizationId: string;
      dateRange: "7D" | "30D" | "MTD";
      providerFilter: "ALL" | "VERCEL" | "AWS" | "GCP";
      plan?: "STARTER" | "PRO";
    },
  ) {
    const useCase = new GetDashboardAnalyticsUseCase(prisma as unknown as PrismaClient);
    return useCase.execute(input);
  }

  it("returns zero totals and empty evolution when no rows", async () => {
    const prisma = createPrismaMock([], 0);
    const result = await runUseCase(prisma, {
      organizationId: orgId,
      dateRange: "MTD",
      providerFilter: "ALL",
    });

    expect(result.totalCents).toBe(0);
    expect(result.trendPercent).toBe(null);
    // MTD still computes forecast: (0 / daysElapsed) * totalDays = 0
    expect(result.forecastCents).toBe(0);
    expect(result.dailyBurnCents).toBe(0);
    expect(result.anomalies).toBe(0);
    expect(result.anomalyDetails).toEqual([]);
    expect(result.evolution.length).toBe(5); // 01–05 Feb
    expect(result.evolution.every((e) => e.total === 0)).toBe(true);
    expect(result.providerBreakdown).toEqual([]);
    expect(result.categories).toEqual([]);
  });

  it("aggregates totalCents and computes trend from previous period", async () => {
    const rows = [
      {
        date: new Date(Date.UTC(2025, 1, 1)),
        provider: "VERCEL",
        serviceName: "Serverless Functions",
        amountCents: 10000,
      },
      {
        date: new Date(Date.UTC(2025, 1, 2)),
        provider: "VERCEL",
        serviceName: "Edge Functions",
        amountCents: 5000,
      },
    ];
    const prisma = createPrismaMock(rows, 20000); // previous period had 20000
    const result = await runUseCase(prisma, {
      organizationId: orgId,
      dateRange: "MTD",
      providerFilter: "ALL",
    });

    expect(result.totalCents).toBe(15000);
    expect(result.trendPercent).toBe(-25); // 15000/20000 - 1 = -0.25 -> -25%
  });

  it("MTD: computes forecastCents as (totalMTD / daysElapsed) * totalDaysInMonth", async () => {
    const rows = [
      {
        date: new Date(Date.UTC(2025, 1, 1)),
        provider: "AWS",
        serviceName: "Lambda",
        amountCents: 10000,
      },
      {
        date: new Date(Date.UTC(2025, 1, 2)),
        provider: "AWS",
        serviceName: "Lambda",
        amountCents: 10000,
      },
    ];
    const prisma = createPrismaMock(rows, 0);
    const result = await runUseCase(prisma, {
      organizationId: orgId,
      dateRange: "MTD",
      providerFilter: "ALL",
    });

    // totalCents = 20000, daysElapsed = 5, totalDaysInMonth = 28
    // forecast = (20000 / 5) * 28 = 112000
    expect(result.forecastCents).toBe(112000);
  });

  it("7D: does not set forecastCents", async () => {
    const prisma = createPrismaMock([], 0);
    const result = await runUseCase(prisma, {
      organizationId: orgId,
      dateRange: "7D",
      providerFilter: "ALL",
    });
    expect(result.forecastCents).toBe(null);
  });

  it("builds evolution with aws, vercel, gcp and label per day", async () => {
    const rows = [
      {
        date: new Date(Date.UTC(2025, 1, 1)),
        provider: "VERCEL",
        serviceName: "Serverless",
        amountCents: 100,
      },
      {
        date: new Date(Date.UTC(2025, 1, 1)),
        provider: "AWS",
        serviceName: "Lambda",
        amountCents: 200,
      },
      {
        date: new Date(Date.UTC(2025, 1, 2)),
        provider: "GCP",
        serviceName: "Cloud Run",
        amountCents: 150,
      },
    ];
    const prisma = createPrismaMock(rows, 0);
    const result = await runUseCase(prisma, {
      organizationId: orgId,
      dateRange: "MTD",
      providerFilter: "ALL",
    });

    expect(result.evolution.length).toBe(5);
    const day1 = result.evolution.find((e) => e.date === "2025-02-01");
    expect(day1).toBeDefined();
    expect(day1?.aws).toBe(200);
    expect(day1?.vercel).toBe(100);
    expect(day1?.gcp).toBe(0);
    expect(day1?.total).toBe(300);
    expect(day1?.label).toBe("01/02");

    const day2 = result.evolution.find((e) => e.date === "2025-02-02");
    expect(day2?.gcp).toBe(150);
    expect(day2?.total).toBe(150);
    expect(day2?.label).toBe("02/02");
  });

  it("builds providerBreakdown sorted by total desc with services", async () => {
    const rows = [
      {
        date: new Date(Date.UTC(2025, 1, 1)),
        provider: "VERCEL",
        serviceName: "Serverless",
        amountCents: 500,
      },
      {
        date: new Date(Date.UTC(2025, 1, 1)),
        provider: "VERCEL",
        serviceName: "Edge",
        amountCents: 300,
      },
      {
        date: new Date(Date.UTC(2025, 1, 1)),
        provider: "AWS",
        serviceName: "Lambda",
        amountCents: 1000,
      },
    ];
    const prisma = createPrismaMock(rows, 0);
    const result = await runUseCase(prisma, {
      organizationId: orgId,
      dateRange: "MTD",
      providerFilter: "ALL",
    });

    expect(result.providerBreakdown.length).toBe(2);
    expect(result.providerBreakdown[0]?.id).toBe("aws");
    expect(result.providerBreakdown[0]?.total).toBe(1000);
    expect(result.providerBreakdown[0]?.services).toEqual([
      { name: "Lambda", cents: 1000 },
    ]);
    expect(result.providerBreakdown[1]?.id).toBe("vercel");
    expect(result.providerBreakdown[1]?.total).toBe(800);
    expect(result.providerBreakdown[1]?.services).toEqual(
      expect.arrayContaining([
        { name: "Serverless", cents: 500 },
        { name: "Edge", cents: 300 },
      ])
    );
  });

  it("maps service names to categories and returns only categories with cents > 0", async () => {
    const rows = [
      {
        date: new Date(Date.UTC(2025, 1, 1)),
        provider: "VERCEL",
        serviceName: "Serverless Functions",
        amountCents: 100,
      },
      {
        date: new Date(Date.UTC(2025, 1, 1)),
        provider: "VERCEL",
        serviceName: "Postgres",
        amountCents: 200,
      },
    ];
    const prisma = createPrismaMock(rows, 0);
    const result = await runUseCase(prisma, {
      organizationId: orgId,
      dateRange: "MTD",
      providerFilter: "ALL",
    });

    expect(result.categories.length).toBeGreaterThanOrEqual(1);
    const compute = result.categories.find((c) => c.label === "Compute");
    const database = result.categories.find((c) => c.label === "Database");
    expect(compute?.cents).toBe(100);
    expect(database?.cents).toBe(200);
  });

  it("uses plan STARTER by default and does not set isLimited for 30D range", async () => {
    const prisma = createPrismaMock([], 0);
    const result = await runUseCase(prisma, {
      organizationId: orgId,
      dateRange: "30D",
      providerFilter: "ALL",
    });
    expect(result.totalCents).toBe(0);
    expect(result.isLimited).toBeUndefined();
  });

  it("accepts plan PRO and returns same result shape without isLimited for 30D", async () => {
    const prisma = createPrismaMock([], 0);
    const result = await runUseCase(prisma, {
      organizationId: orgId,
      dateRange: "30D",
      providerFilter: "ALL",
      plan: "PRO",
    });
    expect(result).toHaveProperty("totalCents");
    expect(result).toHaveProperty("evolution");
    expect(result).toHaveProperty("providerBreakdown");
    expect(result).toHaveProperty("categories");
    expect(result.isLimited).toBeUndefined();
  });

  it("filters by provider when providerFilter is not ALL", async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        date: new Date(Date.UTC(2025, 1, 1)),
        provider: "VERCEL",
        serviceName: "Serverless",
        amountCents: 500,
      },
    ]);
    const aggregate = vi.fn().mockResolvedValue({ _sum: { amountCents: 300 } });
    const prisma = {
      dailySpend: { findMany, aggregate },
    } as unknown as Pick<PrismaClient, "dailySpend">;

    await runUseCase(prisma, {
      organizationId: orgId,
      dateRange: "MTD",
      providerFilter: "VERCEL",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: orgId,
          provider: "VERCEL",
        }),
      })
    );
  });
});
