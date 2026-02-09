"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { getProfileAvatarUrl, getInitials } from "@/lib/avatar";
import { fetchWithRetry } from "@/lib/safe-fetch";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface ProfileEditFormProps {
  userId: string;
  organizationId: string;
  initialFirstName: string | null;
  initialLastName: string | null;
  initialAvatarPath: string | null;
  initialAvatarUrl: string | null;
}

const supabase = createSupabaseBrowserClient();

export function ProfileEditForm({
  userId,
  organizationId,
  initialFirstName,
  initialLastName,
  initialAvatarPath,
  initialAvatarUrl,
}: ProfileEditFormProps) {
  const t = useTranslations("ProfileEdit");
  const router = useRouter();
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const displayAvatarUrl =
    avatarPreview ?? initialAvatarUrl ?? getProfileAvatarUrl(initialAvatarPath);
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
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      let avatarPath: string | null = initialAvatarPath;

      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop() ?? "png";
        const safeExt = fileExt.toLowerCase();
        const path = `${userId}/avatar-${Date.now()}.${safeExt}`;

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

      const res = await fetchWithRetry("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          avatarPath,
        }),
      });

      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("saveFailed"));
        return;
      }

      setSuccess(true);
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError(
        e instanceof TypeError && e.message.includes("fetch")
          ? t("networkError")
          : t("saveFailed"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-start gap-2">
          <label className="text-sm font-medium text-muted-foreground">{t("avatar")}</label>
          <div className="relative">
            {displayAvatarUrl ? (
              // Avatar é meramente decorativo no formulário de perfil; manter <img> aqui é intencional.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayAvatarUrl}
                alt=""
                className="h-24 w-24 rounded-full object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-2xl text-muted-foreground">
                {initials}
              </div>
            )}
            <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-muted p-1.5 text-muted-foreground transition hover:bg-muted/80 hover:text-foreground">
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatarChange}
              />
              <span className="text-xs">{t("change")}</span>
            </label>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <label
              htmlFor="profile-firstName"
              className="block text-sm font-medium text-muted-foreground"
            >
              {t("firstName")}
            </label>
            <input
              id="profile-firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              placeholder={t("firstNamePlaceholder")}
            />
          </div>
          <div>
            <label
              htmlFor="profile-lastName"
              className="block text-sm font-medium text-muted-foreground"
            >
              {t("lastName")}
            </label>
            <input
              id="profile-lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
              placeholder={t("lastNamePlaceholder")}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {success && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">{t("updated")}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {loading ? t("saving") : t("saveChanges")}
      </button>
    </form>
  );
}
