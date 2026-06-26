import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { generateRecipeFromIngredients } from "../lib/ai-recipes";

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
  .post("/ai-generate", requireAuth, async (c) => {
    const body = await c.req.json<{
      ingredients: string[];
      tags?: string[];
      maxCalories?: number;
      avoidInflammatory?: boolean;
    }>();
    if (!body.ingredients || body.ingredients.length === 0) {
      return c.json({ error: "Indica pelo menos um ingrediente." }, 400);
    }
    try {
      const recipe = await generateRecipeFromIngredients(
        body.ingredients,
        body.tags ?? [],
        body.maxCalories,
        body.avoidInflammatory
      );
      return c.json({ recipe }, 200);
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Erro a gerar receita." },
        502
      );
    }
  })
  // Pedir para adicionar uma receita/alimento
  .post("/request", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json<{ text: string }>();
    if (!body.text || !body.text.trim()) {
      return c.json({ error: "Escreve o que queres pedir." }, 400);
    }
    const [request] = await db
      .insert(schema.recipeRequests)
      .values({ userId: user.id, text: body.text.trim() })
      .returning();
    return c.json({ request }, 201);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.recipes).where(eq(schema.recipes.id, id));
    return c.json({ ok: true }, 200);
  });
