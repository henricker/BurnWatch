"use client";

import { useTranslations } from "next-intl";
import { UserX, Zap } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SubscriptionBlockedMemberModal() {
  const t = useTranslations("Subscription");

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-md border-slate-200 dark:border-zinc-800 z-[100]"
        overlayClassName="backdrop-blur-xl bg-black/80"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 rounded-xl shrink-0">
              <UserX className="size-8 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl text-slate-900 dark:text-white">
                {t("memberBlockedTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
                {t("memberBlockedDescription")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 mt-4">
          <Zap className="size-4 text-amber-500 shrink-0" />
          <p className="text-[10px] font-medium uppercase tracking-widest text-amber-700 dark:text-amber-400">
            {t("memberBlockedHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
