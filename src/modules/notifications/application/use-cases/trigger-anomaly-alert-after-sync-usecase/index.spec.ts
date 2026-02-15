import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { TriggerAnomalyAlertAfterSyncUseCase } from "./index";
import { SendAnomalyAlertUseCase } from "../send-anomaly-alert-usecase";

describe("TriggerAnomalyAlertAfterSyncUseCase", () => {
  const mockFindMany = vi.fn();
  const mockPrisma = {
    dailySpend: { findMany: mockFindMany },
  } as unknown as PrismaClient;

  const mockSendExecute = vi.fn().mockResolvedValue(undefined);
  const mockSendAnomalyAlert = { execute: mockSendExecute } as unknown as SendAnomalyAlertUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not call send when there are no daily spend rows", async () => {
    mockFindMany.mockResolvedValue([]);

    const useCase = new TriggerAnomalyAlertAfterSyncUseCase(mockPrisma, mockSendAnomalyAlert);
    await useCase.execute({ organizationId: "org-1" });

    expect(mockSendExecute).not.toHaveBeenCalled();
  });

  it("does not call send when rows exist but no service meets anomaly criteria", async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    // Flat spend: 100 every day -> no variance -> no anomaly
    mockFindMany.mockResolvedValue([
      { date: yesterday, organizationId: "org-1", provider: "AWS", serviceName: "S3", amountCents: 100 },
      { date: today, organizationId: "org-1", provider: "AWS", serviceName: "S3", amountCents: 100 },
    ]);

    const useCase = new TriggerAnomalyAlertAfterSyncUseCase(mockPrisma, mockSendAnomalyAlert);
    await useCase.execute({ organizationId: "org-1" });

    expect(mockSendExecute).not.toHaveBeenCalled();
  });

  it("calls send with report when at least one service has an anomaly", async () => {
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(d1.getDate() - 3);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() - 2);
    const d3 = new Date(today);
    d3.setDate(d3.getDate() - 1);
    // History mean ~133, stdDev ~47; today 500 > mean+2*stdDev, >100, >mean*1.2
    mockFindMany.mockResolvedValue([
      { date: d1, organizationId: "org-1", provider: "AWS", serviceName: "S3", amountCents: 100 },
      { date: d2, organizationId: "org-1", provider: "AWS", serviceName: "S3", amountCents: 100 },
      { date: d3, organizationId: "org-1", provider: "AWS", serviceName: "S3", amountCents: 200 },
      { date: today, organizationId: "org-1", provider: "AWS", serviceName: "S3", amountCents: 500 },
    ]);

    const useCase = new TriggerAnomalyAlertAfterSyncUseCase(mockPrisma, mockSendAnomalyAlert);
    await useCase.execute({ organizationId: "org-1" });

    expect(mockSendExecute).toHaveBeenCalledTimes(1);
    expect(mockSendExecute).toHaveBeenCalledWith({
      organizationId: "org-1",
      report: expect.objectContaining({
        totalImpactCents: expect.any(Number),
        providers: expect.objectContaining({
          AWS: expect.objectContaining({
            services: expect.arrayContaining([
              expect.objectContaining({
                name: "S3",
                currentSpend: 500,
                averageSpend: expect.any(Number),
                spikePercent: expect.any(Number),
                zScore: expect.any(Number),
              }),
            ]),
            providerTotal: expect.any(Number),
          }),
        }),
      }),
    });
  });

  it("swallows errors and does not rethrow when send throws", async () => {
    const today = new Date();
    const d1 = new Date(today);
    d1.setDate(d1.getDate() - 3);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() - 2);
    const d3 = new Date(today);
    d3.setDate(d3.getDate() - 1);
    mockFindMany.mockResolvedValue([
      { date: d1, organizationId: "org-1", provider: "AWS", serviceName: "S3", amountCents: 100 },
      { date: d2, organizationId: "org-1", provider: "AWS", serviceName: "S3", amountCents: 100 },
      { date: d3, organizationId: "org-1", provider: "AWS", serviceName: "S3", amountCents: 200 },
      { date: today, organizationId: "org-1", provider: "AWS", serviceName: "S3", amountCents: 500 },
    ]);
    mockSendExecute.mockRejectedValueOnce(new Error("send failed"));

    const useCase = new TriggerAnomalyAlertAfterSyncUseCase(mockPrisma, mockSendAnomalyAlert);
    await expect(useCase.execute({ organizationId: "org-1" })).resolves.toBeUndefined();
  });

  it("swallows errors when findMany throws", async () => {
    mockFindMany.mockRejectedValueOnce(new Error("db error"));

    const useCase = new TriggerAnomalyAlertAfterSyncUseCase(mockPrisma, mockSendAnomalyAlert);
    await expect(useCase.execute({ organizationId: "org-1" })).resolves.toBeUndefined();
  });
});
