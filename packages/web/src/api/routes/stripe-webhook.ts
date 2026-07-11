import { Hono } from "hono";
import Stripe from "stripe";
import { db } from "../database";
import * as schema from "../database/schema";
import { user } from "../database/auth-schema";
import { eq } from "drizzle-orm";
import { extendOneTime } from "../lib/access";

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
    // constructEventAsync (não a versão síncrona): o runtime Bun usa Web Crypto,
    // que é assíncrono. A versão síncrona lança "SubtleCryptoProvider...".
    event = await getStripe().webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Assinatura de webhook inválida:", err.message);
    return c.json({ error: "Assinatura inválida" }, 400);
  }

  // Concede/estende acesso e define a data de expiração conforme o modelo:
  //  - recorrente: expira no fim do período pago (current_period_end)
  //  - avulso: estende +1 mês a partir do prazo atual
  const grantAccess = async (
    email: string | null | undefined,
    opts: { stripeCustomerId?: string | null; recurring?: boolean; periodEnd?: Date | null } = {}
  ) => {
    const e = norm(email);
    if (!e) return;
    const [current] = await db.select().from(schema.paidCustomers).where(eq(schema.paidCustomers.email, e));
    const now = new Date();
    const plan = opts.recurring ? "mensal-recorrente" : "mensal-avulso";
    const expiresAt = opts.recurring
      ? (opts.periodEnd ?? new Date(now.getTime() + 32 * 24 * 60 * 60 * 1000)) // fallback ~1 mês + folga
      : extendOneTime(now, current?.expiresAt);

    await db
      .insert(schema.paidCustomers)
      .values({ email: e, stripeCustomerId: opts.stripeCustomerId ?? null, plan, paidAt: now, expiresAt })
      .onConflictDoUpdate({
        target: schema.paidCustomers.email,
        set: { stripeCustomerId: opts.stripeCustomerId ?? current?.stripeCustomerId ?? null, plan, paidAt: now, expiresAt },
      });
    const [existing] = await db.select().from(user).where(eq(user.email, e));
    if (existing && existing.role !== "admin") {
      await db.update(user).set({ role: "member" }).where(eq(user.email, e));
    }
    console.log(`✅ Acesso concedido (${plan}) a ${e} até ${expiresAt.toISOString()}`);
  };

  // Fim de subscrição — o acesso termina agora (o evento dispara no fim do
  // período pago, por isso "agora" corresponde ao fim do prazo).
  const endSubscription = async (email: string | null | undefined) => {
    const e = norm(email);
    if (!e) return;
    await db.update(schema.paidCustomers).set({ expiresAt: new Date() }).where(eq(schema.paidCustomers.email, e));
    const [existing] = await db.select().from(user).where(eq(user.email, e));
    if (existing && existing.role !== "admin") {
      await db.update(user).set({ role: "pending" }).where(eq(user.email, e));
    }
    console.log(`⛔ Subscrição terminada: ${e}`);
  };

  // Obtém o fim do período de uma subscrição (para a expiração recorrente).
  const periodEndOf = async (subscriptionId?: string | null): Promise<Date | null> => {
    if (!subscriptionId) return null;
    try {
      const sub = await getStripe().subscriptions.retrieve(subscriptionId);
      const end = (sub as any).current_period_end;
      return end ? new Date(end * 1000) : null;
    } catch { return null; }
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.payment_status === "paid" || s.status === "complete") {
        const recurring = s.mode === "subscription";
        const periodEnd = recurring ? await periodEndOf(typeof s.subscription === "string" ? s.subscription : null) : null;
        await grantAccess(s.customer_email ?? s.customer_details?.email, {
          stripeCustomerId: typeof s.customer === "string" ? s.customer : null,
          recurring, periodEnd,
        });
      }
      break;
    }
    case "invoice.paid":
    case "invoice.payment_succeeded": {
      const inv = event.data.object as any;
      // Fatura de subscrição → renovação recorrente; estende até ao fim do período.
      const periodEnd = await periodEndOf(typeof inv.subscription === "string" ? inv.subscription : null);
      await grantAccess(inv.customer_email, {
        stripeCustomerId: typeof inv.customer === "string" ? inv.customer : null,
        recurring: true, periodEnd,
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
      await endSubscription(email);
      break;
    }
    default:
      break;
  }

  return c.json({ received: true }, 200);
});
