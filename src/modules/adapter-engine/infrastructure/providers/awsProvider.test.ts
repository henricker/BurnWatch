import type { CloudAccount } from "@prisma/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { EncryptionService } from "@/lib/security/encryption";

import {
  AwsProvider,
  fakeAwsBilledResponse,
} from "./awsProvider";
import {
  SyncErrorWithKey,
  SYNC_ERROR_AWS_INVALID_CREDENTIALS,
} from "../../domain/cloudProvider";

function createEncryptionMock(payload: unknown): EncryptionService {
  return {
    decrypt: vi.fn().mockReturnValue(JSON.stringify(payload)),
    encrypt: vi.fn(),
  } as unknown as EncryptionService;
}

const baseAccount: CloudAccount = {
  id: "acc-aws-1",
  organizationId: "org-1",
  provider: "AWS",
  label: "AWS Prod",
  encryptedCredentials: "enc",
  status: "SYNCED",
  lastSyncError: null,
  lastSyncedAt: null,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
} as unknown as CloudAccount;

describe("AwsProvider - fakeAwsBilledResponse", () => {
  it("returns stable mocked services with positive cents", () => {
    const range = { from: "2025-02-01", to: "2025-02-02" };
    const rows = fakeAwsBilledResponse(range);

    expect(rows).toHaveLength(4);
    const names = rows.map((r) => r.serviceName);
    expect(names).toEqual([
      "Amazon Elastic Compute Cloud",
      "Amazon Relational Database Service",
      "Amazon Simple Storage Service",
      "AWS Lambda",
    ]);
    rows.forEach((r) => {
      expect(r.amountCents).toBeGreaterThan(0);
      expect(r.currency).toBe("USD");
    });
  });
});

describe("AwsProvider.fetchDailySpend", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns fake data when USE_FAKE_AWS_BILLING is true", async () => {
    process.env.USE_FAKE_AWS_BILLING = "true";
    const encryption = createEncryptionMock({});
    const provider = new AwsProvider(encryption);

    const rows = await provider.fetchDailySpend(baseAccount, {
      from: "2025-02-01",
      to: "2025-02-02",
    });

    expect(rows).toHaveLength(4);
    expect(rows[0]?.serviceName).toBe("Amazon Elastic Compute Cloud");
  });
});

describe("AwsProvider.fetchDailySpend – real path (mocked SDK)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, USE_FAKE_AWS_BILLING: "false" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("normalizes Cost Explorer response into DailySpendData", async () => {
    const sendMock = vi.fn().mockResolvedValue({
      ResultsByTime: [
        {
          TimePeriod: { Start: "2025-02-01", End: "2025-02-02" },
          Groups: [
            {
              Keys: ["Amazon Elastic Compute Cloud"],
              Metrics: { UnblendedCost: { Amount: "12.34", Unit: "USD" } },
            },
            {
              Keys: ["Amazon Simple Storage Service"],
              Metrics: { UnblendedCost: { Amount: "0.10", Unit: "USD" } },
            },
          ],
        },
      ],
    });

    vi.doMock("@aws-sdk/client-cost-explorer", () => {
      const LocalSendMock = sendMock;
      class CostExplorerClient {
        // eslint-disable-next-line class-methods-use-this
        send = LocalSendMock;
        constructor(_: unknown) {}
      }
      class GetCostAndUsageCommand {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(_input: unknown) {}
      }
      return { CostExplorerClient, GetCostAndUsageCommand };
    });

    const { AwsProvider: AwsProviderMocked } = await import("./awsProvider");
    const encryption = createEncryptionMock({
      accessKeyId: "AKIA1234567890ABCD12",
      secretAccessKey: "x".repeat(40),
      region: "us-east-1",
    });

    const provider = new AwsProviderMocked(encryption);

    const rows = await provider.fetchDailySpend(baseAccount, {
      from: "2025-02-01",
      to: "2025-02-02",
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(rows).toHaveLength(2);

    const ec2 = rows.find((r) => r.serviceName === "Amazon Elastic Compute Cloud");
    const s3 = rows.find((r) => r.serviceName === "Amazon Simple Storage Service");
    expect(ec2?.amountCents).toBe(1234);
    expect(ec2?.currency).toBe("USD");
    expect(s3?.amountCents).toBe(10);
  });

  it("wraps invalid credential errors into SyncErrorWithKey", async () => {
    const sendMock = vi
      .fn()
      .mockRejectedValue({ name: "InvalidClientTokenId", message: "The security token included in the request is invalid." });

    vi.doMock("@aws-sdk/client-cost-explorer", () => {
      const LocalSendMock = sendMock;
      class CostExplorerClient {
        // eslint-disable-next-line class-methods-use-this
        send = LocalSendMock;
        constructor(_: unknown) {}
      }
      class GetCostAndUsageCommand {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(_input: unknown) {}
      }
      return { CostExplorerClient, GetCostAndUsageCommand };
    });

    const { AwsProvider: AwsProviderMocked } = await import("./awsProvider");
    const encryption = createEncryptionMock({
      accessKeyId: "AKIA1234567890ABCD12",
      secretAccessKey: "x".repeat(40),
    });
    const provider = new AwsProviderMocked(encryption);

    await expect(
      provider.fetchDailySpend(baseAccount, {
        from: "2025-02-01",
        to: "2025-02-02",
      }),
    ).rejects.toMatchObject<SyncErrorWithKey>({
      syncErrorKey: SYNC_ERROR_AWS_INVALID_CREDENTIALS,
    });
  });
});

