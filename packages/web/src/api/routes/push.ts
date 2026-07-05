import { Hono } from "hono";
import webpush from "web-push";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const configured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
if (configured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:thebodylaab@gmail.com",
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export const pushRoute = new Hono()
  // Chave pública para o browser subscrever
  .get("/vapid-public-key", requireAuth, async (c) => {
    if (!configured) return c.json({ error: "Push não configurado" }, 503);
    return c.json({ key: process.env.VAPID_PUBLIC_KEY }, 200);
  })
  // Guarda a subscrição do browser atual
  .post("/subscribe", requireAuth, async (c) => {
    const user = c.get("user")!;
    const sub = await c.req.json();
    if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
      return c.json({ message: "Subscrição inválida" }, 400);
    }
    await db.insert(schema.pushSubscriptions)
      .values({ userId: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
      .onConflictDoUpdate({
        target: schema.pushSubscriptions.endpoint,
        set: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      });
    return c.json({ ok: true }, 201);
  })
  // Remove a subscrição do browser atual
  .post("/unsubscribe", requireAuth, async (c) => {
    const { endpoint } = await c.req.json();
    if (typeof endpoint === "string") {
      await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.endpoint, endpoint));
    }
    return c.json({ ok: true }, 200);
  })
  // Broadcast para todos os dispositivos subscritos (só admin)
  .post("/broadcast", requireAuth, async (c) => {
    const me = c.get("user")!;
    if (me.role !== "admin") return c.json({ error: "Forbidden" }, 403);
    if (!configured) return c.json({ error: "Push não configurado" }, 503);

    const { title, body, url } = await c.req.json();
    if (!title || typeof title !== "string") return c.json({ message: "Título obrigatório" }, 400);

    const subs = await db.select().from(schema.pushSubscriptions);
    const payload = JSON.stringify({ title, body: body ?? "", url: url ?? "/" });
    let sent = 0, removed = 0;
    await Promise.all(subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        // 404/410 = subscrição morta; limpa da base
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await db.delete(schema.pushSubscriptions).where(eq(schema.pushSubscriptions.id, s.id));
          removed++;
        }
      }
    }));
    return c.json({ sent, removed, total: subs.length }, 200);
  });
