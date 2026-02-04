# 🏃‍♂️ Sprint 01: The "First Dollar" Foundation (Supabase Edition)

## 🎯 Objective
Build the end-to-end "Steel Thread": Setup Supabase Auth/DB, connect a cloud provider (Vercel), fetch real spend data, and display a predictive "End of Month" projection.

---

## 🏗 Milestone 1: Core Infra, Auth & Multi-tenancy
**Goal:** Setup Supabase and the secure database foundation.

### Technical Requirements:
- **Supabase Integration:**
    - Use Supabase Auth for User Management.
    - Implement **Row Level Security (RLS)**: Users should only see data from their own `Organization`.
- **Prisma Schema (Supabase-ready):**
    - `Organization`: Primary container.
    - `Profile`: Linked to Supabase `auth.users` via UUID.
    - `CloudAccount`: Stores credentials (Provider enum, encrypted keys).
    - `DailySpend`: Financial records with `org_id` and unique constraint on `(org_id, provider, service_name, date)`.
- **Security Primitives:**
    - `EncryptionService`: AES-256-GCM for API keys before saving to DB.
    - Use `@supabase/supabase-js` for client/server communication.

> **Cursor Instruction:** "Setup the Prisma schema with Supabase Auth integration. Create an Organization-based multi-tenancy structure. Also, implement the AES-256-GCM Encryption utility for cloud credentials."

---

## 🔌 Milestone 2: The Adapter Engine (Vercel Implementation)
**Goal:** Create the modular ingestion layer.

### Technical Requirements:
- **Contract:** Interface `ICloudProvider` in `src/lib/adapters/types.ts`.
- **Vercel Adapter:** - Integration with Vercel Billing API.
    - **Normalization:** Map response to our `DailySpend` schema.
    - **Integer Math:** All values must be handled in **Cents**.

---

## 🧪 Milestone 3: Sync Service & Prediction Math
**Goal:** The "Intelligence" layer.

### Technical Requirements:
- **Sync Engine:** - Fetch all `CloudAccount` records.
    - Decrypt keys and call the correct Adapter.
    - Use Prisma `upsert` to ensure idempotency.
- **Predictive Engine:**
    - Linear regression to calculate "Projected End of Month".
    - `AnomalyScore`: Flag if `today > last_7_days_avg * 1.5`.

---

## 📊 Milestone 4: The "Aha!" Dashboard
**Goal:** Value-focused UI with Shadcn/UI.

### UI Requirements:
- **Auth Flow:** Login/Signup via Supabase Auth.
- **Hero Metrics:** "Total Spend This Month" vs "Projected Spend".
- **Visuals:** Bar Chart (Recharts) for daily burn and Service Breakdown table.
- **Vibe:** High-fidelity, minimalist infra-tool (Dark Mode).

---

## ⚠️ Senior Constraints
1. **RLS is Mandatory:** Do not rely solely on application-level filtering. Use Supabase RLS.
2. **Server-Side Sync:** The Sync Service must run on the server (Edge Functions or Cron) to protect API Keys.
3. **BigInt/Cents:** Use `Int` in Prisma for money to avoid floating-point drift.