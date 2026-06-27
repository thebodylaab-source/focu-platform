/**
 * Correção de SEGURANÇA das etiquetas dietéticas nas receitas JÁ EXISTENTES na BD.
 *
 * Editar o seed (seed-recipes.ts) não altera linhas já gravadas — este script
 * percorre todas as receitas da base de dados e corrige as inconsistências:
 *
 *   - sem-gluten + "aveia" sem certificação  -> "aveia certificada sem glúten"
 *   - sem-gluten + molho de soja comum        -> "molho de soja sem glúten (tamari)"
 *   - vegan + "mel" (mel de abelha)           -> remove a tag "vegan" (mantém vegetariano)
 *
 * É idempotente: correr várias vezes não duplica correções.
 *
 * Como correr (a partir da raiz do projeto, com DATABASE_URL definido):
 *   bun --env-file=.env fix-dietary-safety.ts
 * ou no Runable, como passo único de manutenção.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { recipes } from "./packages/web/src/api/database/schema";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = drizzle(client);

function normalize(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function hasWord(text: string, word: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(normalize(text));
}

// Corrige um ingrediente de aveia para versão certificada (se ainda não estiver).
function fixOats(ing: string): string {
  if (!hasWord(ing, "aveia")) return ing;
  const n = normalize(ing);
  if (n.includes("certificada") || n.includes("sem gluten")) return ing;
  // acrescenta a especificação logo a seguir à palavra "aveia"
  return ing.replace(/(aveia)/i, "$1 certificada sem glúten");
}

// Corrige molho de soja comum para tamari/sem glúten (se aplicável).
function fixSoy(ing: string): string {
  const n = normalize(ing);
  if (!/molho (de )?soja/.test(n)) return ing;
  if (/tamari|sem gluten/.test(n)) return ing;
  return ing.replace(/molho\s*(de\s*)?soja/i, "molho de soja sem glúten (tamari)");
}

async function run() {
  const rows = await db.select().from(recipes);
  let changed = 0;
  const report: string[] = [];

  for (const r of rows) {
    let tags: string[] = [];
    let ingredients: string[] = [];
    try {
      tags = JSON.parse(r.tags);
      ingredients = JSON.parse(r.ingredients);
    } catch {
      continue;
    }

    const before = JSON.stringify({ tags, ingredients });
    const problems: string[] = [];

    if (tags.includes("sem-gluten")) {
      ingredients = ingredients.map((ing) => {
        const fixedOats = fixOats(ing);
        if (fixedOats !== ing) problems.push(`aveia -> certificada`);
        const fixedSoy = fixSoy(fixedOats);
        if (fixedSoy !== fixedOats) problems.push(`molho soja -> tamari`);
        return fixedSoy;
      });
    }

    if (tags.includes("vegan")) {
      const hasHoney = ingredients.some((ing) => hasWord(ing, "mel"));
      if (hasHoney) {
        tags = tags.filter((t) => t !== "vegan");
        if (!tags.includes("vegetariano")) tags.push("vegetariano");
        problems.push(`remove tag vegan (contém mel)`);
      }
    }

    const after = JSON.stringify({ tags, ingredients });
    if (after !== before) {
      await db
        .update(recipes)
        .set({ tags: JSON.stringify(tags), ingredients: JSON.stringify(ingredients) })
        .where(eq(recipes.id, r.id));
      changed++;
      report.push(`#${r.id} "${r.title}": ${problems.join("; ")}`);
    }
  }

  console.log(`Receitas analisadas: ${rows.length}`);
  console.log(`Receitas corrigidas: ${changed}\n`);
  for (const line of report) console.log("  ✔ " + line);
}

run().then(() => process.exit(0));
