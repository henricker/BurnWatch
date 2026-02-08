"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Cloud,
  Database,
  Globe,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
  Zap,
  Save,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import {
  validateAwsCredentials,
  validateGcpCredentials,
  validateVercelCredentials,
} from "@/modules/cloud-provider-credentials/util/cloud-credentials";
import { fetchWithRetry } from "@/lib/safe-fetch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type CloudProvider = "AWS" | "VERCEL" | "GCP";

type CloudAccountStatus = "SYNCED" | "SYNCING" | "SYNC_ERROR";

/** Keys stored in lastSyncError; map to translated messages in Connections. */
const SYNC_ERROR_VERCEL_FORBIDDEN = "vercel-forbidden-error-sync";

type AccountRow = {
  id: string;
  provider: CloudProvider;
  label: string;
  status: CloudAccountStatus;
  lastSyncError: string | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const SYNC_MOCK_DURATION_MS = 2500;

function ProviderLogo({ provider }: { provider: string }) {
  const className = "size-4";
  switch (provider) {
    case "AWS":
      return <Cloud className={className} style={{ color: "#ff9900" }} />;
    case "VERCEL":
      return <Zap className={className} />;
    case "GCP":
      return <Globe className={className} style={{ color: "#4285f4" }} />;
    default:
      return <Database className={className} />;
  }
}

function credentialTypeLabel(provider: string): string {
  switch (provider) {
    case "AWS":
      return "RO_ACCESS_KEY";
    case "VERCEL":
      return "API_TOKEN";
    case "GCP":
      return "SERVICE_ACCOUNT";
    default:
      return "—";
  }
}

function formatLastSync(
  lastSyncedAt: string | null,
  isSyncing: boolean,
  t: (k: string) => string,
): string {
  if (isSyncing) return t("syncingEllipsis");
  const dateStr = lastSyncedAt;
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
}

function StatCard({
  label,
  value,
  subtext,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  subtext: string;
  icon: React.ReactNode;
  color: "orange" | "blue" | "zinc";
}) {
  const colorStyles = {
    orange:
      "text-orange-500 bg-orange-500/5 border-orange-500/10 dark:border-orange-500/20",
    blue: "text-blue-500 bg-blue-500/5 border-blue-500/10 dark:border-blue-500/20",
    zinc: "text-slate-500 dark:text-zinc-400 bg-slate-500/5 dark:bg-zinc-400/5 border-slate-200 dark:border-zinc-800",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-[#0a0a0a] group">
      <div
        className={`absolute top-0 right-0 rounded-bl-lg border p-3 opacity-10 transition-transform group-hover:scale-110 ${colorStyles[color]}`}
      >
        {icon}
      </div>
      <div className="relative z-10 text-left">
        <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-600">
          {label}
        </span>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tighter text-slate-900 dark:text-white">
            {value}
          </span>
          <span className="text-[9px] font-mono uppercase tracking-widest font-bold text-slate-500 dark:text-zinc-500">
            {subtext}
          </span>
        </div>
      </div>
    </div>
  );
}

export function ConnectionsView() {
  const t = useTranslations("Connections");
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalAccount, setEditModalAccount] = useState<AccountRow | null>(null);
  const [deleteModalAccount, setDeleteModalAccount] = useState<AccountRow | null>(null);

  async function loadAccounts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry("/api/cloud-accounts");
      if (!res.ok) {
        setError(t("failedToLoad"));
        return;
      }
      const data = (await res.json()) as { accounts: AccountRow[] };
      setAccounts(data.accounts ?? []);
    } catch {
      setError(t("failedToLoad"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.provider.toLowerCase().includes(q),
    );
  }, [accounts, searchQuery]);

  const syncHealthPercent =
    accounts.length === 0
      ? 100
      : Math.round(
          (accounts.filter((a) => a.status === "SYNCED").length / accounts.length) * 100,
        );

  const addSyncing = (id: string) => {
    setSyncingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, SYNC_MOCK_DURATION_MS);
  };

  async function handleSyncClick(acc: AccountRow) {
    addSyncing(acc.id);
    try {
      const res = await fetchWithRetry(`/api/cloud-accounts/${acc.id}`, {
        method: "POST",
      });
      const data = (await res.json()).catch(() => null) as {
        lastSyncedAt?: string | null;
        status?: CloudAccountStatus;
        lastSyncError?: string | null;
      } | null;
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(acc.id);
        return next;
      });
      if (!res.ok || !data) return;
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === acc.id
            ? {
                ...a,
                lastSyncedAt: data?.lastSyncedAt ?? a.lastSyncedAt,
                status: data?.status ?? "SYNCED",
                lastSyncError: data?.lastSyncError ?? null,
              }
            : a,
        ),
      );
    } catch {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(acc.id);
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen space-y-8 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-zinc-800/50 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t("title")}
              </h1>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
                {t("subtitle")}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 active:scale-95"
          >
            <Plus size={14} />
            {t("connectCloud")}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label={t("statNodes")}
            value={accounts.length}
            subtext={t("statNodesSubtext")}
            icon={<Database size={16} />}
            color="orange"
          />
          <StatCard
            label={t("statHealth")}
            value={`${syncHealthPercent}%`}
            subtext={t("statHealthSubtext")}
            icon={<TrendingUp size={16} />}
            color="blue"
          />
          <StatCard
            label={t("statSecurity")}
            value="GCM"
            subtext={t("statSecuritySubtext")}
            icon={<ShieldCheck size={16} />}
            color="zinc"
          />
        </div>

        {/* Search */}
        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-[#0a0a0a]">
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-zinc-600"
            />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              className="w-full border-none bg-transparent py-2 pl-9 pr-4 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-zinc-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#0a0a0a]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900/20">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-zinc-600">
              {t("tableTitle")}
            </h3>
            <span className="rounded border border-orange-500/10 bg-orange-500/5 px-2 py-0.5 font-mono text-[9px] text-orange-500">
              {t("readOnlyAccess")}
            </span>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-slate-500 dark:text-zinc-500">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-2 py-12 text-rose-500">
                <AlertTriangle className="size-5" />
                <span className="text-sm">{error}</span>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/30 dark:border-zinc-900/50 dark:bg-zinc-900/10">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-600">
                      {t("provider")}
                    </th>
                    <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-600">
                      {t("type")}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-600">
                      {t("lastSync")}
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-600">
                      {t("state")}
                    </th>
                    <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-600">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-900/50">
                  {filteredAccounts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-slate-500 dark:text-zinc-500"
                      >
                        {accounts.length === 0
                          ? "No cloud accounts yet. Click “Connect Cloud” to add one."
                          : "No matches for your search."}
                      </td>
                    </tr>
                  ) : (
                    filteredAccounts.map((acc) => {
                      const isSyncing = syncingIds.has(acc.id);
                      return (
                        <tr
                          key={acc.id}
                          className="transition-colors hover:bg-slate-50/80 dark:hover:bg-zinc-900/20 group"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 shadow-inner transition-all group-hover:border-orange-500/30 dark:border-zinc-800 dark:bg-zinc-900">
                                <ProviderLogo provider={acc.provider} />
                              </div>
                              <div>
                                <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-zinc-200">
                                  {acc.label}
                                </p>
                                <p className="font-mono text-[10px] uppercase text-slate-400 dark:text-zinc-500">
                                  {acc.provider}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-block rounded border border-slate-200 px-2 py-0.5 font-mono text-[9px] uppercase text-slate-500 dark:border-zinc-800 dark:text-zinc-500">
                              {credentialTypeLabel(acc.provider)}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400 dark:text-zinc-500">
                              {isSyncing ? (
                                <RefreshCw size={12} className="animate-spin text-orange-500" />
                              ) : (
                                <span className="inline-block size-3" />
                              )}
                              {formatLastSync(acc.lastSyncedAt, isSyncing, t)}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {isSyncing || acc.status === "SYNCING" ? (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">
                                  {t("statusSyncing")}
                                </span>
                              </div>
                            ) : acc.status === "SYNC_ERROR" && acc.lastSyncError ? (
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex cursor-help items-center gap-2">
                                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 dark:text-red-500">
                                        {t("statusError")}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    {acc.lastSyncError === SYNC_ERROR_VERCEL_FORBIDDEN
                                      ? t("syncErrorVercelForbidden")
                                      : acc.lastSyncError}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-500">
                                  {t("statusSynced")}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <TooltipProvider delayDuration={300}>
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => void handleSyncClick(acc)}
                                      disabled={isSyncing}
                                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-orange-500/5 hover:text-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      aria-label={t("tooltipManualSync")}
                                    >
                                      <RefreshCw
                                        size={16}
                                        className={isSyncing ? "animate-spin" : undefined}
                                      />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {t("tooltipManualSync")}
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => setEditModalAccount(acc)}
                                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-orange-500/5 hover:text-orange-500"
                                      aria-label={t("editLabel")}
                                    >
                                      <Settings2 size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {t("tooltipRename")}
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteModalAccount(acc)}
                                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-500/5 hover:text-red-500"
                                      aria-label={t("delete")}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {t("tooltipDelete")}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Security card */}
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-orange-500/10 bg-orange-500/[0.03] p-6 md:flex-row">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-500 shadow-inner">
            <Lock size={24} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-sm font-bold uppercase tracking-widest text-orange-600 dark:text-orange-500">
              {t("securityTitle")}
            </h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-zinc-500">
              {t("securityBody")}
            </p>
          </div>
          <button
            type="button"
            className="shrink-0 border-b border-orange-500/30 pb-1 text-[10px] font-bold uppercase tracking-widest text-orange-600 transition-all hover:border-orange-500 dark:text-orange-500"
          >
            {t("securityDocs")}
          </button>
        </div>
      </div>

      {/* Add connection modal */}
      <AddConnectionModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={(newAccount) => {
          setAccounts((prev) => [newAccount, ...prev]);
          addSyncing(newAccount.id);
          setAddModalOpen(false);
          router.refresh();
        }}
        onError={(msg) => setError(msg)}
      />

      {/* Edit modal */}
      <EditConnectionModal
        account={editModalAccount}
        onClose={() => setEditModalAccount(null)}
        onSuccess={(updated) => {
          setAccounts((prev) =>
            prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
          );
          setEditModalAccount(null);
          router.refresh();
        }}
      />

      {/* Delete modal */}
      <DeleteConnectionModal
        account={deleteModalAccount}
        onClose={() => setDeleteModalAccount(null)}
        onSuccess={(id) => {
          setAccounts((prev) => prev.filter((a) => a.id !== id));
          setDeleteModalAccount(null);
          router.refresh();
        }}
      />
    </div>
  );
}

// --- Add Connection Modal ---

function ProviderSelectCard({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 transition-all ${
        active
          ? "border-orange-500 bg-orange-500/5 text-orange-600 shadow-inner ring-1 ring-orange-500/20 dark:text-orange-500"
          : "border-slate-200 bg-slate-50/50 text-slate-400 hover:border-slate-300 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:border-zinc-700"
      }`}
    >
      <div className={active ? "scale-110 transition-transform duration-300" : ""}>
        {icon}
      </div>
      <span className="text-[10px] font-black uppercase tracking-widest">
        {label}
      </span>
    </button>
  );
}

function AddConnectionModal({
  open,
  onOpenChange,
  onSuccess,
  onError,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (account: AccountRow) => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations("Connections");
  const [provider, setProvider] = useState<CloudProvider>("VERCEL");
  const [label, setLabel] = useState("");
  const [awsAccessKeyId, setAwsAccessKeyId] = useState("");
  const [awsSecretKey, setAwsSecretKey] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [gcpBillingId, setGcpBillingId] = useState("");
  const [gcpServiceJson, setGcpServiceJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const credentialsValidation = useMemo(() => {
    if (provider === "AWS") {
      return validateAwsCredentials(awsAccessKeyId, awsSecretKey);
    }
    if (provider === "VERCEL") {
      return validateVercelCredentials(vercelToken);
    }
    if (provider === "GCP") {
      return validateGcpCredentials(gcpBillingId, gcpServiceJson);
    }
    return { ok: true as const };
  }, [provider, awsAccessKeyId, awsSecretKey, vercelToken, gcpBillingId, gcpServiceJson]);

  const hasTypedCredentials = useMemo(() => {
    if (provider === "AWS")
      return awsAccessKeyId.trim() !== "" || awsSecretKey.trim() !== "";
    if (provider === "VERCEL") return vercelToken.trim() !== "";
    if (provider === "GCP")
      return gcpBillingId.trim() !== "" || gcpServiceJson.trim() !== "";
    return false;
  }, [provider, awsAccessKeyId, awsSecretKey, vercelToken, gcpBillingId, gcpServiceJson]);

  const liveValidationError =
    hasTypedCredentials && !credentialsValidation.ok
      ? credentialsValidation.error
      : null;

  const canSubmit =
    label.trim() !== "" &&
    credentialsValidation.ok;

  function resetForm() {
    setLabel("");
    setAwsAccessKeyId("");
    setAwsSecretKey("");
    setVercelToken("");
    setGcpBillingId("");
    setGcpServiceJson("");
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setFormError("Label is required");
      return;
    }

    let body: Record<string, string> = {
      provider,
      label: trimmedLabel,
    };
    if (provider === "AWS") {
      body.accessKeyId = awsAccessKeyId.trim();
      body.secretAccessKey = awsSecretKey.trim();
    } else if (provider === "VERCEL") {
      body.token = vercelToken.trim();
    } else {
      body.billingAccountId = gcpBillingId.trim();
      body.serviceAccountJson = gcpServiceJson.trim();
    }

    setSaving(true);
    try {
      const res = await fetchWithRetry("/api/cloud-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; account?: AccountRow };
      if (!res.ok) {
        setFormError(data.error ?? t("failedToCreate"));
        return;
      }
      if (data.account) {
        onSuccess(data.account);
        resetForm();
        onOpenChange(false);
      }
    } catch {
      onError(t("failedToCreate"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) { onOpenChange(o); if (!o) resetForm(); } }}>
      <DialogContent className="max-w-lg border-slate-200 dark:border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-left">
            <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-2.5 text-orange-500">
              <Zap size={20} />
            </div>
            {t("modalConnectTitle")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div className="space-y-3">
            <label className="ml-1 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-zinc-600">
              {t("modalEngineLabel")}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <ProviderSelectCard
                active={provider === "VERCEL"}
                onClick={() => setProvider("VERCEL")}
                icon={<Zap size={18} />}
                label="Vercel"
              />
              <ProviderSelectCard
                active={provider === "AWS"}
                onClick={() => setProvider("AWS")}
                icon={<Cloud size={18} />}
                label="AWS"
              />
              <ProviderSelectCard
                active={provider === "GCP"}
                onClick={() => setProvider("GCP")}
                icon={<Globe size={18} />}
                label="GCP"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
              {t("modalAccountLabel")}
            </label>
            <input
              type="text"
              placeholder={t("modalLabelPlaceholder")}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-all focus:border-orange-500/50 dark:border-zinc-800 dark:bg-[#050505] dark:shadow-inner"
            />
          </div>

          {provider === "AWS" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                  {t("awsAccessKeyId")}
                </label>
                <input
                  type="text"
                  placeholder={t("awsAccessKeyIdPlaceholder")}
                  value={awsAccessKeyId}
                  onChange={(e) => setAwsAccessKeyId(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 font-mono text-sm outline-none transition-all focus:border-orange-500/50 dark:bg-[#050505] ${
                    liveValidationError
                      ? "border-rose-500 bg-rose-50/30 dark:border-rose-500/50 dark:bg-rose-950/20"
                      : "border-slate-200 bg-slate-50 dark:border-zinc-800"
                  }`}
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                  {t("awsSecretKey")}
                </label>
                <input
                  type="password"
                  placeholder={t("awsSecretKeyPlaceholder")}
                  value={awsSecretKey}
                  onChange={(e) => setAwsSecretKey(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 font-mono text-sm outline-none transition-all focus:border-orange-500/50 dark:bg-[#050505] ${
                    liveValidationError
                      ? "border-rose-500 bg-rose-50/30 dark:border-rose-500/50 dark:bg-rose-950/20"
                      : "border-slate-200 bg-slate-50 dark:border-zinc-800"
                  }`}
                />
              </div>
              {liveValidationError && (
                <p className="text-xs text-rose-500 dark:text-rose-400" role="alert">
                  {liveValidationError}
                </p>
              )}
              <p className="text-[10px] italic text-slate-400 dark:text-zinc-600">
                {t("awsHint")}
              </p>
            </div>
          )}

          {provider === "VERCEL" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                  {t("vercelToken")}
                </label>
                <span className="flex items-center gap-1 font-mono text-[9px] font-bold uppercase text-orange-500">
                  <Lock size={10} />
                  {t("vercelSafeIngest")}
                </span>
              </div>
              <input
                type="password"
                placeholder={t("vercelTokenPlaceholder")}
                value={vercelToken}
                onChange={(e) => setVercelToken(e.target.value)}
                className={`w-full rounded-xl border px-4 py-3 font-mono text-sm outline-none transition-all focus:border-orange-500/50 dark:bg-[#050505] dark:shadow-inner ${
                  liveValidationError
                    ? "border-rose-500 bg-rose-50/30 dark:border-rose-500/50 dark:bg-rose-950/20"
                    : "border-slate-200 bg-slate-50 dark:border-zinc-800"
                }`}
              />
              {liveValidationError && (
                <p className="text-xs text-rose-500 dark:text-rose-400" role="alert">
                  {liveValidationError}
                </p>
              )}
            </div>
          )}

          {provider === "GCP" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                  {t("gcpBillingId")}
                </label>
                <input
                  type="text"
                  placeholder={t("gcpBillingIdPlaceholder")}
                  value={gcpBillingId}
                  onChange={(e) => setGcpBillingId(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-3 font-mono text-sm outline-none transition-all focus:border-orange-500/50 dark:bg-[#050505] ${
                    liveValidationError
                      ? "border-rose-500 bg-rose-50/30 dark:border-rose-500/50 dark:bg-rose-950/20"
                      : "border-slate-200 bg-slate-50 dark:border-zinc-800"
                  }`}
                />
              </div>
              <div className="space-y-2">
                <label className="ml-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                  {t("gcpServiceAccountJson")}
                </label>
                <textarea
                  rows={3}
                  placeholder={t("gcpServiceAccountPlaceholder")}
                  value={gcpServiceJson}
                  onChange={(e) => setGcpServiceJson(e.target.value)}
                  className={`w-full resize-none rounded-xl border px-4 py-3 font-mono text-[10px] outline-none transition-all focus:border-orange-500/50 dark:bg-[#050505] dark:shadow-inner ${
                    liveValidationError
                      ? "border-rose-500 bg-rose-50/30 dark:border-rose-500/50 dark:bg-rose-950/20"
                      : "border-slate-200 bg-slate-50 dark:border-zinc-800"
                  }`}
                />
              </div>
              {liveValidationError && (
                <p className="text-xs text-rose-500 dark:text-rose-400" role="alert">
                  {liveValidationError}
                </p>
              )}
            </div>
          )}

          {formError && (
            <p className="text-sm text-rose-500">{formError}</p>
          )}

          <DialogFooter className="flex gap-3 border-t border-slate-200 pt-4 dark:border-zinc-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="flex-1"
            >
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              disabled={saving || !canSubmit}
              className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {t("saveConnection")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditConnectionModal({
  account,
  onClose,
  onSuccess,
}: {
  account: AccountRow | null;
  onClose: () => void;
  onSuccess: (updated: { id: string; label: string }) => void;
}) {
  const t = useTranslations("Connections");
  const [label, setLabel] = useState(account?.label ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setLabel(account?.label ?? "");
    setFormError(null);
  }, [account]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    const trimmed = label.trim();
    if (!trimmed) {
      setFormError("Label is required");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetchWithRetry(`/api/cloud-accounts/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFormError(data.error ?? t("failedToUpdate"));
        return;
      }
      onSuccess({ id: account.id, label: trimmed });
      onClose();
    } catch {
      setFormError(t("failedToUpdate"));
    } finally {
      setSaving(false);
    }
  }

  if (!account) return null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editModalTitle")}</DialogTitle>
          <DialogDescription>
            {account.provider} – {account.label}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
              {t("editLabelField")}
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-orange-500/50 dark:border-zinc-800 dark:bg-[#050505]"
            />
          </div>
          {formError && <p className="text-sm text-rose-500">{formError}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving} className="gap-2 bg-orange-500 hover:bg-orange-600">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save size={14} />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteConnectionModal({
  account,
  onClose,
  onSuccess,
}: {
  account: AccountRow | null;
  onClose: () => void;
  onSuccess: (id: string) => void;
}) {
  const t = useTranslations("Connections");
  const [deleting, setDeleting] = useState(false);

  if (!account) return null;

  const accountId = account.id;

  async function handleConfirm() {
    setDeleting(true);
    try {
      const res = await fetchWithRetry(`/api/cloud-accounts/${accountId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? t("failedToDelete"));
        return;
      }
      onSuccess(accountId);
      onClose();
    } catch {
      alert(t("failedToDelete"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md border-red-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-500">
            <Trash2 className="size-5" />
            {t("deleteConfirmTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("deleteConfirmBody")} ({account.label})
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>
            {t("deleteConfirmCancel")}
          </Button>
          <Button variant="destructive" onClick={() => void handleConfirm()} disabled={deleting} className="gap-2">
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            {t("deleteConfirmConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
