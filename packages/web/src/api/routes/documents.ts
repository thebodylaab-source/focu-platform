import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const documentsRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const rows = await db.select().from(schema.documents);
    return c.json({ documents: rows }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const [doc] = await db.insert(schema.documents).values(body).returning();
    return c.json({ document: doc }, 201);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.documents).where(eq(schema.documents.id, id));
    return c.json({ ok: true }, 200);
  });
