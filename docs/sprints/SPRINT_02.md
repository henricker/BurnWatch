# 🚀 Sprint 02: Multi-Cloud Expansion & Business Readiness

## 🎯 Objetivo

Expandir o poder de fogo do BurnWatch integrando os "pesos pesados" da nuvem (AWS e GCP). O objetivo é que, ao final desta sprint, o produto seja capaz de consolidar o gasto de qualquer startup moderna, independentemente de onde a sua infraestrutura reside.

---

## 🏗 Milestone 06: AWS Integration (The Giant)

**Meta:** Implementar o adapter real para a AWS utilizando a API do Cost Explorer.

### Requisitos Técnicos

- **AWS Adapter:** Implementar a lógica de busca via SDK da AWS (`@aws-sdk/client-cost-explorer`).
- **IAM Policy Guide:** Criar a documentação interna/instrução para o utilizador criar uma policy ReadOnlyAccess específica de Billing.
- **Mapping:** Mapear serviços complexos (EC2, RDS, S3, Lambda) para as nossas categorias universais.
- **Granularidade:** Garantir que o backfill diário funcione com o lag de processamento da AWS (até 24h).

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
