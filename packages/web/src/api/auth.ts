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
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Com RESEND_API_KEY envia email real; sem ela regista no log do servidor
      // (suficiente para o admin ajudar manualmente até configurar o Resend).
      const key = process.env.RESEND_API_KEY;
      if (key) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.EMAIL_FROM ?? "FO.CU <onboarding@resend.dev>",
            to: user.email,
            subject: "Recuperar palavra-passe — FO.CU",
            html: `<p>Olá${user.name ? ` ${user.name}` : ""},</p>
<p>Recebemos um pedido para repor a tua palavra-passe na FO.CU.</p>
<p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#E8590C;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold">Repor palavra-passe</a></p>
<p>Se não foste tu, ignora este email — a tua conta continua segura.</p>`,
          }),
        });
        if (!res.ok) console.error("Falha ao enviar email de reset:", await res.text());
      } else {
        console.log(`🔑 Reset de password pedido para ${user.email}: ${url}`);
      }
    },
  },
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
