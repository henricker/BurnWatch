# BurnWatch – STATE (end of Milestone 02)

Este documento resume o estado atual da base de código após a implementação do **Milestone 02: Organization Invitation System (Magic Links)** e ajustes de UI (RBAC, tema light/dark, shadcn). Serve como contexto inicial para outras AIs (ex.: Gemini) continuarem o trabalho.

---

## 1. Stack e Versões relevantes

- **Next.js**: 16 (App Router, `src/app`)
- **TypeScript**: `strict` ligado, sem uso de `any`
- **ORM**: Prisma **5.22.0** (intencionalmente não migrado para v7 para evitar `prisma.config.ts` por enquanto)
- **DB**: Supabase Postgres
- **Auth**: Supabase Auth (email magic link + GitHub OAuth)
- **Testing**: Vitest 4 (scripts `pnpm test`)

---

## 2. Schema de banco (Prisma + Supabase)

Arquivo: `prisma/schema.prisma`

- **Datasource**
  - `provider = "postgresql"`
  - Usa `url = env("DATABASE_URL")` e `directUrl = env("DIRECT_URL")` (compatível com Prisma v5).

- **Modelos principais**
  - `Organization`
    - Representa o **Workspace** multi-tenant.
    - Campos principais: `id (UUID)`, `name`, `createdAt`, `updatedAt`.
    - Relacionamentos: `profiles`, `cloudAccounts`, `dailySpends`.
  - `Profile`
    - Liga um usuário do Supabase (`auth.users`) a uma `Organization`.
    - Campos:
      - `userId: String @db.Uuid @map("user_id")` – armazena `auth.users.id`.
      - `organizationId: String @db.Uuid @map("organization_id")`.
      - `role: Role` – enum `OWNER | ADMIN | MEMBER` (default `MEMBER`).
      - `firstName`, `lastName`, `avatarPath` (opcionais).
      - `theme: String?` – preferência de tema (`"light" | "dark" | "system"`, default `"system"`).
      - `locale: String?` – preferência de idioma (`"pt" | "en"`, default `"pt"`).
    - Constraints:
      - `@@unique([userId, organizationId], name: "profile_user_org_unique")`.
  - `OrganizationInvite`
    - Convites pendentes por email para uma organização.
    - Campos: `id`, `email`, `organizationId`, `role` (Role), `createdAt`, `expiresAt`.
    - `@@unique([organizationId, email], name: "org_invite_org_email_unique")`.
  - `CloudAccount`
    - Guarda credenciais e metadados de provedores de cloud.
    - Campos:
      - `organizationId: String @db.Uuid @map("organization_id")`.
      - `provider: CloudProvider` (enum: `AWS | VERCEL | GCP | OTHER`).
      - `label: String` (ex.: “Prod AWS”).
      - `encryptedCredentials: String @map("encrypted_credentials")` – payload criptografado (AES‑256‑GCM).
      - `metadata: Json?`.
    - Índices:
      - `@@index([organizationId], name: "cloud_account_org_idx")`.
  - `DailySpend`
    - Tabela agregada de gasto diário.
    - Campos:
      - `organizationId: String @db.Uuid @map("organization_id")`.
      - `date: DateTime @map("date")`.
      - `provider: CloudProvider`.
      - `serviceName: String @map("service_name")`.
      - `amountCents: Int @map("amount_cents")` – **SEM floats**.
      - `currency: String? @default("USD")`.
    - Índices:
      - **Índice único composto para idempotência de sync**  
        `@@unique([organizationId, provider, serviceName, date], name: "daily_spend_org_provider_service_date_unique")`.
      - Índice de consulta rápida:  
        `@@index([organizationId, date], name: "daily_spend_org_date_idx")`.

> Observação: o índice único gera em Prisma o campo  
> `daily_spend_org_provider_service_date_unique` dentro de `DailySpendWhereUniqueInput`. Isso é usado na camada de serviço para `upsert`.

---

## 3. RLS (Row Level Security) e multi-tenancy

- RLS está **habilitado** manualmente, via painel Supabase, nas tabelas:
  - `organizations`, `profiles`, `cloud_accounts`, `daily_spend`, `organization_invites`.
- As policies estão documentadas em: `docs/RLS_POLICIES.sql`.
  - Padrão: cruzar com `public.profiles` via `organization_id` e `profiles.user_id = auth.uid()`.
  - Exemplos:
    - `orgs_select_member` em `organizations`: só vê a org se existir `profile` para aquele `auth.uid()`.
    - `profiles_self_*`: usuário só lê/insere/atualiza o próprio `Profile`.
    - `cloud_accounts_member_crud` / `daily_spend_member_crud`: CRUD por org.
    - `organization_invites_owner_admin_manage`: apenas OWNER/ADMIN da org podem gerenciar convites.
- Regra arquitetural: **toda nova tabela multi-tenant deve ter `organization_id` e policy consistente**.

---

## 4. Camada de segurança – EncryptionService (AES‑256‑GCM)

Arquivo: `src/lib/security/encryption.ts`

- Implementa `EncryptionService` usando `node:crypto` (`aes-256-gcm`):
  - Chave: `Buffer` de **32 bytes** (AES‑256). Validamos o tamanho na construção.
  - IV: `randomBytes(12)` (tamanho recomendado para GCM).
  - Formato serializado de saída:  
    **`iv:authTag:ciphertext`**, todos em base64.
- Tipos/erros:
  - `type SerializedCiphertext = string`.
  - `EncryptionError` e `DecryptionError` (subclasses de `Error`).
- Métodos principais:
  - `encrypt(plaintext: string): SerializedCiphertext`.
  - `decrypt(serialized: SerializedCiphertext): string`.
  - `static fromEnv(env = process.env)`:
    - lê `ENCRYPTION_KEY` (base64 ou hex);
    - faz parse para `Buffer` de 32 bytes;
    - dispara `EncryptionError` se o formato/tamanho estiver incorreto.

### API de teste rápida

Arquivo: `src/app/api/encryption-test/route.ts`

- Rota `GET /api/encryption-test`:
  - Usa `EncryptionService.fromEnv()`.
  - Criptografa/decriptografa `"BurnWatch encryption roundtrip"`.
  - Retorna `{ ok, original, decrypted, ciphertext }` ou erro `500`.

---

## 5. Supabase Clients (Next.js 14 friendly)

Ambos seguem o padrão `@supabase/ssr`.

### Browser client

Arquivo: `src/lib/supabase/client.ts`

- `createSupabaseBrowserClient(): SupabaseClient`
  - Usa `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
  - Configura auth com:
    ```ts
    auth: {
      flowType: "implicit", // evita problemas de PKCE para o MVP
    }
    ```
  - Esse client é usado em componentes client (`"use client"`), como a tela de login.

### Server client

Arquivo: `src/lib/supabase/server.ts`

- `createSupabaseServerClient(): Promise<SupabaseClient>`
  - Usa `cookies()` de `next/headers` (assinatura assíncrona) para ler/escrever cookies.
  - Configura `createServerClient(url, key, { cookies: { getAll, setAll } })` conforme docs do `@supabase/ssr`.
  - **setAll** está em `try/catch`: em Server Components o Next.js não permite modificar cookies (apenas em Route Handlers / Server Actions); ao falhar, o refresh de sessão não persiste nessa resposta, mas a página não quebra.
  - Retorna `Promise<SupabaseClient>` – usar sempre com `await` em Server Components e route handlers.

---

## 6. Fluxo de Autenticação (Magic Link + GitHub)

### Tela de login / signup por email

Arquivo: `src/app/page.tsx` (Client Component)

- UI minimalista dark, infra‑vibe.
- Campos e estados:
  - `email: string`
  - `status: "idle" | "loading" | "success" | "error"`
  - `errorMessage: string | null`
- Ação principal – magic link:
  - Função `handleSubmit` chama:
    ```ts
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    ```
  - Mostra:
    - loading: `"Sending magic link..."`;
    - sucesso: `"Magic link sent. Check your inbox to continue."`;
    - erro genérico ou de rate limit (ex.: `"email rate limit exceeded"`).

### Login com GitHub

Ainda na `src/app/page.tsx`:

- Botão “**Continue with GitHub**” que chama:
  ```ts
  await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  ```
- Supabase já foi configurado no painel com provider GitHub e redirect URL `/auth/callback`.

### Callback de autenticação

Arquivo: `src/app/auth/callback/page.tsx` (Client Component)

- Responsável por finalizar o login tanto de **magic link** quanto de **OAuth (GitHub)**.
- Lógica:
  - `useEffect` roda `confirmSession()`:
    ```ts
    await supabase.auth.initialize(); // captura tokens do URL (implicit flow)
    const { data, error } = await supabase.auth.getSession();
    ```
  - Se não houver `session`, mostra erro:  
    `"No active session found. Try requesting a new magic link."`
  - Se houver sessão:
    - Chama `POST /api/auth/complete` com `Authorization: Bearer <access_token>`.
    - O servidor (auth completion) verifica se existe `OrganizationInvite` pendente para o email; se sim, cria `Profile` e remove o invite; senão, se não houver profile, retorna `next: "/onboarding"`, caso contrário `next: "/dashboard"`.
    - Cliente redireciona para `dataJson.next`.
- A página de callback está envolvida em `<Suspense>` (Next.js exige para `useSearchParams`).

### Onboarding

Arquivo: `src/app/onboarding/page.tsx`

- Primeiro acesso sem invite: usuário é mandado para `/onboarding`.
- Formulário: nome da organização, primeiro nome, sobrenome, avatar (opcional).
- `POST /api/onboarding/complete` cria `Organization` e `Profile` (role OWNER); upload de avatar para bucket Supabase `profile` (signed URL gerada no servidor para leitura).

### Dashboard e layout

- **Layout:** `src/app/dashboard/layout.tsx` – Server Component que chama `getSessionProfile()` (redireciona para `/` se não autenticado, para `/onboarding` se sem profile). Renderiza `SidebarProvider` e `DashboardShell` (nome da org, role, theme/locale para header).
- **Sidebar:** shadcn `Sidebar` com `AppSidebar` (Dashboard, Members, Settings); colapsável; ícones e tooltips.
- **Header:** `SidebarTrigger` + no canto direito `ThemeToggle` (Light/Dark/System) e `LocaleSwitcher` (PT/EN). Tema e idioma são salvos no perfil via `PATCH /api/profile`; ao carregar o dashboard, `PreferencesSync` aplica `profile.theme` uma vez (next-themes).
- **Página dashboard:** `src/app/dashboard/page.tsx` – placeholder; futuramente gasto e projeções.

### Membros

Arquivo: `src/app/dashboard/members/page.tsx`

- Lista **Membros Atuais** (Profile na org) e **Convites Pendentes** (OrganizationInvite não expirados).
- Ações: Convidar (modal com email e role), Remover membro, Reenviar convite.
- APIs: `POST /api/invites`, `DELETE /api/members/[profileId]`, `PATCH /api/profile` (dados + theme/locale).
- UI com classes de tema (`text-foreground`, `bg-card`, `border-border`, etc.) para light/dark.

### Settings

Arquivo: `src/app/dashboard/settings/page.tsx`

- Seções: **Perfil** (nome, sobrenome, avatar via `ProfileEditForm`), **Organization** (nome da org, role do usuário), **Danger zone** (apenas para OWNER; delete org previsto para milestone futuro).
- Avatar: upload para bucket `profile`; signed URL gerada em `src/lib/avatar.ts` com service role para leitura.

### Tema (light/dark) e preferências

- **next-themes** no layout raiz (`ThemeProvider` com `attribute="class"`, `defaultTheme="system"`).
- Tema e locale armazenados em `Profile.theme` e `Profile.locale`; aplicados no header do dashboard e sincronizados ao carregar (PreferencesSync aplica tema uma vez).
- **Regra de UI:** `.cursor/rules/shadcn-ui.mdc` – usar sempre componentes shadcn; páginas e componentes usam variáveis de tema (foreground, muted-foreground, card, border, primary, destructive) para funcionar em light e dark.

### Middleware e resiliência

- **Middleware** (`src/middleware.ts`): matcher `["/"]`. Se usuário autenticado (Supabase `getUser`) acessa `/`, redireciona para `/dashboard`. Try/catch e timeout (~4s) para não travar se Supabase estiver lento ou inacessível.
- **safe-fetch:** `src/lib/safe-fetch.ts` – `fetchWithRetry()` com retry em erros de rede; usado nas chamadas de API do cliente.
- **Supabase server:** `setAll` de cookies em try/catch para não quebrar em Server Components (Next só permite setar cookies em Route Handlers / Server Actions).

---

## 7. Serviços de domínio (módulos)

### 7.1. Billing / DailySpend

#### DailySpendService (idempotência via índice composto)

Arquivo: `src/modules/billing/application/dailySpendService.ts`

- Interface:
  ```ts
  export interface UpsertDailySpendInput {
    organizationId: string;
    date: Date;
    provider: CloudProvider;
    serviceName: string;
    amountCents: number;
    currency?: string;
  }
  ```
- Função principal:
  ```ts
  export async function upsertDailySpend(
    prisma: Pick<PrismaClient, "dailySpend">,
    input: UpsertDailySpendInput,
  ) {
    return prisma.dailySpend.upsert({
      where: {
        daily_spend_org_provider_service_date_unique: {
          organizationId,
          provider,
          serviceName,
          date,
        },
      },
      create: { ... },
      update: { amountCents, currency },
    });
  }
  ```
- Garante que múltiplos syncs com o mesmo `(org, provider, service, date)` apenas atualizam o registro existente (idempotência de ingestão).

---

## 8. Testes (Vitest) – “Testing for Confidence”

### Configuração

- Arquivo: `vitest.config.ts`
  - `environment: "node"`, `globals: true`, `include: ["src/**/*.test.ts"]`.
- Script em `package.json`:
  - `"test": "vitest"`.

### Testes de criptografia

Arquivo: `src/lib/security/encryption.test.ts`

Casos cobertos:

- Round‑trip simétrico:
  - `encrypt` seguido de `decrypt` retorna o plaintext original.
- IV aleatório:
  - Duas chamadas de `encrypt` para o mesmo plaintext geram ciphertexts diferentes.
- Key inválida:
  - `new EncryptionService({ key: Buffer.alloc(16) })` lança `EncryptionError`.
- Ciphertext malformado:
  - `decrypt("invalid-format")` lança `DecryptionError`.
- Key diferente:
  - Criptografar com uma chave e tentar decriptar com outra lança `DecryptionError`.

### Teste do comportamento de idempotência em DailySpend

Arquivo: `src/services/dailySpendService.test.ts`

- Usa `vi.fn()` para mockar `prisma.dailySpend.upsert`.
- Chama `upsertDailySpend(prismaMock, input)` duas vezes com os mesmos dados.
- Verifica:
  - `upsert` foi chamado 2 vezes.
  - O primeiro call recebeu `where: { daily_spend_org_provider_service_date_unique: { ... } }` – ou seja, o índice composto correto está sendo usado como chave única.

Resultado atual: `pnpm test` passa com **2 test files / 6 testes**.

---

## 9. Variáveis de ambiente necessárias

Resumo das envs hoje (arquivo `.env` não é commitado, mas o contrato é este):

- **Prisma / DB**
  - `DATABASE_URL` – conexão Supabase via pool (pgBouncer).
  - `DIRECT_URL` – conexão direta (porta 5432) usada para migrations.
- **Supabase client**
  - `NEXT_PUBLIC_SUPABASE_URL` – URL do projeto.
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` – publishable key ou anon key.
- **Criptografia**
  - `ENCRYPTION_KEY` – chave de 32 bytes:
    - formato base64 (recomendado) ou
    - 64 chars hex.

---

## 10. Atualizações específicas do Milestone 02 (vs. doc original)

Comparado à descrição em `docs/sprints/SPRINT_01.md` (Milestone 2), o que foi implementado:

- **Schema**
  - `OrganizationInvite` com unique `(organizationId, email)`; `Profile.role` como enum `Role` (OWNER/ADMIN/MEMBER); `Profile.theme` e `Profile.locale` para preferências.
- **RBAC**
  - `src/lib/roles.ts`: `ROLE_LABELS`, `canManageMembers`, `canDeleteOrganization`; hierarquia no invite (não convidar com role superior).
- **Invite Service**
  - `src/modules/organizations/application/inviteService.ts`: `createInvite` com validação e `signInWithOtp` com `emailRedirectTo` para `/auth/callback`.
- **Auth completion**
  - `POST /api/auth/complete`: lê invite pendente; se existir, cria `Profile` e remove invite; senão retorna `next: "/onboarding"` ou `next: "/dashboard"`.
- **Onboarding**
  - `/onboarding` com formulário (org, nome, avatar); `POST /api/onboarding/complete` cria Organization + Profile (OWNER).
- **Member Management**
  - `/dashboard/members`: membros atuais + convites pendentes; Convidar, Remover, Reenviar. APIs: `POST /api/invites`, `DELETE /api/members/[profileId]`, `PATCH /api/profile`.
- **Settings**
  - `/dashboard/settings`: Perfil (nome, sobrenome, avatar), Organization, Danger zone (OWNER). Avatar com signed URL (bucket `profile`).
- **Tema e locale**
  - next-themes no layout; ThemeToggle e LocaleSwitcher no header do dashboard; preferências salvas no perfil; PreferencesSync aplica tema ao carregar.
- **UI (shadcn e tema)**
  - Sidebar shadcn; regra `shadcn-ui.mdc`; páginas de membros e settings com classes de tema para light/dark.
- **Resiliência**
  - Middleware com try/catch e timeout; Supabase server `setAll` em try/catch; `fetchWithRetry` no cliente.

Em resumo: **convites por magic link, onboarding, gestão de membros, preferências de tema/idioma e UI adaptada ao tema** estão prontos. Próximos passos (Milestone 3+): adapters de cloud, sync, dashboard com dados de gasto.

