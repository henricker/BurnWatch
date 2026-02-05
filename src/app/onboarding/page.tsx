"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";

import { fetchWithRetry } from "@/lib/safe-fetch";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type OnboardingStatus = "idle" | "loading" | "success" | "error";

const supabase = createSupabaseBrowserClient();

export default function OnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState<string>("");
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [status, setStatus] = useState<OnboardingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setAvatarFile(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgName.trim()) {
      setErrorMessage("Organization name is required.");
      setStatus("error");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage("First name and last name are required.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    try {
      let avatarPath: string | null = null;

      if (avatarFile) {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          throw new Error(
            error?.message ?? "Unable to load authenticated user for avatar.",
          );
        }

        const fileExt = avatarFile.name.split(".").pop() ?? "png";
        const safeExt = fileExt.toLowerCase();
        const path = `${user.id}/avatar-${Date.now()}.${safeExt}`;

        const uploadResult = await supabase.storage
          .from("profile")
          .upload(path, avatarFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadResult.error) {
          throw new Error(uploadResult.error.message);
        }

        avatarPath = path;
      }

      const response = await fetchWithRetry("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: orgName.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          avatarPath,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setStatus("error");
        setErrorMessage(
          data.error ?? "Failed to create organization. Please try again.",
        );
        return;
      }

      setStatus("success");

      setTimeout(() => {
        router.replace("/dashboard");
      }, 1000);
    } catch (error: unknown) {
      setStatus("error");
      const isNetwork =
        error instanceof TypeError && (error as Error).message?.includes("fetch");
      setErrorMessage(
        isNetwork
          ? "Network error. Please try again."
          : error instanceof Error
            ? error.message
            : "Unexpected error.",
      );
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-50">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-xl">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create your workspace
          </h1>
          <p className="text-sm text-zinc-400">
            Before you start tracking spend, we need to create your Organization
            (workspace). This step is required.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="org-name"
              className="block text-sm font-medium text-zinc-200"
            >
              Organization name
            </label>
            <input
              id="org-name"
              type="text"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              placeholder="ex: Acme Infra, My Startup"
              className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="first-name"
                className="block text-sm font-medium text-zinc-200"
              >
                First name
              </label>
              <input
                id="first-name"
                type="text"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="Jane"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="last-name"
                className="block text-sm font-medium text-zinc-200"
              >
                Last name
              </label>
              <input
                id="last-name"
                type="text"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                placeholder="Doe"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-50 outline-none ring-0 transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/40"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="avatar"
              className="block text-sm font-medium text-zinc-200"
            >
              Avatar (optional)
            </label>
            <input
              id="avatar"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-900 hover:file:bg-white"
            />
            <p className="text-xs text-zinc-500">
              Used in headers/sidebars. You can change this later.
            </p>
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="flex w-full items-center justify-center rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {status === "loading" ? "Creating workspace..." : "Create workspace"}
          </button>
        </form>

        <div className="mt-4 min-h-[1.5rem] text-sm">
          {status === "success" && (
            <p className="text-emerald-400">
              Workspace created. Redirecting to your dashboard...
            </p>
          )}
          {status === "error" && errorMessage && (
            <p className="text-rose-400">{errorMessage}</p>
          )}
        </div>

        <p className="mt-6 text-xs text-zinc-500">
          BurnWatch will use this Organization as the primary container for your
          cloud accounts, spend data and alerts.
        </p>
      </div>
    </div>
  );
}

