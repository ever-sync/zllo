# Deploy do console web na Vercel

O console fica em `web/` (a raiz do repo é o app Expo). O ponto crítico é
apontar a Vercel pra essa subpasta.

## 1. Criar o projeto
1. Vercel → **Add New… → Project** → importe o repo do GitHub (`ever-sync/zllo`).
2. Em **Root Directory**, selecione **`web`**. ⚠️ Sem isso a Vercel tenta buildar o app Expo da raiz e falha.
3. **Framework Preset**: Next.js (detecta sozinho). Build/Output: padrão.

## 2. Environment Variables (do projeto HOSTED)
No Supabase Dashboard → Project Settings → API, pegue a URL e a publishable key
e cadastre na Vercel (Production + Preview):

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nkmpxyumayvnbpwxdkke.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key do hosted |

## 3. Deploy
Clique **Deploy**. A Vercel roda `next build` em `web/` e publica.
Domínio inicial: `https://<projeto>.vercel.app`.

## 4. Ajustar o Supabase Auth (cookies SSR)
Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: a URL da Vercel (`https://<projeto>.vercel.app`).
- **Redirect URLs**: adicione a mesma URL.
(O login do console é e-mail/senha, mas isso mantém a sessão SSR e e-mails
consistentes.)

## 5. Verificar
- Abra a URL → `/login`.
- Entre com uma conta **assistência** ou **admin** que exista no HOSTED.
  (No hosted não há seed — crie/conta real primeiro; admin via tabela `admins`.)

## CLI (alternativa)
```bash
cd web
npx vercel            # primeiro deploy (escolha o escopo; root = a própria pasta web)
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npx vercel --prod
```

## Notas
- `web/.env.local` é só local (gitignored). Produção usa as env vars da Vercel.
- A cada push na branch conectada, a Vercel faz deploy automático.
- Next 16 + proxy.ts (middleware) são suportados nativamente.
