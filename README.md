# 🕵️‍♂️ BurnWatch
### *Stop burning cash. Start watching your burn.*

**BurnWatch** is a strategic financial observability platform designed for lean startups and engineering teams. We transform the chaotic "Black Box" of cloud billing into actionable, real-time financial intelligence.

---

## 💎 The Value Proposition

Cloud costs are the second largest expense for software companies, yet most teams only see the price tag when it's too late. 

**BurnWatch** provides the "Financial Early Warning System" that founders and CTOs need to protect their runway. We don't just show you what you spent; we tell you **what you are about to spend.**

## 🎯 Key Business Outcomes

* **Protect Your Runway:** Stop "unforeseen spikes" from eating months of your company's life.
* **Engineering Accountability:** Instantly identify which deployment or service caused a cost anomaly.
* **Credit Optimization:** For startups on AWS/GCP credit programs, BurnWatch ensures you don't waste your "free money" on idle resources.
* **Zero-Effort FinOps:** Enterprise-grade financial oversight without the $50k/year consultant price tag.

---

## 🚀 Strategic Features

### 1. The Unified Burn Rate
Consolidate **AWS, Vercel, and GCP** into a single, normalized financial timeline. No more hopping between tabs to understand your total daily spend.

### 2. Predictive Forecasting (The "Aha!" Moment)
Using daily regression models, BurnWatch projects your end-of-month invoice. If your projected bill exceeds your budget, you get notified on Day 5, not Day 30.

### 3. Anomaly Detection (The Kill-Switch)
Detect cost spikes at the service level (e.g., an S3 bucket receiving a DDoS or a Lambda loop). BurnWatch alerts your team via Slack before the "leak" becomes a flood.

### 4. Shadow IT Discovery
Identify "Zombies"—forgotten instances, idle GPUs, and orphaned storage volumes that are quietly draining your bank account.

---

## 🛠 High-Level Architecture
*Built for security and scale by senior engineers.*

* **Security First:** AES-256-GCM encryption for all cloud credentials. We never store what we don't need.
* **Adapter-Based Engine:** A modular architecture that allows adding new cloud providers in hours, not weeks.
* **Backend by Use Cases:** Each module follows a clear layout: `domain/`, `application/use-cases/<use-case-name>/` (with `index.ts` and `index.spec.ts` per use case), and `infrastructure/`. API routes stay thin and delegate to use-case classes.
* **Lightweight & Edge-Ready:** Built on **Next.js** (App Router), Supabase (Auth + Postgres), and Prisma; optimized for low-latency dashboards and global reach.
* **Predictive Layer:** Custom math engine for trend analysis and anomaly scoring.

---

## 📍 Current Status

**Sprint 01 – Concluída com sucesso.** Milestones 1–5 entregues:

- **M1 – Auth & multi-tenancy:** Magic link + GitHub, Supabase + Prisma, RLS.
- **M2 – Organization & members:** Onboarding, invites, RBAC (Owner/Admin/Member), Settings (profile, org name, delete org), i18n (PT, EN, ES), light/dark theme, landing with transcultural copy and pricing.
- **M3 – Credential Management UI:** `/dashboard/connections` with CRUD for Vercel, AWS, GCP; credentials encrypted at rest (AES-256-GCM); per-account status, Sync Health, rename/delete with confirmation.
- **M4 – Adapter Engine (Vercel):** Real ingestion via Vercel Billing API; SyncService with day-by-day backfill and bulk upsert per day (~73s → ~35s); 403/token error handling with translated tooltips; unified loading state when creating a connection or triggering sync.
- **M5 – The "Aha!" Dashboard:** Analytics module (`getDashboardAnalytics`) with date ranges (7D, 30D, MTD) and provider filter; `GET /api/analytics`; cost evolution chart (multiple lines per provider when "All"), metric cards (total, forecast, daily burn, status), Resource Breakdown, Spend by Category (Observability & Automation); end-of-month projection (MTD), Z-score anomaly detection; full i18n and unit tests for analytics.

**Sprint 02: Multi-Cloud Expansion & Business Readiness**

- **M6 – AWS Integration:** ✅ Concluído. `AwsProvider` com Cost Explorer SDK, modo fake, tratamento de credencial inválida e mensagens traduzidas em Connections; CI com cache pnpm e `prisma generate`; lint sem erros nem warnings; polimento do dashboard (gráfico 30 dias com eixo X/Y e tooltip no hover, gasto por categoria em light mode) e da sidebar (logo alinhado no modo colapsado, modo aberto preservado).
- **M6.5 – Backend Architecture Improvements:** ✅ Concluído. Use cases em classes (domain / application / infrastructure); uma pasta por use case em kebab-case com `index.ts` e `index.spec.ts` em todos os módulos; rotas API finas; Vitest com `*.spec.ts`; 105 testes e build passando. Necessário para a evolução sustentável da plataforma.
- **M7 – GCP Integration:** ✅ Concluído. `GcpProvider` com Service Account JSON e BigQuery Billing Export; modo fake (`USE_FAKE_GCP_BILLING`); erros GCP traduzidos em Connections; mapeamento de serviços (BigQuery → Database) e cor #22c55e no dashboard; 116 testes.
- **M8 – Notification Engine:** ✅ Concluído. Webhooks Slack e Discord por organização (`slackWebhookUrl`, `discordWebhookUrl`, `notificationSettings` em Organization); use cases `SendAnomalyAlertUseCase`, `TestWebhookConnectionUseCase`, `TriggerAnomalyAlertAfterSyncUseCase`; página `/dashboard/notifications` (testar webhook sem gravar, guardar quando valor difere); mensagens em pt/en/es conforme locale do OWNER; trigger pós-sync em fire-and-forget. 137 testes.
- **M9 – Monetization:** Stripe Checkout (Starter R$ 97 / $49, Pro R$ 197 / $149), Usage Guards (soft block), pricing regional (`bw_market`).

Ver [docs/sprints/SPRINT_01.md](docs/sprints/SPRINT_01.md) (histórico) e [docs/sprints/SPRINT_02.md](docs/sprints/SPRINT_02.md) (plano atual). Contexto técnico e env: [docs/STATE.md](docs/STATE.md).

---

## 🏃 Development

```bash
pnpm install
# Create .env with DATABASE_URL, DIRECT_URL, Supabase keys, ENCRYPTION_KEY (see docs/STATE.md §9)
pnpm db:push           # or pnpm prisma migrate dev
pnpm dev
```

Required env vars and details: **§9** in `docs/STATE.md`.

GitHub Actions CI: `.github/workflows/ci.yml` roda `pnpm lint`, `pnpm test` e `pnpm build` em cada push/PR para `main`, com billing fake para AWS, Vercel e GCP por padrão (`USE_FAKE_*_BILLING=true`).

---

## 📈 Roadmap & Vision

- **Q1:** MVP - Vercel & AWS & GCP connectivity + Core Projection Engine.
- **Q2:** Intelligent Alerts - Slack/Discord integration with 1-click remediation.
- **Q3:** AI-Spend Monitoring - Tracking LLM token usage (OpenAI/Anthropic) as part of infra costs.
- **Q4:** Auto-Optimization - AI-driven suggestions for Spot Instances and Reserved Capacity.

---

## 💼 Business Inquiries
BurnWatch is currently in active development. If you are a founder looking to regain control of your cloud spend, follow this repository or open an issue to join the beta.
