import type { CloudAccount } from "@prisma/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { EncryptionService } from "@/lib/security/encryption";

import { serviceNameToCategory } from "@/modules/analytics/domain/serviceNameToCategory";

import {
  fakeGcpBilledResponse,
  GcpProvider,
  parseGcpCredentials,
} from "./gcpProvider";
import {
  SyncErrorWithKey,
  SYNC_ERROR_GCP_INVALID_CREDENTIALS,
} from "../../domain/cloudProvider";

function createEncryptionMock(plaintext: string): EncryptionService {
  return {
    decrypt: vi.fn().mockReturnValue(plaintext),
    encrypt: vi.fn(),
  } as unknown as EncryptionService;
}

const baseAccount: CloudAccount = {
  id: "acc-gcp-1",
  organizationId: "org-1",
  provider: "GCP",
  label: "GCP Prod",
  encryptedCredentials: "enc",
  status: "SYNCED",
  lastSyncError: null,
  lastSyncedAt: null,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
} as unknown as CloudAccount;

const validServiceAccountJson = JSON.stringify({
  type: "service_account",
  project_id: "my-gcp-project",
  private_key: "-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----\n",
  client_email: "burnwatch@my-gcp-project.iam.gserviceaccount.com",
});

describe("parseGcpCredentials", () => {
  it("returns billingAccountId and serviceAccountKey when JSON is valid", () => {
    const plaintext = JSON.stringify({
      billingAccountId: "012345-ABCDEF",
      serviceAccountJson: validServiceAccountJson,
    });
    const result = parseGcpCredentials(plaintext);
    expect(result.billingAccountId).toBe("012345-ABCDEF");
    expect(result.serviceAccountKey.project_id).toBe("my-gcp-project");
    expect(result.serviceAccountKey.client_email).toContain("burnwatch");
    expect(result.serviceAccountKey.private_key).toContain("BEGIN PRIVATE KEY");
  });

  it("throws SyncErrorWithKey when plaintext is not valid JSON", () => {
    expect(() => parseGcpCredentials("not json")).toThrow(SyncErrorWithKey);
  });

  it("throws SyncErrorWithKey when billingAccountId or serviceAccountJson is missing", () => {
    expect(() =>
      parseGcpCredentials(JSON.stringify({ billingAccountId: "012345-ABCDEF" })),
    ).toThrow(SyncErrorWithKey);
    expect(() =>
      parseGcpCredentials(JSON.stringify({ serviceAccountJson: validServiceAccountJson })),
    ).toThrow(SyncErrorWithKey);
  });

  it("throws SyncErrorWithKey when serviceAccountJson is not valid JSON", () => {
    const plaintext = JSON.stringify({
      billingAccountId: "012345-ABCDEF",
      serviceAccountJson: "not json",
    });
    expect(() => parseGcpCredentials(plaintext)).toThrow(SyncErrorWithKey);
  });

  it("throws SyncErrorWithKey when type is not service_account", () => {
    const badKey = JSON.stringify({
      type: "user",
      project_id: "p",
      private_key: "k",
      client_email: "e@e.com",
    });
    const plaintext = JSON.stringify({
      billingAccountId: "012345-ABCDEF",
      serviceAccountJson: badKey,
    });
    expect(() => parseGcpCredentials(plaintext)).toThrow(SyncErrorWithKey);
  });

  it("throws SyncErrorWithKey when project_id, private_key or client_email is missing", () => {
    const noProject = JSON.stringify({
      type: "service_account",
      private_key: "k",
      client_email: "e@e.com",
    });
    const plaintext = JSON.stringify({
      billingAccountId: "012345-ABCDEF",
      serviceAccountJson: noProject,
    });
    expect(() => parseGcpCredentials(plaintext)).toThrow(SyncErrorWithKey);
  });
});

describe("fakeGcpBilledResponse", () => {
  it("returns GCP-like services with positive cents and correct date", () => {
    const range = { from: "2025-02-01", to: "2025-02-02" };
    const rows = fakeGcpBilledResponse(range);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    const names = rows.map((r) => r.serviceName);
    expect(names).toContain("Compute Engine");
    expect(names).toContain("BigQuery");
    expect(names).toContain("Cloud Run");
    expect(names).toContain("Cloud Storage");
    rows.forEach((r) => {
      expect(r.amountCents).toBeGreaterThan(0);
      expect(r.currency).toBe("USD");
    });
    expect(rows[0]?.date.toISOString().slice(0, 10)).toBe("2025-02-01");
  });
});

describe("GcpProvider - serviceNameToCategory mapping", () => {
  it("maps fake GCP service names to expected categories", () => {
    expect(serviceNameToCategory("Compute Engine")).toBe("Compute");
    expect(serviceNameToCategory("Cloud Run")).toBe("Compute");
    expect(serviceNameToCategory("Cloud Storage")).toBe("Storage");
    expect(serviceNameToCategory("BigQuery")).toBe("Database");
  });
});

describe("GcpProvider.fetchDailySpend", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns fake data when USE_FAKE_GCP_BILLING is true", async () => {
    process.env.USE_FAKE_GCP_BILLING = "true";
    const plaintext = JSON.stringify({
      billingAccountId: "012345-ABCDEF",
      serviceAccountJson: validServiceAccountJson,
    });
    const encryption = createEncryptionMock(plaintext);
    const provider = new GcpProvider(encryption);
    const result = await provider.fetchDailySpend(baseAccount, {
      from: "2025-02-01",
      to: "2025-02-02",
    });

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((r) => r.serviceName === "Compute Engine")).toBe(true);
    expect(encryption.decrypt).not.toHaveBeenCalled();
  });

  it("decrypts and parses credentials when not in fake mode (rejects: real BQ or auth error)", async () => {
    process.env.USE_FAKE_GCP_BILLING = "false";
    const plaintext = JSON.stringify({
      billingAccountId: "012345-ABCDEF",
      serviceAccountJson: validServiceAccountJson,
    });
    const encryption = createEncryptionMock(plaintext);
    const provider = new GcpProvider(encryption);

    await expect(
      provider.fetchDailySpend(baseAccount, { from: "2025-02-01", to: "2025-02-02" }),
    ).rejects.toThrow();
    expect(encryption.decrypt).toHaveBeenCalledWith(baseAccount.encryptedCredentials);
  });

  it("throws SyncErrorWithKey for invalid credentials when not in fake mode", async () => {
    process.env.USE_FAKE_GCP_BILLING = "false";
    const encryption = createEncryptionMock(JSON.stringify({ billingAccountId: "" }));
    const provider = new GcpProvider(encryption);

    await expect(
      provider.fetchDailySpend(baseAccount, { from: "2025-02-01", to: "2025-02-02" }),
    ).rejects.toMatchObject({
      syncErrorKey: SYNC_ERROR_GCP_INVALID_CREDENTIALS,
    });
  });
});
