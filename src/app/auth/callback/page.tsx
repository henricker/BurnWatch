"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { fetchWithRetry } from "@/lib/safe-fetch";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CallbackStatus = "verifying" | "success" | "error";

const supabase = createSupabaseBrowserClient();

function AuthCallbackContent() {
  const t = useTranslations("Callback");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>("verifying");
  const [message, setMessage] = useState<string>(t("confirmingSession"));

  useEffect(() => {
    async function confirmSession() {
      try {
        // For implicit flow, initialize the client so it can
        // capture tokens from the URL fragment if present.
        await supabase.auth.initialize();

        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          setStatus("error");
          setMessage(error?.message ?? t("noSession"));
          return;
        }

        // Send the session token so the server can complete auth (invite application, etc.).
        // The server may not have the session in cookies yet when coming from a magic link.
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
          router.replace(dataJson.next);
        }, 1200);
      } catch (error: unknown) {
        setStatus("error");
        const isNetwork =
          error instanceof TypeError && (error as Error).message?.includes("fetch");
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-50">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-zinc-400">{message}</p>
        </div>

        {status === "verifying" && (
          <div className="mt-6 h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-100" />
        )}

        {status === "error" && (
          <button
            type="button"
            onClick={() => router.replace("/")}
            className="mt-6 flex w-full items-center justify-center rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white"
          >
            {t("backToSignIn")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-50">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-100" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

