import { Hono } from 'hono';
import { cors } from "hono/cors";
import { isAllowedWebOrigin } from "./lib/origins";
import { auth } from "./auth";
import { authMiddleware } from "./middleware/auth";
import { videosRoute } from "./routes/videos";
import { documentsRoute } from "./routes/documents";
import { nutritionRoute } from "./routes/nutrition";
import { recipesRoute } from "./routes/recipes";
import { membershipRoute } from "./routes/membership";
import { stripeWebhookRoute } from "./routes/stripe-webhook";
import { adminRoute } from "./routes/admin";
import { favoritesRoute } from "./routes/favorites";
import { progressRoute } from "./routes/progress";
import { pushRoute } from "./routes/push";
import { cycleRoute } from "./routes/cycle";

// CORS restrito às origens web conhecidas (+ localhost em dev). Apps nativas
// não passam por CORS (é uma proteção de browser), por isso não são afetadas.
const corsMiddleware = cors({
  origin: (origin) => (isAllowedWebOrigin(origin) ? origin : null),
  credentials: true,
  exposeHeaders: ["set-auth-token"],
});

// API sub-app (all under /api/*)
const apiApp = new Hono()
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .use("*", authMiddleware)
  .get("/health", (c) => c.json({ status: "ok" }, 200))
  // Config pública para o frontend (Google, link de pagamento da mensalidade).
  .get("/config", (c) => c.json({
    googleAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    paymentLink: process.env.STRIPE_PAYMENT_LINK ?? "https://buy.stripe.com/14AfZj0jY7mZ5HB4dMfjG00",
    subscriptionLink: process.env.STRIPE_SUBSCRIPTION_LINK ?? null,
  }, 200))
  .route("/videos", videosRoute)
  .route("/documents", documentsRoute)
  .route("/nutrition", nutritionRoute)
  .route("/recipes", recipesRoute)
  .route("/membership", membershipRoute)
  .route("/admin", adminRoute)
  .route("/favorites", favoritesRoute)
  .route("/progress", progressRoute)
  .route("/push", pushRoute)
  .route("/cycle", cycleRoute);

// Root app
const app = new Hono()
  .use(corsMiddleware)
  // Stripe webhook at /webhook/stripe — NO auth, raw body
  .route("/webhook/stripe", stripeWebhookRoute)
  // All API routes under /api
  .route("/api", apiApp);

export type AppType = typeof app;
export default app;
