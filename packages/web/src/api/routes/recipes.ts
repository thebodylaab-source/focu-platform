import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { generateText, createGateway } from "ai";

const gateway = createGateway({
  baseURL: process.env.AI_GATEWAY_BASE_URL,
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

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
  .post("/generate", requireAuth, async (c) => {
    try {
      const { prompt } = await c.req.json();
      const userPrompt = prompt || "Cria uma receita saudável e equilibrada para uma mulher a fazer um desafio de glúteos";

      const systemPrompt = `És um nutricionista especializado em alimentação saudável para mulheres ativas. 
Crias receitas nutritivas, equilibradas e saborosas. 
Responde SEMPRE em JSON válido com exatamente esta estrutura (sem texto extra):
{
  "title": "Nome da receita",
  "description": "Descrição curta e apetitosa (1 linha)",
  "calories": número,
  "protein": número em gramas,
  "carbs": número em gramas,
  "fat": número em gramas,
  "prepTime": minutos de preparação,
  "cookTime": minutos de cozinha,
  "servings": número de pessoas,
  "ingredients": ["ingrediente 1 com quantidade", "ingrediente 2", ...],
  "steps": ["Passo 1", "Passo 2", ...],
  "tags": ["sem-gluten", "alta-proteina", ...],
  "category": "principal" ou "pequeno-almoco" ou "lanche" ou "sobremesa"
}
Tags disponíveis: sem-gluten, sem-lactose, vegan, vegetariano, sem-acucar, alta-proteina
Usa português de Portugal.`;

      const { text: raw } = await generateText({
        model: gateway("anthropic/claude-sonnet-4.6"),
        system: systemPrompt,
        prompt: userPrompt,
        maxTokens: 1024,
      });

      // Extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return c.json({ error: "Resposta inválida da IA" }, 500);
      
      const recipe = JSON.parse(jsonMatch[0]);
      
      // Normalize arrays to JSON strings
      recipe.ingredients = JSON.stringify(Array.isArray(recipe.ingredients) ? recipe.ingredients : []);
      recipe.steps = JSON.stringify(Array.isArray(recipe.steps) ? recipe.steps : []);
      recipe.tags = JSON.stringify(Array.isArray(recipe.tags) ? recipe.tags : []);
      
      return c.json({ recipe }, 200);
    } catch (e: any) {
      console.error("Generate recipe error:", e);
      return c.json({ error: e.message || "Erro interno" }, 500);
    }
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.recipes).where(eq(schema.recipes.id, id));
    return c.json({ ok: true }, 200);
  });
