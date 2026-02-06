import React from "react";
import Link from "next/link";
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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] bg-grid font-sans text-[#f5f5f5] selection:bg-orange-500/30">
      <style>{`
        .bg-grid {
          background-image: radial-gradient(circle at 1px 1px, #1a1a1a 1px, transparent 0);
          background-size: 32px 32px;
        }
        .glow-orange {
          box-shadow: 0 0 40px rgba(249, 115, 22, 0.15);
        }
        .glow-orange-small {
          box-shadow: 0 0 20px rgba(249, 115, 22, 0.2);
        }
      `}</style>

      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-[#1a1a1a] bg-[#050505]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <BurnWatchLogo size="md" />
          </div>
          <nav className="hidden items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-zinc-500 md:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Diferenciais
            </a>
            <a
              href="#how-it-works"
              className="transition-colors hover:text-white"
            >
              Integração
            </a>
            <a href="#alerts" className="transition-colors hover:text-white">
              Alertas
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Preços
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-white"
            >
              Entrar
            </Link>
            <Link
              href="/login"
              className="glow-orange-small rounded bg-[#f97316] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#ea580c]"
            >
              Começar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20">
        <div className="mx-auto max-w-7xl px-6 text-center lg:text-left">
          <div className="max-w-3xl">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-500">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
              Observabilidade Financeira para Startups
            </div>

            <h1 className="mb-8 text-5xl font-extrabold leading-[1.05] tracking-tighter text-white md:text-7xl">
              O controle da sua <br />
              <span className="text-[#f97316]">Infraestrutura Cloud</span>{" "}
              <br />
              está de volta.
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400 lg:mx-0">
              Consolide gastos da Vercel, AWS e GCP num único painel de alta
              fidelidade. Identificamos cada cêntimo gasto antes que ele se
              torne um problema.
            </p>

            <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row lg:mx-0">
              <div className="group relative flex-1">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 transition-colors group-focus-within:text-orange-500"
                  size={16}
                />
                <input
                  type="email"
                  placeholder="trabalho@empresa.com"
                  className="h-12 w-full rounded bg-[#0a0a0a] border border-[#1a1a1a] pl-10 pr-4 text-sm text-white outline-none transition-all focus:border-orange-500/50"
                />
              </div>
              <button className="glow-orange-small flex h-12 items-center justify-center gap-2 rounded bg-[#f97316] px-6 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#ea580c]">
                Acesso Instantâneo <ArrowRight size={14} />
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

        {/* Dashboard Preview Section */}
        <div className="mx-auto mt-20 max-w-7xl px-6">
          <div className="glow-orange relative overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#0a0a0a] shadow-2xl">
            <div className="flex h-8 items-center justify-between border-b border-[#1a1a1a] bg-[#050505] px-4">
              <div className="flex gap-1.5">
                <div className="h-2 w-2 rounded-full bg-zinc-800" />
                <div className="h-2 w-2 rounded-full bg-zinc-800" />
                <div className="h-2 w-2 rounded-full bg-zinc-800" />
              </div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">
                Dash_Core_v1.0
              </div>
            </div>
            <div className="p-8">
              <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="group rounded border border-[#1a1a1a] bg-[#050505]/50 p-6 text-center text-white transition-colors hover:border-orange-500/20 md:text-left">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    Gasto Mensal (MTD)
                  </p>
                  <p className="text-3xl font-bold tracking-tighter text-white">
                    $402.10{" "}
                    <span className="font-sans text-xs text-zinc-600">USD</span>
                  </p>
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-900">
                    <div className="h-full w-2/3 bg-orange-500" />
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center rounded border border-[#1a1a1a] bg-[#050505]/50 p-6 text-center md:items-start md:text-left">
                  <p className="mb-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    Monitorização Ativa
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="rounded-md border border-green-500/20 bg-green-500/10 p-2 text-green-500">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-widest text-green-500">
                        Sistema Saudável
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        Nenhum pico detectado
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative flex h-64 w-full items-end gap-3 overflow-hidden rounded border border-[#1a1a1a] bg-[#050505] p-6">
                <div className="absolute left-6 top-6 flex items-center gap-4 text-[10px] font-mono uppercase tracking-widest text-zinc-600">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-500" /> AWS
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-zinc-500" /> Vercel
                  </div>
                </div>
                <div className="h-[30%] flex-1 rounded-t bg-zinc-900/50" />
                <div className="h-[45%] flex-1 rounded-t bg-zinc-900/50" />
                <div className="h-[60%] flex-1 rounded-t border-t border-orange-500/40 bg-orange-500/20" />
                <div className="h-[55%] flex-1 rounded-t bg-zinc-900/50" />
                <div className="h-[90%] flex-1 cursor-pointer rounded-t bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all hover:scale-[1.02]" />
                <div className="h-[70%] flex-1 rounded-t bg-zinc-900/50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais Section */}
      <section id="features" className="border-t border-[#1a1a1a] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              O que nos torna diferentes
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-500">
              O BurnWatch foi construído para eliminar o ruído e focar no que
              importa para a sua saúde financeira.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-12 text-white md:grid-cols-3">
            <FeatureItem
              icon={<Clock size={24} />}
              title="Setup Instantâneo"
              description="Sem SDKs ou agentes pesados. Conecte as suas contas em segundos via Read-Only API Keys e visualize o seu histórico financeiro sem instalar nada."
            />
            <FeatureItem
              icon={<TrendingUp size={24} />}
              title="Previsão Inteligente"
              description="Algoritmos de regressão analisam o seu consumo diário e projetam o custo exato de final de mês antes que a fatura chegue ao seu e-mail."
            />
            <FeatureItem
              icon={<AlertTriangle size={24} />}
              title="Alertas Reais"
              description="Sem ruído desnecessário. O nosso sistema de anomalias só dispara quando o desvio padrão do consumo foge completamente da realidade do seu projeto."
            />
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section
        id="security"
        className="relative overflow-hidden border-t border-[#1a1a1a] bg-[#070707] py-32"
      >
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-8 inline-flex rounded-2xl border border-orange-500/20 bg-orange-500/10 p-3 text-orange-500">
            <Lock size={32} />
          </div>
          <h2 className="mb-8 text-4xl font-bold tracking-tight text-white">
            Privacidade e Segurança por Omissão.
          </h2>
          <p className="mb-12 text-xl leading-relaxed text-zinc-400">
            As suas credenciais de infraestrutura são criptografadas antes de
            serem armazenadas. Utilizamos políticas rigorosas de isolamento de
            dados para garantir que apenas a sua organização aceda às
            informações financeiras.
          </p>

          <div className="grid grid-cols-1 gap-6 text-left md:grid-cols-3">
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6">
              <Check className="mb-4 text-orange-500" size={20} />
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white">
                Criptografia
              </h4>
              <p className="text-xs text-zinc-500">
                Chaves protegidas em repouso com camadas de isolamento.
              </p>
            </div>
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6">
              <Check className="mb-4 text-orange-500" size={20} />
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white">
                Isolamento (RLS)
              </h4>
              <p className="text-xs text-zinc-500">
                Dados protegidos nativamente ao nível da base de dados.
              </p>
            </div>
            <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6">
              <Check className="mb-4 text-orange-500" size={20} />
              <h4 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white">
                Acesso Read-Only
              </h4>
              <p className="text-xs text-zinc-500">
                Trabalhamos apenas com permissões de leitura de faturamento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Alertas Section */}
      <section id="alerts" className="border-t border-[#1a1a1a] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Alertas que você realmente recebe
            </h2>
            <p className="mt-2 max-w-2xl text-zinc-500">
              Não precisa abrir o painel para saber se o gasto subiu. Nós
              avisamos onde a sua equipa já está.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="group rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-8 transition-all hover:border-orange-500/20">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 transition-colors group-hover:text-orange-500">
                <Hash size={24} />
              </div>
              <h4 className="mb-3 text-lg font-bold tracking-tight text-white">
                Slack Connect
              </h4>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                Notificações em tempo real diretamente no canal de
                infraestrutura da sua equipa.
              </p>
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-500">
                Pronto a usar <ArrowRight size={12} />
              </div>
            </div>

            <div className="group rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-8 transition-all hover:border-orange-500/20">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 transition-colors group-hover:text-orange-500">
                <MessageSquare size={24} />
              </div>
              <h4 className="mb-3 text-lg font-bold tracking-tight text-white">
                Discord Integration
              </h4>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                Acompanhe o burn rate no workspace da sua comunidade ou projeto
                pessoal.
              </p>
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-500">
                Pronto a usar <ArrowRight size={12} />
              </div>
            </div>

            <div className="group rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-8 transition-all hover:border-orange-500/20">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 transition-colors group-hover:text-orange-500">
                <Mail size={24} />
              </div>
              <h4 className="mb-3 text-lg font-bold tracking-tight text-white">
                Email Intelligence
              </h4>
              <p className="mb-6 text-sm leading-relaxed text-zinc-500">
                Resumos semanais e alertas críticos enviados para os
                administradores da organização.
              </p>
              <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-orange-500">
                Configurável <ArrowRight size={12} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section
        id="how-it-works"
        className="border-t border-[#1a1a1a] py-24"
      >
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="mb-16 text-center text-3xl font-bold tracking-tight text-white">
            Fluxo de Integração
          </h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="group relative rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-10 transition-all hover:border-orange-500/30">
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-xl font-bold text-orange-500">
                1
              </div>
              <h4 className="mb-4 text-lg font-bold text-white">
                Conecte as nuvens
              </h4>
              <p className="text-sm leading-relaxed text-zinc-500">
                Adicione as API Keys da Vercel, AWS ou GCP num processo seguro
                de 30 segundos.
              </p>
            </div>
            <div className="group relative rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-10 transition-all hover:border-orange-500/30">
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-xl font-bold text-orange-500">
                2
              </div>
              <h4 className="mb-4 text-lg font-bold text-white">
                Sync Automático
              </h4>
              <p className="text-sm leading-relaxed text-zinc-500">
                O motor de sincronização processa os gastos, normaliza os dados
                e aplica a lógica de burn rate.
              </p>
            </div>
            <div className="group relative rounded-2xl border border-[#1a1a1a] bg-[#0a0a0a] p-10 transition-all hover:border-orange-500/30">
              <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-xl font-bold text-orange-500">
                3
              </div>
              <h4 className="mb-4 text-lg font-bold text-white">
                Visão Unificada
              </h4>
              <p className="text-sm leading-relaxed text-zinc-500">
                Visualize instantaneamente o seu faturamento multi-cloud e
                receba alertas proativos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Collaboration Section */}
      <section className="border-t border-[#1a1a1a] bg-gradient-to-b from-transparent to-orange-500/5 py-24">
        <div className="mx-auto flex max-w-7xl flex-col-reverse items-center gap-20 px-6 lg:flex-row">
          <div className="grid w-full flex-1 grid-cols-2 gap-4">
            <div className="group flex aspect-square flex-col items-center justify-center rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 text-center transition-colors hover:border-orange-500/20">
              <Users className="mb-4 text-orange-500" size={32} />
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-white">
                Team Sync
              </h5>
              <p className="mt-2 text-[10px] text-zinc-600">
                Convite por link mágico
              </p>
            </div>
            <div className="group flex aspect-square flex-col items-center justify-center rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 text-center transition-colors hover:border-orange-500/20">
              <RefreshCw className="mb-4 text-orange-500" size={32} />
              <h5 className="text-[10px] font-bold uppercase tracking-widest text-white">
                Multi-Cloud
              </h5>
              <p className="mt-2 text-[10px] text-zinc-600">
                AWS + Vercel + GCP
              </p>
            </div>
            <div className="group col-span-2 flex items-center gap-6 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-6 text-white transition-colors hover:border-orange-500/20">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-[#1a1a1a] bg-zinc-900 grayscale transition-all group-hover:grayscale-0">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Infra"
                  alt="Avatar"
                />
              </div>
              <div>
                <h5 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  Organization Support
                </h5>
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Gestão de membros com RBAC (Owner, Admin, Member).
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 text-center lg:text-left">
            <h2 className="mb-8 text-4xl font-bold leading-tight tracking-tighter text-white">
              Feito para equipas de alta performance.
            </h2>
            <p className="mb-10 text-xl leading-relaxed text-zinc-400">
              Partilhe os indicadores de custo com toda a equipa sem comprometer
              a segurança. Controle permissões e centralize a governação
              financeira da sua startup.
            </p>
            <button className="mx-auto flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-orange-500 transition-all hover:gap-4 lg:mx-0">
              Ver Gestão de Membros <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="border-t border-[#1a1a1a] bg-[#050505] py-24"
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-20 text-center text-white">
            <h2 className="text-4xl font-bold tracking-tighter">
              Cresça com Previsibilidade.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-lg text-zinc-500">
              Pague em Reais, monitorize em Dólares. Escolha o plano que melhor
              se adapta à escala da sua operação.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-4 md:grid-cols-2">
            {/* Starter Plan */}
            <div className="flex flex-col rounded-2xl border border-[#1a1a1a] bg-[#080808] p-10 transition-all hover:border-zinc-800">
              <div className="mb-10 text-left">
                <h3 className="mb-6 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Plano Starter
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tighter text-white">
                    R$ 97
                  </span>
                  <span className="text-sm text-zinc-600">/mês</span>
                </div>
                <p className="mt-4 text-[10px] font-mono uppercase italic text-zinc-600">
                  * Custo operacional de uma t3.medium.
                </p>
              </div>
              <ul className="mb-12 flex-1 space-y-5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> Monitoramento
                  até $600 USD / mês
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> Vercel, AWS &
                  GCP Ingest
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> Alertas Slack
                  & Discord
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> 1 Org + 3
                  Membros
                </li>
              </ul>
              <button className="w-full rounded border border-[#1a1a1a] border-dashed py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-900 hover:text-white">
                Selecionar Starter
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative flex flex-col rounded-2xl border border-orange-500/30 bg-[#0a0a0a] p-10 shadow-[0_0_50px_rgba(249,115,22,0.08)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#f97316] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                Melhor Escolha
              </div>
              <div className="mb-10 text-left">
                <h3 className="mb-6 text-[10px] font-bold uppercase tracking-widest text-orange-500">
                  Plano Pro
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold tracking-tighter text-white">
                    R$ 197
                  </span>
                  <span className="text-sm text-zinc-600">/mês</span>
                </div>
              </div>
              <ul className="mb-12 flex-1 space-y-5 text-left text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> Monitoramento
                  Ilimitado
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> Histórico de 12
                  Meses
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> Relatórios
                  Semanais (PDF)
                </li>
                <li className="flex items-center gap-3">
                  <Check size={16} className="text-[#f97316]" /> Membros
                  Ilimitados
                </li>
              </ul>
              <button className="glow-orange-small w-full rounded bg-[#f97316] py-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#ea580c]">
                Selecionar Pro
              </button>
            </div>
          </div>
          <p className="mt-16 text-center text-[9px] font-mono uppercase tracking-widest text-zinc-600 opacity-60">
            * Facturamento original em USD. Câmbio flutuante aplicado na
            visualização.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-16">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-10 px-6 text-zinc-600 md:flex-row">
          <div className="flex items-center gap-2 opacity-50 grayscale transition-all hover:opacity-100 hover:grayscale-0">
            <BurnWatchLogo size="sm" />
          </div>
          <div className="text-[9px] font-mono uppercase tracking-widest">
            © 2026 BurnWatch • Infra-First observability
          </div>
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
    </div>
  );
}

type FeatureItemProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function FeatureItem({ icon, title, description }: FeatureItemProps) {
  return (
    <div className="group">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-orange-500 transition-colors group-hover:border-orange-500/30">
        {icon}
      </div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-white">
        {title}
      </h3>
      <p className="text-xs font-medium leading-relaxed text-zinc-500">
        {description}
      </p>
    </div>
  );
}
