"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UserPlus, X, CheckCircle2 } from "lucide-react";

import type { Role } from "@prisma/client";
import { fetchWithRetry } from "@/lib/safe-fetch";

interface InviteMemberButtonProps {
  organizationId: string;
  currentUserRole: Role;
  allowInviteAdmin: boolean;
  /** Override button label (e.g. "Novo Membro" on members page). */
  buttonLabel?: string;
}

export function InviteMemberButton({
  organizationId,
  currentUserRole,
  allowInviteAdmin,
  buttonLabel,
}: InviteMemberButtonProps) {
  const t = useTranslations("Invite");
  const tRoles = useTranslations("Roles");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [targetRole, setTargetRole] = useState<Role>("MEMBER");
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

  const label = buttonLabel ?? t("button");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 active:scale-[0.98]"
      >
        <UserPlus className="h-3.5 w-3.5" />
        {label}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="p-6">
              <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg border border-primary/20 bg-primary/10 p-2 text-primary">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <h2 id="invite-title" className="text-lg font-bold tracking-tight text-foreground">
                    {t("title")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setError(null);
                  }}
                  className="rounded-md p-1 text-muted-foreground transition hover:text-foreground"
                  aria-label={t("cancel")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="invite-email"
                    className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    {t("emailLabel")}
                  </label>
                  <input
                    id="invite-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm shadow-inner outline-none transition placeholder:text-muted-foreground focus:border-primary/50"
                    placeholder={t("emailPlaceholder")}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("role")}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTargetRole("MEMBER")}
                      className={`flex flex-col rounded-xl border p-4 text-left shadow-sm transition ${
                        targetRole === "MEMBER"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/30 hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                          {tRoles("MEMBER")}
                        </span>
                        {targetRole === "MEMBER" && (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <p className="text-[9px] leading-tight text-muted-foreground">
                        {t("memberCardDesc")}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => allowInviteAdmin && setTargetRole("ADMIN")}
                      disabled={!allowInviteAdmin}
                      className={`flex flex-col rounded-xl border p-4 text-left shadow-sm transition ${
                        targetRole === "ADMIN"
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/30 hover:border-muted-foreground/30"
                      } ${!allowInviteAdmin ? "cursor-not-allowed opacity-60" : ""}`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-foreground">
                          {tRoles("ADMIN")}
                        </span>
                        {targetRole === "ADMIN" && (
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                        )}
                      </div>
                      <p className="text-[9px] leading-tight text-muted-foreground">
                        {t("adminCardDesc")}
                      </p>
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setError(null);
                    }}
                    className="flex-1 rounded-lg border border-border px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground transition hover:bg-muted"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-lg bg-primary px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50"
                  >
                    {loading ? t("sending") : t("sendInvite")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
