# Deploy do console web no Railway

O console fica em `web/` (a raiz do repo é o app Expo). O ponto crítico é
apontar o serviço do Railway pra essa subpasta.

## 1. Criar o serviço
1. Railway → **New Project → Deploy from GitHub repo** → escolha `ever-sync/zllo`
   (autorize o Railway no GitHub se for a 1ª vez).
2. Abra o serviço criado → **Settings → Source**:
   - **Root Directory** = `web`  ⚠️ sem isso ele tenta buildar o app Expo da raiz e falha.
   - Branch: `main`.
3. Build/Start já vêm do `web/railway.json` (Nixpacks → `next build` / `next start`).
   O Node fica fixado em 20 pelo `web/.nvmrc`.

## 2. Variables (os "acessos")
Serviço → aba **Variables** → adicione (valores do projeto HOSTED no
Supabase Dashboard → Project Settings → API):

| Nome | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nkmpxyumayvnbpwxdkke.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key do hosted |
| `REVALIDATE_SECRET` | token aleatório (mesmo valor nas Edge Functions Supabase) |

> São `NEXT_PUBLIC_*`: o Railway injeta no **build** (ficam embutidas no
> bundle do navegador). Nunca coloque aqui a `service_role`/secret.

## 3. Domínio
Serviço → **Settings → Networking → Generate Domain** (ou conecte um domínio
próprio). Sai algo como `https://<serviço>.up.railway.app`.

## 4. Ajustar o Supabase Auth (sessão SSR)
Supabase Dashboard → Authentication → URL Configuration:
- **Site URL**: a URL do Railway.
- **Redirect URLs**: adicione a mesma URL.

## 5. Verificar
Abra a URL → `/login`. Entre com uma conta **assistência** ou **admin** que
exista no HOSTED. (No hosted não há seed — crie a conta antes; admin via
tabela `admins`.)

## CLI (alternativa)
```bash
npm i -g @railway/cli
railway login            # abre o navegador
railway link             # vincula ao projeto
railway up               # deploy
# defina as variáveis pelo painel ou:
railway variables --set NEXT_PUBLIC_SUPABASE_URL=https://nkmpxyumayvnbpwxdkke.supabase.co
railway variables --set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable>
```
Pelo CLI, rode-o de dentro de `web/` (ou configure o Root Directory no serviço).

## Notas
- A cada push na branch conectada, o Railway faz redeploy automático.
- `next start` usa a porta do `$PORT` que o Railway injeta — não precisa configurar.
- Mesmo princípio da Vercel; escolha **um** dos dois pra hospedar o console.
