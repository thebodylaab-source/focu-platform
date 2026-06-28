import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { eq } from "drizzle-orm";
import { db } from "./database";
import { paidCustomers } from "./database/schema";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "thebodylaab@gmail.com";

// Verifica se um email já pagou (registado SÓ pelo webhook assinado do Stripe).
async function hasPaid(email: string): Promise<boolean> {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  const [row] = await db.select().from(paidCustomers).where(eq(paidCustomers.email, e));
  return !!row;
}

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.WEBSITE_URL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: (request) => {
    const origin = request?.headers.get("origin");
    return origin ? [origin] : ["*"];
  },
  plugins: [bearer(), expo()],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "pending",
        input: false, // not user-settable
      },
      rgpdConsentAt: {
        type: "date",
        required: false,
        input: false, // definido no servidor, não pelo cliente
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          // admin > pagou (member) > pending. Membro só se houver pagamento real.
          let role = "pending";
          if (userData.email === ADMIN_EMAIL) role = "admin";
          else if (await hasPaid(userData.email)) role = "member";
          // Regista o consentimento RGPD (o registo exige a checkbox no frontend).
          return { data: { ...userData, role, rgpdConsentAt: new Date() } };
        },
      },
    },
  },
});
