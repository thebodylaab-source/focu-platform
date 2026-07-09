import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const today = () => new Date().toISOString().split("T")[0];

// Valida e normaliza as definições do ciclo.
function clean(body: any): { lastPeriodStart: string; cycleLength: number; periodLength: number } | string {
  if (!isDate(body.lastPeriodStart)) return "Data da última menstruação inválida.";
  if (body.lastPeriodStart > today()) return "A data não pode ser no futuro.";
  const cycleLength = Math.round(Number(body.cycleLength));
  if (!Number.isFinite(cycleLength) || cycleLength < 20 || cycleLength > 45) return "Duração do ciclo deve estar entre 20 e 45 dias.";
  const periodLength = Math.round(Number(body.periodLength ?? 5));
  if (!Number.isFinite(periodLength) || periodLength < 2 || periodLength > 10) return "Duração da menstruação deve estar entre 2 e 10 dias.";
  return { lastPeriodStart: body.lastPeriodStart, cycleLength, periodLength };
}

async function upsert(userId: string, data: { lastPeriodStart: string; cycleLength: number; periodLength: number }) {
  const existing = await db.select().from(schema.cycleTracking).where(eq(schema.cycleTracking.userId, userId));
  if (existing.length > 0) {
    const [row] = await db.update(schema.cycleTracking)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.cycleTracking.userId, userId))
      .returning();
    return row;
  }
  const [row] = await db.insert(schema.cycleTracking).values({ userId, ...data }).returning();
  return row;
}

export const cycleRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [row] = await db.select().from(schema.cycleTracking).where(eq(schema.cycleTracking.userId, user.id));
    return c.json({ cycle: row ?? null }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const parsed = clean(await c.req.json());
    if (typeof parsed === "string") return c.json({ message: parsed }, 400);
    const row = await upsert(user.id, parsed);
    return c.json({ cycle: row }, 200);
  })
  // Check-in de hoje (como se sente) — null se ainda não registou hoje.
  .get("/checkin", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [row] = await db.select().from(schema.cycleCheckins)
      .where(and(eq(schema.cycleCheckins.userId, user.id), eq(schema.cycleCheckins.checkinDate, today())));
    return c.json({ checkin: row ?? null }, 200);
  })
  // Regista/atualiza o check-in de hoje.
  .post("/checkin", requireAuth, async (c) => {
    const user = c.get("user")!;
    const { feeling } = await c.req.json();
    const allowed = ["otima", "bem", "media", "sem-energia"];
    if (!allowed.includes(feeling)) return c.json({ message: "Estado inválido" }, 400);
    const [existing] = await db.select().from(schema.cycleCheckins)
      .where(and(eq(schema.cycleCheckins.userId, user.id), eq(schema.cycleCheckins.checkinDate, today())));
    if (existing) {
      const [row] = await db.update(schema.cycleCheckins).set({ feeling })
        .where(eq(schema.cycleCheckins.id, existing.id)).returning();
      return c.json({ checkin: row }, 200);
    }
    const [row] = await db.insert(schema.cycleCheckins)
      .values({ userId: user.id, checkinDate: today(), feeling }).returning();
    return c.json({ checkin: row }, 201);
  })
  // Atalho: "o período começou hoje" — atualiza só a data, mantém as durações.
  .post("/period-started", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const date = isDate(body.date) && body.date <= today() ? body.date : today();
    const [existing] = await db.select().from(schema.cycleTracking).where(eq(schema.cycleTracking.userId, user.id));
    const row = await upsert(user.id, {
      lastPeriodStart: date,
      cycleLength: existing?.cycleLength ?? 28,
      periodLength: existing?.periodLength ?? 5,
    });
    return c.json({ cycle: row }, 200);
  });
