import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireMember, requireAdmin } from "../middleware/auth";

// Valida/normaliza a estrutura de dias vinda do admin.
function normalizeDays(input: unknown): string {
  if (!Array.isArray(input)) return "[]";
  const days = input.slice(0, 30).map((d: any) => ({
    name: String(d?.name ?? "").slice(0, 120),
    exercises: Array.isArray(d?.exercises)
      ? d.exercises.slice(0, 40).map((e: any) => ({
          name: String(e?.name ?? "").slice(0, 160),
          sets: String(e?.sets ?? "").slice(0, 20),
          reps: String(e?.reps ?? "").slice(0, 20),
          notes: String(e?.notes ?? "").slice(0, 500),
          videoId: e?.videoId != null && !Number.isNaN(Number(e.videoId)) ? Number(e.videoId) : null,
        }))
      : [],
  }));
  return JSON.stringify(days);
}

export const trainingRoute = new Hono()
  // A aluna vê o SEU plano.
  .get("/me", requireMember, async (c) => {
    const user = c.get("user")!;
    const [plan] = await db.select().from(schema.trainingPlans).where(eq(schema.trainingPlans.userId, user.id));
    return c.json({ plan: plan ?? null }, 200);
  })
  // Admin lê o plano de uma aluna.
  .get("/:userId", requireAdmin, async (c) => {
    const userId = c.req.param("userId");
    const [plan] = await db.select().from(schema.trainingPlans).where(eq(schema.trainingPlans.userId, userId));
    return c.json({ plan: plan ?? null }, 200);
  })
  // Admin cria/atualiza o plano de uma aluna (upsert por userId).
  .put("/:userId", requireAdmin, async (c) => {
    const admin = c.get("user")!;
    const userId = c.req.param("userId");
    const body = await c.req.json().catch(() => ({}));
    const title = String(body?.title ?? "O teu plano").slice(0, 120) || "O teu plano";
    const notes = body?.notes != null ? String(body.notes).slice(0, 2000) : null;
    const days = normalizeDays(body?.days);
    const now = new Date();

    const [existing] = await db.select().from(schema.trainingPlans).where(eq(schema.trainingPlans.userId, userId));
    if (existing) {
      await db.update(schema.trainingPlans)
        .set({ title, notes, days, updatedBy: admin.id, updatedAt: now })
        .where(eq(schema.trainingPlans.userId, userId));
    } else {
      await db.insert(schema.trainingPlans)
        .values({ userId, title, notes, days, updatedBy: admin.id, createdAt: now, updatedAt: now });
    }
    const [plan] = await db.select().from(schema.trainingPlans).where(eq(schema.trainingPlans.userId, userId));
    return c.json({ plan }, 200);
  })
  // Admin apaga o plano de uma aluna.
  .delete("/:userId", requireAdmin, async (c) => {
    const userId = c.req.param("userId");
    await db.delete(schema.trainingPlans).where(eq(schema.trainingPlans.userId, userId));
    return c.json({ ok: true }, 200);
  });
