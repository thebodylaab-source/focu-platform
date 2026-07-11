import app from "./api";
import { reconcileExpirations } from "./api/lib/access";

// Reconciliação de expirações: despromove membros expirados e repromove
// pendentes renovados. Corre no arranque e depois de hora a hora.
async function runReconcile() {
  try {
    const r = await reconcileExpirations();
    if (r.downgraded || r.upgraded) console.log(`🔄 Reconciliação de acesso: -${r.downgraded} +${r.upgraded}`);
  } catch (e) {
    console.error("Erro na reconciliação de expirações:", e);
  }
}
runReconcile();
setInterval(runReconcile, 60 * 60 * 1000);

const port = Number(process.env.PORT ?? 3000);
const distDir = `${import.meta.dir}/../dist`;
const indexPath = `${distDir}/index.html`;

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(request) {
    const url = new URL(request.url);

    // Healthcheck simples — responde sem tocar na API/auth/BD.
    if (url.pathname === "/healthz") {
      return new Response("ok", { status: 200 });
    }

    // API e webhooks (Stripe) são tratados pelo Hono. O webhook do Stripe vive
    // em /webhook/stripe (fora de /api), por isso tem de ser encaminhado também.
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/webhook")) {
      return app.fetch(request);
    }

    const filePath = getStaticFilePath(url.pathname);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    const index = Bun.file(indexPath);
    if (await index.exists()) {
      return new Response(index, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response("Build output not found. Run `bun run build` first.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  },
});

console.log(`Web server listening on port ${server.port}`);

function getStaticFilePath(pathname: string) {
  const cleanPath = decodeURIComponent(pathname)
    .replace(/^\/+/, "")
    .replaceAll("..", "");

  return cleanPath ? `${distDir}/${cleanPath}` : indexPath;
}
