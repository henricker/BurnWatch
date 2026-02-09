import type { CloudProvider } from "@prisma/client";

export interface UpsertDailySpendInput {
  organizationId: string;
  cloudAccountId: string;
  date: Date;
  provider: CloudProvider;
  serviceName: string;
  amountCents: number;
  currency?: string;
}
