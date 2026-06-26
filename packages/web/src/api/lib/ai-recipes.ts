import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export type GeneratedRecipe = {
  title: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: string[];
  steps: string[];
  tags: string[];
  category: string;
};

const VALID_TAGS = [
  "sem-gluten",
  "sem-lactose",
  "vegan",
  "vegetariano",
  "sem-acucar",
  "alta-proteina",
];

const VALID_CATEGORIES = [
  "pequeno-almoco",
  "principal",
  "salada",
  "snack",
  "sobremesa",
  "sopa",
  "bebida",
];

function extractJson(text: string): string {
  return text.trim().replace(/^```json|^```|```$/g, "").trim();
}

export async function generateRecipeFromIngredients(
  ingredients: string[],
  tags: string[],
  maxCalories?: number,
  avoidInflammatory?: boolean
): Promise<GeneratedRecipe> {
  const anthropic = getClient();
  if (!anthropic) {
    throw new Error("ANTHROPIC_API_KEY não configurada no servidor.");
  }

  const restrictions: string[] = [];
  if (tags.length > 0) restrictions.push(`tags obrigatórias: ${tags.join(", ")}`);
  if (avoidInflammatory) {
    restrictions.push(
      "evitar ingredientes pro-inflamatórios (carne vermelha, açúcar refinado, fritos, álcool, lacticínios em excesso) — indicado para alguém com endometriose"
    );
  }
  if (maxCalories) restrictions.push(`máximo ${maxCalories} kcal por porção`);

  const prompt = `Cria uma receita SAUDÁVEL, em português europeu, no estilo da plataforma FO.CU by The Body Lab (mulheres, foco em transformação e nutrição equilibrada), usando principalmente estes ingredientes disponíveis: ${ingredients.join(", ")}.
${restrictions.length > 0 ? `Restrições: ${restrictions.join("; ")}.` : ""}
Podes sugerir 1-2 ingredientes extra comuns (sal, azeite, especiarias) se necessário, mas evita ingredientes caros ou difíceis de encontrar.
"tags" deve usar apenas valores deste conjunto: ${VALID_TAGS.join(", ")}.
"category" deve ser um destes valores: ${VALID_CATEGORIES.join(", ")}.
Responde APENAS com um JSON válido (sem markdown, sem texto extra) no formato exato:
{
  "title": "string",
  "description": "string curta e apetitosa",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "prepTime": number,
  "cookTime": number,
  "servings": number,
  "ingredients": ["string"],
  "steps": ["string"],
  "tags": ["string"],
  "category": "string"
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Resposta inesperada do modelo de IA.");
  }

  const parsed = JSON.parse(extractJson(block.text)) as GeneratedRecipe;
  parsed.tags = (parsed.tags ?? []).filter((t) => VALID_TAGS.includes(t));
  if (!VALID_CATEGORIES.includes(parsed.category)) parsed.category = "principal";
  return parsed;
}
