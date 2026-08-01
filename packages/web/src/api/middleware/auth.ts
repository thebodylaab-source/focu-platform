import { createMiddleware } from "hono/factory";
import { auth } from "../auth";

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  return next();
});

export const requireAuth = createMiddleware(async (c, next) => {
  if (!c.get("user")) return c.json({ message: "Unauthorized" }, 401);
  return next();
});

export const requireAdmin = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  if ((user as any).role !== "admin") return c.json({ message: "Forbidden" }, 403);
  return next();
});

// Exige acesso pago: role "member" ou "admin". Utilizadores "pending"
// (registados mas sem pagamento válido) são recusados — isto garante o
// paywall ao nível da API, não só no frontend.
export const requireMember = createMiddleware(async (c, next) => {
  const user = c.get("user");
  if (!user) return c.json({ message: "Unauthorized" }, 401);
  const role = (user as any).role;
  if (role !== "member" && role !== "admin") {
    return c.json({ message: "Acesso pendente — pagamento necessário." }, 403);
  }
  return next();
});
