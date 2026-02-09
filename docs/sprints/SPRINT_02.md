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

## 🌐 Milestone 07: GCP Integration (The Data Lake)

**Meta:** Conectar ao Google Cloud Platform para ingestão de faturamento.

### Requisitos Técnicos

- **GCP Adapter:** Utilizar a Cloud Billing API ou processamento de exportação para BigQuery (se necessário para maior precisão).
- **Service Account Security:** Garantir que o upload do ficheiro JSON de credenciais seja processado e encriptado corretamente no SyncService.
- **Mapping:** Traduzir serviços como Cloud Run, GCE e Cloud SQL para as categorias universais.

---

## 🔔 Milestone 08: Notification Engine (Retention)

**Meta:** Proatividade fora do browser via Slack e Discord.

### Requisitos Técnicos

- **Webhook Central:** Configuração de URLs por organização (Slack e Discord).
- **Payloads Inteligentes:** Formatação de mensagens que mostram o "Burn do Dia" e o "Alerta de Spike".
- **Trigger de Anomalia:** Disparo imediato se o Z-Score detetar um desvio padrão > 2.0.

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
