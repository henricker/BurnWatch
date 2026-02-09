# BurnWatch – STATE (Milestone 06.5 – Backend Architecture Improvements concluído)

Este documento resume o estado atual da base de código após a conclusão do **Milestone 06.5: Backend Architecture Improvements (Arch Improvements)** e dos anteriores (incl. **Milestone 06: AWS Integration**, **Milestone 05: The "Aha!" Dashboard**). Inclui Milestones 01–04 (auth, organizações, membros, i18n, Configurações, Conexões Cloud, adapter-engine (ICloudProvider, VercelProvider com Billing API, SyncService, DailySpend por `cloudAccountId`), tratamento de erro 403/token inválido (chave `vercel-forbidden-error-sync` + traduções + tooltip), UX de estado “A sincronizar…” com prioridade e limpeza ao receber resposta, e validação de token Vercel em formato alfanumérico (ex. `R1O1lKO7v8L0svh4dTbw6pfu`). Inclui ainda o **módulo de analytics** (getDashboardAnalytics, evolução por provedor, projeção MTD, anomalia Z-score, resource breakdown, spend by category), **GET /api/analytics** e o dashboard com gráfico de evolução, métricas e i18n completo. O **Milestone 06.5** consolidou a arquitetura backend: use cases em classes, uma pasta por use case (kebab-case) com `index.ts` e `index.spec.ts`, layout domain/application/infrastructure por módulo, rotas API finas e 105 testes passando. Serve como contexto para outras AIs continuarem o trabalho.

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
      - `locale: String?` – preferência de idioma (`"pt" | "en" | "es"`, default `"pt"`).
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
      - `status: CloudAccountStatus` (enum: `SYNCED | SYNCING | SYNC_ERROR`, default `SYNCED`).
      - `lastSyncError: String?`, `lastSyncedAt: DateTime?`.
      - `metadata: Json?`.
    - Índices:
      - `@@index([organizationId], name: "cloud_account_org_idx")`.
  - `DailySpend`
    - Tabela agregada de gasto diário, **por conta cloud**.
    - Campos:
      - `organizationId: String @db.Uuid @map("organization_id")`.
      - `cloudAccountId: String @db.Uuid @map("cloud_account_id")` – conta que originou o gasto.
      - `date: DateTime @map("date")`.
      - `provider: CloudProvider`.
      - `serviceName: String @map("service_name")`.
      - `amountCents: Int @map("amount_cents")` – **SEM floats**.
      - `currency: String? @default("USD")`.
    - Índices:
      - **Índice único composto para idempotência de sync por conta**  
        `@@unique([organizationId, cloudAccountId, provider, serviceName, date], name: "daily_spend_org_provider_service_date_account_unique")`.
      - Índice de consulta:  
        `@@index([organizationId, date], name: "daily_spend_org_date_idx")`.

> Observação: o índice único gera em Prisma o campo  
> `daily_spend_org_provider_service_date_account_unique` dentro de `DailySpendWhereUniqueInput`. Usado no `upsert` do sync por conta.

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

### Landing page (root) e login

- **Root (`/`):** Landing page em `src/app/page.tsx` (Server) que renderiza `LandingContent` (Client). Conteúdo traduzido (namespace `Landing` em pt/en/es), preços por idioma (pt → R$ 97 / R$ 197; en/es → $49 / $149), tema light/dark e idioma com botões flutuantes (`LandingThemeToggle`, `LandingLocaleToggle`). Scroll suave para âncoras (#features, #security, #alerts, #how-it-works, #pricing). Nav na ordem lógica da página; copy de pricing transcultural (BR: “Pague em Reais, monitore em Dólares”; EN: “Predictable Growth. Scalable Control.”; ES: “Crecimiento previsible. Control total.”).
- **Login (`/login`):** Formulário de magic link + GitHub em `src/app/login/page.tsx` (Client Component).

- UI minimalista dark, infra‑vibe; textos via i18n (Auth).
- Campos e estados: `email`, `status` (idle/loading/success/error), `errorMessage`.
- Magic link: `signInWithOtp` com `emailRedirectTo` para `/auth/callback`; feedback loading/sucesso/erro.

### Login com GitHub

Em `src/app/login/page.tsx`:

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

- **Layout:** `src/app/dashboard/layout.tsx` – Server Component que chama `getSessionProfile()` (redireciona para `/login` se não autenticado, para `/onboarding` se sem profile). Renderiza `SidebarProvider` e `DashboardShell` (nome da org, role, theme/locale para header).
- **Sidebar:** shadcn `Sidebar` com `AppSidebar` (Dashboard, Members, Settings); colapsável; ícones e tooltips.
- **Header:** `SidebarTrigger` + no canto direito `ThemeToggle` (Light/Dark/System) e `LocaleSwitcher` (PT/EN/ES). Tema e idioma são salvos no perfil via `PATCH /api/profile`; ao carregar o dashboard, `PreferencesSync` aplica `profile.theme` uma vez (next-themes). Troca de idioma é **instantânea na UI** (sem refresh); persistência no perfil em background.
- **Página dashboard:** `src/app/dashboard/page.tsx` (Client Component) – placeholder com textos via i18n; futuramente gasto e projeções.

### Membros

- **Server:** `src/app/dashboard/members/page.tsx` busca profile, org, membros e convites; passa dados para **Client:** `MembersView` em `src/app/dashboard/members/MembersView.tsx`.
- Lista **Membros Atuais** e **Convites Pendentes**; Convidar (modal), Remover, Reenviar. Todas as strings via `useTranslations()` para atualização imediata ao trocar idioma.
- APIs: `POST /api/invites`, `DELETE /api/members/[profileId]`, `PATCH /api/profile`.

### Settings

- **Server:** `src/app/dashboard/settings/page.tsx` busca profile, org e email via `getSessionProfile()`; calcula `showDeleteOrg` (só OWNER) e `canEditOrgName` (OWNER ou ADMIN) com `src/lib/roles.ts` (`canDeleteOrganization`, `canUpdateOrganizationName`). Passa esses flags e dados iniciais para **Client:** `SettingsView` em `src/app/dashboard/settings/SettingsView.tsx`.
- **SettingsView (redesign):** Header com ícone Settings, título "Configurações", subtítulo i18n, botão único "Guardar alterações" que submete o formulário (desativado quando não há alterações – `isDirty` com base em nome, apelido, nome da org e avatar). Secção **Perfil:** avatar (upload para bucket `profile`), nome, apelido, e-mail read-only com badge "Verificado". Secção **Organização:** OWNER/ADMIN editam nome do workspace e veem id da org (read-only); MEMBER vê nome e id em só leitura. Secção **Zona de perigo** (apenas OWNER): card "Kernel.Terminate()", botão "Destruir workspace" que abre **modal de confirmação** (i18n: título e corpo); ao confirmar, `DELETE /api/organization`, depois `signOut()` e redirecionar para `/`. Layout e padding alinhados à tela de membros: `p-4 md:p-8`, `max-w-6xl`, `space-y-8`.
- **APIs de organização:** `PATCH /api/organization` (body `{ name: string }`) – só OWNER ou ADMIN; `DELETE /api/organization` – só OWNER; no DELETE o servidor obtém todos os perfis da org, elimina cada utilizador no Supabase Auth (`admin.auth.admin.deleteUser`), depois `prisma.organization.delete()` (cascade remove profiles, invites, cloud accounts, daily spends).

### Tema (light/dark) e preferências

- **next-themes** no layout raiz (`ThemeProvider` com `attribute="class"`, `defaultTheme="dark"`).
- Tema e locale em `Profile.theme` e `Profile.locale`; PreferencesSync aplica tema ao carregar.
- **Regra de UI:** `.cursor/rules/shadcn-ui.mdc` – usar shadcn; variáveis de tema para light/dark.
- **Landing:** botões flutuantes para tema (`LandingThemeToggle`) e idioma (`LandingLocaleToggle`); sem persistência em perfil (só UX local).

### i18n (next-intl, pt / en / es)

- **Biblioteca:** next-intl; locale via cookie `NEXT_LOCALE` (definido em auth/complete, onboarding/complete, PATCH /api/profile e no `LandingLocaleToggle`).
- **Config:** `src/i18n/request.ts` – `getRequestConfig` lê o cookie e, se ausente/inválido, usa `Accept-Language` (função `getPreferredLocaleFromHeader` em `src/i18n/locales.ts`) para primeira carga; `src/i18n/locales.ts` – tipo `Locale`, `isValidLocale`, `getPreferredLocaleFromHeader`, locales pt/en/es.
- **Mensagens:** `messages/pt.json`, `messages/en.json`, `messages/es.json` (namespaces: Auth, Callback, Onboarding, Dashboard, Members, Invite, RemoveMember, ResendInvite, Settings, ProfileEdit, Sidebar, Theme, Locale, Roles, Common, **Landing**).
- **Landing:** namespace `Landing` com toda a copy da landing (hero, nav, features, security, alerts, how-it-works, collaboration, pricing, footer); preços por idioma (pt → R$ 97 / R$ 197; en/es → $49 / $149); copy de pricing transcultural (título/subtítulo/CTA por locale).
- **Troca instantânea:** `LocaleOverrideProvider` (client) mantém override de locale + cache de mensagens; ao selecionar idioma no `LocaleSwitcher` (dashboard) ou `LandingLocaleToggle` (landing), a UI atualiza na hora; persistência no perfil em background no dashboard; na landing só cookie `NEXT_LOCALE`. `GET /api/messages/[locale]` serve os JSONs para o client.

- **Alias:** `@messages/*` em `tsconfig.json` para importar os JSONs na API.

### Middleware e resiliência

- **Middleware** (`src/middleware.ts`): matcher `['/((?!api|_next|.*\\..*).*)']` (todas as rotas de página).
  - **Locale:** define cookie `NEXT_LOCALE` a partir de `Accept-Language` quando o cookie não existe ou é inválido (`getPreferredLocaleFromHeader` de `@/i18n/locales`).
  - **Mercado:** define cookie `bw_market` a partir do header `x-vercel-ip-country` (BR para Brasil, INTL para demais); disponível para uso futuro (ex.: ofertas por região).
  - **Auth:** em `/login`, se o usuário já estiver autenticado (Supabase `getUser`), redireciona para `/dashboard`; try/catch e timeout (~4s) para não travar se Supabase estiver lento.
- **safe-fetch:** `src/lib/safe-fetch.ts` – `fetchWithRetry()` com retry em erros de rede; usado nas chamadas de API do cliente.
- **Supabase server:** `setAll` de cookies em try/catch para não quebrar em Server Components (Next só permite setar cookies em Route Handlers / Server Actions).

---

## 7. Serviços de domínio (módulos)

### 7.1. Billing / DailySpend

#### DailySpendService (idempotência via índice composto por conta)

Arquivo: `src/modules/billing/application/dailySpendService.ts`

- Interface:
  ```ts
  export interface UpsertDailySpendInput {
    organizationId: string;
    cloudAccountId: string;
    date: Date;
    provider: CloudProvider;
    serviceName: string;
    amountCents: number;
    currency?: string;
  }
  ```
- **Single upsert:** `upsertDailySpend(prisma, input)` – um registro por chamada; usa `Pick<PrismaClient, "dailySpend">`.
- **Bulk upsert:** `upsertDailySpendBulk(prisma, inputs[])` – recebe um array de `UpsertDailySpendInput` e executa todos os upserts numa única `prisma.$transaction(...)` (array de promises). Requer `Pick<PrismaClient, "dailySpend" | "$transaction">`. Retorna o número de linhas upsertadas. Usado pelo SyncService para persistir todas as rows de um dia de uma vez (melhoria de performance: sync completo passou de ~73s para ~35s).
- Ambas usam o mesmo índice único `daily_spend_org_provider_service_date_account_unique`; múltiplos syncs com o mesmo `(org, cloudAccount, provider, service, date)` apenas atualizam o registro existente (idempotência de ingestão por conta).

#### Analytics (Dashboard)

Arquivos: `src/modules/analytics/application/analyticsService.ts`, `serviceNameToCategory.ts`

- **resolveDateRange(range, now):** retorna `start`, `end`, `previousStart`, `previousEnd` em UTC. `range`: `"7D"` (últimos 7 dias), `"30D"` (30 dias), `"MTD"` (do dia 1 do mês até hoje). Período anterior tem o mesmo número de dias e termina no dia antes de `start`.
- **getDashboardAnalytics(prisma, input):** entrada `organizationId`, `dateRange` (7D|30D|MTD), `providerFilter` (ALL|VERCEL|AWS|GCP). Consulta `DailySpend` no intervalo; agrega `totalCents`, tendência vs período anterior (`trendPercent`), projeção fim do mês só para MTD (`forecastCents = (totalMTD / daysElapsed) * totalDaysInMonth`), média dos últimos 7 dias (`dailyBurnCents`), anomalias (Z-score: dia > mean + 2*std nos últimos 7, conta hoje e ontem). Retorna ainda `evolution` (por dia: date, label, aws, vercel, gcp, total), `providerBreakdown` (por provedor com serviços ordenados por cents), `categories` (Compute, Network, Database, Storage, Observability, Automation, Other) via `serviceNameToCategory`.
- **serviceNameToCategory:** mapeamento de nomes de serviço (incl. mapa explícito Vercel: Serverless Functions, Edge Functions → Compute; Bandwidth, Image Optimization, Log Drains → Network; Postgres, KV → Database; Blob → Storage; Web Analytics → Observability; Cron Jobs → Automation) para categorias universais; keywords para AWS/GCP.

---

## 8. Testes (Vitest) – “Testing for Confidence”

### Configuração

- Arquivo: `vitest.config.ts`
  - `environment: "node"`, `globals: true`, `include: ["src/**/*.test.ts", "src/**/*.spec.ts"]`.
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

Arquivo: `src/modules/billing/application/dailySpendService.test.ts`

- Usa `vi.fn()` para mockar `prisma.dailySpend.upsert`.
- Chama `upsertDailySpend(prismaMock, input)` com `cloudAccountId`; verifica uso do índice `daily_spend_org_provider_service_date_account_unique`.

### Módulo analytics

Arquivo: `src/modules/analytics/application/analyticsService.test.ts`

- **resolveDateRange:** MTD (start primeiro dia do mês, end hoje, período anterior com mesmo número de dias); 7D (7 dias incluindo hoje); 30D (30 dias incluindo hoje).
- **getDashboardAnalytics:** mock de `prisma.dailySpend.findMany` e `aggregate` com `vi.useFakeTimers` para data fixa; casos: zero rows (totais zero, evolution com 5 dias, forecastCents 0 para MTD); agregação totalCents e trendPercent; MTD forecastCents = (totalMTD/daysElapsed)*totalDays; 7D sem forecast; evolution com aws/vercel/gcp e labels; providerBreakdown ordenado por total com services; categorias a partir de serviceName (Compute, Database); filtro por provider (where.provider).

### Módulo cloud-provider-credentials

- **Validadores** (`src/modules/cloud-provider-credentials/util/cloud-credentials.ts`): validação só de formato para AWS (Access Key ID AKIA + 16 alfanuméricos, Secret 40 chars), **Vercel (token ≥ 16 chars; aceita formato com prefixo `v_tok_`/`vercel_` ou alfanumérico puro, ex. `R1O1lKO7v8L0svh4dTbw6pfu`)**, GCP (billing ID `012345-ABCDEF`, JSON com `type`, `private_key`, `client_email`). `validateCredentials`, `credentialsToPlaintext`. Testes em `util/cloud-credentials.test.ts`.
- **Serviço** (`src/modules/cloud-provider-credentials/application/cloudCredentialsService.ts`): `listAccounts`, `createAccount` (valida, encripta, grava), `updateLabel`, `syncAccount` (delega ao adapter-engine), `deleteAccount`. Erros: `CloudCredentialsError`, `CloudCredentialsNotFoundError`, `CloudCredentialsValidationError`. Testes em `cloudCredentialsService.test.ts`.
- **APIs** (orquestradoras): `GET/POST /api/cloud-accounts`, `PATCH /api/cloud-accounts/[id]` (label), `POST /api/cloud-accounts/[id]` (sync – chama SyncService do adapter-engine); resolvem utilizador/org via `profileService`.

### Módulo adapter-engine (Milestone 04 + início Milestone 06)

- **Domínio** (`src/modules/adapter-engine/domain/cloudProvider.ts`): interface `ICloudProvider` (`fetchDailySpend(cloudAccount, range)`), tipos `DailySpendData`, `FetchRange`, constantes `SYNC_ERROR_VERCEL_FORBIDDEN` e `SYNC_ERROR_AWS_INVALID_CREDENTIALS` e classe `SyncErrorWithKey` para erros com chave armazenável em `lastSyncError`.
- **VercelProvider** (`src/modules/adapter-engine/infrastructure/providers/vercelProvider.ts`): integração real com Vercel Billing API (`GET /v1/billing/charges`), desencriptação do token, resposta JSONL normalizada para `amountCents` e `serviceName`; em 403 com `invalidToken`/“Not authorized” lança `SyncErrorWithKey` com chave `vercel-forbidden-error-sync`. Possui modo fake via `fakeVercelBilledResponse(from, to)` activado por `USE_FAKE_VERCEL_BILLING="true"` (JSONL com serviços típicos da Vercel).
- **AwsProvider** (`src/modules/adapter-engine/infrastructure/providers/awsProvider.ts` – Milestone 06): integração com AWS Cost Explorer via `@aws-sdk/client-cost-explorer` (`GetCostAndUsageCommand` com `Granularity: "DAILY"`, `Metrics: ["UnblendedCost"]`, `GroupBy` por `SERVICE`). Desencripta `accessKeyId`/`secretAccessKey`/`region` do `encryptedCredentials`, normaliza `Amount` (string decimal) para `amountCents` (inteiro) e usa `serviceName` = nome do serviço AWS. Em erros de credencial (`InvalidClientTokenId`, `InvalidSignatureException`, etc.) lança `SyncErrorWithKey` com chave `aws-invalid-credentials-error`. Também expõe `fakeAwsBilledResponse(range)` para uso local, controlado por `USE_FAKE_AWS_BILLING="true"`.
- **MockProvider** (`src/modules/adapter-engine/infrastructure/providers/mockProvider.ts`): continua a retornar `[]` para GCP/OTHER até implementação real.
- **SyncService** (`src/modules/adapter-engine/application/syncService.ts`): orquestra sync por conta (SYNCING → provider.fetchDailySpend → **bulk upsert** por dia via `upsertDailySpendBulk(prisma, dayInputs)` → SYNCED ou SYNC_ERROR com `lastSyncError` = chave ou mensagem). Cada dia é persistido numa única transação (todas as rows do dia de uma vez). Em erro do tipo `SyncErrorWithKey` grava a chave em `lastSyncError` para tradução na UI. Para `provider === "AWS"` passa a usar `AwsProvider` real; para `VERCEL` usa `VercelProvider`; demais continuam em `MockProvider`.
- **Conexões (UI):** Em SYNC_ERROR com `lastSyncError`, tooltip na célula de estado mostra mensagem traduzida (chaves `syncErrorVercelForbidden` e `syncErrorAwsInvalidCredentials` em pt/en/es) ou texto bruto. Estado “A sincronizar…” tem prioridade (mostrado assim que o utilizador clica em sync); `syncingIds` é limpo ao receber resposta da API. **Ao criar um cloud provider:** a conta é adicionada já com `status: "SYNCING"` e o id em `syncingIds` no `onSuccess` do modal; condição unificada `showSyncing = isSyncing || acc.status === "SYNCING"` para a coluna “Último sync” (ícone + “Sincronizando…”), botão de sync (disabled + spin) e célula de estado — assim a primeira renderização já mostra loading em toda a linha. Token Vercel aceite em formato alfanumérico na validação do formulário.

**Melhorias futuras (sync):** Para o MVP o sync é disparado na mesma requisição HTTP (POST `/api/cloud-accounts/[id]`) e o cliente aguarda a conclusão. Uma evolução natural é mover a ingestão para **background jobs com filas e workers**; a UI passaria a consultar o estado (`status` / `lastSyncedAt`) em vez de manter a conexão aberta até o fim. Por agora mantemos o fluxo síncrono por simplicidade.

- **Opção preferencial – Trigger.dev:** Plano free com limites documentados ([Limits](https://trigger.dev/docs/limits)): concurrency (ex.: 10–20 runs em prod), $5/mês de uso incluído, 10 schedules, retries e dashboard. Integração Next.js (Route Handler ou Server Action com `tasks.trigger()`), filas e [Concurrency & Queues](https://trigger.dev/docs/queue-concurrency) com `concurrencyLimit` e `concurrencyKey` (per-tenant, ex. por `organizationId`). Deploy via CLI ou [GitHub Actions](https://trigger.dev/docs/github-actions); as tasks correm na infra Trigger.dev (sync longo sem timeout). Documentação e pricing públicos.
- **Alternativa – Vercel Queues:** [Limited Beta](https://vercel.com/changelog/vercel-queues-is-now-in-limited-beta); SDK `@vercel/queue` (alpha). Limites técnicos: 1 000 msg/s por tópico, payload máx 4,5 MB. Plano free e quotas não estão documentados na página de limites/preços da Vercel; considerar quando a oferta e o free tier estiverem claros.

Resultado atual: `pnpm test` passa com todos os testes (incl. encryption, dailySpend, organizations, cloud-provider-credentials, adapter-engine (SyncService + AwsProvider/VercelProvider), **analytics analyticsService**).

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
  - `src/lib/roles.ts`: `ROLE_LABELS`, `canManageMembers`, `canDeleteOrganization`, `canUpdateOrganizationName` (OWNER e ADMIN podem alterar nome da organização); hierarquia no invite (não convidar com role superior).
- **Invite Service**
  - `src/modules/organizations/application/inviteService.ts`: `createInvite` com validação e `signInWithOtp` com `emailRedirectTo` para `/auth/callback`.
- **Auth completion**
  - `POST /api/auth/complete`: lê invite pendente; se existir, cria `Profile` e remove invite; senão retorna `next: "/onboarding"` ou `next: "/dashboard"`.
- **Onboarding**
  - `/onboarding` com formulário (org, nome, avatar); `POST /api/onboarding/complete` cria Organization + Profile (OWNER).
- **Member Management**
  - `/dashboard/members`: membros atuais + convites pendentes; Convidar, Remover, Reenviar. APIs: `POST /api/invites`, `DELETE /api/members/[profileId]`, `PATCH /api/profile`.
- **Settings (redesign e regras por role)**
  - `/dashboard/settings`: Redesign com header (ícone, título, subtítulo, botão único "Guardar alterações" desativado quando não há alterações). Perfil: nome, apelido, avatar (upload bucket `profile`), e-mail read-only com badge Verificado. Organização: OWNER/ADMIN editam nome da org e veem id; MEMBER vê nome e id em só leitura. Zona de perigo (só OWNER): card "Kernel.Terminate()", botão "Destruir workspace" que abre modal de confirmação; ao confirmar, DELETE organização (ver abaixo), signOut e redirect para `/`. Layout padronizado com a tela de membros: `p-4 md:p-8`, `max-w-6xl`.
  - **APIs de organização:** `src/app/api/organization/route.ts`: `PATCH` (atualiza nome da org; OWNER ou ADMIN); `DELETE` (só OWNER: obtém todos os perfis da org, elimina cada `auth.users` via Supabase Admin `deleteUser`, depois `prisma.organization.delete()` com cascade).
  - **Modal de eliminação:** Dialog com título e corpo i18n (`deleteOrgConfirmTitle`, `deleteOrgConfirmBody`), botões Cancelar e "Sim, eliminar tudo"; estado de loading durante o DELETE.
- **Tema e locale**
  - next-themes no layout; ThemeToggle e LocaleSwitcher (PT/EN/ES) no header; preferências salvas no perfil; PreferencesSync aplica tema ao carregar; troca de idioma instantânea (override no client, persistência em background).
- **i18n**
  - next-intl com pt, en, es; mensagens em `messages/*.json`; cookie `NEXT_LOCALE`; `LocaleOverrideProvider` + `GET /api/messages/[locale]` para troca imediata sem refresh; client views (MembersView, SettingsView, dashboard page) com `useTranslations()` para toda a UI traduzida atualizar na hora.
- **UI (shadcn e tema)**
  - Sidebar shadcn; regra `shadcn-ui.mdc`; páginas com classes de tema para light/dark.
- **Dashboard (card de anomalia)**
  - Card de alerta de anomalia em `src/app/dashboard/page.tsx` com contraste adequado no light mode (fundo/borda e texto; dark mode mantido).
- **Landing e produto público (polimento Milestone 02)**
  - **Rotas:** landing na root (`/`), login em `/login`; middleware redireciona usuário logado de `/login` para `/dashboard`.
  - **Logo e favicon:** `BurnWatchLogo` em `src/components/burnwatch-logo.tsx`; favicon gerado em `src/app/icon.tsx` (ImageResponse com logo laranja + Zap).
  - **Landing i18n:** conteúdo em `LandingContent` (Client) com `useTranslations('Landing')`; namespace `Landing` em pt/en/es; botões flutuantes de tema e idioma (`LandingThemeToggle`, `LandingLocaleToggle`); preços por locale (pt: R$ 97 / R$ 197; en/es: $49 / $149).
  - **Copy transcultural:** título/subtítulo/CTA de pricing por idioma (BR: “Pague em Reais, monitore em Dólares” + “Começar em Reais”; EN: “Predictable Growth. Scalable Control.” + “Start Scaling”; ES: “Crecimiento previsible. Control total.” + “Empezar ahora”).
  - **UX:** scroll suave para âncoras (`scroll-behavior: smooth` em `globals.css`); nav na ordem da página (Features, Security, Alerts, Integration, Pricing); tema padrão dark (`defaultTheme="dark"` no ThemeProvider).
- **Resiliência**
  - Middleware com try/catch e timeout; Supabase server `setAll` em try/catch; `fetchWithRetry` no cliente; `setLocaleCookie` em auth/complete, onboarding/complete e PATCH profile.

**Conclusão Milestone 02:** Todo o comportamento da Milestone 02 está concluído e funcional: convites por magic link, onboarding, gestão de membros com RBAC, preferências de tema/idioma (pt, en, es) com troca instantânea, UI adaptada ao tema, landing pública i18n com copy transcultural e preços por idioma, **tela de Configurações com redesign (estilo Gemini), regras por role (OWNER/ADMIN/MEMBER), atualização e eliminação total da organização (incluindo auth dos membros no Supabase), modal de confirmação ao eliminar e botão Guardar desativado quando não há alterações**.

**Milestone 03 concluído – Credential Management UI (CRUD):** Página Conexões em `/dashboard/connections`; CRUD de CloudAccounts (Vercel, AWS, GCP) com credenciais encriptadas; módulo `cloud-provider-credentials` (validadores + `cloudCredentialsService`); status por conta e Sync Health; APIs como orquestradoras; testes unitários para validadores e serviço.

**Milestone 04 concluído – The Adapter Engine (Vercel Implementation):** Módulo `adapter-engine` com ICloudProvider, VercelProvider (Billing API real), SyncService e DailySpend por `cloudAccountId`; POST `/api/cloud-accounts/[id]` para sync; tratamento de 403/token inválido (chave `vercel-forbidden-error-sync` + traduções + tooltip); UX de estado “A sincronizar…” com prioridade e limpeza ao receber resposta; **bulk upsert** por dia em DailySpend (sync completo ~73s → ~35s); loading unificado ao criar conexão (coluna “Último sync”, ícone de sync e Estado desde a primeira renderização); validação de token Vercel em formato alfanumérico (mín. 16 caracteres).

**Milestone 05 concluído – The "Aha!" Dashboard:** Módulo `analytics` com getDashboardAnalytics (evolução por dia/provedor, projeção MTD, daily burn, anomalia Z-score, resource breakdown, spend by category); serviceNameToCategory com categorias Observability e Automation e mapa Vercel; GET /api/analytics; dashboard com gráfico de evolução (múltiplas linhas quando All), métricas, scroll discreto e i18n completo. Testes em `analyticsService.test.ts` (resolveDateRange e getDashboardAnalytics com Prisma mock e fake timers).

**Milestone 06.5 concluído – Backend Architecture Improvements (Arch Improvements):** Use cases em classes (dependências no construtor, `execute()`); layout em três camadas por módulo (domain / application/use-cases / infrastructure); uma pasta por use case em kebab-case com `index.ts` e `index.spec.ts` em todos os módulos (adapter-engine, billing, analytics, cloud-provider-credentials, organizations); rotas API finas; Vitest com `include: ["src/**/*.test.ts", "src/**/*.spec.ts"]`; 105 testes e build passando. Necessário para a evolução sustentável da plataforma.

---

## 11. CI, Lint e Ajustes Recentes

- **CI (GitHub Actions)** – `.github/workflows/ci.yml`:
  - **Cache pnpm:** `cache: 'pnpm'` é definido em `actions/setup-node@v4` (não em `pnpm/action-setup`, que ignora `cache: true`). O store pnpm é cacheado entre runs.
  - **Prisma client:** passo explícito `pnpm prisma generate` após `pnpm install` e antes de Lint/Test, para que `.prisma/client` exista na CI e os testes (ex.: `onboardingService.test.ts`) não falhem com `Cannot find module '.prisma/client/default'`.
  - Sequência: Checkout → Install pnpm → Setup Node (cache pnpm) → Install deps → **Generate Prisma client** → Lint → Test → Build.

- **Lint (ESLint):**
  - `pnpm lint` passa com **zero erros e zero warnings**.
  - Remoção de imports/variáveis não usados em: `LandingContent`, `api/organization/route`, `InviteMemberButton`, `MembersView`, `dashboard/page`, `locale-switcher`, `syncService`, `analyticsService`, `mockProvider`, `awsProvider.test.ts`.
  - Uso intencional de `<img>` em avatares e imagens decorativas (Landing, MemberAvatar, ProfileEditForm, SettingsView, complete-profile-gate, owner-onboarding-card) com `eslint-disable-next-line @next/next/no-img-element` local.
  - Padrão “mounted” em theme/locale toggles e app-sidebar mantido com `eslint-disable-next-line react-hooks/set-state-in-effect` onde aplicável; callback de auth com `react-hooks/exhaustive-deps` documentado.
  - `components/ui/sidebar.tsx`: skeleton com largura fixa (sem `Math.random` em render); `landing-locale-toggle`: escrita de cookie em `useEffect` para respeitar regra de imutabilidade.
  - `api/organization/route.ts`: `DELETE` sem parâmetro não utilizado.

- **Dashboard (tema claro):**
  - Ícone/nome do provedor **Vercel** no resource breakdown usa `text-slate-900 dark:text-white` para contraste correto no tema claro (símbolo visível em fundo branco).

- **Dashboard – gráfico de evolução (Milestone 06):**
  - Visão 30 dias: eixo X com rótulos amostrados (5 pontos: início, 25%, 50%, 75%, fim) para evitar sobreposição; eixo Y com escala em moeda (0, 25%, 50%, 75%, 100% do máximo); linha GCP em verde (`#22c55e`) para visibilidade no dark mode; tooltip no hover com data e valores (AWS, Vercel, GCP, total) do dia correspondente à posição do cursor.

- **Dashboard – gasto por categoria:**
  - Light mode: container dos ícones com `bg-slate-200/80` e ícone `text-slate-600`; faixa da barra de progresso com `bg-slate-200/70`; no hover, rótulo da categoria com `group-hover:text-slate-900` em vez de branco para manter legibilidade.

- **Sidebar (modo colapsado):**
  - Header: símbolo BurnWatch com container `size-8` (32px) alinhado aos botões de navegação; padding do header no modo ícone `pl-6 pr-2` para coincidir com o padding efetivo do conteúdo (SidebarContent px-4 + SidebarGroup p-2); texto (nome da org e role) oculto no modo colapsado; modo aberto preservado (layout original com ícone + texto no bloco com borda).
