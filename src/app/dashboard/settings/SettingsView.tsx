"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Settings,
  Save,
  Check,
  Camera,
  ShieldCheck,
  Zap,
  Trash2,
  AlertOctagon,
  Loader2,
} from "lucide-react";

import { getProfileAvatarUrl, getInitials } from "@/lib/avatar";
import { fetchWithRetry } from "@/lib/safe-fetch";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const supabase = createSupabaseBrowserClient();

export function SettingsView({
  userId,
  organizationId,
  organizationName,
  profileRole,
  initialFirstName,
  initialLastName,
  initialAvatarPath,
  initialAvatarUrl,
  email,
  showDeleteOrg,
  canEditOrgName,
}: {
  userId: string;
  organizationId: string;
  organizationName: string;
  profileRole: string;
  initialFirstName: string | null;
  initialLastName: string | null;
  initialAvatarPath: string | null;
  initialAvatarUrl: string | null;
  email?: string;
  showDeleteOrg: boolean;
  canEditOrgName: boolean;
}) {
  const t = useTranslations("Settings");
  const tRoles = useTranslations("Roles");
  const tProfileEdit = useTranslations("ProfileEdit");
  const router = useRouter();

  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [orgName, setOrgName] = useState(organizationName);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const displayAvatarUrl =
    avatarPreview ?? initialAvatarUrl ?? getProfileAvatarUrl(initialAvatarPath);
  const initials = getInitials(
    firstName.trim() || null,
    lastName.trim() || null,
  );
  const roleLabel = tRoles(profileRole as "OWNER" | "ADMIN" | "MEMBER");

  const isDirty =
    firstName !== (initialFirstName ?? "") ||
    lastName !== (initialLastName ?? "") ||
    (canEditOrgName && orgName.trim() !== organizationName) ||
    avatarFile !== null;

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setAvatarFile(file);
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    try {
      let avatarPath: string | null = initialAvatarPath;

      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop() ?? "png";
        const path = `${userId}/avatar-${Date.now()}.${fileExt.toLowerCase()}`;
        const { error: uploadError } = await supabase.storage
          .from("profile")
          .upload(path, avatarFile, { cacheControl: "3600", upsert: true });
        if (uploadError) {
          setError(uploadError.message);
          setSaving(false);
          return;
        }
        avatarPath = path;
      }

      const profileRes = await fetchWithRetry("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          avatarPath,
        }),
      });
      const profileData = (await profileRes.json()) as { error?: string };
      if (!profileRes.ok) {
        setError(profileData.error ?? tProfileEdit("saveFailed"));
        setSaving(false);
        return;
      }

      if (canEditOrgName && orgName.trim() && orgName.trim() !== organizationName) {
        const orgRes = await fetchWithRetry("/api/organization", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: orgName.trim() }),
        });
        const orgData = (await orgRes.json()) as { error?: string };
        if (!orgRes.ok) {
          setError(orgData.error ?? tProfileEdit("saveFailed"));
          setSaving(false);
          return;
        }
      }

      setSaved(true);
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(
        err instanceof TypeError && (err as Error).message?.includes("fetch")
          ? tProfileEdit("networkError")
          : tProfileEdit("saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteOrganization() {
    setDeleting(true);
    try {
      const res = await fetchWithRetry("/api/organization", { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Failed to delete organization");
        setDeleting(false);
        setDeleteModalOpen(false);
        return;
      }
      await supabase.auth.signOut();
      window.location.replace("/");
    } catch {
      setError("Network error");
      setDeleting(false);
      setDeleteModalOpen(false);
    }
  }

  return (
    <div className="min-h-screen flex-1 bg-slate-50 p-4 transition-colors duration-300 dark:bg-[#050505] md:p-8">
      <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t("title")}
              </h1>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
                {t("subtitle")}
              </p>
            </div>
          </div>
          <Button
            onClick={() =>
              (
                document.getElementById("settings-form") as HTMLFormElement
              )?.requestSubmit()
            }
            disabled={saving || !isDirty}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {saving ? t("saving") : saved ? t("saved") : t("saveChanges")}
          </Button>
        </div>

        <form id="settings-form" onSubmit={handleSubmit} className="space-y-8">
          {/* Profile */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-[#0a0a0a]">
            <div className="border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/20">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-zinc-600">
                {t("userProfileSection")}
              </h3>
            </div>
            <div className="flex flex-col gap-12 p-8 lg:flex-row">
              <div className="flex flex-col items-center gap-4">
                <div className="group relative">
                  <div className="flex h-28 w-28 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white p-1 transition-all group-hover:border-orange-500/50 dark:border-zinc-800 dark:bg-zinc-900">
                    {displayAvatarUrl ? (
                      <img
                        src={displayAvatarUrl}
                        alt=""
                        className="h-full w-full rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center rounded-xl text-2xl font-semibold text-slate-400 dark:text-zinc-500">
                        {initials || "?"}
                      </div>
                    )}
                  </div>
                  <label className="absolute -bottom-2 -right-2 cursor-pointer rounded-lg bg-orange-500 p-2 text-white shadow-lg transition-transform hover:scale-110">
                    <Camera size={16} />
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600">
                  {t("visualIdentity")}
                </p>
              </div>

              <div className="grid flex-1 grid-cols-1 gap-8 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                    {t("firstName")}
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-orange-500/50 dark:border-zinc-800 dark:bg-[#050505] dark:placeholder:text-zinc-800"
                    placeholder={tProfileEdit("firstNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                    {t("lastName")}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-orange-500/50 dark:border-zinc-800 dark:bg-[#050505] dark:placeholder:text-zinc-800"
                    placeholder={tProfileEdit("lastNamePlaceholder")}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                    {t("emailReadOnly")}
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      readOnly
                      value={email ?? ""}
                      className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-3 pl-4 pr-24 text-sm font-mono text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-500"
                    />
                    <div className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-2">
                      <span className="text-[8px] font-bold uppercase text-orange-500/50">
                        {t("verified")}
                      </span>
                      <ShieldCheck className="size-4 text-orange-500/40" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Organization */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors dark:border-zinc-800 dark:bg-[#0a0a0a]">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/20">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-zinc-600">
                {t("organizationSection")}
              </h3>
              {(profileRole === "OWNER" || profileRole === "ADMIN") && (
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-orange-600 dark:text-orange-500">
                  {roleLabel}
                </span>
              )}
            </div>
            <div className="space-y-8 p-8">
              <div className="flex flex-col gap-8 md:flex-row">
                <div className="flex-1 space-y-2">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                    {t("workspaceName")}
                  </label>
                  {canEditOrgName ? (
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none transition-all focus:border-orange-500/50 dark:border-zinc-800 dark:bg-[#050505]"
                    />
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 dark:border-zinc-800 dark:bg-[#050505] dark:text-zinc-300">
                      {organizationName}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                    {t("orgIdLabel")}
                  </label>
                  <div className="group flex cursor-default items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-400 dark:border-zinc-800 dark:bg-[#050505]">
                    <span>{organizationId}</span>
                    <Zap size={12} className="opacity-20 transition-all group-hover:text-orange-500 group-hover:opacity-100" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <p className="text-sm text-rose-500">{error}</p>
          )}
        </form>

        {/* Danger zone: only OWNER */}
        {showDeleteOrg && (
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
                  onClick={() => setDeleteModalOpen(true)}
                  className="shrink-0 gap-2 rounded-xl border-red-500/30 px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-red-600 transition-all hover:bg-red-500 hover:text-white dark:text-red-500 dark:hover:bg-red-500 dark:hover:text-white"
                >
                  <Trash2 size={14} />
                  {t("destroyWorkspace")}
                </Button>
              </div>
            </div>
          </section>
        )}

        <footer className="border-t border-slate-200 pb-16 pt-8 text-center dark:border-zinc-900/50">
          <p className="font-medium text-[9px] uppercase tracking-[0.5em] text-slate-400 dark:text-zinc-700">
            BurnWatch Protocol v1.0.4 • © 2026
          </p>
        </footer>
      </div>

      {/* Delete confirmation modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="border-red-500/30 bg-white dark:border-red-500/30 dark:bg-[#0a0a0a]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
              <AlertOctagon className="size-5" />
              {t("deleteOrgConfirmTitle")}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-zinc-400">
              {t("deleteOrgConfirmBody")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 border-t border-slate-200 pt-4 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
              disabled={deleting}
            >
              {t("deleteOrgConfirmCancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleDeleteOrganization()}
              disabled={deleting}
              className="gap-2"
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {t("deleteOrgConfirmConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
