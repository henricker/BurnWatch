"use client";

import React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Zap,
  Check,
  Cloud,
  Globe,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  Lock,
  Users,
  RefreshCw,
  ArrowRight,
  Mail,
  Clock,
  MessageSquare,
  Hash,
} from "lucide-react";

import BurnWatchLogo from "@/components/burnwatch-logo";
import { LandingThemeToggle } from "@/components/landing-theme-toggle";
import { LandingLocaleToggle } from "@/components/landing-locale-toggle";

/** Preço por idioma: pt = Reais, en/es = Dólares */
const PRICING = {
  pt: { starter: "R$ 97", pro: "R$ 197" },
  en: { starter: "$49", pro: "$149" },
  es: { starter: "$49", pro: "$149" },
} as const;

export function LandingContent() {
  const locale = useLocale() as keyof typeof PRICING;
  const t = useTranslations("Landing");
  const prices = PRICING[locale] ?? PRICING.en;

  return (
    <div className="landing-bg-grid min-h-screen font-sans text-zinc-900 selection:bg-orange-500/30 dark:bg-[#050505] dark:text-[#f5f5f5]">
      <style>{`
        .glow-orange {
          box-shadow: 0 0 40px rgba(249, 115, 22, 0.15);
        }
        .glow-orange-small {
          box-shadow: 0 0 20px rgba(249, 115, 22, 0.2);
        }
      `}</style>

      <header className="fixed top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-[#1a1a1a] dark:bg-[#050505]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3 text-zinc-900 dark:text-white">
            <BurnWatchLogo size="md" className="text-zinc-900 dark:text-white" />
          </div>
          <nav className="hidden items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-zinc-500 md:flex">
            <a href="#features" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              {t("navFeatures")}
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              {t("navIntegration")}
            </a>
            <a href="#alerts" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              {t("navAlerts")}
            </a>
            <a href="#pricing" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
              {t("navPricing")}
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-white"
            >
              {t("signIn")}
            </Link>
            <Link
              href="/login"
              className="glow-orange-small rounded bg-[#f97316] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#ea580c]"
            >
              {t("getStarted")}
            </Link>
          </div>
        </div>
      </header>

      <section className="relative pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-6 text-center lg:text-left">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
              {t("badge")}
            </div>
            <h1 className="mb-8 text-5xl font-extrabold leading-[1.05] tracking-tighter text-zinc-900 md:text-7xl dark:text-white">
              {t("heroTitle")} <br />
              <span className="text-[#f97316]">{t("heroHighlight")}</span> <br />
              {t("heroSuffix")}
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-600 lg:mx-0 dark:text-zinc-400">
              {t("heroSubtitle")}
            </p>
            <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row lg:mx-0">
              <div className="group relative flex-1">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-orange-500 dark:text-zinc-600"
                  size={16}
                />
                <input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  className="h-12 w-full rounded border border-zinc-200 bg-zinc-100 pl-10 pr-4 text-sm text-zinc-900 outline-none transition-all focus:border-orange-500/50 dark:border-[#1a1a1a] dark:bg-[#0a0a0a] dark:text-white"
                />
              </div>
              <button className="glow-orange-small flex h-12 items-center justify-center gap-2 rounded bg-[#f97316] px-6 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#ea580c]">
                {t("ctaInstant")} <ArrowRight size={14} />
              </button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-10 opacity-40 transition-opacity hover:opacity-100 lg:justify-start">
              <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-tighter">
                <Globe size={18} /> Vercel
              </div>
              <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-tighter">
                <Cloud size={18} /> AWS
              </div>
              <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-tighter">
                <TrendingUp size={18} /> GCP
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-20 max-w-7xl px-6">
          <div className="glow-orange relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 shadow-2xl dark:border-[#1a1a1a] dark:bg-[#0a0a0a]">
            <div className="flex h-8 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 dark:border-[#1a1a1a] dark:bg-[#050505]">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-800" />
                <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-800" />
                <div className="h-2 w-2 rounded-full bg-zinc-300 dark:bg-zinc-800" />
              </div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-600">
                {t("previewTitle")}
              </div>
            </div>
            <div className="p-8">
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="group rounded border border-zinc-200 bg-white/80 p-6 text-center text-zinc-900 transition-colors hover:border-orange-500/20 dark:border-[#1a1a1a] dark:bg-[#050505]/50 dark:text-white md:text-left">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    {t("previewMtd")}
                  </p>
                  <p className="text-3xl font-bold tracking-tighter text-zinc-900 dark:text-white">
                    $402.10 <span className="font-sans text-xs text-zinc-500 dark:text-zinc-600">{t("previewUsd")}</span>
                  </p>
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-900">
                    <div className="h-full w-2/3 bg-orange-500" />
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center rounded border border-zinc-200 bg-white/80 p-6 text-center dark:border-[#1a1a1a] dark:bg-[#050505]/50 md:items-start md:text-left">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    {t("previewActive")}
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="rounded-md border border-green-500/20 bg-green-500/10 p-2 text-green-500">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-widest text-green-500">
                        {t("previewHealthy")}
                      </p>
                      <p className="text-[10px] text-zinc-500">{t("previewNoPeak")}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative flex h-64 w-full items-end gap-3 overflow-hidden rounded border border-zinc-200 bg-zinc-50 p-6 dark:border-[#1a1a1a] dark:bg-[#050505]">
                <div className="absolute left-6 top-6 flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-600">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-500" /> AWS
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-zinc-500" /> Vercel
                  </div>
                </div>
                <div className="h-[30%] flex-1 rounded-t bg-zinc-300/80 dark:bg-zinc-900/50" />
                <div className="h-[45%] flex-1 rounded-t bg-zinc-300/80 dark:bg-zinc-900/50" />
                <div className="h-[60%] flex-1 rounded-t border-t border-orange-500/40 bg-orange-500/20" />
                <div className="h-[55%] flex-1 rounded-t bg-zinc-300/80 dark:bg-zinc-900/50" />
                <div className="h-[90%] flex-1 cursor-pointer rounded-t bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all hover:scale-[1.02]" />
                <div className="h-[70%] flex-1 rounded-t bg-zinc-300/80 dark:bg-zinc-900/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-zinc-200 py-24 dark:border-[#1a1a1a]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {t("featuresTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-500">{t("featuresSubtitle")}</p>
          </div>
          <div className="grid grid-cols-1 gap-12 text-zinc-900 md:grid-cols-3 dark:text-white">
            <FeatureItem
              icon={<Clock size={24} />}
              title={t("feature1Title")}
              description={t("feature1Desc")}
            />
            <FeatureItem
              icon={<TrendingUp size={24} />}
              title={t("feature2Title")}
              description={t("feature2Desc")}
            />
            <FeatureItem
              icon={<AlertTriangle size={24} />}
              title={t("feature3Title")}
              description={t("feature3Desc")}
            />
          </div>
        </div>
      </section>

      <section
        id="security"
        className="relative overflow-hidden border-t border-zinc-200 bg-zinc-100 py-32 dark:border-[#1a1a1a] dark:bg-[#070707]"
      >
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-8 inline-flex rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 text-orange-500">
            <Lock size={32} />
          </div>
          <h2 className="mb-8 text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {t("securityTitle")}
          </h2>
          <p className="mb-12 text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t("securitySubtitle")}
          </p>
          <div className="grid grid-cols-1 gap-6 text-left md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-[#1a1a1a] dark:bg-[#0a0a0a]">
              <Check className="mb-4 text-orange-500" size={20} />
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
                {t("securityEncryption")}
              </h4>
              <p className="text-xs text-zinc-500">{t("securityEncryptionDesc")}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-[#1a1a1a] dark:bg-[#0a0a0a]">
              <Check className="mb-4 text-orange-500" size={20} />
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
                {t("securityRls")}
              </h4>
              <p className="text-xs text-zinc-500">{t("securityRlsDesc")}</p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-[#1a1a1a] dark:bg-[#0a0a0a]">
              <Check className="mb-4 text-orange-500" size={20} />
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
                {t("securityReadOnly")}
              </h4>
              <p className="text-xs text-zinc-500">{t("securityReadOnlyDesc")}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="alerts" className="border-t border-zinc-200 py-24 dark:border-[#1a1a1a]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {t("alertsTitle")}
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-zinc-600 dark:text-zinc-500">{t("alertsSubtitle")}</p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <AlertCard
              icon={<Hash size={24} />}
              title={t("alertsSlack")}
              description={t("alertsSlackDesc")}
              cta={t("readyToUse")}
            />
            <AlertCard
              icon={<MessageSquare size={24} />}
              title={t("alertsDiscord")}
              description={t("alertsDiscordDesc")}
              cta={t("readyToUse")}
            />
            <AlertCard
              icon={<Mail size={24} />}
              title={t("alertsEmail")}
              description={t("alertsEmailDesc")}
              cta={t("configurable")}
            />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-zinc-200 py-24 dark:border-[#1a1a1a]">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {t("howItWorksTitle")}
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <StepCard step={1} title={t("step1Title")} description={t("step1Desc")} />
            <StepCard step={2} title={t("step2Title")} description={t("step2Desc")} />
            <StepCard step={3} title={t("step3Title")} description={t("step3Desc")} />
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 bg-gradient-to-b from-transparent to-orange-500/5 py-24 dark:border-[#1a1a1a]">
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-20 px-6 lg:flex-row">
          <div className="grid w-full flex-1 grid-cols-2 gap-4">
            <MiniCard title={t("teamSync")} desc={t("teamSyncDesc")} icon={<Users size={32} />} />
            <MiniCard title={t("multiCloud")} desc={t("multiCloudDesc")} icon={<RefreshCw size={32} />} />
            <div className="group col-span-2 flex items-center gap-6 rounded-xl border border-zinc-200 bg-white p-6 text-zinc-900 transition-colors hover:border-orange-500/20 dark:border-[#1a1a1a] dark:bg-[#0a0a0a] dark:text-white">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 grayscale transition-all group-hover:grayscale-0 dark:border-[#1a1a1a] dark:bg-zinc-900">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Infra" alt="" />
              </div>
              <div>
                <h5 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
                  {t("orgSupport")}
                </h5>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">{t("orgSupportDesc")}</p>
              </div>
            </div>
          </div>
          <div className="flex-1 text-center lg:text-left">
            <h2 className="mb-8 text-4xl font-bold leading-tight tracking-tighter text-zinc-900 dark:text-white">
              {t("collabTitle")}
            </h2>
            <p className="mb-10 text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("collabSubtitle")}
            </p>
            <button className="mx-auto flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-500 transition-all hover:gap-4 lg:mx-0">
              {t("collabCta")} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section
        id="pricing"
        className="border-t border-zinc-200 bg-zinc-50 py-24 dark:border-[#1a1a1a] dark:bg-[#050505]"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center text-zinc-900 dark:text-white">
            <h2 className="text-4xl font-bold tracking-tighter">{t("pricingTitle")}</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-zinc-600 dark:text-zinc-500">
              {t("pricingSubtitle")}
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-4 md:grid-cols-2">
            <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-10 transition-all hover:border-zinc-400 dark:border-[#1a1a1a] dark:bg-[#080808] dark:hover:border-zinc-800">
              <div className="mb-10 text-left">
                <h3 className="mb-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {t("pricingStarter")}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tighter text-zinc-900 dark:text-white">
                    {prices.starter}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-600">{t("perMonth")}</span>
                </div>
              </div>
              <ul className="mb-12 flex-1 space-y-5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> {t("starterFeature1")}
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> {t("starterFeature2")}
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> {t("starterFeature3")}
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> {t("starterFeature4")}
                </li>
              </ul>
              <button className="w-full rounded border border-zinc-200 border-dashed py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-[#1a1a1a] dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white">
                {t("selectStarter")}
              </button>
            </div>

            <div className="relative flex flex-col rounded-2xl border border-orange-500/30 bg-white p-10 shadow-[0_0_50px_rgba(249,115,22,0.08)] dark:bg-[#0a0a0a]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#f97316] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                {t("bestChoice")}
              </div>
              <div className="mb-10 text-left">
                <h3 className="mb-6 text-[10px] font-bold uppercase tracking-widest text-orange-500">
                  {t("pricingPro")}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tighter text-zinc-900 dark:text-white">
                    {prices.pro}
                  </span>
                  <span className="text-sm text-zinc-500 dark:text-zinc-600">{t("perMonth")}</span>
                </div>
              </div>
              <ul className="mb-12 flex-1 space-y-5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> {t("proFeature1")}
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> {t("proFeature2")}
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> {t("proFeature3")}
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> {t("proFeature4")}
                </li>
              </ul>
              <button className="glow-orange-small w-full rounded bg-[#f97316] py-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#ea580c]">
                {t("selectPro")}
              </button>
            </div>
          </div>
          <p className="mt-16 text-center text-[9px] font-mono uppercase tracking-widest text-zinc-500 opacity-60 dark:text-zinc-600">
            {t("pricingDisclaimer")}
          </p>
        </div>
      </section>

      <footer className="border-t border-zinc-200 py-16 dark:border-[#1a1a1a]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-10 px-6 text-zinc-500 md:flex-row dark:text-zinc-600">
          <div className="flex items-center gap-2 opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0 text-zinc-700 dark:text-white">
            <BurnWatchLogo size="sm" className="text-zinc-700 dark:text-white" />
          </div>
          <div className="text-[9px] font-mono uppercase tracking-widest">{t("footerCopy")}</div>
          <div className="flex gap-8">
            <a href="#" className="transition-colors hover:text-orange-500">
              <Globe size={18} />
            </a>
            <a href="#" className="transition-colors hover:text-orange-500">
              <RefreshCw size={18} />
            </a>
          </div>
        </div>
      </footer>

      <LandingThemeToggle />
      <LandingLocaleToggle />
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-300 bg-zinc-100 text-orange-500 transition-colors group-hover:border-orange-500/30 dark:border-zinc-800 dark:bg-zinc-900">
        {icon}
      </div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
        {title}
      </h3>
      <p className="text-xs font-medium leading-relaxed text-zinc-600 dark:text-zinc-500">
        {description}
      </p>
    </div>
  );
}

function AlertCard({
  icon,
  title,
  description,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <div className="group rounded-2xl border border-zinc-200 bg-white p-8 transition-all hover:border-orange-500/20 dark:border-[#1a1a1a] dark:bg-[#0a0a0a]">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 transition-colors group-hover:text-orange-500 dark:bg-zinc-900 dark:text-zinc-400">
        {icon}
      </div>
      <h4 className="mb-3 text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
        {title}
      </h4>
      <p className="mb-6 text-sm leading-relaxed text-zinc-500">{description}</p>
      <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-500">
        {cta} <ArrowRight size={12} />
      </div>
    </div>
  );
}

function StepCard({
  step,
  title,
  description,
}: {
  step: number;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative rounded-2xl border border-zinc-200 bg-white p-10 transition-all hover:border-orange-500/30 dark:border-[#1a1a1a] dark:bg-[#0a0a0a]">
      <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-xl font-bold text-orange-500">
        {step}
      </div>
      <h4 className="mb-4 text-lg font-bold text-zinc-900 dark:text-white">{title}</h4>
      <p className="text-sm leading-relaxed text-zinc-500">{description}</p>
    </div>
  );
}

function MiniCard({
  title,
  desc,
  icon,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="group flex aspect-square flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-6 text-center transition-colors hover:border-orange-500/20 dark:border-[#1a1a1a] dark:bg-[#0a0a0a]">
      <span className="mb-4 text-orange-500">{icon}</span>
      <h5 className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 dark:text-white">
        {title}
      </h5>
      <p className="mt-2 text-[10px] text-zinc-500 dark:text-zinc-600">{desc}</p>
    </div>
  );
}
