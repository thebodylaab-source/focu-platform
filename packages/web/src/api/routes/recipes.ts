import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import Anthropic from "@anthropic-ai/sdk";

// IA ligada diretamente à chave Anthropic (independente de qualquer gateway).
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Controlo de custos: cada aluno gera 1 receita por dia. A reserva é feita
// ANTES de chamar a IA (com restrição única (userId, genDate) na base, à prova
// de pedidos simultâneos). Se a geração falhar, a reserva é devolvida para a
// aluna poder tentar de novo — não perde o dia por um erro da IA.
const today = () => new Date().toISOString().split("T")[0];

async function reserveDailyGeneration(userId: string): Promise<boolean> {
  const [row] = await db.insert(schema.aiGenerations)
    .values({ userId, genDate: today() })
    .onConflictDoNothing()
    .returning();
  return !!row; // inseriu → reservado; conflito → já usou hoje
}

async function rollbackDailyGeneration(userId: string): Promise<void> {
  await db.delete(schema.aiGenerations)
    .where(and(eq(schema.aiGenerations.userId, userId), eq(schema.aiGenerations.genDate, today())));
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
    const user = c.get("user")!;
    const isAdmin = user.role === "admin";
    // Reserva o dia ANTES de qualquer trabalho (à prova de concorrência).
    if (!isAdmin && !(await reserveDailyGeneration(user.id))) {
      return c.json({ error: "Já geraste a tua receita de hoje. 🍑 Volta amanhã para uma nova!" }, 429);
    }
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
        if (!isAdmin) await rollbackDailyGeneration(user.id); // falhou → devolve o dia
        return c.json({ error: "Resposta inválida da IA. Tenta novamente." }, 500);
      }

      // Normalize arrays to JSON strings
      recipe.ingredients = JSON.stringify(Array.isArray(recipe.ingredients) ? recipe.ingredients : []);
      recipe.steps = JSON.stringify(Array.isArray(recipe.steps) ? recipe.steps : []);
      recipe.tags = JSON.stringify(Array.isArray(recipe.tags) ? recipe.tags : []);
      
      return c.json({ recipe }, 200);
    } catch (e: any) {
      if (!isAdmin) await rollbackDailyGeneration(user.id); // falhou → devolve o dia
      console.error("Generate recipe error:", e);
      return c.json({ error: e.message || "Erro interno" }, 500);
    }
  })
  .delete("/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.recipes).where(eq(schema.recipes.id, id));
    return c.json({ ok: true }, 200);
  });
