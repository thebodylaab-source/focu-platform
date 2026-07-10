// Lista de origens permitidas para CORS e para o trustedOrigins do better-auth.
// Substitui o antigo "reflete qualquer origem" (que permitia a qualquer site
// fazer pedidos autenticados em nome de uma utilizadora com sessão aberta).

const STATIC_WEB_ORIGINS = ["https://www.focu.pt", "https://focu.pt"];

function envOrigin(): string | null {
  const url = process.env.WEBSITE_URL?.trim().replace(/\/+$/, "");
  return url && /^https?:\/\//.test(url) ? url : null;
}

// Origens web fixas (produção + o domínio configurado no ambiente).
export function allowedWebOrigins(): string[] {
  const list = [...STATIC_WEB_ORIGINS];
  const env = envOrigin();
  if (env && !list.includes(env)) list.push(env);
  return list;
}

const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Serve para o CORS do browser: só domínios web conhecidos (+ localhost em dev).
export function isAllowedWebOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  if (allowedWebOrigins().includes(origin)) return true;
  return LOCALHOST.test(origin);
}

// Serve para o trustedOrigins do better-auth. Inclui as origens web e também
// esquemas nativos (app móvel, ex: "focu://") — que não são http(s) e não são
// atacáveis via browser — para não partir o login na app.
export function isTrustedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  if (isAllowedWebOrigin(origin)) return true;
  // Esquema personalizado de app nativa (não http/https)
  return !/^https?:\/\//.test(origin);
}
