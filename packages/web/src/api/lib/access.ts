import { db } from "../database";
import * as schema from "../database/schema";
import { user } from "../database/auth-schema";
import { eq } from "drizzle-orm";

export const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// Prazo de um pagamento avulso: estende a partir do maior entre "agora" e a
// expiração atual (para quem paga antes de acabar não perder dias).
export function extendOneTime(now: Date, current: Date | null | undefined): Date {
  const base = current && current.getTime() > now.getTime() ? current.getTime() : now.getTime();
  return new Date(base + MONTH_MS);
}

// Acesso válido = sem data de expiração (legado/vitalício) OU ainda dentro do prazo.
export function isAccessValid(expiresAt: Date | null | undefined, now: Date = new Date()): boolean {
  return !expiresAt || expiresAt.getTime() > now.getTime();
}

// Reconcilia os roles com a expiração: despromove membros expirados e
// (re)promove pendentes com pagamento ainda válido. Admin nunca é tocado.
export async function reconcileExpirations(): Promise<{ downgraded: number; upgraded: number }> {
  const now = new Date();
  const paid = await db.select().from(schema.paidCustomers);
  const users = await db.select().from(user);
  const byEmail = new Map(users.map((u) => [u.email.trim().toLowerCase(), u]));

  let downgraded = 0, upgraded = 0;
  for (const p of paid) {
    const u = byEmail.get(p.email.trim().toLowerCase());
    if (!u || u.role === "admin") continue;
    const valid = isAccessValid(p.expiresAt, now);
    if (valid && u.role !== "member") {
      await db.update(user).set({ role: "member" }).where(eq(user.id, u.id));
      upgraded++;
    } else if (!valid && u.role === "member") {
      await db.update(user).set({ role: "pending" }).where(eq(user.id, u.id));
      downgraded++;
    }
  }
  return { downgraded, upgraded };
}
