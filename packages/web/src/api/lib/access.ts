import { db } from "../database";
import * as schema from "../database/schema";
import { user } from "../database/auth-schema";
import { eq } from "drizzle-orm";
import { isAccessValid } from "./access-core";

// Re-exporta a lógica pura para quem já importava daqui.
export { MONTH_MS, extendOneTime, isAccessValid } from "./access-core";

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
