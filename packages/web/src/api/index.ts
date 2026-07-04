import { Hono } from 'hono';
import { cors } from "hono/cors";
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

const corsMiddleware = cors({ origin: (origin) => origin ?? "*", credentials: true, exposeHeaders: ["set-auth-token"] });

// API sub-app (all under /api/*)
const apiApp = new Hono()
  .on(["GET", "POST"], "/auth/*", (c) => auth.handler(c.req.raw))
  .use("*", authMiddleware)
  .get("/health", (c) => c.json({ status: "ok" }, 200))
  .route("/videos", videosRoute)
  .route("/documents", documentsRoute)
  .route("/nutrition", nutritionRoute)
  .route("/recipes", recipesRoute)
  .route("/membership", membershipRoute)
  .route("/admin", adminRoute)
  .route("/favorites", favoritesRoute)
  .route("/progress", progressRoute);

// Root app
const app = new Hono()
  .use(corsMiddleware)
  // Stripe webhook at /webhook/stripe — NO auth, raw body
  .route("/webhook/stripe", stripeWebhookRoute)
  // All API routes under /api
  .route("/api", apiApp);

export type AppType = typeof app;
export default app;
