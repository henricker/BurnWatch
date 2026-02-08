/**
 * Format-only validation for cloud provider credentials.
 * No network calls; used to validate shape before encrypting and saving.
 */

import type { CloudProvider } from "@prisma/client";

/** AWS Access Key ID: prefix AKIA + 16 alphanumeric chars (A-Za-z0-9) = 20 total */
const AWS_ACCESS_KEY_ID_REGEX = /^AKIA[0-9A-Za-z]{16}$/;
/** AWS Secret Access Key: 40 chars (base64-like) */
const AWS_SECRET_LENGTH = 40;

/** Vercel token: non-empty, reasonable length. Formats: v_tok_..., vercel_..., or plain alphanumeric (e.g. R1O1lKO7v8L0svh4dTbw6pfu) */
const VERCEL_TOKEN_MIN_LENGTH = 16;

/** GCP Billing Account ID: e.g. 012345-ABCDEF (6 digits - 6-8 alphanumeric) */
const GCP_BILLING_ID_REGEX = /^\d{6}-[0-9A-Z]{6,8}$/i;

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateAwsCredentials(
  accessKeyId: string,
  secretAccessKey: string,
): ValidationResult {
  const id = (accessKeyId ?? "").trim();
  const secret = (secretAccessKey ?? "").trim();
  if (!id) return { ok: false, error: "Access Key ID is required" };
  if (!secret) return { ok: false, error: "Secret Access Key is required" };
  if (!AWS_ACCESS_KEY_ID_REGEX.test(id)) {
    return {
      ok: false,
      error: "Access Key ID must start with AKIA followed by 16 alphanumeric characters",
    };
  }
  if (secret.length !== AWS_SECRET_LENGTH) {
    return {
      ok: false,
      error: "Secret Access Key must be 40 characters",
    };
  }
  return { ok: true };
}

export function validateVercelCredentials(token: string): ValidationResult {
  const t = (token ?? "").trim();
  if (!t) return { ok: false, error: "API token is required" };
  if (t.length < VERCEL_TOKEN_MIN_LENGTH) {
    return {
      ok: false,
      error: `API token seems too short (expected at least ${VERCEL_TOKEN_MIN_LENGTH} characters)`,
    };
  }
  return { ok: true };
}

export function validateGcpCredentials(
  billingAccountId: string,
  serviceAccountJson: string,
): ValidationResult {
  const billing = (billingAccountId ?? "").trim();
  const json = (serviceAccountJson ?? "").trim();
  if (!billing) return { ok: false, error: "Billing Account ID is required" };
  if (!json) return { ok: false, error: "Service Account Key (JSON) is required" };
  if (!GCP_BILLING_ID_REGEX.test(billing)) {
    return {
      ok: false,
      error: "Billing Account ID must match format 012345-ABCDEF (6 digits, hyphen, 6-8 alphanumeric)",
    };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, error: "Service Account Key must be valid JSON" };
  }
  const obj = parsed as Record<string, unknown>;
  if (obj?.type !== "service_account") {
    return { ok: false, error: 'JSON must have "type": "service_account"' };
  }
  if (!obj?.private_key || typeof obj.private_key !== "string") {
    return { ok: false, error: 'JSON must include "private_key"' };
  }
  if (!obj?.client_email || typeof obj.client_email !== "string") {
    return { ok: false, error: 'JSON must include "client_email"' };
  }
  return { ok: true };
}

export type CredentialsPayload =
  | { provider: "AWS"; accessKeyId: string; secretAccessKey: string }
  | { provider: "VERCEL"; token: string }
  | { provider: "GCP"; billingAccountId: string; serviceAccountJson: string };

export function validateCredentials(
  provider: CloudProvider,
  payload: Record<string, unknown>,
): ValidationResult {
  switch (provider) {
    case "AWS": {
      const accessKeyId = typeof payload.accessKeyId === "string" ? payload.accessKeyId : "";
      const secretAccessKey = typeof payload.secretAccessKey === "string" ? payload.secretAccessKey : "";
      return validateAwsCredentials(accessKeyId, secretAccessKey);
    }
    case "VERCEL": {
      const token = typeof payload.token === "string" ? payload.token : "";
      return validateVercelCredentials(token);
    }
    case "GCP": {
      const billingAccountId = typeof payload.billingAccountId === "string" ? payload.billingAccountId : "";
      const serviceAccountJson = typeof payload.serviceAccountJson === "string" ? payload.serviceAccountJson : "";
      return validateGcpCredentials(billingAccountId, serviceAccountJson);
    }
    default:
      return { ok: false, error: "Unsupported provider" };
  }
}

/** Build plaintext credentials string for encryption (JSON). */
export function credentialsToPlaintext(provider: CloudProvider, payload: Record<string, unknown>): string {
  switch (provider) {
    case "AWS":
      return JSON.stringify({
        accessKeyId: String(payload.accessKeyId ?? "").trim(),
        secretAccessKey: String(payload.secretAccessKey ?? "").trim(),
      });
    case "VERCEL":
      return JSON.stringify({ token: String(payload.token ?? "").trim() });
    case "GCP":
      return JSON.stringify({
        billingAccountId: String(payload.billingAccountId ?? "").trim(),
        serviceAccountJson: String(payload.serviceAccountJson ?? "").trim(),
      });
    default:
      return "{}";
  }
}
