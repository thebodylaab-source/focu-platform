import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const nutritionRoute = new Hono()
  // --- Calorie Goal ---
  .get("/goal", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [goal] = await db.select().from(schema.calorieGoals).where(eq(schema.calorieGoals.userId, user.id));
    return c.json({ goal: goal ?? null }, 200);
  })
  .post("/goal", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const existing = await db.select().from(schema.calorieGoals).where(eq(schema.calorieGoals.userId, user.id));
    if (existing.length > 0) {
      const [updated] = await db.update(schema.calorieGoals)
        .set({ ...body, updatedAt: new Date() })
        .where(eq(schema.calorieGoals.userId, user.id))
        .returning();
      return c.json({ goal: updated }, 200);
    } else {
      const [created] = await db.insert(schema.calorieGoals).values({ userId: user.id, ...body }).returning();
      return c.json({ goal: created }, 201);
    }
  })
  // --- Food Log ---
  .get("/logs", requireAuth, async (c) => {
    const user = c.get("user")!;
    const date = c.req.query("date") ?? new Date().toISOString().split("T")[0];
    const logs = await db.select().from(schema.foodLogs)
      .where(and(eq(schema.foodLogs.userId, user.id), eq(schema.foodLogs.logDate, date)));
    return c.json({ logs }, 200);
  })
  .post("/logs", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const [log] = await db.insert(schema.foodLogs).values({ userId: user.id, ...body }).returning();
    return c.json({ log }, 201);
  })
  .delete("/logs/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.foodLogs).where(and(eq(schema.foodLogs.id, id), eq(schema.foodLogs.userId, user.id)));
    return c.json({ ok: true }, 200);
  })
  // --- Custom Food Items ---
  .get("/foods", requireAuth, async (c) => {
    const user = c.get("user")!;
    const foods = await db.select().from(schema.foodItems).where(eq(schema.foodItems.userId, user.id));
    return c.json({ foods }, 200);
  })
  .post("/foods", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const [food] = await db.insert(schema.foodItems).values({ userId: user.id, ...body }).returning();
    return c.json({ food }, 201);
  })
  .delete("/foods/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.foodItems).where(and(eq(schema.foodItems.id, id), eq(schema.foodItems.userId, user.id)));
    return c.json({ ok: true }, 200);
  });
