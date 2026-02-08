import type { CloudAccount } from "@prisma/client";

import type { DailySpendData, FetchRange, ICloudProvider } from "../../domain/cloudProvider";

/**
 * Mock provider for AWS and GCP.
 * Returns empty array; real adapters will be implemented in future milestones.
 */
export class MockProvider implements ICloudProvider {
  async fetchDailySpend(
    _cloudAccount: CloudAccount,
    _range: FetchRange,
  ): Promise<DailySpendData[]> {
    return [];
  }
}
