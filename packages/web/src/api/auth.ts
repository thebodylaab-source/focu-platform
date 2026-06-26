import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { db } from "./database";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "thebodylaab@gmail.com";

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
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (userData) => {
          const role = userData.email === ADMIN_EMAIL ? "admin" : "pending";
          return { data: { ...userData, role } };
        },
      },
    },
  },
});
