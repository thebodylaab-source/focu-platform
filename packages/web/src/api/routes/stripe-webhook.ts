import { Hono } from "hono";
import Stripe from "stripe";
import { db } from "../database";
import * as schema from "../database/schema";
import { user } from "../database/auth-schema";
import { eq } from "drizzle-orm";

// Lazy init para evitar falha no import quando as env vars não existem.
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-05-28.basil" });
  }
  return _stripe;
}

const norm = (e?: string | null) => (e ? e.trim().toLowerCase() : "");

export const stripeWebhookRoute = new Hono().post("/", async (c) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = c.req.header("stripe-signature");
  const body = await c.req.text();

  // SEGURANÇA: sem secret configurado OU sem assinatura, RECUSAMOS.
  // (Antes, sem secret, aceitava-se qualquer JSON — permitia forjar pagamentos.)
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET não configurado — webhook recusado.");
    return c.json({ error: "Webhook não configurado." }, 500);
  }
  if (!sig) {
    return c.json({ error: "Assinatura em falta." }, 400);
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    // DEBUG TEMPORÁRIO: regista o que o container vê, para diagnosticar o 400.
    try {
      const { createClient } = await import("@libsql/client");
      const dbg = createClient({ url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN });
      const fp = `secret=${webhookSecret.slice(0, 12)}...${webhookSecret.slice(-4)} len=${webhookSecret.length} bodylen=${body.length} err=${err.message}`;
      await dbg.execute("CREATE TABLE IF NOT EXISTS _wh_debug (id integer primary key autoincrement, ts text, info text)");
      await dbg.execute({ sql: "INSERT INTO _wh_debug (ts, info) VALUES (?, ?)", args: [new Date().toISOString(), fp] });
    } catch { /* ignore */ }
    console.error("Assinatura de webhook inválida:", err.message);
    return c.json({ error: "Assinatura inválida" }, 400);
  }

  // Marca o email como pago (fonte de verdade) e ativa a conta se já existir.
  const grantAccess = async (
    email: string | null | undefined,
    opts: { stripeCustomerId?: string | null; plan?: string | null } = {}
  ) => {
    const e = norm(email);
    if (!e) return;
    await db
      .insert(schema.paidCustomers)
      .values({ email: e, stripeCustomerId: opts.stripeCustomerId ?? null, plan: opts.plan ?? null, paidAt: new Date() })
      .onConflictDoUpdate({
        target: schema.paidCustomers.email,
        set: { stripeCustomerId: opts.stripeCustomerId ?? null, plan: opts.plan ?? null, paidAt: new Date() },
      });
    const [existing] = await db.select().from(user).where(eq(user.email, e));
    if (existing && existing.role !== "admin") {
      await db.update(user).set({ role: "member" }).where(eq(user.email, e));
    }
    console.log(`✅ Acesso concedido: ${e}`);
  };

  // Revoga o acesso (cancelamento) — remove de paid_customers e volta a pending.
  const revokeAccess = async (email: string | null | undefined) => {
    const e = norm(email);
    if (!e) return;
    await db.delete(schema.paidCustomers).where(eq(schema.paidCustomers.email, e));
    const [existing] = await db.select().from(user).where(eq(user.email, e));
    if (existing && existing.role !== "admin") {
      await db.update(user).set({ role: "pending" }).where(eq(user.email, e));
    }
    console.log(`⛔ Acesso revogado: ${e}`);
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status === "paid" || s.status === "complete") {
        await grantAccess(s.customer_email ?? s.customer_details?.email, {
          stripeCustomerId: typeof s.customer === "string" ? s.customer : null,
        });
      }
      break;
    }
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const inv = event.data.object as any;
      await grantAccess(inv.customer_email, {
        stripeCustomerId: typeof inv.customer === "string" ? inv.customer : null,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as any;
      let email: string | null = null;
      try {
        const cust = await getStripe().customers.retrieve(sub.customer);
        email = (cust as any)?.email ?? null;
      } catch {
        /* ignore */
      }
      await revokeAccess(email);
      break;
    }
    default:
      break;
  }

  return c.json({ received: true }, 200);
});
