"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

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
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleResend}
        disabled={loading}
        title={t("resend")}
        className="rounded-md p-1.5 text-muted-foreground transition hover:bg-blue-500/10 hover:text-blue-500 disabled:opacity-50"
      >
        <RefreshCw className="h-4 w-4" />
      </button>
      {error && (
        <p className="max-w-[220px] text-right text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
