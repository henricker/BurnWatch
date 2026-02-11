"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Bell,
  Hash,
  MessageSquare,
  Mail,
  Activity,
  ShieldCheck,
  Send,
  Loader2,
  CheckCircle2,
  Eye,
  ChevronRight,
  Zap,
  ExternalLink,
} from "lucide-react";

import { fetchWithRetry } from "@/lib/safe-fetch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PreviewType = "anomaly" | "burn" | "limit" | null;

type NotificationSettingsState = {
  anomaly: boolean;
  dailySummary: boolean;
  limitWarning: boolean;
};

type ApiSettings = {
  slackWebhookUrl: string;
  discordWebhookUrl: string;
  notificationSettings: NotificationSettingsState;
};

const PREVIEW_CONTENT: Record<
  NonNullable<PreviewType>,
  {
    title: string;
    slackTitle: string;
    slackDesc: string;
    slackCents: string;
    slackAvg: string;
    discordTitle: string;
    discordDesc: string;
    discordColor: string;
  }
> = {
  anomaly: {
    title: "Alerta de Anomalia",
    slackTitle: "⚠️ Spike detetado na AWS!",
    slackDesc: "O serviço CloudFront teve um aumento de 450% nas últimas 24h.",
    slackCents: "$125.40",
    slackAvg: "$22.10",
    discordTitle: "🚨 ANOMALIA DE CUSTO",
    discordDesc: "Detetado spike crítico no provedor **AWS**.",
    discordColor: "bg-red-500",
  },
  burn: {
    title: "Resumo Diário",
    slackTitle: "📈 Burn Rate Diário",
    slackDesc: "Ontem o seu workspace consumiu um total de $41.50.",
    slackCents: "$41.50",
    slackAvg: "$38.20",
    discordTitle: "📊 RELATÓRIO DIÁRIO",
    discordDesc: "O gasto de ontem foi consolidado com sucesso.",
    discordColor: "bg-blue-500",
  },
  limit: {
    title: "Aviso de Limite",
    slackTitle: "💳 Alerta de Orçamento (80%)",
    slackDesc: "Atingiu 80% do limite do plano Starter ($480 de $600).",
    slackCents: "$480.00",
    slackAvg: "80%",
    discordTitle: "⚠️ LIMITE DE PLANO",
    discordDesc: "A sua organização está próxima de atingir o limite mensal.",
    discordColor: "bg-orange-500",
  },
};

function PayloadPreviewModal({
  type,
  isOpen,
  onClose,
  t,
}: {
  type: PreviewType;
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}) {
  if (!isOpen || !type) return null;
  const content = PREVIEW_CONTENT[type];
  const title = content.title;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border-slate-200 dark:border-zinc-800">
        <DialogHeader className="shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <Eye size={18} />
              </div>
              <div>
                <DialogTitle className="text-lg">{t("previewModalTitle")}: {title}</DialogTitle>
                <p className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-black mt-0.5">
                  {t("previewModalSubtitle")}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto py-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Hash size={14} className="text-[#36C5F0]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                {t("previewSlackLabel")}
              </span>
            </div>
            <div className="bg-[#1A1D21] p-6 rounded-xl border border-white/5 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded bg-orange-600 flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
                  <Zap size={16} className="text-white fill-white" />
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-sm">BurnWatch</span>
                    <span className="text-[10px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded font-bold uppercase">
                      App
                    </span>
                    <span className="text-[10px] text-white/30 ml-2">{t("previewNow")}</span>
                  </div>
                  <p className="text-[#D1D2D3] text-sm font-bold">{content.slackTitle}</p>
                  <div
                    className={`border-l-4 ${type === "anomaly" ? "border-red-500" : "border-orange-500"} bg-white/5 p-4 rounded-r mt-3`}
                  >
                    <p className="text-[#D1D2D3] text-xs leading-relaxed">{content.slackDesc}</p>
                    <div className="flex gap-6 mt-4 pt-3 border-t border-white/5">
                      <div>
                        <p className="text-[9px] text-white/50 uppercase font-bold tracking-wider">
                          {t("previewValue")}
                        </p>
                        <p className="text-white text-xs font-bold font-mono">{content.slackCents}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-white/50 uppercase font-bold tracking-wider">
                          {type === "limit" ? t("previewPercent") : t("previewAverage")}
                        </p>
                        <p className="text-white text-xs font-bold font-mono">{content.slackAvg}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 pt-3 border-t border-white/5 text-[10px] text-[#D1D2D3]/30 font-mono uppercase tracking-widest">
                Block Kit API v2
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <MessageSquare size={14} className="text-[#5865F2]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                {t("previewDiscordLabel")}
              </span>
            </div>
            <div className="bg-[#313338] p-6 rounded-xl border border-black/20 shadow-xl relative overflow-hidden">
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${content.discordColor}`} />
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <Zap size={10} className="text-white fill-white" />
                </div>
                <span className="text-white font-bold text-[10px] uppercase tracking-tighter opacity-80">
                  BurnWatch Intelligence
                </span>
              </div>
              <h4 className="text-white font-extrabold text-sm mb-2">{content.discordTitle}</h4>
              <p className="text-[#B5BAC1] text-xs leading-relaxed mb-6">{content.discordDesc}</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-black/20 p-2.5 rounded border border-white/5">
                  <p className="text-[9px] text-white/40 uppercase font-bold mb-1">AWS Node</p>
                  <p className="text-white text-xs font-mono">$29.10</p>
                </div>
                <div className="bg-black/20 p-2.5 rounded border border-white/5">
                  <p className="text-[9px] text-white/40 uppercase font-bold mb-1">Vercel Edge</p>
                  <p className="text-white text-xs font-mono">$12.40</p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full bg-[#4F545C] hover:bg-[#5D6269] text-white text-[10px] font-bold uppercase tracking-widest h-9"
                asChild
              >
                <a href="/dashboard">
                  {t("previewOpenDashboard")} <ExternalLink size={10} className="ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>
        <div className="shrink-0 p-4 bg-slate-100 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-zinc-800 text-center">
          <p className="text-[9px] font-mono text-slate-400 dark:text-zinc-600 uppercase tracking-widest">
            {t("previewFooter")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WebhookCard({
  title,
  icon,
  placeholder,
  description,
  value,
  savedValue,
  onChange,
  onSave,
  onTest,
  isTesting,
  testStatus,
  saveStatus,
  t,
}: {
  title: string;
  icon: React.ReactNode;
  placeholder: string;
  description: string;
  value: string;
  /** Currently saved URL (from server). Save button enabled only when value !== savedValue. */
  savedValue: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onTest: () => void;
  isTesting: boolean;
  testStatus: "idle" | "loading" | "success";
  saveStatus: "idle" | "saving";
  t: (key: string) => string;
}) {
  const trimmed = value.trim();
  const savedTrimmed = savedValue.trim();
  const canTest = trimmed.length > 0 && !isTesting;
  const canSave = trimmed.length > 0 && trimmed !== savedTrimmed && saveStatus !== "saving";

  return (
    <div className="rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-slate-50 dark:bg-[#050505] rounded-xl border border-slate-100 dark:border-zinc-900 shrink-0">
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
              {title} {t("integration")}
            </h4>
            <p className="text-[9px] text-slate-400 dark:text-zinc-600 font-mono uppercase">
              {t("statusLabel")}: {testStatus === "success" ? t("statusConnected") : t("statusStandby")}
            </p>
          </div>
          <span className="text-[8px] font-black uppercase text-green-500/60 bg-green-500/5 px-2 py-0.5 rounded border border-green-500/10 shrink-0">
            {t("active")}
          </span>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <Label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 dark:text-zinc-500">
                {t("endpointUrl")}
              </Label>
              <span className="text-[8px] text-orange-500 font-mono uppercase font-bold tracking-widest flex items-center gap-1">
                <Zap size={8} /> {t("sslSecured")}
              </span>
            </div>
            <Input
              type="url"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="font-mono text-xs bg-slate-50 dark:bg-[#050505] border-slate-200 dark:border-zinc-800 rounded-xl h-11"
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-500 leading-relaxed">{description}</p>
          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={!canTest}
              className={`flex-1 h-11 text-[10px] font-bold uppercase tracking-widest ${
                testStatus === "success"
                  ? "bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-500"
                  : ""
              }`}
            >
              {isTesting && testStatus === "loading" ? (
                <Loader2 size={12} className="animate-spin mr-2" />
              ) : testStatus === "success" ? (
                <CheckCircle2 size={12} className="mr-2" />
              ) : (
                <Send size={12} className="mr-2" />
              )}
              {testStatus === "loading" ? t("testing") : testStatus === "success" ? t("signalSent") : t("testWebhook")}
            </Button>
            <Button
              type="button"
              onClick={onSave}
              disabled={!canSave}
              className="flex-1 h-11 bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              {saveStatus === "saving" ? <Loader2 size={12} className="animate-spin mr-2" /> : null}
              {t("save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreferenceItem({
  title,
  description,
  enabled,
  onToggle,
  onPreview,
  t,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  onPreview: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h5 className="text-[11px] font-bold text-slate-900 dark:text-white uppercase tracking-wider">{title}</h5>
          <p className="text-[10px] text-slate-500 dark:text-zinc-600 mt-1 leading-relaxed">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          className={`w-10 h-5 rounded-full relative transition-colors shrink-0 mt-1 cursor-pointer flex items-center ${
            enabled ? "bg-orange-500" : "bg-slate-200 dark:bg-zinc-800"
          }`}
        >
          <span
            className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${
              enabled ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>
      <button
        type="button"
        onClick={onPreview}
        className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-600 hover:text-orange-500 transition-colors w-fit pl-1"
      >
        <Eye size={12} /> {t("viewPreview")} <ChevronRight size={10} />
      </button>
    </div>
  );
}

export function NotificationsView() {
  const t = useTranslations("Notifications");
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [slackUrl, setSlackUrl] = useState("");
  const [discordUrl, setDiscordUrl] = useState("");
  const [preferences, setPreferences] = useState<NotificationSettingsState>({
    anomaly: true,
    dailySummary: false,
    limitWarning: true,
  });
  const [testing, setTesting] = useState<"slack" | "discord" | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "loading" | "success">("idle");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving">("idle");
  const [previewType, setPreviewType] = useState<PreviewType>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithRetry("/api/notifications", { cache: "no-store" });
      if (!res.ok) {
        setError(t("failedToLoad"));
        return;
      }
      const data = (await res.json()) as ApiSettings;
      setSettings(data);
      setSlackUrl(data.slackWebhookUrl ?? "");
      setDiscordUrl(data.discordWebhookUrl ?? "");
      setPreferences(data.notificationSettings ?? { anomaly: true, dailySummary: false, limitWarning: true });
    } catch {
      setError(t("failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleTest = async (channel: "slack" | "discord", webhookUrl: string) => {
    const trimmed = webhookUrl.trim();
    if (!trimmed) return;
    setTesting(channel);
    setTestStatus("loading");
    setError(null);
    try {
      const res = await fetchWithRetry("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, webhookUrl: trimmed }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setTestStatus("success");
        setTimeout(() => {
          setTesting(null);
          setTestStatus("idle");
        }, 3000);
      } else {
        setError(data.error ?? t("testFailed"));
        setTestStatus("idle");
        setTesting(null);
      }
    } catch {
      setError(t("testFailed"));
      setTestStatus("idle");
      setTesting(null);
    }
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    setError(null);
    try {
      const res = await fetchWithRetry("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slackWebhookUrl: slackUrl.trim() || null,
          discordWebhookUrl: discordUrl.trim() || null,
          notificationSettings: preferences,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? t("failedToSave"));
        return;
      }
      await loadSettings();
    } catch {
      setError(t("failedToSave"));
    } finally {
      setSaveStatus("idle");
    }
  };

  const handleSaveSlack = () => {
    setSaveStatus("saving");
    setError(null);
    fetchWithRetry("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slackWebhookUrl: slackUrl.trim() || null,
        discordWebhookUrl: settings?.discordWebhookUrl ?? "",
        notificationSettings: preferences,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setError(data.error ?? t("failedToSave"));
          return;
        }
        void loadSettings();
      })
      .catch(() => setError(t("failedToSave")))
      .finally(() => setSaveStatus("idle"));
  };

  const handleSaveDiscord = () => {
    setSaveStatus("saving");
    setError(null);
    fetchWithRetry("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slackWebhookUrl: settings?.slackWebhookUrl ?? "",
        discordWebhookUrl: discordUrl.trim() || null,
        notificationSettings: preferences,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setError(data.error ?? t("failedToSave"));
          return;
        }
        void loadSettings();
      })
      .catch(() => setError(t("failedToSave")))
      .finally(() => setSaveStatus("idle"));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#050505] transition-colors p-8 md:p-12 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
              <Bell size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t("title")}
              </h1>
              <p className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-[0.2em] font-black mt-1">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <WebhookCard
              title="Slack"
              icon={<Hash className="text-[#36C5F0]" size={20} />}
              placeholder="https://hooks.slack.com/services/..."
              description={t("slackDescription")}
              value={slackUrl}
              savedValue={settings?.slackWebhookUrl ?? ""}
              onChange={setSlackUrl}
              onSave={handleSaveSlack}
              onTest={() => void handleTest("slack", slackUrl)}
              isTesting={testing === "slack"}
              testStatus={testing === "slack" ? testStatus : "idle"}
              saveStatus={saveStatus}
              t={t}
            />
            <WebhookCard
              title="Discord"
              icon={<MessageSquare className="text-[#5865F2]" size={20} />}
              placeholder="https://discord.com/api/webhooks/..."
              description={t("discordDescription")}
              value={discordUrl}
              savedValue={settings?.discordWebhookUrl ?? ""}
              onChange={setDiscordUrl}
              onSave={handleSaveDiscord}
              onTest={() => void handleTest("discord", discordUrl)}
              isTesting={testing === "discord"}
              testStatus={testing === "discord" ? testStatus : "idle"}
              saveStatus={saveStatus}
              t={t}
            />
            <div className="p-6 rounded-3xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] flex items-start gap-4 shadow-sm opacity-50 grayscale cursor-not-allowed">
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-900 text-slate-400 shrink-0">
                <Mail size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    {t("emailIntelligence")}
                  </h4>
                  <span className="text-[8px] font-bold bg-slate-100 dark:bg-zinc-900 text-slate-500 px-2 py-0.5 rounded border border-slate-200 dark:border-zinc-800 uppercase tracking-widest">
                    {t("comingSoon")}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-zinc-500 mt-2 leading-relaxed">
                  {t("emailDescription")}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-zinc-800 rounded-[32px] p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-8 border-b border-slate-100 dark:border-zinc-900/50 pb-4">
                <Activity size={16} className="text-orange-500" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-600">
                  {t("preferencesTitle")}
                </h3>
              </div>
              <div className="space-y-8">
                <PreferenceItem
                  title={t("prefAnomalyTitle")}
                  description={t("prefAnomalyDesc")}
                  enabled={preferences.anomaly}
                  onToggle={() => setPreferences((p) => ({ ...p, anomaly: !p.anomaly }))}
                  onPreview={() => setPreviewType("anomaly")}
                  t={t}
                />
                <PreferenceItem
                  title={t("prefDailySummaryTitle")}
                  description={t("prefDailySummaryDesc")}
                  enabled={preferences.dailySummary}
                  onToggle={() => setPreferences((p) => ({ ...p, dailySummary: !p.dailySummary }))}
                  onPreview={() => setPreviewType("burn")}
                  t={t}
                />
                <PreferenceItem
                  title={t("prefLimitTitle")}
                  description={t("prefLimitDesc")}
                  enabled={preferences.limitWarning}
                  onToggle={() => setPreferences((p) => ({ ...p, limitWarning: !p.limitWarning }))}
                  onPreview={() => setPreviewType("limit")}
                  t={t}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? <Loader2 size={12} className="animate-spin mr-2" /> : null}
              {t("savePreferences")}
            </Button>
            <div className="px-6 py-4 flex items-center gap-3 bg-slate-50 dark:bg-zinc-900/30 rounded-2xl border border-slate-200 dark:border-zinc-800">
              <ShieldCheck size={14} className="text-green-500 shrink-0" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-600">
                {t("secureDelivery")}
              </span>
            </div>
          </div>
        </div>

        <footer className="pt-12 pb-24 text-center border-t border-slate-200 dark:border-zinc-900/50">
          <p className="text-[9px] font-mono text-slate-400 dark:text-zinc-700 uppercase tracking-[0.5em] font-medium italic">
            {t("footer")}
          </p>
        </footer>
      </div>

      <PayloadPreviewModal
        type={previewType}
        isOpen={!!previewType}
        onClose={() => setPreviewType(null)}
        t={t}
      />
    </div>
  );
}
