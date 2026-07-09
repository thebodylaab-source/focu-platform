import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { isRestForgiven, type CycleSettings } from "../../shared/cycle-core";

const dayStr = (d: Date) => d.toISOString().split("T")[0];

export const progressRoute = new Hono()
  // GET /api/progress — check-ins recentes + streak atual (respeita o período)
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const rows = await db.select().from(schema.workoutCheckins)
      .where(and(eq(schema.workoutCheckins.userId, user.id), gte(schema.workoutCheckins.checkinDate, dayStr(since))))
      .orderBy(desc(schema.workoutCheckins.checkinDate));

    // #1: dias de descanso durante a menstruação / pré-período não quebram o streak.
    const [cycleRow] = await db.select().from(schema.cycleTracking).where(eq(schema.cycleTracking.userId, user.id));
    const cycle: CycleSettings | null = cycleRow
      ? { lastPeriodStart: cycleRow.lastPeriodStart, cycleLength: cycleRow.cycleLength, periodLength: cycleRow.periodLength }
      : null;
    const forgiven = (dateStr: string) => (cycle ? isRestForgiven(cycle, dateStr) : false);

    const dates = new Set(rows.map((r) => r.checkinDate));
    const todayStr = dayStr(new Date());
    const restForgivenToday = !dates.has(todayStr) && forgiven(todayStr);

    // Streak: conta dias treinados, atravessando (sem quebrar) os dias de
    // descanso "protegidos" pelo ciclo. Só treinos incrementam o número.
    let streak = 0;
    const cursor = new Date();
    if (!dates.has(dayStr(cursor))) cursor.setDate(cursor.getDate() - 1); // hoje ainda pode treinar
    while (true) {
      const ds = dayStr(cursor);
      if (dates.has(ds)) { streak++; cursor.setDate(cursor.getDate() - 1); continue; }
      if (forgiven(ds)) { cursor.setDate(cursor.getDate() - 1); continue; } // ponte, não conta nem quebra
      break;
    }

    // Dias protegidos recentes (para o calendário do dashboard)
    const forgivenDays: string[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = dayStr(d);
      if (!dates.has(ds) && forgiven(ds)) forgivenDays.push(ds);
    }

    return c.json({ checkins: rows.map((r) => r.checkinDate), streak, restForgivenToday, forgivenDays }, 200);
  })
  // POST /api/progress/checkin — marca (ou desmarca) o treino de hoje
  .post("/checkin", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json().catch(() => ({}));
    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : dayStr(new Date());
    // Só hoje ou passado — não faz sentido marcar treinos futuros.
    if (date > dayStr(new Date())) return c.json({ message: "Data futura inválida" }, 400);

    const [existing] = await db.select().from(schema.workoutCheckins)
      .where(and(eq(schema.workoutCheckins.userId, user.id), eq(schema.workoutCheckins.checkinDate, date)));
    if (existing) {
      await db.delete(schema.workoutCheckins).where(eq(schema.workoutCheckins.id, existing.id));
      return c.json({ checked: false }, 200);
    }
    await db.insert(schema.workoutCheckins).values({ userId: user.id, checkinDate: date });
    return c.json({ checked: true }, 200);
  });
