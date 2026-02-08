import type { PrismaClient, CloudProvider } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import { upsertDailySpend } from "./dailySpendService";

describe("upsertDailySpend", () => {
  it("uses composite unique key for idempotent upserts", async () => {
    const upsertMock = vi.fn().mockResolvedValue({
      id: "daily-spend-id",
    });

    const prismaMock: Pick<PrismaClient, "dailySpend"> = {
      // Cast is safe here for testing, we only care about the shape of `upsert`.
      dailySpend: {
        upsert: upsertMock,
      } as unknown as PrismaClient["dailySpend"],
    };

    const input = {
      organizationId: "org-123",
      cloudAccountId: "cloud-acc-456",
      date: new Date("2025-01-01"),
      provider: "AWS" as CloudProvider,
      serviceName: "Lambda",
      amountCents: 12345,
      currency: "USD",
    };

    await upsertDailySpend(prismaMock, input);
    await upsertDailySpend(prismaMock, input);

    expect(upsertMock).toHaveBeenCalledTimes(2);

    const firstCallArgs = upsertMock.mock.calls[0]?.[0];

    expect(firstCallArgs).toMatchObject({
      where: {
        daily_spend_org_provider_service_date_account_unique: {
          organizationId: input.organizationId,
          cloudAccountId: input.cloudAccountId,
          provider: input.provider,
          serviceName: input.serviceName,
          date: input.date,
        },
      },
    });
  });
});

