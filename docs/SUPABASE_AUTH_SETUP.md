# Supabase Auth – Configuração para magic link e convites

Para o fluxo de **convite por e-mail** (magic link) funcionar ao primeiro clique, duas coisas precisam estar corretas.

O envio do convite usa um cliente Supabase com **implicit flow** (`createSupabaseOtpClient`), para o link no e-mail redirecionar com os tokens no fragmento (`#access_token=...`) em vez de `?code=...`. Assim o browser do convidado não precisa de PKCE code verifier (que só existiria se o fluxo tivesse sido iniciado no mesmo browser).

## 1. URL de redirect no nosso app

O link que o Supabase envia no e-mail redireciona o utilizador para a nossa app em `{ORIGEM}/auth/callback`. Essa origem deve ser **sempre a mesma** que está configurada no Supabase.

- **Definir no `.env`:**
  ```bash
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
  Em produção:
  ```bash
  NEXT_PUBLIC_APP_URL=https://burnwatch.cloud
  ```

- Se `NEXT_PUBLIC_APP_URL` não estiver definido, a API de convites usa o `origin` do request. Em desenvolvimento isso costuma ser correto; em produção é melhor definir a variável.

## 2. Redirect URLs no Supabase

O Supabase só completa o magic link e redireciona **com sessão** se o URL de destino estiver na lista de URLs permitidas. Caso contrário, redireciona com erro (`otp_expired` / `access_denied`) e o utilizador não fica logado.

1. Abre o **Supabase Dashboard** do projeto.
2. **Authentication** → **URL Configuration**.
3. Em **Redirect URLs**, adiciona **exatamente**:
   - Desenvolvimento: `http://localhost:3000/auth/callback`
   - Produção: `https://burnwatch.cloud/auth/callback` (ou o domínio que usas).
4. Em **Site URL** (opcional mas recomendado), usa a mesma origem: `http://localhost:3000` ou `https://burnwatch.cloud`.
5. Guarda.

Depois disto, ao clicar no link do convite no e-mail, o Supabase redireciona para `{NEXT_PUBLIC_APP_URL}/auth/callback` com a sessão no URL (fragment). A nossa página de callback lê a sessão, chama `/api/auth/complete` (que aplica o convite e cria o Profile) e redireciona o utilizador para o dashboard (ou onboarding se for primeiro acesso sem convite).
