import { Hono } from "hono";
import Stripe from "stripe";
import { db } from "../database";
import { user } from "../database/auth-schema";
import { eq } from "drizzle-orm";

// Lazy init to avoid module-level failure when env vars not available at import time
let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-05-28.basil" });
  }
  return _stripe;
}

export const stripeWebhookRoute = new Hono().post("/", async (c) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature");

  let event: Stripe.Event;

  if (webhookSecret && sig) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature failed:", err.message);
      return c.json({ error: "Invalid signature" }, 400);
    }
  } else {
    // No secret configured — parse raw (dev/testing only)
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }
  }

  const activateByEmail = async (email: string | null | undefined) => {
    if (!email) return;
    const [existing] = await db.select().from(user).where(eq(user.email, email));
    if (!existing) {
      console.log(`Stripe webhook: no user found for ${email}`);
      return;
    }
    if (existing.role === "admin") return; // never downgrade admin
    await db.update(user).set({ role: "member" }).where(eq(user.email, email));
    console.log(`✅ Activated member: ${email}`);
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await activateByEmail(session.customer_email ?? session.customer_details?.email);
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      await activateByEmail((invoice as any).customer_email);
      break;
    }
    case "customer.subscription.deleted":
    case "invoice.payment_failed": {
      // Optionally downgrade to pending — uncomment if needed
      // const obj = event.data.object as any;
      // const email = obj.customer_email;
      // if (email) await db.update(user).set({ role: "pending" }).where(eq(user.email, email));
      break;
    }
    default:
      break;
  }

  return c.json({ received: true }, 200);
});
