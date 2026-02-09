import type { CloudAccount } from "@prisma/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { EncryptionService } from "@/lib/security/encryption";

import {
  VercelProvider,
  fakeVercelBilledResponse,
} from "./vercelProvider";
import { SYNC_ERROR_VERCEL_FORBIDDEN } from "../../domain/cloudProvider";

function createEncryptionMock(payload: unknown): EncryptionService {
  return {
    decrypt: vi.fn().mockReturnValue(JSON.stringify(payload)),
    encrypt: vi.fn(),
  } as unknown as EncryptionService;
}

const baseAccount: CloudAccount = {
  id: "acc-vercel-1",
  organizationId: "org-1",
  provider: "VERCEL",
  label: "Vercel Prod",
  encryptedCredentials: "enc",
  status: "SYNCED",
  lastSyncError: null,
  lastSyncedAt: null,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
} as unknown as CloudAccount;

describe("VercelProvider - fakeVercelBilledResponse", () => {
  it("produces JSONL with multiple services and positive amounts", () => {
    const text = fakeVercelBilledResponse("2025-02-01", "2025-02-02");
    const lines = text.split("\n").filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);

    const parsed = lines.map((l) => JSON.parse(l) as { ServiceName?: string; BilledCost?: number });
    const services = parsed.map((p) => p.ServiceName);
    expect(services).toContain("Serverless Functions");
    parsed.forEach((p) => {
      expect(typeof p.BilledCost).toBe("number");
      expect(p.BilledCost).toBeGreaterThan(0);
    });
  });
});

describe("VercelProvider.fetchDailySpend", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns parsed fake data when USE_FAKE_VERCEL_BILLING is true", async () => {
    process.env.USE_FAKE_VERCEL_BILLING = "true";
    const encryption = createEncryptionMock({});
    const provider = new VercelProvider(encryption);

    const rows = await provider.fetchDailySpend(baseAccount, {
      from: "2025-02-01",
      to: "2025-02-02",
    });

    expect(rows.length).toBeGreaterThan(0);
    const services = rows.map((r) => r.serviceName);
    expect(services).toContain("Serverless Functions");
    rows.forEach((r) => {
      expect(r.amountCents).toBeGreaterThan(0);
      expect(r.currency).toBe("USD");
    });
  });

  it("wraps 403 invalid token responses into SyncErrorWithKey", async () => {
    delete process.env.USE_FAKE_VERCEL_BILLING;

    const encryption = createEncryptionMock({ token: "vercel-token" });
    const provider = new VercelProvider(encryption);

    const fetchMock = vi.fn().mockResolvedValue({
      status: 403,
      ok: false,
      statusText: "Forbidden",
      text: vi.fn().mockResolvedValue(
        JSON.stringify({
          error: { invalidToken: true, message: "Not authorized: invalid token" },
        }),
      ),
    });

    global.fetch = fetchMock;

    await expect(
      provider.fetchDailySpend(baseAccount, {
        from: "2025-02-01",
        to: "2025-02-02",
      }),
    ).rejects.toMatchObject({
      syncErrorKey: SYNC_ERROR_VERCEL_FORBIDDEN,
    });
  });

  it("returns empty array on 404 costs_not_found", async () => {
    delete process.env.USE_FAKE_VERCEL_BILLING;

    const encryption = createEncryptionMock({ token: "vercel-token" });
    const provider = new VercelProvider(encryption);

    const fetchMock = vi.fn().mockResolvedValue({
      status: 404,
      ok: false,
      statusText: "Not Found",
      text: vi.fn().mockResolvedValue('{"error":"costs_not_found"}'),
    });

    global.fetch = fetchMock;

    const rows = await provider.fetchDailySpend(baseAccount, {
      from: "2025-02-01",
      to: "2025-02-02",
    });

    expect(rows).toEqual([]);
  });
});

