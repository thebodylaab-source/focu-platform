import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { user } from "../database/auth-schema";
import { eq, like, or, desc, sql, gte } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";
import { extendOneTime } from "../lib/access";

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
  // GET /api/admin/metrics — séries temporais para o dashboard de métricas
  .get("/metrics", requireAdmin, async (c) => {
    const me = c.get("user")!;
    if (me.role !== "admin") return c.json({ error: "Forbidden" }, 403);

    const days = 30;
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);
    const sinceStr = since.toISOString().split("T")[0];

    const [allUsers, logs, checkins, pushSubs] = await Promise.all([
      db.select({ createdAt: user.createdAt }).from(user),
      db.select({ logDate: schema.foodLogs.logDate, userId: schema.foodLogs.userId }).from(schema.foodLogs)
        .where(gte(schema.foodLogs.logDate, sinceStr)),
      db.select({ checkinDate: schema.workoutCheckins.checkinDate, userId: schema.workoutCheckins.userId }).from(schema.workoutCheckins)
        .where(gte(schema.workoutCheckins.checkinDate, sinceStr)),
      db.select({ id: schema.pushSubscriptions.id }).from(schema.pushSubscriptions),
    ]);

    const dayKeys = Array.from({ length: days }, (_, i) => {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      return d.toISOString().split("T")[0];
    });

    const series = dayKeys.map((day) => ({
      day,
      signups: allUsers.filter((u) => u.createdAt && u.createdAt.toISOString().split("T")[0] === day).length,
      foodLogs: logs.filter((l) => l.logDate === day).length,
      checkins: checkins.filter((ch) => ch.checkinDate === day).length,
    }));

    // Utilizadores ativos: com registo de comida ou treino nos últimos 7 dias
    const d7 = dayKeys.slice(-7);
    const activeSet = new Set<string>();
    for (const l of logs) if (d7.includes(l.logDate)) activeSet.add(l.userId);
    for (const ch of checkins) if (d7.includes(ch.checkinDate)) activeSet.add(ch.userId);

    return c.json({
      series,
      active7d: activeSet.size,
      pushSubscribers: pushSubs.length,
    });
  })
  // POST /api/admin/broadcast — envia push a todos (delegado na rota /push)
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
  })
  // GET /api/admin/paid-emails — acessos concedidos (inclui pagamentos fora da plataforma)
  .get("/paid-emails", requireAdmin, async (c) => {
    const me = c.get("user")!;
    if (me.role !== "admin") return c.json({ error: "Forbidden" }, 403);
    const rows = await db.select().from(schema.paidCustomers).orderBy(desc(schema.paidCustomers.paidAt));
    // Junta o estado da conta (se existe e o role atual) por email.
    const emails = rows.map((r) => r.email);
    const accounts = emails.length
      ? await db.select({ email: user.email, role: user.role }).from(user)
      : [];
    const roleByEmail = new Map(accounts.map((a) => [a.email.trim().toLowerCase(), a.role]));
    const customers = rows.map((r) => ({
      email: r.email,
      plan: r.plan,
      paidAt: r.paidAt,
      expiresAt: r.expiresAt,
      accountRole: roleByEmail.get(r.email.trim().toLowerCase()) ?? null, // null = ainda sem conta
    }));
    return c.json({ customers });
  })
  // POST /api/admin/paid-emails — autoriza um email (pagamento fora da plataforma)
  .post("/paid-emails", requireAdmin, async (c) => {
    const me = c.get("user")!;
    if (me.role !== "admin") return c.json({ error: "Forbidden" }, 403);
    const body = await c.req.json<{ email?: string; duration?: string }>().catch(() => ({}));
    const email = (body?.email ?? "").trim().toLowerCase();
    if (!email || !email.includes("@")) return c.json({ error: "Email inválido" }, 400);
    const now = new Date();
    const lifetime = body?.duration === "lifetime";
    const expiresAt = lifetime ? null : extendOneTime(now, null); // 1 mês por defeito

    const [existing] = await db.select().from(schema.paidCustomers).where(eq(schema.paidCustomers.email, email));
    if (existing) {
      await db.update(schema.paidCustomers).set({ plan: "manual", paidAt: now, expiresAt }).where(eq(schema.paidCustomers.email, email));
    } else {
      await db.insert(schema.paidCustomers).values({ email, plan: "manual", paidAt: now, expiresAt });
    }

    // Se já existe uma conta com este email e está pendente, ativa-a já.
    const [u] = await db.select().from(user).where(eq(user.email, email));
    let promoted = false;
    if (u && u.role === "pending") {
      await db.update(user).set({ role: "member" }).where(eq(user.id, u.id));
      promoted = true;
    }
    await db.insert(schema.adminAuditLog).values({
      adminId: me.id,
      adminName: me.name ?? me.email,
      targetUserId: u?.id ?? "-",
      targetEmail: email,
      action: `acesso manual concedido (${lifetime ? "vitalício" : "1 mês"})${promoted ? " + ativado" : u ? "" : " (ainda sem conta)"}`,
    });
    return c.json({ ok: true, promoted, hasAccount: !!u });
  })
  // DELETE /api/admin/paid-emails/:email — revoga o acesso de um email
  .delete("/paid-emails/:email", requireAdmin, async (c) => {
    const me = c.get("user")!;
    if (me.role !== "admin") return c.json({ error: "Forbidden" }, 403);
    const email = decodeURIComponent(c.req.param("email")).trim().toLowerCase();
    await db.delete(schema.paidCustomers).where(eq(schema.paidCustomers.email, email));
    // Se há uma conta membro com este email (nunca admin), volta a pendente.
    const [u] = await db.select().from(user).where(eq(user.email, email));
    let downgraded = false;
    if (u && u.role === "member") {
      await db.update(user).set({ role: "pending" }).where(eq(user.id, u.id));
      downgraded = true;
    }
    await db.insert(schema.adminAuditLog).values({
      adminId: me.id,
      adminName: me.name ?? me.email,
      targetUserId: u?.id ?? "-",
      targetEmail: email,
      action: `acesso revogado${downgraded ? " + despromovido a pendente" : ""}`,
    });
    return c.json({ ok: true, downgraded });
  });
