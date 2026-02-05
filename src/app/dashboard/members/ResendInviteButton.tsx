"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { Role } from "@prisma/client";
import { fetchWithRetry } from "@/lib/safe-fetch";

interface ResendInviteButtonProps {
  organizationId: string;
  email: string;
  targetRole: Role;
}

export function ResendInviteButton({
  organizationId,
  email,
  targetRole,
}: ResendInviteButtonProps) {
  const t = useTranslations("ResendInvite");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function friendlyResendError(apiError: string): string {
    if (/rate limit|rate_limit|too many requests|429/i.test(apiError)) {
      return t("rateLimit");
    }
    return apiError || t("failed");
  }

  async function handleResend() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetchWithRetry("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, email, targetRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(friendlyResendError(data.error ?? ""));
        return;
      }
      router.refresh();
    } catch {
      setError(tCommon("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        className="rounded px-2 py-1 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
      >
        {loading ? "…" : t("resend")}
      </button>
      {error && (
        <p className="max-w-[220px] text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
