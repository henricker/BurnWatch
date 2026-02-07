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

## 🏗 Milestone 3: Credential Management UI (CRUD)

**Objetivo:** Criar a interface onde o utilizador "conecta" as suas nuvens de forma segura.

### Requisitos Técnicos

- **Telas de Conexão:** Interface para adicionar CloudAccount (Vercel, AWS, GCP).
- **Segurança Prática:** Utilizar o EncryptionService já criado para encriptar os tokens no momento do save.
- **UX de Feedback:** Mostrar status de "Ligado" (placeholder até ao Sync Engine) e permitir renomear/remover contas.

---

## 🧩 Milestone 4: The Adapter Engine (Vercel Implementation)

**Objetivo:** O motor técnico para buscar os gastos reais, dependente das credenciais do M3.

### Requisitos Técnicos

- **Contract:** Interface ICloudProvider para garantir extensibilidade para outros providers futuramente.
- **Vercel Adapter:** Integração real com a Vercel Billing API.
- **Normalization:** Mapear a resposta para o schema DailySpend usando apenas inteiros (amountCents).
- **Idempotência:** Garantir que o sync de dados diários não duplique registros via upsert.

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
