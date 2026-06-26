import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const membershipRoute = new Hono()
  .get("/me", requireAuth, async (c) => {
    const user = c.get("user")!;
    const [membership] = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, user.id));
    // Auto-create membership on first check
    if (!membership) {
      const [created] = await db.insert(schema.memberships).values({
        userId: user.id,
        status: "active",
        plan: "mensal",
      }).returning();
      return c.json({ membership: created }, 200);
    }
    return c.json({ membership }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    const existing = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, user.id));
    if (existing.length > 0) {
      const [updated] = await db.update(schema.memberships).set(body).where(eq(schema.memberships.userId, user.id)).returning();
      return c.json({ membership: updated }, 200);
    }
    const [created] = await db.insert(schema.memberships).values({ userId: user.id, ...body }).returning();
    return c.json({ membership: created }, 201);
  });
