import type { PrismaClient } from "@prisma/client";

import type { UpsertDailySpendInput } from "../../../domain/dailySpend";

type PrismaWithTransaction = Pick<PrismaClient, "dailySpend" | "$transaction">;

/**
 * Bulk upsert daily spend rows in a single transaction.
 */
export class UpsertDailySpendBulkUseCase {
  constructor(private readonly prisma: PrismaWithTransaction) {}

  async execute(inputs: UpsertDailySpendInput[]): Promise<number> {
    if (inputs.length === 0) return 0;

    const delegate = this.prisma.dailySpend;
    await this.prisma.$transaction(
      inputs.map((input) => {
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
            currency: currency ?? "USD",
          },
          update: {
            amountCents,
            currency: currency ?? "USD",
          },
        });
      }),
    );
    return inputs.length;
  }
}
