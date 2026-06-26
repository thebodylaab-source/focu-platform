import { Hono } from "hono";
import { db } from "../database";
import { user } from "../database/auth-schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

// Middleware: admin only
const requireAdmin = requireAuth; // role check is inside

export const adminRoute = new Hono()
  // GET /api/admin/users — list all users
  .get("/users", requireAdmin, async (c) => {
    const me = c.get("user")!;
    if (me.role !== "admin") return c.json({ error: "Forbidden" }, 403);
    const users = await db
      .select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
      .from(user)
      .orderBy(user.createdAt);
    return c.json({ users });
  })
  // PATCH /api/admin/users/:id — change role
  .patch("/users/:id", requireAdmin, async (c) => {
    const me = c.get("user")!;
    if (me.role !== "admin") return c.json({ error: "Forbidden" }, 403);
    const { id } = c.req.param();
    const { role } = await c.req.json<{ role: string }>();
    if (!["admin", "member", "pending"].includes(role)) {
      return c.json({ error: "Invalid role" }, 400);
    }
    const [updated] = await db.update(user).set({ role }).where(eq(user.id, id)).returning();
    return c.json({ user: updated });
  });
