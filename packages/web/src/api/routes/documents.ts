import { Hono } from "hono";
import { mkdir } from "node:fs/promises";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";

// Pasta de uploads. Em produção deve apontar para um VOLUME persistente do
// Railway (ex: UPLOAD_DIR=/data/uploads), senão os ficheiros perdem-se no deploy.
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? "/data/uploads";
await mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB
const safeExt = (name: string) => (name.split(".").pop() ?? "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8) || "bin";

export const documentsRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const rows = await db.select().from(schema.documents);
    return c.json({ documents: rows }, 200);
  })
  // Upload de um ficheiro (admin) → guarda no volume e devolve o URL interno.
  .post("/upload", requireAdmin, async (c) => {
    const body = await c.req.parseBody();
    const file = body["file"];
    if (!(file instanceof File)) return c.json({ message: "Ficheiro em falta." }, 400);
    if (file.size === 0) return c.json({ message: "Ficheiro vazio." }, 400);
    if (file.size > MAX_BYTES) return c.json({ message: "Ficheiro demasiado grande (máx. 30 MB)." }, 400);
    const name = `${crypto.randomUUID()}.${safeExt(file.name)}`;
    try {
      await Bun.write(`${UPLOAD_DIR}/${name}`, await file.arrayBuffer());
    } catch (e) {
      console.error("Erro ao gravar upload:", e);
      return c.json({ message: "Não foi possível guardar o ficheiro. Confirma que há um volume configurado." }, 500);
    }
    return c.json({ url: `/api/documents/file/${name}`, name }, 201);
  })
  // Serve um ficheiro carregado. Público mas com nome aleatório (não adivinhável).
  .get("/file/:name", async (c) => {
    const name = c.req.param("name").replace(/[^a-zA-Z0-9._-]/g, "");
    if (!name || name.includes("..")) return c.json({ message: "Inválido" }, 400);
    const f = Bun.file(`${UPLOAD_DIR}/${name}`);
    if (!(await f.exists())) return c.json({ message: "Ficheiro não encontrado" }, 404);
    return new Response(f);
  })
  .post("/", requireAdmin, async (c) => {
    const body = await c.req.json();
    if (!body.title || !body.fileUrl) return c.json({ message: "Título e ficheiro obrigatórios." }, 400);
    const [doc] = await db.insert(schema.documents).values(body).returning();
    return c.json({ document: doc }, 201);
  })
  .delete("/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.documents).where(eq(schema.documents.id, id));
    return c.json({ ok: true }, 200);
  });
