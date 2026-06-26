import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const videosRoute = new Hono()
  .get("/", requireAuth, async (c) => {
    const rows = await db.select().from(schema.videos).orderBy(asc(schema.videos.order));
    return c.json({ videos: rows }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const body = await c.req.json();
    const [video] = await db.insert(schema.videos).values(body).returning();
    return c.json({ video }, 201);
  })
  .delete("/:id", requireAuth, async (c) => {
    const id = parseInt(c.req.param("id"));
    await db.delete(schema.videos).where(eq(schema.videos.id, id));
    return c.json({ ok: true }, 200);
  });
