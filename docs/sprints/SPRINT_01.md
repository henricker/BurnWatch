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
    - Initial Auth methods: **Email Magic Link** (primary) and groundwork for OAuth providers (e.g. GitHub) in later milestones.
- **Prisma Schema (Supabase-ready):**
    - `Organization`: Primary container.
    - `Profile`: Linked to Supabase `auth.users` via UUID.
    - `CloudAccount`: Stores credentials (Provider enum, encrypted keys).
    - `DailySpend`: Financial records with `org_id` and unique constraint on `(org_id, provider, service_name, date)`.
- **Security Primitives:**
    - `EncryptionService`: AES-256-GCM for API keys before saving to DB.
    - Use `@supabase/supabase-js` for client/server communication.
- **Auth UI:**
    - Implement a minimal **Login/Signup screen** using Supabase Auth with **email magic link**.
    - The screen must support:
        - entering an email to receive a magic link;
        - basic success/error feedback (e.g. “check your inbox”).
    - This screen will be the entry point to the workspace (`Organization`) once Milestone 2 introduces invitation flows.

> **Cursor Instruction:** "Setup the Prisma schema with Supabase Auth integration. Create an Organization-based multi-tenancy structure. Also, implement the AES-256-GCM Encryption utility for cloud credentials."

---

## 🔌 Milestone 2: Organization Invitation System (Magic Links)
**Goal:** Seamless onboarding into Organizations via Supabase Magic Links.

### Technical Requirements (Pivot)
- **OrganizationInvite Model (Prisma):**
    - Add `OrganizationInvite` with:
        - `id`
        - `email` (**unique por org**)
        - `organizationId`
        - `role`
        - `createdAt`
        - `expiresAt`
    - Garantir que um mesmo email não possa ser convidado duas vezes para a mesma `Organization` (unique constraint apropriado).

- **Invite Service (`src/services/inviteService.ts`):**
    - Função `inviteUser(adminId, orgId, guestEmail)`:
        - Verificar se `adminId` tem permissão para convidar para `orgId`.
        - Criar o registro em `OrganizationInvite`.
        - Chamar `supabase.auth.signInWithOtp({ email: guestEmail })` para disparar o Magic Link.

- **Automated Onboarding (`/auth/callback`):**
    - Atualizar o callback de auth (`src/app/auth/callback/page.tsx` ou `route.ts` se migrar para handler):
        - Após confirmar a sessão:
            - Buscar `OrganizationInvite` pendente para o email autenticado.
            - Se existir:
                - Criar `Profile` ligando `auth.user.id` àquele `organizationId` com o `role` do invite.
                - Remover o registro de `OrganizationInvite` (convite consumido).
            - Se **não existir invite**:
                - Se o usuário **já tiver `Profile`** (já faz parte de alguma `Organization`):
                    - Seguir o fluxo normal de login (redirecionar para `/dashboard`).
                - Se for **primeiro acesso** (nenhum `Profile` ainda):
                    - Redirecionar obrigatoriamente para uma tela de **Onboarding de Organização** (ex.: `src/app/onboarding/page.tsx` ou modal equivalente).
                    - Nessa tela o usuário deve:
                        - Criar sua própria `Organization` (nome, opcionalmente timezone/moeda).
                        - Criar o `Profile` ligando `auth.user.id` à nova `Organization` como `owner`/`admin`.
                    - O usuário **não pode pular essa etapa**; somente após concluir o onboarding é redirecionado para `/dashboard`.
        - **Constraint:** usar transações Prisma para o fluxo de aceitação de convite (criação de `Profile` + deleção do invite) para garantir atomicidade.

- **Member Management UI (`src/app/dashboard/settings/members/page.tsx`):**
    - Tela em “infra‑vibe” minimalista (Shadcn/UI quando introduzido no projeto):
        - Formulário para convidar novos membros por email.
        - Tabela com:
            - Membros atuais (derivados de `Profile`).
            - Convites pendentes (derivados de `OrganizationInvite`).
        - Ações:
            - **Revoke**: cancelar um invite pendente.
            - **Remove**: remover um membro atual (ajustando ou deletando o `Profile`).

### ✅ Implementation status (Milestone 02 – concluído)

- **Schema (Prisma):**
  - `OrganizationInvite` com `id`, `email`, `organizationId`, `role`, `createdAt`, `expiresAt`; unique `(organizationId, email)`.
  - `Profile.role` como enum `Role` (`OWNER` | `ADMIN` | `MEMBER`); defaults `MEMBER`.
  - `Profile.theme` e `Profile.locale` para preferências (tema light/dark/system e idioma pt/en).
- **RBAC:** `src/lib/roles.ts` com `ROLE_LABELS`, `canManageMembers`, `canDeleteOrganization`; hierarquia respeitada no invite (não convidar com role superior ao do inviter).
- **Invite Service:** `src/modules/organizations/application/inviteService.ts` – `createInvite(prisma, supabase, params)` com validação de role e `signInWithOtp` com `emailRedirectTo` para `/auth/callback`.
- **Auth completion:** `src/app/api/auth/complete/route.ts` – lê invite pendente por email; se existir, cria `Profile` e remove invite (fluxo atômico); senão redireciona para `/onboarding` se sem profile, ou para `next` (ex.: `/dashboard`).
- **Onboarding:** `src/app/onboarding/page.tsx` – cria `Organization` e `Profile` (OWNER); upload de avatar opcional; `POST /api/onboarding/complete`.
- **Member Management UI:** `src/app/dashboard/members/page.tsx` – lista “Membros Atuais” e “Convites Pendentes”; botões Convidar, Remover, Reenviar. APIs: `POST /api/invites`, `DELETE /api/members/[profileId]`, `PATCH /api/profile` (inclui theme/locale).
- **Settings:** `src/app/dashboard/settings/page.tsx` – seção Perfil (nome, sobrenome, avatar), Organization (nome, role), Danger zone (OWNER). Formulário de perfil e avatar com signed URL (bucket profile).
- **Tema e idioma:** Light/Dark/System e seletor PT/EN no header do dashboard (canto superior direito); preferências salvas no perfil; ao carregar dashboard aplica `profile.theme` via `PreferencesSync`. Biblioteca: `next-themes` (sem i18n ainda).
- **UI (shadcn):** Sidebar do dashboard com shadcn (`Sidebar`, `SidebarTrigger`); regra `.cursor/rules/shadcn-ui.mdc` para sempre usar shadcn. Páginas de membros e settings com classes de tema (`text-foreground`, `text-muted-foreground`, `bg-card`, `border-border`, etc.) para light/dark.
- **Outros:** Middleware em `src/middleware.ts` redireciona usuário logado de `/` para `/dashboard`; try/catch + timeout no middleware para não travar se Supabase falhar. `src/lib/supabase/server.ts` – `setAll` em try/catch para não quebrar em Server Components (cookies só podem ser modificados em Route Handler/Server Action). `src/lib/safe-fetch.ts` – `fetchWithRetry` para reduzir falhas de rede em dev. RLS: políticas documentadas em `docs/RLS_POLICIES.sql` (incl. `organization_invites_owner_admin_manage`).

---

## 🧩 Milestone 3: The Adapter Engine (Vercel Implementation)
**Goal:** Create the modular ingestion layer for cloud providers, starting with Vercel.

### Technical Requirements:
- **Contract:** Interface `ICloudProvider` em `src/lib/adapters/types.ts`.
- **Vercel Adapter:**
    - Integração com a Vercel Billing API.
    - **Normalization:** Mapear a resposta para o schema `DailySpend`.
    - **Integer Math:** Todos os valores em **cents** (inteiros) do começo ao fim.
- **Extensibilidade:**
    - Estrutura preparada para receber outros providers (AWS, GCP, etc.) implementando a mesma interface `ICloudProvider`.

---

## 🧪 Milestone 4: Sync Service & Prediction Math
**Goal:** The "Intelligence" layer.

### Technical Requirements:
- **Sync Engine:** - Fetch all `CloudAccount` records.
    - Decrypt keys and call the correct Adapter.
    - Use Prisma `upsert` to ensure idempotency.
- **Predictive Engine:**
    - Linear regression to calculate "Projected End of Month".
    - `AnomalyScore`: Flag if `today > last_7_days_avg * 1.5`.

---

## 📊 Milestone 5: The "Aha!" Dashboard
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