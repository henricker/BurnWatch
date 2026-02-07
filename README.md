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
* **Lightweight & Edge-Ready:** Built on **Next.js** (App Router), Supabase (Auth + Postgres), and Prisma; optimized for low-latency dashboards and global reach.
* **Predictive Layer:** Custom math engine for trend analysis and anomaly scoring.

---

## 📍 Current Status (Sprint 01)

**Done:** Milestone 1 (Auth & multi-tenancy) and **Milestone 2 (Organization & member system)** are complete and functional:

- Magic link + GitHub auth, onboarding, organization invites, RBAC (Owner / Admin / Member).
- Team management (members, pending invites), Settings (profile, org name, delete org with confirmation).
- i18n (PT, EN, ES) with instant locale switch; light/dark theme; landing page with transcultural copy and pricing.

**Next:** **Milestone 3 – Credential Management UI (CRUD):** connection screens for Vercel, AWS, GCP; encrypt tokens on save; status “Connected” and rename/remove accounts.

See `docs/sprints/SPRINT_01.md` for the full sprint plan and `docs/STATE.md` for technical context and env setup.

---

## 🏃 Development

```bash
pnpm install
# Create .env with DATABASE_URL, DIRECT_URL, Supabase keys, ENCRYPTION_KEY (see docs/STATE.md §9)
pnpm db:push           # or pnpm prisma migrate dev
pnpm dev
```

Required env vars and details: **§9** in `docs/STATE.md`.

---

## 📈 Roadmap & Vision

- **Q1:** MVP - Vercel & AWS & GCP connectivity + Core Projection Engine.
- **Q2:** Intelligent Alerts - Slack/Discord integration with 1-click remediation.
- **Q3:** AI-Spend Monitoring - Tracking LLM token usage (OpenAI/Anthropic) as part of infra costs.
- **Q4:** Auto-Optimization - AI-driven suggestions for Spot Instances and Reserved Capacity.

---

## 💼 Business Inquiries
BurnWatch is currently in active development. If you are a founder looking to regain control of your cloud spend, follow this repository or open an issue to join the beta.
