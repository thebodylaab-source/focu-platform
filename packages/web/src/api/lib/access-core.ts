// Lógica pura de acesso (sem base de dados) — testável isoladamente.

export const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Prazo de um pagamento avulso: estende a partir do maior entre "agora" e a
// expiração atual (para quem paga antes de acabar não perder dias).
export function extendOneTime(now: Date, current: Date | null | undefined): Date {
  const base = current && current.getTime() > now.getTime() ? current.getTime() : now.getTime();
  return new Date(base + MONTH_MS);
}

// Acesso válido = sem data de expiração (legado/vitalício) OU dentro do prazo.
export function isAccessValid(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  return !expiresAt || expiresAt.getTime() > now.getTime();
}
