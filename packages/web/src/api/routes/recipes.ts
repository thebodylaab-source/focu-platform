import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and, sql, isNull, isNotNull, ne, or } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import Anthropic from "@anthropic-ai/sdk";

// IA ligada diretamente à chave Anthropic (independente de qualquer gateway).
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Controlo de custos: cada aluna pode gerar até 3 receitas por dia (dá margem
// para tentar outra se não gostar, sem custo descontrolado). O contador é
// incrementado atomicamente ANTES da chamada (à prova de concorrência); se a
// geração falhar, é decrementado — não se perde a tentativa por um erro da IA.
const DAILY_LIMIT = 3;
const today = () => new Date().toISOString().split("T")[0];

async function reserveDailyGeneration(userId: string): Promise<boolean> {
  const [row] = await db.insert(schema.aiGenerations)
    .values({ userId, genDate: today(), count: 1 })
    .onConflictDoUpdate({
      target: [schema.aiGenerations.userId, schema.aiGenerations.genDate],
      set: { count: sql`${schema.aiGenerations.count} + 1` },
    })
    .returning();
  if ((row?.count ?? 1) > DAILY_LIMIT) { await rollbackDailyGeneration(userId); return false; }
  return true;
}

async function rollbackDailyGeneration(userId: string): Promise<void> {
  await db.update(schema.aiGenerations)
    .set({ count: sql`max(0, ${schema.aiGenerations.count} - 1)` })
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
    const user = c.get("user")!;
    // Cada aluna vê as receitas do programa (owner NULL) + as suas próprias.
    // Admin vê tudo.
    const rows = user.role === "admin"
      ? await db.select().from(schema.recipes)
      : await db.select().from(schema.recipes)
          .where(or(isNull(schema.recipes.ownerId), eq(schema.recipes.ownerId, user.id)));
    return c.json({ recipes: rows }, 200);
  })
  // Receitas feitas por OUTRAS alunas (comunidade) — para partilha de ideias.
  .get("/community", requireAuth, async (c) => {
    const user = c.get("user")!;
    const rows = await db.select().from(schema.recipes)
      .where(and(isNotNull(schema.recipes.ownerId), ne(schema.recipes.ownerId, user.id)));
    return c.json({ recipes: rows }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return c.json({ message: "Título obrigatório." }, 400);
    }
    const ingredients = (() => { try { return JSON.parse(body.ingredients ?? "[]"); } catch { return []; } })();
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return c.json({ message: "A receita precisa de pelo menos um ingrediente." }, 400);
    }
    const num = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0 ? n : null; };
    // Admin cria receitas do programa (owner NULL); aluna cria receitas pessoais.
    const ownerId = user.role === "admin" ? null : user.id;
    const [recipe] = await db.insert(schema.recipes).values({
      ...body,
      ownerId,
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
      return c.json({ error: "Já usaste as tuas 3 gerações de hoje. 🍑 Volta amanhã para mais!" }, 429);
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
  .delete("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = parseInt(c.req.param("id"));
    const [recipe] = await db.select().from(schema.recipes).where(eq(schema.recipes.id, id));
    if (!recipe) return c.json({ ok: true }, 200);
    // Admin apaga qualquer; aluna só as receitas dela (não as do programa).
    if (user.role !== "admin" && recipe.ownerId !== user.id) {
      return c.json({ message: "Só podes apagar as tuas receitas." }, 403);
    }
    await db.delete(schema.recipes).where(eq(schema.recipes.id, id));
    return c.json({ ok: true }, 200);
  });
