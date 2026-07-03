import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { user } from "../database/auth-schema";
import { eq, like, or, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

// Middleware: admin only
const requireAdmin = requireAuth; // role check is inside

export const adminRoute = new Hono()
  // GET /api/admin/users — list users (pesquisa + paginação)
  .get("/users", requireAdmin, async (c) => {
    const me = c.get("user")!;
    if (me.role !== "admin") return c.json({ error: "Forbidden" }, 403);
    const q = (c.req.query("q") ?? "").trim();
    const page = Math.max(1, parseInt(c.req.query("page") ?? "1") || 1);
    const pageSize = Math.min(100, Math.max(10, parseInt(c.req.query("limit") ?? "50") || 50));

    const where = q ? or(like(user.name, `%${q}%`), like(user.email, `%${q}%`)) : undefined;
    const users = await db
      .select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt })
      .from(user)
      .where(where)
      .orderBy(desc(user.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(user).where(where);
    return c.json({ users, total: count, page, pageSize });
  })
  // GET /api/admin/stats — métricas para o dashboard admin
  .get("/stats", requireAdmin, async (c) => {
    const me = c.get("user")!;
    if (me.role !== "admin") return c.json({ error: "Forbidden" }, 403);
    const now = Date.now();
    const d7 = new Date(now - 7 * 86400_000);
    const d30 = new Date(now - 30 * 86400_000);
    const all = await db.select({ role: user.role, createdAt: user.createdAt }).from(user);
    const stats = {
      total: all.length,
      members: all.filter((u) => u.role === "member").length,
      pending: all.filter((u) => u.role === "pending").length,
      admins: all.filter((u) => u.role === "admin").length,
      new7d: all.filter((u) => u.createdAt && u.createdAt >= d7).length,
      new30d: all.filter((u) => u.createdAt && u.createdAt >= d30).length,
    };
    return c.json({ stats });
  })
  // GET /api/admin/audit — últimas ações de administração
  .get("/audit", requireAdmin, async (c) => {
    const me = c.get("user")!;
    if (me.role !== "admin") return c.json({ error: "Forbidden" }, 403);
    const logs = await db.select().from(schema.adminAuditLog)
      .orderBy(desc(schema.adminAuditLog.createdAt))
      .limit(50);
    return c.json({ logs });
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
    // Um admin não se pode despromover a si próprio (evita lockout do painel).
    if (id === me.id && role !== "admin") {
      return c.json({ error: "Não podes remover o teu próprio acesso de admin." }, 400);
    }
    const [before] = await db.select().from(user).where(eq(user.id, id));
    if (!before) return c.json({ error: "Utilizador não encontrado" }, 404);
    const [updated] = await db.update(user).set({ role }).where(eq(user.id, id)).returning();
    await db.insert(schema.adminAuditLog).values({
      adminId: me.id,
      adminName: me.name ?? me.email,
      targetUserId: id,
      targetEmail: before.email,
      action: `role: ${before.role} → ${role}`,
    });
    return c.json({ user: updated });
  });
