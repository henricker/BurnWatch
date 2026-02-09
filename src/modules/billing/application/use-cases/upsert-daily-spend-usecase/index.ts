import type { PrismaClient } from "@prisma/client";

import type { UpsertDailySpendInput } from "../../../domain/dailySpend";

type PrismaWithDailySpend = Pick<PrismaClient, "dailySpend">;

/**
 * Persists a single daily spend row (upsert by unique key).
 */
export class UpsertDailySpendUseCase {
  constructor(private readonly prisma: PrismaWithDailySpend) {}

  async execute(input: UpsertDailySpendInput) {
    const delegate = this.prisma.dailySpend;
    const {
      organizationId,
      cloudAccountId,
      provider,
      serviceName,
      date,
      amountCents,
      currency,
    } = input;

    return delegate.upsert({
      where: {
        daily_spend_org_provider_service_date_account_unique: {
          organizationId,
          cloudAccountId,
          provider,
          serviceName,
          date,
        },
      },
      create: {
        organizationId,
        cloudAccountId,
        provider,
        serviceName,
        date,
        amountCents,
        currency,
      },
      update: {
        amountCents,
        currency: currency ?? "USD",
      },
    });
  }
}
