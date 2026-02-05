"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fetchWithRetry } from "@/lib/safe-fetch";

interface RemoveMemberButtonProps {
  profileId: string;
  memberName: string;
}

export function RemoveMemberButton({
  profileId,
  memberName,
}: RemoveMemberButtonProps) {
  const t = useTranslations("RemoveMember");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleRemove() {
    setLoading(true);
    try {
      const res = await fetchWithRetry(`/api/members/${profileId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? t("failed"));
        return;
      }
      setConfirm(false);
      router.refresh();
    } catch {
      alert(tCommon("networkError"));
    } finally {
      setLoading(false);
    }
  }

  if (!confirm) {
    return (
      <button
        type="button"
        onClick={() => setConfirm(true)}
        className="rounded px-2 py-1 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {t("remove")}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {t("confirm", { name: memberName || t("thisMember") })}
      </span>
      <button
        type="button"
        onClick={handleRemove}
        disabled={loading}
        className="rounded px-2 py-1 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {loading ? "…" : t("yes")}
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {t("no")}
      </button>
    </div>
  );
}
