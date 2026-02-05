"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import type { Role } from "@prisma/client";
import { fetchWithRetry } from "@/lib/safe-fetch";

interface InviteMemberButtonProps {
  organizationId: string;
  currentUserRole: Role;
  allowInviteAdmin: boolean;
}

export function InviteMemberButton({
  organizationId,
  currentUserRole,
  allowInviteAdmin,
}: InviteMemberButtonProps) {
  const t = useTranslations("Invite");
  const tRoles = useTranslations("Roles");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] = useState<Role>(
    allowInviteAdmin ? "MEMBER" : "MEMBER",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetchWithRetry("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, email: email.trim(), targetRole }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("failedToSend"));
        return;
      }
      setOpen(false);
      setEmail("");
      setTargetRole("MEMBER");
      router.refresh();
    } catch {
      setError(tCommon("networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
      >
        {t("button")}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
            <h2 id="invite-title" className="text-lg font-semibold text-foreground">
              {t("title")}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="invite-email"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  {t("email")}
                </label>
                <input
                  id="invite-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                  placeholder={t("emailPlaceholder")}
                />
              </div>
              <div>
                <label
                  htmlFor="invite-role"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  {t("role")}
                </label>
                <select
                  id="invite-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as Role)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
                >
                  <option value="MEMBER">{tRoles("MEMBER")}</option>
                  {allowInviteAdmin && (
                    <option value="ADMIN">{tRoles("ADMIN")}</option>
                  )}
                </select>
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? t("sending") : t("sendInvite")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
