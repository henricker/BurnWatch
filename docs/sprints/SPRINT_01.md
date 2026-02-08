# 🏃‍♂️ Sprint 01: The Core Value Thread (Aha! Moment Foundation)

## 🎯 Objetivo

Construir a "Steel Thread" técnica do BurnWatch: desde a autenticação e gestão de equipas até à ingestão real de dados da Vercel e visualização no dashboard. O objetivo é provar o valor real do produto para que o utilizador esteja pronto para pagar na Sprint 02.

---

## ✅ Milestone 1: Core Infra, Auth & Multi-tenancy

**Status:** Concluído

- Setup Supabase, Prisma Schema inicial e RLS.
- Auth via Magic Link e GitHub.

---

## ✅ Milestone 2: Organization & Member System

**Status:** Concluído e funcional

- Sistema de convites atómico.
- Gestão de membros com RBAC (Owner, Admin, Member).
- i18n (PT, EN, ES) e Dark/Light mode base.
- **Configurações (Settings):** Redesign alinhado ao layout da tela de membros; regras por role (OWNER: editar perfil, nome da org, eliminar organização; ADMIN: editar perfil e nome da org, sem zona de perigo; MEMBER: editar perfil, organização em só leitura, sem zona de perigo). API PATCH/DELETE para organização; modal de confirmação crítica ao eliminar; botão "Guardar alterações" desativado quando não há alterações.

---

## ✅ Milestone 3: Credential Management UI (CRUD)

**Status:** Concluído

**Objetivo:** Criar a interface onde o utilizador "conecta" as suas nuvens de forma segura.

### Entregues

- **Telas de Conexão:** Página `/dashboard/connections` com lista de CloudAccounts, modal para adicionar (Vercel, AWS, GCP), validação de formato de credenciais (sem chamadas a APIs externas).
- **Segurança:** EncryptionService para encriptar credenciais (AES-256-GCM) no save; credenciais nunca em claro.
- **UX de Feedback:** Status por conta (Sincronizado / Sincronizando / Erro), último sync (`lastSyncedAt`), Sync Health dinâmico; renomear rótulo (PATCH), eliminar com confirmação, botão de sync manual (mock).
- **Backend em módulos:** Módulo `cloud-provider-credentials` com `util/cloud-credentials` (validadores), `application/cloudCredentialsService` (list/create/updateLabel/sync/delete); APIs como orquestradoras; testes unitários para validadores e serviço.
- **Schema:** Enum `CloudAccountStatus` (SYNCED, SYNCING, SYNC_ERROR); campos `status`, `lastSyncError`, `lastSyncedAt` em `CloudAccount`.
- **i18n:** Namespace `Connections` (pt, en, es); item "Conexões" na sidebar.

---

## ✅ Milestone 4: The Adapter Engine (Vercel Implementation)

**Status:** Concluído

**Objetivo:** O motor técnico para buscar os gastos reais, dependente das credenciais do M3.

### Entregues

- **Contract:** Interface `ICloudProvider` em `src/modules/adapter-engine/domain/cloudProvider.ts`; tipos `DailySpendData`, `FetchRange`; erros com chave (`SyncErrorWithKey`, `SYNC_ERROR_VERCEL_FORBIDDEN`) para armazenar em `lastSyncError`.
- **Vercel Adapter:** `VercelProvider` em `src/modules/adapter-engine/infrastructure/providers/vercelProvider.ts` – integração real com Vercel Billing API (`GET /v1/billing/charges`), desencriptação do token, resposta JSONL normalizada para `amountCents` e `serviceName`.
- **Tratamento 403 / token inválido:** Em 403 com `invalidToken` ou “Not authorized”, lança `SyncErrorWithKey`; `SyncService` grava a chave `vercel-forbidden-error-sync` em `lastSyncError`; traduções (pt, en, es) e tooltip na célula de estado em Connections para mensagem amigável.
- **Normalization:** Mapeamento para `DailySpend` com `amountCents` (inteiros); `DailySpend` com `cloudAccountId` e índice único `daily_spend_org_provider_service_date_account_unique`.
- **Idempotência:** Upsert por `(organizationId, cloudAccountId, provider, serviceName, date)`; `dailySpendService` e testes atualizados para `cloudAccountId`.
- **SyncService:** Orquestração (SYNCING → provider → upsert → SYNCED ou SYNC_ERROR); `POST /api/cloud-accounts/[id]` para sync manual.
- **UX:** Estado “A sincronizar…” com prioridade sobre erro anterior; limpeza de `syncingIds` ao receber resposta da API; tooltip de erro traduzido em SYNC_ERROR.
- **Validação Vercel:** Token aceite em formato alfanumérico (ex. `R1O1lKO7v8L0svh4dTbw6pfu`), mínimo 16 caracteres.
- **MockProvider:** Placeholder para AWS/GCP (retorna `[]`) até implementação futura.

---

## 📊 Milestone 5: The "Aha!" Dashboard

**Objetivo:** Visualização final dos dados e projeção financeira para o utilizador.

### Requisitos Técnicos

- **Dashboard Wiring:** Ligar o banco de dados real de DailySpend aos gráficos de Recharts.
- **Intelligence:** Implementar o cálculo de projeção (Fim de Mês) usando regressão linear simples.
- **Anomaly Detection:** Flag visual se o gasto de hoje for muito superior à média dos últimos 7 dias.
- **Polimento Final:** Garantir que a "Vibe de Infra" está impecável com dados reais fluindo.

---

## 📅 Próximos Passos (Sprint 02: Business & Growth)

- Milestone 6: Notification Engine (Discord & Slack Webhooks).
- Milestone 7: Stripe Integration (BRL R$ 97/197 vs USD $ 49/149).

---

## 📈 Tabela de Preços Referencial (Para Implementação na Sprint 02)

| Mercado | Starter ($600 Limit) | Pro (Unlimited) | Moeda |
|---------|----------------------|------------------|-------|
| Brasil  | R$ 97                | R$ 197           | BRL   |
| Global  | $49                  | $149             | USD   |
