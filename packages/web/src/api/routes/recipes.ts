import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const recipesRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const rows = await db.select().from(schema.recipes);
    return c.json({ recipes: rows }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const [recipe] = await db.insert(schema.recipes).values(body).returning();
    return c.json({ recipe }, 201);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.recipes).where(eq(schema.recipes.id, id));
    return c.json({ ok: true }, 200);
  });
