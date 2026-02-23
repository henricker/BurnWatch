"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Zap } from "lucide-react";

import { fetchWithRetry } from "@/lib/safe-fetch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type PlanSlug = "STARTER" | "PRO";

export function SubscriptionRequiredModal({ allowTrial = true }: { allowTrial?: boolean }) {
  const t = useTranslations("Subscription");
  const [loading, setLoading] = useState<PlanSlug | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChoosePlan = async (plan: PlanSlug) => {
    setLoading(plan);
    setError(null);
    try {
      const res = await fetchWithRetry("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, allowTrial }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (json.url) {
        window.location.href = json.url;
        return;
      }
      setError(json.error ?? t("failedToLoad"));
    } catch {
      setError(t("failedToLoad"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg border-slate-200 dark:border-zinc-800 z-[100]"
        overlayClassName="backdrop-blur-xl bg-black/80"
        showCloseButton={false}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/10 rounded-xl shrink-0">
              <Zap className="size-8 text-orange-500" />
            </div>
            <div>
              <DialogTitle className="text-xl text-slate-900 dark:text-white">
                {t("requiredModalTitle")}
              </DialogTitle>
              <DialogDescription className="text-sm text-slate-600 dark:text-zinc-400 mt-1">
                {allowTrial ? t("requiredModalDescription") : t("requiredModalDescriptionNoTrial")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="pt-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => void handleChoosePlan("STARTER")}
              disabled={loading !== null}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-colors",
                "border-slate-200 dark:border-zinc-700 hover:border-orange-500/50 hover:bg-orange-500/5",
                "disabled:opacity-60 disabled:pointer-events-none",
              )}
            >
              <span className="font-bold text-slate-900 dark:text-white">
                {t("planStarter")}
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                {t("detailsStarterHistory")} · {t("detailsStarterMembers")}
              </span>
              {allowTrial && (
                <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-500">
                  {t("requiredModalTrialStarter")}
                </span>
              )}
              {loading === "STARTER" ? (
                <Loader2 className="mt-1 size-4 animate-spin text-orange-500" />
              ) : (
                <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-500">
                  <Check className="size-3.5" />
                  {allowTrial ? t("requiredModalCta") : t("requiredModalCtaNoTrial")}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => void handleChoosePlan("PRO")}
              disabled={loading !== null}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-colors",
                "border-orange-500/50 bg-orange-500/5 hover:bg-orange-500/10",
                "disabled:opacity-60 disabled:pointer-events-none",
              )}
            >
              <span className="font-bold text-slate-900 dark:text-white">
                {t("planPro")}
              </span>
              <span className="text-xs text-slate-500 dark:text-zinc-400">
                {t("detailsProHistory")} · {t("detailsProMembers")}
              </span>
              {allowTrial && (
                <span className="text-[10px] font-semibold text-orange-600 dark:text-orange-500">
                  {t("requiredModalTrialPro")}
                </span>
              )}
              {loading === "PRO" ? (
                <Loader2 className="mt-1 size-4 animate-spin text-orange-500" />
              ) : (
                <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-500">
                  <Check className="size-3.5" />
                  {allowTrial ? t("requiredModalCta") : t("requiredModalCtaNoTrial")}
                </span>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
