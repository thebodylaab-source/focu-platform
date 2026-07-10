import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { eq } from "drizzle-orm";
import { db } from "./database";
import { paidCustomers } from "./database/schema";
import { allowedWebOrigins, isTrustedOrigin } from "./lib/origins";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "thebodylaab@gmail.com";

// Verifica se um email já pagou (registado SÓ pelo webhook assinado do Stripe).
async function hasPaid(email: string): Promise<boolean> {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) return false;
  const [row] = await db.select().from(paidCustomers).where(eq(paidCustomers.email, e));
  return !!row;
}

const escapeHtml = (s: string) =>
  (s ?? "").replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[ch] as string));

// Envia um email via Resend. Sem RESEND_API_KEY, regista o link no log do
// servidor (suficiente para o admin ajudar até o Resend estar configurado).
async function sendEmail(to: string, subject: string, html: string, logLabel: string, logUrl: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`✉️ ${logLabel} para ${to}: ${logUrl}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "FO.CU <onboarding@resend.dev>", to, subject, html }),
  });
  if (!res.ok) console.error(`Falha ao enviar email (${logLabel}):`, await res.text());
}

export const auth = betterAuth({
  basePath: "/api/auth",
  baseURL: process.env.WEBSITE_URL,
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    // #1: exige confirmação de email antes de entrar — fecha o bypass de
    // pagamento (registar com o email de outra pessoa que pagou).
    // SÓ é obrigatória se houver serviço de email (RESEND_API_KEY): sem ele os
    // links só iriam para o log e ninguém conseguiria confirmar → não bloqueia.
    requireEmailVerification: !!process.env.RESEND_API_KEY,
    sendResetPassword: async ({ user, url }) => {
      const nome = escapeHtml(user.name ?? "");
      await sendEmail(user.email, "Recuperar palavra-passe — FO.CU",
        `<p>Olá${nome ? ` ${nome}` : ""},</p>
<p>Recebemos um pedido para repor a tua palavra-passe na FO.CU.</p>
<p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#E8590C;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold">Repor palavra-passe</a></p>
<p>Se não foste tu, ignora este email — a tua conta continua segura.</p>`,
        "Reset de password", url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const nome = escapeHtml(user.name ?? "");
      await sendEmail(user.email, "Confirma o teu email — FO.CU",
        `<p>Olá${nome ? ` ${nome}` : ""}! 🍑</p>
<p>Bem-vinda à FO.CU. Confirma o teu email para ativares a conta:</p>
<p><a href="${url}" style="display:inline-block;padding:12px 24px;background:#E8590C;color:#fff;border-radius:12px;text-decoration:none;font-weight:bold">Confirmar email</a></p>
<p>Se não foste tu que te registaste, ignora este email.</p>`,
        "Confirmação de email", url);
    },
  },
  secret: process.env.BETTER_AUTH_SECRET,
  // Origens de confiança (CSRF): domínios web conhecidos + a origem do pedido
  // apenas se for de confiança (web permitida ou esquema nativo da app).
  trustedOrigins: (request) => {
    const origins = new Set(allowedWebOrigins());
    const origin = request?.headers.get("origin");
    if (isTrustedOrigin(origin)) origins.add(origin!);
    return [...origins];
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
