import { describe, expect, it } from "vitest";

import {
  credentialsToPlaintext,
  validateAwsCredentials,
  validateCredentials,
  validateGcpCredentials,
  validateVercelCredentials,
} from "./cloud-credentials";

const VALID_AWS_ID = "AKIA1B2C3D4E5F6G7H89"; // AKIA + 16 alphanumeric
const VALID_AWS_SECRET = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789ABCD"; // 40 chars

const VALID_GCP_BILLING = "012345-ABCDEF";
const VALID_GCP_JSON = JSON.stringify({
  type: "service_account",
  private_key: "-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----",
  client_email: "sync@project.iam.gserviceaccount.com",
});

describe("validateAwsCredentials", () => {
  it("accepts valid Access Key ID and 40-char secret", () => {
    expect(validateAwsCredentials(VALID_AWS_ID, VALID_AWS_SECRET)).toEqual({
      ok: true,
    });
  });

  it("accepts lowercase in Access Key ID (alphanumeric)", () => {
    expect(
      validateAwsCredentials("AKIA1b2c3d4e5f6g7h89", VALID_AWS_SECRET),
    ).toEqual({ ok: true });
  });

  it("rejects empty Access Key ID", () => {
    const result = validateAwsCredentials("", VALID_AWS_SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Access Key ID is required");
  });

  it("rejects empty Secret Access Key", () => {
    const result = validateAwsCredentials(VALID_AWS_ID, "");
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toContain("Secret Access Key is required");
  });

  it("rejects Access Key ID not starting with AKIA + 16 alphanumeric", () => {
    const result = validateAwsCredentials("AKIA123", VALID_AWS_SECRET);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toContain("AKIA followed by 16 alphanumeric");
  });

  it("rejects Secret Access Key not 40 characters", () => {
    const result = validateAwsCredentials(VALID_AWS_ID, "short");
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toContain("Secret Access Key must be 40 characters");
  });

  it("trims whitespace", () => {
    expect(
      validateAwsCredentials(`  ${VALID_AWS_ID}  `, `  ${VALID_AWS_SECRET}  `),
    ).toEqual({ ok: true });
  });
});

describe("validateVercelCredentials", () => {
  it("accepts token with at least 20 characters", () => {
    expect(
      validateVercelCredentials("vercel_xxxxxxxxxxxxxxxxxxxx"),
    ).toEqual({ ok: true });
  });

  it("rejects empty token", () => {
    const result = validateVercelCredentials("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("API token is required");
  });

  it("rejects token shorter than 20 characters", () => {
    const result = validateVercelCredentials("short");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("at least 20");
  });
});

describe("validateGcpCredentials", () => {
  it("accepts valid billing ID and service account JSON", () => {
    expect(
      validateGcpCredentials(VALID_GCP_BILLING, VALID_GCP_JSON),
    ).toEqual({ ok: true });
  });

  it("rejects empty Billing Account ID", () => {
    const result = validateGcpCredentials("", VALID_GCP_JSON);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toContain("Billing Account ID is required");
  });

  it("rejects empty Service Account JSON", () => {
    const result = validateGcpCredentials(VALID_GCP_BILLING, "");
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toContain("Service Account Key");
  });

  it("rejects Billing Account ID not matching 012345-ABCDEF format", () => {
    const result = validateGcpCredentials("invalid", VALID_GCP_JSON);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.error).toContain("012345-ABCDEF");
  });

  it("rejects invalid JSON", () => {
    const result = validateGcpCredentials(
      VALID_GCP_BILLING,
      "not valid json",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("valid JSON");
  });

  it("rejects JSON without type service_account", () => {
    const bad = JSON.stringify({
      type: "user",
      private_key: "x",
      client_email: "a@b.com",
    });
    const result = validateGcpCredentials(VALID_GCP_BILLING, bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("service_account");
  });

  it("rejects JSON without private_key", () => {
    const bad = JSON.stringify({
      type: "service_account",
      client_email: "a@b.com",
    });
    const result = validateGcpCredentials(VALID_GCP_BILLING, bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("private_key");
  });

  it("rejects JSON without client_email", () => {
    const bad = JSON.stringify({
      type: "service_account",
      private_key: "x",
    });
    const result = validateGcpCredentials(VALID_GCP_BILLING, bad);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("client_email");
  });
});

describe("validateCredentials", () => {
  it("delegates to AWS validator for AWS provider", () => {
    expect(
      validateCredentials("AWS", {
        accessKeyId: VALID_AWS_ID,
        secretAccessKey: VALID_AWS_SECRET,
      }),
    ).toEqual({ ok: true });
    expect(
      validateCredentials("AWS", {
        accessKeyId: "",
        secretAccessKey: VALID_AWS_SECRET,
      }),
    ).toEqual({ ok: false, error: "Access Key ID is required" });
  });

  it("delegates to Vercel validator for VERCEL provider", () => {
    expect(
      validateCredentials("VERCEL", {
        token: "vercel_xxxxxxxxxxxxxxxxxxxx",
      }),
    ).toEqual({ ok: true });
    expect(validateCredentials("VERCEL", { token: "" })).toEqual({
      ok: false,
      error: "API token is required",
    });
  });

  it("delegates to GCP validator for GCP provider", () => {
    expect(
      validateCredentials("GCP", {
        billingAccountId: VALID_GCP_BILLING,
        serviceAccountJson: VALID_GCP_JSON,
      }),
    ).toEqual({ ok: true });
  });

  it("returns unsupported for OTHER provider", () => {
    const result = validateCredentials("OTHER", {});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Unsupported");
  });
});

describe("credentialsToPlaintext", () => {
  it("produces JSON with accessKeyId and secretAccessKey for AWS", () => {
    const out = credentialsToPlaintext("AWS", {
      accessKeyId: "AKIA123",
      secretAccessKey: "secret40charsxxxxxxxxxxxxxxxxxxxx",
    });
    const parsed = JSON.parse(out) as Record<string, string>;
    expect(parsed.accessKeyId).toBe("AKIA123");
    expect(parsed.secretAccessKey).toBe("secret40charsxxxxxxxxxxxxxxxxxxxx");
  });

  it("produces JSON with token for VERCEL", () => {
    const out = credentialsToPlaintext("VERCEL", {
      token: "vercel_xxx",
    });
    const parsed = JSON.parse(out) as Record<string, string>;
    expect(parsed.token).toBe("vercel_xxx");
  });

  it("produces JSON with billingAccountId and serviceAccountJson for GCP", () => {
    const out = credentialsToPlaintext("GCP", {
      billingAccountId: "111111-AAAA",
      serviceAccountJson: '{"type":"service_account"}',
    });
    const parsed = JSON.parse(out) as Record<string, string>;
    expect(parsed.billingAccountId).toBe("111111-AAAA");
    expect(parsed.serviceAccountJson).toBe('{"type":"service_account"}');
  });

  it("returns {} for unsupported provider", () => {
    expect(credentialsToPlaintext("OTHER", {})).toBe("{}");
  });
});
