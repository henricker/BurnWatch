"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserMinus } from "lucide-react";
import { fetchWithRetry } from "@/lib/safe-fetch";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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
      setOpen(false);
      router.refresh();
    } catch {
      alert(tCommon("networkError"));
    } finally {
      setLoading(false);
    }
  }

  const displayName =
    memberName?.trim() || t("thisMember");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded px-2 py-1 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {t("remove")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={!loading}
          className="w-[min(100%-2rem,20rem)] gap-0 overflow-hidden border-destructive/20 bg-card/95 p-0 shadow-xl shadow-destructive/5 backdrop-blur-sm sm:rounded-xl"
        >
          <DialogHeader className="flex flex-row items-start gap-3 p-4 pb-2 pr-10">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <UserMinus className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
              <DialogTitle className="text-base font-bold tracking-tight">
                {t("modalTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t("confirm", { name: displayName })}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-row justify-end gap-2 border-t border-border/50 px-4 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              {t("no")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={loading}
            >
              {loading ? "…" : t("yes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
