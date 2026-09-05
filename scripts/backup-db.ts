// Backup completo da base de dados FO.CU (Turso/libSQL).
// Gera dois ficheiros com data/hora em ./backups/:
//   - focu-db-<stamp>.sql   → schema + INSERTs, restaurável (SQLite/Turso)
//   - focu-db-<stamp>.json  → dados em bruto (fácil de inspecionar)
//
// Uso:  bun --env-file=.env scripts/backup-db.ts
//   ou: npm run backup   (ver package.json)
//   ou: duplo-clique em backup.cmd (Windows)

import { createClient } from "@libsql/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!url) {
  console.error("❌ DATABASE_URL em falta. Corre a partir da raiz do projeto com o .env carregado.");
  process.exit(1);
}

const client = createClient({ url, authToken });

// Escapa um valor para SQL literal.
function sqlLiteral(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number" || typeof v === "bigint") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Uint8Array || v instanceof ArrayBuffer) {
    const bytes = v instanceof ArrayBuffer ? new Uint8Array(v) : v;
    let hex = "";
    for (const b of bytes) hex += b.toString(16).padStart(2, "0");
    return `X'${hex}'`;
  }
  // string (e qualquer outro) → escapa plicas
  return `'${String(v).replace(/'/g, "''")}'`;
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19); // YYYY-MM-DDTHH-MM-SS
const outDir = join(process.cwd(), "backups");
mkdirSync(outDir, { recursive: true });

// Objetos do schema (tabelas, índices, triggers) por ordem de criação.
const schemaRes = await client.execute(
  "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, name"
);

const tablesRes = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name"
);
const tables = tablesRes.rows.map((r: any) => r.name as string);

// ---- .sql ----
const sqlParts: string[] = [];
sqlParts.push(`-- Backup FO.CU — ${new Date().toISOString()}`);
sqlParts.push("PRAGMA foreign_keys=OFF;");
sqlParts.push("BEGIN TRANSACTION;");

for (const row of schemaRes.rows as any[]) {
  if (row.type === "table") sqlParts.push(`${row.sql};`);
}
for (const t of tables) {
  const res = await client.execute(`SELECT * FROM "${t}"`);
  if (res.rows.length === 0) continue;
  const cols = res.columns.map((c) => `"${c}"`).join(", ");
  for (const r of res.rows as any[]) {
    const vals = res.columns.map((c) => sqlLiteral(r[c])).join(", ");
    sqlParts.push(`INSERT INTO "${t}" (${cols}) VALUES (${vals});`);
  }
  console.error(`  ${t}: ${res.rows.length} linhas`);
}
// Índices/triggers depois dos dados
for (const row of schemaRes.rows as any[]) {
  if (row.type !== "table") sqlParts.push(`${row.sql};`);
}
sqlParts.push("COMMIT;");
sqlParts.push("PRAGMA foreign_keys=ON;");

const sqlPath = join(outDir, `focu-db-${stamp}.sql`);
writeFileSync(sqlPath, sqlParts.join("\n"), "utf8");

// ---- .json ----
const dump: Record<string, unknown> = {
  _meta: { exportedAt: new Date().toISOString(), tableCount: tables.length, tables },
};
for (const t of tables) {
  const res = await client.execute(`SELECT * FROM "${t}"`);
  dump[t] = res.rows;
}
const jsonPath = join(outDir, `focu-db-${stamp}.json`);
writeFileSync(jsonPath, JSON.stringify(dump, null, 2), "utf8");

console.error(`\n✅ Backup concluído (${tables.length} tabelas):`);
console.error(`   ${sqlPath}`);
console.error(`   ${jsonPath}`);
