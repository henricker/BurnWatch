# 🕵️‍♂️ BurnWatch: Business & Product Strategy

## 1. Proposta de Valor Única (UVP)
**"O radar de custo que avisa antes da fatura chegar."**
Diferente das ferramentas de Enterprise FinOps (como CloudHealth ou Apptio), que focam em relatórios trimestrais complexos para o CFO, o **BurnWatch** foca no **Engenheiro e no Founder**. É uma ferramenta de observabilidade financeira em tempo real que transforma dados brutos de faturamento em decisões técnicas.

## 2. Diagnóstico da Dor (Problem Mapping)
* **O "Pavor do Fim do Mês":** O susto paralisante ao abrir o billing da cloud e descobrir um gasto 3x maior que o planejado.
* **Desperdício de Créditos:** Startups com créditos (AWS Activate/Google for Startups) que "queimam" $100k em meses por falta de arquitetura otimizada, chegando ao "cash burn" real despreparadas.
* **Shadow IT & Zombies:** Desenvolvedores que levantam instâncias potentes para testes rápidos e esquecem volumes EBS ou instâncias GPU ativos.
* **API Spikes:** Loops infinitos em Serverless ou picos de consumo de tokens em LLMs (OpenAI/Anthropic) que não são monitorados pelo billing tradicional da cloud em tempo real.

## 3. Diferenciais Competitivos (The Moats)

### A. Actionable Insights (O "E daí?")
O BurnWatch não exibe apenas gráficos; ele interpreta anomalias. 
- *Exemplo:* "Seu gasto com AWS Lambda subiu 40% nas últimas 12h. Detectamos um padrão de erro 5XX na função `process-image`. Isso está gerando retentativas infinitas e custo desnecessário."

### B. O "Fear Factor" (Segurança Financeira)
O marketing e o produto são baseados em **prevenção de desastres**. 
- **Kill-Switch Alerts:** Notificações críticas via SMS/Telegram/Slack quando o gasto projetado ultrapassa o limite definido em uma janela de 24h.

### C. Time-to-Value (Setup em 5 Minutos)
Para PMEs, a barreira de entrada deve ser zero:
- Uso de **CloudFormation/Terraform stacks** prontas para criar IAM Roles de leitura com um clique.
- Integração nativa com Vercel via OAuth.

## 4. Estratégia de Monetização (Tiered SaaS)
* **Plano Startup ($29/mês):** Monitoramento de até $2.000 de spend mensal. Alertas básicos e dashboard centralizado.
* **Plano Scale ($99/mês):** Monitoramento de até $10.000 de spend. Inclui **Projeção de IA**, detecção de anomalias por granularidade de serviço e múltiplos usuários.
* **Plano Enterprise (Custom):** Spend ilimitado + Automação de "Saving Opportunities" (ex: recomendações de instâncias Spot ou instâncias RI).

## 5. Roadmap Evolutivo
1.  **Fase 1 (MVP):** Conectores AWS/Vercel + Dashboard de gasto diário + Alerta de Spike simples.
2.  **Fase 2 (Intelligence):** Motor de regressão linear para projeção de fatura e detecção de sazonalidade.
3.  **Fase 3 (Optimization):** Sugestões de limpeza de recursos (Zombies) e alertas de "Idle Resources".
4.  **Fase 4 (AI Observability):** Monitoramento de consumo de tokens de APIs de IA de terceiros via proxy ou log.

---
**Nota para a IA (Cursor/Windsurf):** Ao desenvolver funcionalidades, priorize sempre a precisão dos dados e a clareza da notificação. O usuário deve sentir que o BurnWatch é um membro sênior da equipe cuidando do cofre da empresa.