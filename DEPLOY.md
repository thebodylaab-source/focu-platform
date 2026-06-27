# Deploy da app FO.CU no Railway

A app é um servidor **Bun** que serve o frontend compilado (Vite/React) e a
API (Hono) em `/api`. Base de dados: **Turso/LibSQL**. IA: **Anthropic** (direta).

## Passos no Railway

1. Cria conta em https://railway.app e clica **New Project → Deploy from GitHub repo**.
2. Escolhe o repositório `thebodylaab-source/focu-platform`, branch `main`.
   - O `railway.json` já define o build e o start (não precisas configurar comandos):
     - Build: `bun install && cd packages/web && bun run build`
     - Start: `cd packages/web && bun src/server.ts`
3. Em **Variables**, define as variáveis de ambiente (ver abaixo).
4. Em **Settings → Networking → Generate Domain** para obteres um URL público.
5. Mete esse URL em `WEBSITE_URL` e faz redeploy.

## Variáveis de ambiente (Railway → Variables)

| Variável | Valor |
|---|---|
| `DATABASE_URL` | libsql://…turso.io (o teu) |
| `DATABASE_AUTH_TOKEN` | token da Turso (regenerado!) |
| `ANTHROPIC_API_KEY` | a tua chave sk-ant-… |
| `BETTER_AUTH_SECRET` | string aleatória longa e FIXA |
| `WEBSITE_URL` | o domínio gerado pelo Railway (https://…up.railway.app) |
| `ADMIN_EMAIL` | thebodylaab@gmail.com |
| `STRIPE_SECRET_KEY` | (só se usares pagamentos) |
| `STRIPE_WEBHOOK_SECRET` | (só se usares pagamentos) |

> `PORT` é definido automaticamente pelo Railway — não precisas de o pôr.
> `BETTER_AUTH_SECRET` tem de ser FIXO: se mudar, todas as sessões são
> invalidadas (utilizadores têm de iniciar sessão de novo).
>
> Gera um segredo com:
> `bun -e "console.log(crypto.randomUUID()+crypto.randomUUID())"`

## Correr localmente

```bash
bun install
cp .env.example .env     # preencher
cd packages/web
bun run build
bun --env-file=../../.env src/server.ts   # http://localhost:3000
```

## Base de dados (migrações)

Schema em `packages/web/src/api/database/schema.ts`. Numa BD nova:
`cd packages/web && bun --env-file=../../.env run db:push`.
Tabelas e colunas atuais (incl. `tags` em global_foods/shopping_list) já existem na BD.
