import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, desc } from "drizzle-orm";
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
  // A aluna vê os SEUS registos de carga (todos, para o plano agrupar por exercício).
  .get("/logs", requireMember, async (c) => {
    const user = c.get("user")!;
    const rows = await db.select().from(schema.exerciseLogs)
      .where(eq(schema.exerciseLogs.userId, user.id))
      .orderBy(desc(schema.exerciseLogs.logDate), desc(schema.exerciseLogs.id));
    return c.json({ logs: rows }, 200);
  })
  // A aluna regista uma carga para um exercício.
  .post("/log", requireMember, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const exercise = String(body?.exercise ?? "").trim().slice(0, 160);
    if (!exercise) return c.json({ error: "Exercício em falta" }, 400);
    const weight = body?.weight != null && !Number.isNaN(Number(body.weight)) ? Number(body.weight) : null;
    const reps = body?.reps != null ? String(body.reps).slice(0, 20) : null;
    const notes = body?.notes != null ? String(body.notes).slice(0, 300) : null;
    const logDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body?.logDate)) ? String(body.logDate) : new Date().toISOString().split("T")[0];
    const [row] = await db.insert(schema.exerciseLogs)
      .values({ userId: user.id, exercise, weight, reps, notes, logDate, createdAt: new Date() })
      .returning();
    return c.json({ log: row }, 201);
  })
  // A aluna apaga um registo seu.
  .delete("/log/:id", requireMember, async (c) => {
    const user = c.get("user")!;
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.exerciseLogs)
      .where(and(eq(schema.exerciseLogs.id, id), eq(schema.exerciseLogs.userId, user.id)));
    return c.json({ ok: true }, 200);
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
