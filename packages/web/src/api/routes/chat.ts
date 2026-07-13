import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { user } from "../database/auth-schema";
import { and, eq, gt, desc, asc, like, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { publish, publishDm } from "../chat/hub";

const MAX = 1000;
const clean = (b: unknown): string | null => {
  if (typeof b !== "string") return null;
  const t = b.trim();
  return t.length === 0 || t.length > MAX ? null : t;
};

// Mensagens de uma sala: se "after" vier, só as mais recentes que esse id;
// caso contrário, as últimas 50.
async function messagesOf(room: string, after?: number) {
  if (after && Number.isFinite(after)) {
    return db.select().from(schema.chatMessages)
      .where(and(eq(schema.chatMessages.room, room), gt(schema.chatMessages.id, after)))
      .orderBy(asc(schema.chatMessages.id)).limit(200);
  }
  const rows = await db.select().from(schema.chatMessages)
    .where(eq(schema.chatMessages.room, room))
    .orderBy(desc(schema.chatMessages.id)).limit(50);
  return rows.reverse();
}

async function insertMessage(room: string, sender: { id: string; name: string | null; role: string }, body: string) {
  const [msg] = await db.insert(schema.chatMessages).values({
    room, senderId: sender.id, senderName: sender.name ?? "Aluna", senderRole: sender.role === "admin" ? "admin" : "member", body,
  }).returning();
  return { ...msg, room };
}

export const chatRoute = new Hono()
  // --- Comunidade ---
  .get("/community", requireAuth, async (c) => {
    const after = parseInt(c.req.query("after") ?? "");
    return c.json({ messages: await messagesOf("community", after) }, 200);
  })
  .post("/community", requireAuth, async (c) => {
    const u = c.get("user")!;
    const body = clean((await c.req.json()).body);
    if (!body) return c.json({ message: "Mensagem inválida (1–1000 caracteres)." }, 400);
    // Silenciada? (admins nunca são bloqueados)
    if (u.role !== "admin") {
      const [m] = await db.select().from(schema.chatMutes).where(eq(schema.chatMutes.userId, u.id));
      if (m) return c.json({ message: "Foste silenciada na comunidade. Podes na mesma falar com a treinadora." }, 403);
    }
    const msg = await insertMessage("community", u, body);
    publish("community", { type: "message", ...msg });
    return c.json({ message: msg }, 201);
  })
  // --- Conversa privada da aluna com a treinadora ---
  .get("/dm", requireAuth, async (c) => {
    const u = c.get("user")!;
    const after = parseInt(c.req.query("after") ?? "");
    return c.json({ messages: await messagesOf(`dm:${u.id}`, after) }, 200);
  })
  .post("/dm", requireAuth, async (c) => {
    const u = c.get("user")!;
    const body = clean((await c.req.json()).body);
    if (!body) return c.json({ message: "Mensagem inválida." }, 400);
    const room = `dm:${u.id}`;
    const msg = await insertMessage(room, u, body);
    publishDm(room, { type: "message", ...msg });
    return c.json({ message: msg }, 201);
  })
  // --- Admin: caixa de entrada de conversas ---
  .get("/threads", requireAdmin, async (c) => {
    const rows = await db.select().from(schema.chatMessages)
      .where(like(schema.chatMessages.room, "dm:%"))
      .orderBy(desc(schema.chatMessages.id));
    const latest = new Map<string, typeof rows[number]>();
    for (const m of rows) if (!latest.has(m.room)) latest.set(m.room, m);
    const ids = [...latest.keys()].map((r) => r.slice(3));
    const names = ids.length
      ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ids))
      : [];
    const nameById = new Map(names.map((n) => [n.id, n.name]));
    const threads = [...latest.entries()].map(([room, last]) => ({
      userId: room.slice(3),
      name: nameById.get(room.slice(3)) ?? "Aluna",
      lastBody: last.body,
      lastRole: last.senderRole,
      lastAt: last.createdAt,
    }));
    return c.json({ threads }, 200);
  })
  .get("/dm/:userId", requireAdmin, async (c) => {
    const after = parseInt(c.req.query("after") ?? "");
    return c.json({ messages: await messagesOf(`dm:${c.req.param("userId")}`, after) }, 200);
  })
  .post("/dm/:userId", requireAdmin, async (c) => {
    const u = c.get("user")!;
    const body = clean((await c.req.json()).body);
    if (!body) return c.json({ message: "Mensagem inválida." }, 400);
    const room = `dm:${c.req.param("userId")}`;
    const msg = await insertMessage(room, u, body);
    publishDm(room, { type: "message", ...msg });
    return c.json({ message: msg }, 201);
  })
  // --- Moderação (admin) ---
  .delete("/message/:id", requireAdmin, async (c) => {
    const id = parseInt(c.req.param("id"));
    const [msg] = await db.select().from(schema.chatMessages).where(eq(schema.chatMessages.id, id));
    if (!msg) return c.json({ ok: true }, 200);
    await db.delete(schema.chatMessages).where(eq(schema.chatMessages.id, id));
    const event = { type: "delete", id, room: msg.room };
    if (msg.room.startsWith("dm:")) publishDm(msg.room, event); else publish(msg.room, event);
    return c.json({ ok: true }, 200);
  })
  .get("/mutes", requireAdmin, async (c) => {
    const rows = await db.select({ userId: schema.chatMutes.userId }).from(schema.chatMutes);
    return c.json({ muted: rows.map((r) => r.userId) }, 200);
  })
  .post("/mute/:userId", requireAdmin, async (c) => {
    await db.insert(schema.chatMutes).values({ userId: c.req.param("userId") }).onConflictDoNothing();
    return c.json({ ok: true }, 200);
  })
  .delete("/mute/:userId", requireAdmin, async (c) => {
    await db.delete(schema.chatMutes).where(eq(schema.chatMutes.userId, c.req.param("userId")));
    return c.json({ ok: true }, 200);
  });
