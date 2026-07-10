import { Hono } from "hono";
import Stripe from "stripe";
import { db } from "../database";
import * as schema from "../database/schema";
import { user as userTable } from "../database/auth-schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

let _stripe: Stripe | null = null;
function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-05-28.basil" });
  return _stripe;
}

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
  // Verificação self-service: se o webhook falhou, o utilizador pendente pode
  // pedir uma verificação direta ao Stripe pelo email da conta.
  .post("/verify-payment", requireAuth, async (c) => {
    const user = c.get("user")!;
    if (user.role !== "pending") return c.json({ activated: user.role !== "pending", role: user.role }, 200);
    const email = user.email.trim().toLowerCase();

    const activate = async () => {
      await db.update(userTable).set({ role: "member" }).where(eq(userTable.id, user.id));
      return c.json({ activated: true }, 200);
    };

    // 1) Fonte de verdade local (webhook já registou o pagamento)
    const [paid] = await db.select().from(schema.paidCustomers).where(eq(schema.paidCustomers.email, email));
    if (paid) return activate();

    // 2) Consulta direta ao Stripe (webhook perdido)
    const stripe = getStripe();
    if (stripe) {
      try {
        const charges = await stripe.charges.search({
          query: `billing_details.email:'${email.replace(/'/g, "")}' AND status:'succeeded'`,
          limit: 1,
        });
        if (charges.data.length > 0) {
          await db.insert(schema.paidCustomers)
            .values({ email, paidAt: new Date() })
            .onConflictDoNothing();
          return activate();
        }
      } catch (e) {
        console.error("verify-payment Stripe search error:", e);
      }
    }
    return c.json({ activated: false, message: "Não encontrámos nenhum pagamento com o email " + email + ". Confirma que usaste o mesmo email no pagamento." }, 200);
  })
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json();
    // Só campos permitidos — nunca escrever userId/status arbitrários vindos do cliente.
    const allowed: { plan?: string } = {};
    if (typeof body.plan === "string" && body.plan.length <= 40) allowed.plan = body.plan;

    const existing = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, user.id));
    if (existing.length > 0) {
      const [updated] = await db.update(schema.memberships).set(allowed).where(eq(schema.memberships.userId, user.id)).returning();
      return c.json({ membership: updated }, 200);
    }
    const [created] = await db.insert(schema.memberships).values({ userId: user.id, ...allowed }).returning();
    return c.json({ membership: created }, 201);
  });
