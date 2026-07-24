import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, like, or, gte, lte } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

// Valida um alimento antes de entrar na base (pessoal ou global).
// Evita dados absurdos que envenenam as contagens de toda a gente.
function validateFood(body: any): string | null {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2 || name.length > 60) return "Nome do alimento inválido (2–60 caracteres).";
  const cal = parseFloat(body.calories);
  if (!Number.isFinite(cal) || cal < 0 || cal > 1000) return "Calorias inválidas (0–1000 por porção).";
  for (const macro of ["protein", "carbs", "fat"]) {
    const v = parseFloat(body[macro] ?? 0);
    if (!Number.isFinite(v) || v < 0 || v > 200) return "Macros inválidos (0–200g por porção).";
  }
  return null;
}

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
  // Logs num intervalo de datas (máx. 31 dias) — usado pelo relatório semanal
  .get("/logs/range", requireAuth, async (c) => {
    const user = c.get("user")!;
    const from = c.req.query("from") ?? "";
    const to = c.req.query("to") ?? "";
    const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
    if (!isDate(from) || !isDate(to) || from > to) return c.json({ message: "Intervalo inválido" }, 400);
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400_000;
    if (days > 31) return c.json({ message: "Intervalo máximo: 31 dias" }, 400);
    const logs = await db.select().from(schema.foodLogs)
      .where(and(
        eq(schema.foodLogs.userId, user.id),
        gte(schema.foodLogs.logDate, from),
        lte(schema.foodLogs.logDate, to),
      ));
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
    const invalid = validateFood(body);
    if (invalid) return c.json({ message: invalid }, 400);
    const [food] = await db.insert(schema.foodItems).values({ userId: user.id, ...body }).returning();
    return c.json({ food }, 201);
  })
  .delete("/foods/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.foodItems).where(and(eq(schema.foodItems.id, id), eq(schema.foodItems.userId, user.id)));
    return c.json({ ok: true }, 200);
  })
  // --- Global Foods (shared DB) ---
  .get("/global-foods", requireAuth, async (c) => {
    const search = c.req.query("q") ?? "";
    let foods;
    if (search.length > 1) {
      foods = await db.select().from(schema.globalFoods)
        .where(like(schema.globalFoods.name, `%${search}%`));
    } else {
      foods = await db.select().from(schema.globalFoods).limit(100);
    }
    return c.json({ foods }, 200);
  })
  .post("/global-foods", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const invalid = validateFood(body);
    if (invalid) return c.json({ message: invalid }, 400);
    // upsert by name (ignore if already exists)
    try {
      const [food] = await db.insert(schema.globalFoods)
        .values({ ...body, addedByUserId: user.id })
        .onConflictDoNothing()
        .returning();
      return c.json({ food: food ?? null }, 201);
    } catch {
      return c.json({ food: null }, 200);
    }
  })
  .delete("/global-foods/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.globalFoods).where(
      and(eq(schema.globalFoods.id, id), eq(schema.globalFoods.addedByUserId, user.id))
    );
    return c.json({ ok: true }, 200);
  })
  // --- Shopping List ---
  .get("/shopping", requireAuth, async (c) => {
    const user = c.get("user")!;
    const items = await db.select().from(schema.shoppingList)
      .where(eq(schema.shoppingList.userId, user.id));
    return c.json({ items }, 200);
  })
  .post("/shopping", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const [item] = await db.insert(schema.shoppingList)
      .values({ userId: user.id, ...body })
      .returning();
    return c.json({ item }, 201);
  })
  .patch("/shopping/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const [item] = await db.update(schema.shoppingList)
      .set(body)
      .where(and(eq(schema.shoppingList.id, id), eq(schema.shoppingList.userId, user.id)))
      .returning();
    return c.json({ item }, 200);
  })
  .delete("/shopping/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.shoppingList)
      .where(and(eq(schema.shoppingList.id, id), eq(schema.shoppingList.userId, user.id)));
    return c.json({ ok: true }, 200);
  })
  .delete("/shopping", requireAuth, async (c) => {
    // ?all=true limpa a lista inteira; sem query limpa só os concluídos
    const user = c.get("user")!;
    const all = c.req.query("all") === "true";
    await db.delete(schema.shoppingList)
      .where(all
        ? eq(schema.shoppingList.userId, user.id)
        : and(eq(schema.shoppingList.userId, user.id), eq(schema.shoppingList.checked, true)));
    return c.json({ ok: true }, 200);
  });
