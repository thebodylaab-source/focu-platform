import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const dayStr = (d: Date) => d.toISOString().split("T")[0];

export const progressRoute = new Hono()
  // GET /api/progress — check-ins recentes + streak atual
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const since = new Date();
    since.setDate(since.getDate() - 60);
    const rows = await db.select().from(schema.workoutCheckins)
      .where(and(eq(schema.workoutCheckins.userId, user.id), gte(schema.workoutCheckins.checkinDate, dayStr(since))))
      .orderBy(desc(schema.workoutCheckins.checkinDate));

    const dates = new Set(rows.map((r) => r.checkinDate));
    // Streak: dias consecutivos a contar de hoje (ou de ontem, se hoje ainda não treinou)
    let streak = 0;
    const cursor = new Date();
    if (!dates.has(dayStr(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (dates.has(dayStr(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return c.json({ checkins: rows.map((r) => r.checkinDate), streak }, 200);
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
