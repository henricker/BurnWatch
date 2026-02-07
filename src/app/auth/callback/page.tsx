"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Zap, Loader2, CheckCircle2 } from "lucide-react";

import { fetchWithRetry } from "@/lib/safe-fetch";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CallbackStatus = "verifying" | "success" | "error";

const supabase = createSupabaseBrowserClient();

function CallbackLayout({
  children,
  showBranding = true,
}: {
  children: React.ReactNode;
  showBranding?: boolean;
}) {
  const tAuth = useTranslations("Auth");
  return (
    <div className="relative flex min-h-screen max-h-screen min-w-0 flex-col items-center justify-center overflow-hidden bg-slate-50 px-4 py-4 text-slate-900 transition-colors duration-500 dark:bg-[#050505] dark:text-[#f5f5f5]">
      {/* Background: grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(#64748b 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* Background: orange glow */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/10 blur-[100px]" />

      <div className="z-10 w-full max-w-[380px] shrink-0">
        {showBranding && (
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_0_24px_rgba(249,115,22,0.25)]">
              <Zap size={22} className="fill-white" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
              BurnWatch
            </h1>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500 dark:text-zinc-500">
              {tAuth("tagline")}
            </p>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function AuthCallbackContent() {
  const t = useTranslations("Callback");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>("verifying");
  const [message, setMessage] = useState<string>(t("confirmingSession"));

  useEffect(() => {
    async function confirmSession() {
      try {
        const errorCode = searchParams.get("error_code");
        const errorDesc = searchParams.get("error_description");
        if (
          errorCode === "otp_expired" ||
          (searchParams.get("error") === "access_denied" &&
            errorDesc?.includes("expired"))
        ) {
          setStatus("error");
          setMessage(t("linkExpired"));
          return;
        }

        await supabase.auth.initialize();

        const code = searchParams.get("code");
        if (code) {
          const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setStatus("error");
            setMessage(exchangeError.message ?? t("noSession"));
            return;
          }
        } else if (typeof window !== "undefined" && window.location.hash) {
          const params = new URLSearchParams(
            window.location.hash.replace(/^#/, ""),
          );
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (access_token && refresh_token) {
            const { error: setError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (setError) {
              setStatus("error");
              setMessage(setError.message ?? t("noSession"));
              return;
            }
          }
        }

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          setStatus("error");
          setMessage(error?.message ?? t("noSession"));
          return;
        }

        const response = await fetchWithRetry("/api/auth/complete", {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });
        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          setStatus("error");
          setMessage(data.error ?? t("authFailed"));
          return;
        }

        const dataJson = (await response.json()) as { next: string };

        setStatus("success");
        setMessage(t("signedInRedirecting"));

        setTimeout(() => {
          window.location.replace(dataJson.next);
        }, 1200);
      } catch (error: unknown) {
        setStatus("error");
        const isNetwork =
          error instanceof TypeError &&
          (error as Error).message?.includes("fetch");
        setMessage(
          isNetwork
            ? t("networkError")
            : error instanceof Error
              ? error.message
              : t("confirmSessionFailed"),
        );
      }
    }

    void confirmSession();
  }, [router, searchParams]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl transition-colors duration-500 dark:border-[#1a1a1a] dark:bg-[#0a0a0a]">
      <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-40" />
      <div className="p-6">
        {status === "success" ? (
          <div className="flex flex-col items-center py-2 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10 text-green-500 shadow-[0_0_16px_rgba(34,197,94,0.1)]">
              <CheckCircle2 size={28} />
            </div>
            <h2 className="mb-1 text-lg font-bold tracking-tight">
              {t("title")}
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {message}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">
                {t("title")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                {message}
              </p>
            </div>

            {status === "verifying" && (
              <div className="mt-6 flex justify-center">
                <Loader2
                  size={28}
                  className="animate-spin text-orange-500"
                  aria-hidden
                />
              </div>
            )}

            {status === "error" && (
              <button
                type="button"
                onClick={() => router.replace("/login")}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98]"
              >
                {t("backToSignIn")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CallbackFallback() {
  const t = useTranslations("Callback");
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#1a1a1a] dark:bg-[#0a0a0a]">
      <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-40" />
      <div className="flex flex-col items-center justify-center gap-4 p-8">
        <Loader2
          size={32}
          className="animate-spin text-orange-500"
          aria-hidden
        />
        <p className="text-sm text-slate-500 dark:text-zinc-400">
          {t("confirmingSession")}
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <CallbackLayout>
          <CallbackFallback />
        </CallbackLayout>
      }
    >
      <CallbackLayout>
        <AuthCallbackContent />
      </CallbackLayout>
    </Suspense>
  );
}
