import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const favoritesRoute = new Hono()
  // GET /api/favorites?kind=video|recipe — favoritos do utilizador
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const kind = c.req.query("kind");
    const where = kind
      ? and(eq(schema.favorites.userId, user.id), eq(schema.favorites.kind, kind))
      : eq(schema.favorites.userId, user.id);
    const favs = await db.select().from(schema.favorites).where(where);
    return c.json({ favorites: favs }, 200);
  })
  // POST /api/favorites/toggle — alterna favorito (devolve o estado final)
  .post("/toggle", requireAuth, async (c) => {
    const user = c.get("user")!;
    const { kind, refId } = await c.req.json<{ kind: string; refId: number }>();
    if (!["video", "recipe"].includes(kind) || !Number.isInteger(refId)) {
      return c.json({ message: "Parâmetros inválidos" }, 400);
    }
    const [existing] = await db.select().from(schema.favorites).where(
      and(eq(schema.favorites.userId, user.id), eq(schema.favorites.kind, kind), eq(schema.favorites.refId, refId))
    );
    if (existing) {
      await db.delete(schema.favorites).where(eq(schema.favorites.id, existing.id));
      return c.json({ favorited: false }, 200);
    }
    await db.insert(schema.favorites).values({ userId: user.id, kind, refId });
    return c.json({ favorited: true }, 200);
  });
