import type { CloudAccount } from "@prisma/client";

import type { DailySpendData, FetchRange, ICloudProvider } from "../../domain/cloudProvider";

/**
 * Mock provider for AWS and GCP.
 * Returns empty array; real adapters will be implemented in future milestones.
 */
export class MockProvider implements ICloudProvider {
  async fetchDailySpend(
    cloudAccount: CloudAccount,
    range: FetchRange,
  ): Promise<DailySpendData[]> {
    void cloudAccount;
    void range;
    return [];
  }
}
