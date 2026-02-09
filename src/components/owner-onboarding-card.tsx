"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2, Camera, Loader2 } from "lucide-react";

import { getInitials } from "@/lib/avatar";
import { fetchWithRetry } from "@/lib/safe-fetch";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { Button } from "@/components/ui/button";

const supabase = createSupabaseBrowserClient();

/**
 * Owner onboarding: same visual as the "Complete profile" modal, with an extra
 * organization name field. Shown on /onboarding when the user has no profile (first-time owner).
 */
export function OwnerOnboardingCard() {
  const t = useTranslations("Onboarding");
  const tProfile = useTranslations("ProfileEdit");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const [orgName, setOrgName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initials = getInitials(
    firstName.trim() || null,
    lastName.trim() || null,
  );

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) {
      setError(t("orgNameRequired"));
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError(t("nameRequired"));
      return;
    }
    setError(null);
    setLoading(true);

    try {
      let avatarPath: string | null = null;

      if (avatarFile) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          throw new Error(userError?.message ?? t("unableToLoadUser"));
        }
        const fileExt = avatarFile.name.split(".").pop() ?? "png";
        const safeExt = fileExt.toLowerCase();
        const path = `${user.id}/avatar-${Date.now()}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from("profile")
          .upload(path, avatarFile, {
            cacheControl: "3600",
            upsert: true,
          });

        if (uploadError) {
          setError(uploadError.message);
          setLoading(false);
          return;
        }
        avatarPath = path;
      }

      const res = await fetchWithRetry("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: orgName.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          avatarPath,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("createFailed"));
        setLoading(false);
        return;
      }

      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      router.replace("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("fetch")
          ? tCommon("networkError")
          : t("createFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md overflow-hidden rounded-2xl border border-primary/20 bg-card/95 shadow-xl shadow-primary/5 backdrop-blur-sm">
      <div className="p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="owner-orgName"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {t("orgName")}
            </label>
            <input
              id="owner-orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder={t("orgNamePlaceholder")}
              className="w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 text-foreground shadow-inner transition placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="flex flex-col items-center gap-3 sm:items-start">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {tProfile("avatar")}
              </label>
              <label className="group relative cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAvatarChange}
                />
                {avatarPreview ? (
                  <div className="relative">
                    {/* Avatar decorativo no onboarding; manter <img> é intencional. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={avatarPreview}
                      alt=""
                      className="h-24 w-24 rounded-2xl object-cover ring-2 ring-primary/20 shadow-lg transition group-hover:ring-primary/40"
                    />
                    <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/90 text-primary-foreground shadow-md transition group-hover:bg-primary">
                      <Camera className="h-4 w-4" />
                    </span>
                  </div>
                ) : (
                  <div className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-muted/50 text-muted-foreground transition group-hover:border-primary/30 group-hover:bg-muted">
                    <span className="text-2xl font-semibold tabular-nums">
                      {initials || "?"}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider">
                      <Camera className="h-3 w-3" />
                      {tProfile("change")}
                    </span>
                  </div>
                )}
              </label>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="owner-firstName"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {t("firstName")}
                </label>
                <input
                  id="owner-firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t("firstNamePlaceholder")}
                  className="w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 text-foreground shadow-inner transition placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="owner-lastName"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {t("lastName")}
                </label>
                <input
                  id="owner-lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t("lastNamePlaceholder")}
                  className="w-full rounded-xl border border-input bg-background/80 px-4 py-2.5 text-foreground shadow-inner transition placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border/50 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="w-full gap-2 shadow-lg shadow-primary/20 transition hover:shadow-primary/30 sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("creatingWorkspace")}
                </>
              ) : (
                t("createWorkspace")
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
