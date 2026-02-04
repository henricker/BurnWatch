# 🛠 Technical Context: BurnWatch Architecture

## 1. Stack Tecnológica
- **Framework:** Next.js 14+ (App Router)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** Clerk ou Supabase Auth
- **UI:** Tailwind CSS + Shadcn/UI + Lucide Icons
- **Background Jobs:** Upstash Workflow ou Inngest (para polling de APIs de Cloud)

## 2. Padrões de Código (Senior Level)
- **Strict Typing:** Proibido o uso de `any`. Interfaces devem ser explícitas.
- **Service Layer:** Toda a lógica de negócio (cálculos, integrações) deve ficar em `/services` e não dentro das rotas da API.
- **Adapter Pattern:** Cada Cloud Provider deve implementar a interface `ICloudProvider`.
- **Criptografia:** Chaves de API de clientes devem ser criptografadas no banco usando `AES-256-GCM`.

## 3. Schema de Dados (Resumo)
- `Organization`: Dono do workspace.
- `CloudAccount`: Armazena credenciais (encriptadas) e metadados do provider.
- `DailySpend`: Tabela agregada. Campos: `date`, `amount_usd`, `service_name`, `provider`, `organization_id`.
- `Alert`: Log de anomalias detectadas.

## 4. Estrutura de Pastas
- `/src/app`: Routes e UI.
- `/src/lib/adapters`: Implementações (AWS, Vercel, GCP).
- `/src/lib/math`: Motores de regressão e cálculos de projeção.
- `/src/services`: Camada de orquestração.