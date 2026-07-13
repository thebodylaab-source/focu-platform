import app from "./api";
import { reconcileExpirations } from "./api/lib/access";
import { auth } from "./api/auth";
import { addSocket, removeSocket, type WsData } from "./api/chat/hub";

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

const server = Bun.serve<WsData, {}>({
  port,
  hostname: "0.0.0.0",
  async fetch(request, server) {
    const url = new URL(request.url);

    // Healthcheck simples — responde sem tocar na API/auth/BD.
    if (url.pathname === "/healthz") {
      return new Response("ok", { status: 200 });
    }

    // WebSocket do chat: autentica pelo token na query e faz upgrade.
    if (url.pathname === "/ws") {
      const token = url.searchParams.get("token") ?? "";
      const session = await auth.api.getSession({ headers: new Headers({ Authorization: `Bearer ${token}` }) });
      const u = session?.user;
      if (!u) return new Response("Unauthorized", { status: 401 });
      const ok = server.upgrade(request, { data: { userId: u.id, name: u.name ?? "Aluna", role: (u as any).role ?? "member" } });
      return ok ? undefined : new Response("Upgrade failed", { status: 400 });
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
  websocket: {
    open(ws) { addSocket(ws); },
    close(ws) { removeSocket(ws); },
    // O envio de mensagens é feito por REST (POST /api/chat/...); o WS só
    // serve para receber ao vivo. Respondemos a "ping" para manter viva a ligação.
    message(ws, msg) { if (msg === "ping") ws.send("pong"); },
  },
});

console.log(`Web server listening on port ${server.port}`);

function getStaticFilePath(pathname: string) {
  const cleanPath = decodeURIComponent(pathname)
    .replace(/^\/+/, "")
    .replaceAll("..", "");

  return cleanPath ? `${distDir}/${cleanPath}` : indexPath;
}
