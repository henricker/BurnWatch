"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Zap,
  Mail,
  Github,
  ArrowRight,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Terminal,
  Activity,
} from "lucide-react";

import { LandingLocaleToggle } from "@/components/landing-locale-toggle";
import { LandingThemeToggle } from "@/components/landing-theme-toggle";
import { fetchWithRetry } from "@/lib/safe-fetch";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthStatus = "idle" | "loading" | "success" | "error";

const supabase = createSupabaseBrowserClient();

export default function LoginPage() {
  const t = useTranslations("Auth");
  const tCommon = useTranslations("Common");
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function getRedirectUrl(): string | undefined {
    if (typeof window === "undefined") return undefined;
    return `${window.location.origin}/auth/callback`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) {
      setErrorMessage(t("emailRequired"));
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetchWithRetry("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setErrorMessage(data.error ?? t("unexpectedError"));
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMessage(tCommon("networkError"));
      setStatus("error");
    }
  }

  async function handleGithubSignIn() {
    setStatus("loading");
    setErrorMessage(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: getRedirectUrl() },
      });
      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : t("unexpectedError"),
      );
      setStatus("error");
    }
  }

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

      {/* Top bar: back to landing */}
      <div className="absolute left-4 right-4 top-4 z-20 flex items-center justify-between">
        <Link
          href="/"
          className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-all hover:text-orange-500"
        >
          <ChevronLeft
            size={14}
            className="transition-transform group-hover:-translate-x-1"
          />
          {t("backToLanding")}
        </Link>
      </div>

      <div className="z-10 w-full max-w-[380px] shrink-0 animate-in fade-in zoom-in-95 duration-700">
        {/* Branding */}
        <div className="mb-4 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_0_24px_rgba(249,115,22,0.25)] transition-transform duration-300 hover:rotate-3">
            <Zap size={22} className="fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tighter text-slate-900 dark:text-white">
            BurnWatch
          </h1>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.35em] text-slate-500 dark:text-zinc-500">
            {t("tagline")}
          </p>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl transition-colors duration-500 dark:border-[#1a1a1a] dark:bg-[#0a0a0a]">
          <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-orange-500 to-transparent opacity-40" />
          <div className="p-5">
            {status === "success" ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 py-3 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-green-500/20 bg-green-500/10 text-green-500 shadow-[0_0_16px_rgba(34,197,94,0.1)]">
                  <CheckCircle2 size={28} />
                </div>
                <h2 className="mb-2 text-lg font-bold tracking-tight">
                  {t("linkSentTitle")}
                </h2>
                <p className="mb-6 text-center text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
                  {t("linkSentDescription")}
                  <br />
                  <span className="mt-1.5 inline-block rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
                    {email}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setStatus("idle")}
                  className="border-b border-orange-500/20 pb-0.5 text-[9px] font-bold uppercase tracking-widest text-orange-500 transition-colors hover:text-orange-600"
                >
                  {t("useAnotherEmail")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-xl font-bold tracking-tight">
                    {t("title")}
                  </h2>
                  <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-zinc-500">
                    {t("accessWorkspace")}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-0.5">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                        {t("workEmail")}
                      </label>
                      <Terminal
                        size={11}
                        className="text-orange-500 opacity-50"
                      />
                    </div>
                    <div className="relative group">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-orange-500"
                      />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t("emailPlaceholder")}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-10 py-3 text-sm shadow-inner outline-none transition-all placeholder:text-slate-300 focus:border-orange-500/50 dark:border-[#1a1a1a] dark:bg-[#050505] dark:placeholder:text-zinc-800"
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  {status === "error" && errorMessage && (
                    <p className="text-xs text-rose-500">{errorMessage}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 disabled:opacity-50 active:scale-[0.98]"
                  >
                    {status === "loading" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <>
                        {t("sendMagicLink")} <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </form>

                <div className="relative py-1.5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100 dark:border-zinc-900/50" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-[8px] font-bold uppercase tracking-[0.25em] text-slate-400 dark:bg-[#0a0a0a] dark:text-zinc-600">
                      {t("orContinueWith")}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={status === "loading"}
                  onClick={() => void handleGithubSignIn()}
                  className="group flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-900 shadow-sm transition-all hover:bg-slate-100 dark:border-[#1a1a1a] dark:bg-[#050505] dark:text-white dark:hover:bg-[#0f0f0f] disabled:opacity-50"
                >
                  <Github
                    size={18}
                    className="transition-transform duration-300 group-hover:rotate-12"
                  />
                  {t("continueWithGithub")}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trust footer */}
        <div className="mt-4 flex animate-in flex-col items-center gap-2 px-2 fade-in duration-1000 delay-500">
          <div className="flex items-center gap-1.5 rounded-full border border-green-500/10 bg-green-500/5 px-2.5 py-1 shadow-sm">
            <Activity size={10} className="text-green-500 animate-pulse" />
            <span className="text-[8px] font-bold uppercase tracking-widest text-green-600 dark:text-green-500">
              {t("multiCloudActive")}
            </span>
          </div>
          <div className="flex cursor-default justify-center gap-4 grayscale opacity-25 transition-all duration-700 hover:grayscale-0 hover:opacity-100">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
              AWS
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
              Vercel
            </span>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest">
              GCP
            </span>
          </div>
        </div>
      </div>

      <LandingThemeToggle />
      <LandingLocaleToggle />
    </div>
  );
}
