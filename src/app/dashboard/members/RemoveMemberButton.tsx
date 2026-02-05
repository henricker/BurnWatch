"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchWithRetry } from "@/lib/safe-fetch";

interface RemoveMemberButtonProps {
  profileId: string;
  memberName: string;
}

export function RemoveMemberButton({
  profileId,
  memberName,
}: RemoveMemberButtonProps) {
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
        alert(data.error ?? "Failed to remove member.");
        return;
      }
      setConfirm(false);
      router.refresh();
    } catch {
      alert("Network error. Please try again.");
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
        Remover
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        Remover {memberName || "este membro"}?
      </span>
      <button
        type="button"
        onClick={handleRemove}
        disabled={loading}
        className="rounded px-2 py-1 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {loading ? "…" : "Sim"}
      </button>
      <button
        type="button"
        onClick={() => setConfirm(false)}
        className="rounded px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        Não
      </button>
    </div>
  );
}
