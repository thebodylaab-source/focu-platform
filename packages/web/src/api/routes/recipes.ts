import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import Anthropic from "@anthropic-ai/sdk";

// IA ligada diretamente à chave Anthropic (independente de qualquer gateway).
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Rate limit em memória: máx. 10 gerações por utilizador por hora.
// Reinicia com o processo — suficiente para travar abuso de custos da API.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const generationLog = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const times = (generationLog.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (times.length >= RATE_LIMIT) {
    generationLog.set(userId, times);
    return false;
  }
  times.push(now);
  generationLog.set(userId, times);
  return true;
}

// Extrai o primeiro objeto JSON completo (chavetas equilibradas, ignora strings).
// Mais robusto que regex gananciosa quando a resposta traz texto à volta.
function extractJson(raw: string): any | null {
  const cleaned = raw.replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') inStr = !inStr;
    if (inStr) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

export const recipesRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const rows = await db.select().from(schema.recipes);
    return c.json({ recipes: rows }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return c.json({ message: "Título obrigatório." }, 400);
    }
    const ingredients = (() => { try { return JSON.parse(body.ingredients ?? "[]"); } catch { return []; } })();
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return c.json({ message: "A receita precisa de pelo menos um ingrediente." }, 400);
    }
    const num = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : null; };
    const [recipe] = await db.insert(schema.recipes).values({
      ...body,
      calories: num(body.calories),
      protein: num(body.protein),
      carbs: num(body.carbs),
      fat: num(body.fat),
    }).returning();
    return c.json({ recipe }, 201);
  })
  .post("/generate", requireAuth, async (c) => {
    try {
      const user = c.get("user")!;
      if (!checkRateLimit(user.id)) {
        return c.json({ error: "Limite de gerações atingido (10 por hora). Tenta mais tarde." }, 429);
      }
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

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const block = message.content.find((b) => b.type === "text");
      const raw = block && block.type === "text" ? block.text : "";

      const recipe = extractJson(raw);
      if (!recipe || typeof recipe.title !== "string") {
        return c.json({ error: "Resposta inválida da IA. Tenta novamente." }, 500);
      }

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
