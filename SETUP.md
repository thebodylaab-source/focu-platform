# FO.CU Platform — Setup Local / Claude Code

## Pré-requisitos
- [Bun](https://bun.sh) instalado
- [Node.js](https://nodejs.org) 18+

## Instalação

```bash
# 1. Instalar dependências
bun install

# 2. Configurar variáveis de ambiente
cp .env.production .env
# Edita o .env e muda WEBSITE_URL para o teu domínio

# 3. Build
bun run build:web

# 4. Arrancar servidor
cd packages/web && bun src/server.ts
# Acede em http://localhost:3000
```

## Base de Dados (Turso)
- DB URL: libsql://focu-thebodylaab-source.aws-eu-west-1.turso.io
- Gerida em: https://app.turso.tech

## Migrar schema se fizeres alterações
```bash
cd packages/web
bunx drizzle-kit push
```

## Estrutura
```
focu-platform/
├── packages/
│   ├── web/          ← Servidor + Frontend React
│   │   ├── src/
│   │   │   ├── api/  ← Hono API routes
│   │   │   └── web/  ← React components
│   └── mobile/       ← Expo React Native
├── .env.production   ← Variáveis (renomear para .env)
└── SETUP.md
```

## Conta de teste
- Email: ped1000@gmail.com
- Password: Teste1234!

## Conta admin
- Email: thebodylaab@gmail.com
