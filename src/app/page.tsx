"use client";

import { useState, type FormEvent } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthStatus = "idle" | "loading" | "success" | "error";

const supabase = createSupabaseBrowserClient();

export default function AuthPage() {
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function getRedirectUrl(): string | undefined {
    if (typeof window === "undefined") {
      return undefined;
    }

    return `${window.location.origin}/auth/callback`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email) {
      setErrorMessage("Email is required.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected error.",
      );
      setStatus("error");
    }
  }

  async function handleGithubSignIn() {
    setStatus("loading");
    setErrorMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: getRedirectUrl(),
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setStatus("error");
      }
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected error.",
      );
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-50">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
        <div className="mb-8 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to BurnWatch
          </h1>
          <p className="text-sm text-zinc-400">
            Enter your email and we&apos;ll send you a magic link. No passwords,
            just secure access to your workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-200"
            >
              Work email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
              autoComplete="email"
              required
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="flex w-full items-center justify-center rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "loading" ? "Sending magic link..." : "Send magic link"}
          </button>
        </form>

        <div className="mt-4">
          <button
            type="button"
            disabled={status === "loading"}
            onClick={() => {
              void handleGithubSignIn();
            }}
            className="flex w-full items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Continue with GitHub
          </button>
        </div>

        <div className="mt-4 min-h-[1.5rem] text-sm">
          {status === "success" && (
            <p className="text-emerald-400">
              Magic link sent. Check your inbox to continue.
            </p>
          )}
          {status === "error" && errorMessage && (
            <p className="text-rose-400">{errorMessage}</p>
          )}
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          By signing in, you agree to keep your cloud credentials safe. BurnWatch
          will only use read-only access to monitor spend on your behalf.
        </p>
      </div>
    </div>
  );
}
