# 🚀 Sprint 02: Multi-Cloud Expansion & Business Readiness

## 🎯 Objetivo

Expandir o poder de fogo do BurnWatch integrando os "pesos pesados" da nuvem (AWS e GCP). O objetivo é que, ao final desta sprint, o produto seja capaz de consolidar o gasto de qualquer startup moderna, independentemente de onde a sua infraestrutura reside.

---

## 🏗 Milestone 06: AWS Integration (The Giant)

**Status:** ✅ Concluído.

**Meta:** Implementar o adapter real para a AWS utilizando a API do Cost Explorer e deixar o produto estável para uso (CI, lint, dashboard e sidebar polidos).

### Entregues

- **AWS Adapter:** `AwsProvider` em `src/modules/adapter-engine/infrastructure/providers/awsProvider.ts` usando `@aws-sdk/client-cost-explorer` (`GetCostAndUsageCommand` com `Granularity: "DAILY"`, `Metrics: ["UnblendedCost"]`, `GroupBy` por `SERVICE`), normalizando `Amount` para `amountCents` e mapeando serviços (EC2, RDS, S3, Lambda, etc.) para o nosso modelo de `DailySpendData`.
- **Erro de credencial:** tratamento de erros como `InvalidClientTokenId`/`InvalidSignatureException`/`AccessDeniedException` via `SyncErrorWithKey` com chave `aws-invalid-credentials-error`, exibida com mensagem traduzida em Connections.
- **Modo fake:** `fakeAwsBilledResponse(range)` com valores diários em torno de uma média (pouca variância), ativado por `USE_FAKE_AWS_BILLING=\"true\"` para desenvolvimento/local (sem chamadas reais à AWS).
- **Integração com SyncService:** `SyncService` agora usa `AwsProvider` quando `provider === \"AWS\"` e continua a usar `VercelProvider` para Vercel e `MockProvider` para GCP/OTHER.
- **Testes:** `awsProvider.test.ts` cobre o fake, a normalização da resposta do Cost Explorer e o path de erro de credenciais; `syncService.test.ts` mocka `AwsProvider` para garantir fluxo SYNCING → SYNCED.
- **CI:** workflow GitHub Actions (`.github/workflows/ci.yml`) com cache pnpm em `actions/setup-node@v4`, passo `pnpm prisma generate` antes de Lint/Test, execução de `pnpm lint`, `pnpm test` e `pnpm build` em push/PR para `main`, com `USE_FAKE_AWS_BILLING=true` e `USE_FAKE_VERCEL_BILLING=true` por padrão.
- **Lint:** `pnpm lint` com zero erros e zero warnings (limpeza de imports/variáveis não usados e ajustes de regras onde necessário).
- **Dashboard – gráfico de evolução:** visão 30 dias com eixo X amostrado (evitar sobreposição de datas), eixo Y com escala em moeda, linha GCP em verde para contraste no dark mode; tooltip no hover com data e valores por provedor (ou total) do dia.
- **Dashboard – gasto por categoria:** ícones e faixa da barra com contraste em light mode; texto do hover legível (evitar branco sobre branco).
- **Sidebar:** no modo colapsado, símbolo BurnWatch centralizado e alinhado aos itens de navegação (mesmo padding e tamanho 32px); modo aberto preservado (logo + nome da org + role no bloco original).

### Próximos passos (opcional)

- **IAM Policy Guide:** Criar documentação/instrução para o utilizador provisionar uma policy **ReadOnlyAccess** específica de Billing (Cost Explorer) com o mínimo de permissões.
- **Mapping adicional:** Refinar o mapping de serviços AWS para categorias (ex.: diferenciar `EC2 Spot`, `EBS`, `NAT Gateway`) usando `serviceNameToCategory`.
- **Hardening de produção:** Validar a integração real em contas AWS de staging/produção (latência, limites de Cost Explorer, retries).

---

## 🏛 Milestone 06.5: Backend Architecture Improvements (Arch Improvements)

**Status:** ✅ Concluído.

**Meta:** Melhorar a arquitetura do backend para evolução sustentável da plataforma: uso de classes e use cases, organização por módulos (domain / application / infrastructure), um use case por pasta com `index.ts` e `index.spec.ts`, e rotas API finas.

### Entregues

- **Use cases em classes:** Substituição de funções soltas por classes de use case (dependências no construtor, método `execute()`). Rotas e testes atualizados para instanciar e usar essas classes.
- **Layout em três camadas por módulo:** Em cada `src/modules/{módulo}`: **domain/** (entidades, contratos, erros de domínio), **application/use-cases/** (um use case por pasta), **infrastructure/** (implementações reais: repositórios, adaptadores, Prisma).
- **Uma pasta por use case (kebab-case):** Estrutura `use-cases/{nome-do-usecase}/index.ts` e `index.spec.ts` em todos os módulos (adapter-engine, billing, analytics, cloud-provider-credentials, organizations). Nomes de pastas em kebab-case (ex.: `sync-account-usecase`, `create-invite-usecase`). Mesma classe exportada (ex.: `SyncAccountUseCase`) para não quebrar consumidores.
- **Rotas API finas:** Rotas apenas resolvem sessão, instanciam o use case e devolvem o resultado. Injeção de dependências via construtor.
- **Testes por use case:** Cada use case com seu `index.spec.ts` ao lado; Vitest config atualizado para incluir `src/**/*.spec.ts` além de `*.test.ts`.
- **Limpeza:** Remoção de arquivos antigos (use cases em arquivo único e testes de serviço consolidados). Lint, 116 testes e build Next.js passando.

### Impacto

Necessário para a evolução da plataforma: código mais legível, testes alinhados ao use case, e estrutura que outro desenvolvedor consegue seguir e estender com segurança.

---

## 🌐 Milestone 07: GCP Integration (The Data Lake)

**Status:** ✅ Concluído.

**Meta:** Conectar ao Google Cloud Platform para ingestão de faturamento.

### Entregues

- **GcpProvider** (`src/modules/adapter-engine/infrastructure/providers/gcpProvider.ts`): implementa `ICloudProvider`; credenciais Service Account JSON (`project_id`, `private_key`, `client_email`) desencriptadas e validadas; ingestão via **BigQuery Billing Export** (tabela `gcp_billing_export_v1_<<BILLING_ACCOUNT_ID>>`, dataset configurável com `GCP_BILLING_DATASET_ID`), agregação por dia e `service.description`, normalização para `amountCents`.
- **Modo fake:** `fakeGcpBilledResponse(range)` com Compute Engine, BigQuery, Cloud Run, Cloud Storage; ativado por `USE_FAKE_GCP_BILLING="true"` para desenvolvimento/CI.
- **Erros traduzidos:** `gcp-invalid-credentials-error` e `gcp-billing-export-error` com i18n (`syncErrorGcpInvalidCredentials`, `syncErrorGcpBillingExport`) em pt/en/es; tooltip em Connections na célula de estado.
- **SyncAccountUseCase:** para `provider === "GCP"` usa `GcpProvider`; fluxo SYNCING → fetchDailySpend → bulk upsert → SYNCED ou SYNC_ERROR com `lastSyncError`.
- **Mapping:** `serviceNameToCategory` com BigQuery → Database; dashboard usa cor GCP `#22c55e`.
- **Testes:** `gcpProvider.spec.ts` cobre parse de credenciais (válido/inválido), fake response, `fetchDailySpend` em modo fake e erro de credenciais; 116 testes no total.

---

## 🔔 Milestone 08: Notification Engine (Retention)

**Status:** ✅ Concluído.

**Meta:** Proatividade fora do browser via Slack e Discord.

### Entregues

- **Webhook Central:** Configuração de URLs por organização em `Organization` (`slackWebhookUrl`, `discordWebhookUrl`, `notificationSettings` com `anomaly`, `dailySummary`, `limitWarning`). APIs `GET/PATCH /api/notifications` e `POST /api/notifications/test` (teste com URL opcional no body).
- **Payloads por locale:** Todas as mensagens (Slack e Discord) vêm de `notificationMessages.ts` em pt/en/es; locale do OWNER da organização é resolvido via `getOwnerLocale` e passado aos providers — sem texto chumbado nos providers.
- **Use cases:** `SendAnomalyAlertUseCase` (report consolidado MultiCloudAnomalyReport para webhooks configurados quando `notificationSettings.anomaly` é true); `TestWebhookConnectionUseCase` (mensagem de teste, suporta URL no body para testar sem gravar); `TriggerAnomalyAlertAfterSyncUseCase` (classe com `execute({ organizationId })`: busca dailySpend dos últimos 14 dias, agrupa por provider/serviço, regra Z-Score > 2 + valor > $1 + spike > 20%, constrói report e chama SendAnomalyAlert; erros engolidos).
- **Trigger de Anomalia:** Após sync com sucesso (`POST /api/cloud-accounts/[id]` → status SYNCED), `TriggerAnomalyAlertAfterSyncUseCase` é executado em fire-and-forget.
- **UI:** Página `/dashboard/notifications` com inputs Slack/Discord; botão "Test" ativo só quando há URL; botão "Save" ativo só quando o valor difere do gravado; teste sem gravar suportado.
- **Testes:** SlackProvider, DiscordProvider, SendAnomalyAlertUseCase, TestWebhookConnectionUseCase, TriggerAnomalyAlertAfterSyncUseCase com `index.spec.ts`; 137 testes no total.

---

## 💳 Milestone 09: Monetization (Stripe & Paywall)

**Meta:** Transformar o tráfego em receita.

### Requisitos Técnicos

- **Stripe Checkout:** Fluxos para os planos Starter (R$ 97 / $49) e Pro (R$ 197 / $149).
- **Usage Guards:** Implementar o bloqueio visual (Soft Block) quando o utilizador ultrapassa o limite de monitorização do plano.
- **Regional Pricing:** Ativação da lógica `bw_market` para cobrar na moeda correta (BRL vs USD).

---

## 📈 Resumo da Estratégia de Expansão

Ao terminar esta Sprint, o BurnWatch deixa de ser uma "Vercel Tool" para ser uma **plataforma FinOps Agnóstica**. Este é o momento em que podemos atacar comunidades de Cloud Computing e DevOps com uma oferta completa.

---

## 📈 Tabela de Preços Referencial (Milestone 09)

| Mercado | Starter ($600 Limit) | Pro (Unlimited) | Moeda |
|---------|----------------------|------------------|-------|
| Brasil  | R$ 97                | R$ 197           | BRL   |
| Global  | $49                  | $149             | USD   |
