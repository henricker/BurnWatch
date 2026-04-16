"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { AlertOctagon, CalendarClock, CreditCard, Loader2, Zap, ExternalLink, Trash2 } from "lucide-react";

import { fetchWithRetry } from "@/lib/safe-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SubscriptionData = {
  plan: "STARTER" | "PRO";
  status: string;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  hasPortal: boolean;
};

export function SubscriptionView() {
  const t = useTranslations("Subscription");
  const searchParams = useSearchParams();
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const refetchedForSuccess = useRef(false);
  const initialLoadDone = useRef(false);

  const loadSubscription = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry("/api/subscription", { cache: "no-store" });
      if (!res.ok) {
        setError(t("failedToLoad"));
        return;
      }
      const json = (await res.json()) as SubscriptionData;
      setData(json);
    } catch {
      setError(t("failedToLoad"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    void loadSubscription(true);
  }, [loadSubscription]);

  const success = searchParams.get("success") === "1";
  useEffect(() => {
    if (!success || refetchedForSuccess.current) return;
    refetchedForSuccess.current = true;
    const id = window.setTimeout(() => {
      void loadSubscription(false);
    }, 1500);
    return () => clearTimeout(id);
  }, [success, loadSubscription]);

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const res = await fetchWithRetry("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: "PRO" }),
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
      setCheckoutLoading(false);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetchWithRetry("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] transition-colors p-8 md:p-12 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t("title")}
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-[0.2em] font-black mt-1">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>

        {success && (
          <div
            className="rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-700 dark:text-green-400"
            role="alert"
          >
            {t("successMessage")}
          </div>
        )}

        {data?.cancelAt && (
          <div
            className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            role="status"
          >
            <div className="flex items-start gap-3 min-w-0">
              <CalendarClock className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {t("cancelScheduledTitle")}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
                  {t("cancelScheduledDescription", {
                    date: new Date(data.cancelAt).toLocaleDateString(undefined, {
                      dateStyle: "long",
                    }),
                  })}
                </p>
              </div>
            </div>
            {data.hasPortal && (
              <div className="shrink-0 flex flex-col items-end gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300 dark:hover:bg-amber-500/10 dark:hover:text-amber-200"
                >
                  {portalLoading ? (
                    <Loader2 size={14} className="animate-spin mr-2" />
                  ) : (
                    <ExternalLink size={14} className="mr-2" />
                  )}
                  {t("cancelScheduledReactivate")}
                </Button>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 text-right max-w-[200px]">
                  {t("portalReturnHint")}
                </span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </div>
        )}

        <Card className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] shadow-sm overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-zinc-900/50 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-50 dark:bg-[#050505] rounded-xl border border-slate-100 dark:border-zinc-900 shrink-0">
                  <Zap className="size-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    {t("currentPlan")}
                  </CardTitle>
                  <CardDescription className="text-[10px] font-mono uppercase mt-0.5 text-slate-500 dark:text-zinc-500">
                    {data?.plan === "PRO" ? t("planPro") : t("planStarterUnlimited")}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-2 text-sm text-slate-600 dark:text-zinc-400">
              {data?.plan === "PRO" ? (
                <>
                  <p>{t("detailsProHistory")}</p>
                  <p>{t("detailsProMembers")}</p>
                </>
              ) : (
                <>
                  <p>{t("detailsStarterHistory")}</p>
                  <p>{t("detailsStarterMembers")}</p>
                </>
              )}
            </div>

            {data?.plan === "STARTER" ? (
              <Button
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold uppercase tracking-widest shadow-lg shadow-orange-500/20"
              >
                {checkoutLoading ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : null}
                {t("upgradeToPro")}
              </Button>
            ) : data?.hasPortal ? (
              <div className="space-y-4">
                <p className="text-[10px] text-slate-500 dark:text-zinc-500 leading-relaxed">
                  {t("manageSubscriptionDesc")}
                </p>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 leading-relaxed">
                  {t("portalReturnHint")}
                </p>
                <Button
                  variant="outline"
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="w-full h-11 border-slate-200 dark:border-zinc-800"
                >
                  {portalLoading ? (
                    <Loader2 size={16} className="animate-spin mr-2" />
                  ) : (
                    <ExternalLink size={14} className="mr-2" />
                  )}
                  {t("manageSubscription")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {data?.hasPortal && !data?.cancelAt && (
          <section className="overflow-hidden rounded-2xl border border-red-500/20 bg-red-500/[0.02] shadow-sm">
            <div className="flex items-center gap-2 border-b border-red-500/20 bg-red-500/5 px-6 py-4">
              <AlertOctagon size={16} className="text-red-500" />
              <h3 className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-red-600 dark:text-red-500">
                {t("dangerZoneTitle")}
              </h3>
            </div>
            <div className="p-8">
              <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
                <div className="space-y-1 text-center md:text-left">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {t("dangerZoneDescription")}
                  </h4>
                  <p className="max-w-md text-xs leading-relaxed text-slate-500 dark:text-zinc-500">
                    {t("dangerZoneBody")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="shrink-0 gap-2 rounded-xl border-red-500/30 px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-red-600 transition-all hover:bg-red-500 hover:text-white dark:text-red-500 dark:hover:bg-red-500 dark:hover:text-white"
                >
                  <Trash2 size={14} />
                  {t("cancelSubscription")}
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
