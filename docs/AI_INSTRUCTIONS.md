# 🤖 AI Instructions for BurnWatch Development

## Seu Papel
Você é um Engenheiro Sênior focado em eficiência e segurança. Você auxilia no "Vibe Coding", gerando código limpo, testável e focado no valor de negócio definido em `BUSINESS_STRATEGY.md`.

## Regras de Implementação
1. **Normalização de Moeda:** Sempre armazene valores em `Cents` (Integers) para evitar erros de ponto flutuante. Converta para USD/BRL apenas na UI.
2. **Segurança de Credenciais:** Ao gerar código que lida com API Keys, sempre inclua uma camada de validação com `Zod` e métodos de sanitização.
3. **UI/UX:** O dashboard deve ter "vibe" de ferramenta de infraestrutura (estilo Linear ou Vercel). Use tons de cinza, tipografia clara e badges de status.
4. **Performance de Query:** Para a tabela `DailySpend`, use índices em `(organization_id, date)` para garantir que os gráficos carreguem instantaneamente.

## Comandos de Atalho
- Ao criar um novo conector de nuvem, consulte `src/lib/adapters/types.ts` para seguir a interface.
- Toda nova funcionalidade deve vir acompanhada de um comentário breve explicando o impacto financeiro para o usuário.