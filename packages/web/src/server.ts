// Diagnóstico de arranque: escreve o progresso na BD (que conseguimos ler),
// para detetar onde o container falha quando os logs de runtime não aparecem.
import { createClient } from "@libsql/client";

async function diag(msg: string) {
  try {
    const c = createClient({
      url: process.env.DATABASE_URL!,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
    await c.execute(
      "CREATE TABLE IF NOT EXISTS _boot_diag (id integer primary key autoincrement, ts text, msg text)"
    );
    await c.execute({
      sql: "INSERT INTO _boot_diag (ts, msg) VALUES (?, ?)",
      args: [new Date().toISOString(), msg.slice(0, 1000)],
    });
  } catch {
    /* sem BD não há como reportar */
  }
}

const distDir = `${import.meta.dir}/../dist`;
const indexPath = `${distDir}/index.html`;

function getStaticFilePath(pathname: string) {
  const cleanPath = decodeURIComponent(pathname)
    .replace(/^\/+/, "")
    .replaceAll("..", "");
  return cleanPath ? `${distDir}/${cleanPath}` : indexPath;
}

try {
  await diag(`booting; PORT=${process.env.PORT ?? "(none)"}`);
  const { default: app } = await import("./api");
  await diag("api importada com sucesso");

  const port = Number(process.env.PORT ?? 3000);
  const server = Bun.serve({
    port,
    hostname: "0.0.0.0",
    async fetch(request) {
      const url = new URL(request.url);
      if (url.pathname === "/healthz") {
        return new Response("ok", { status: 200 });
      }
      if (url.pathname.startsWith("/api")) {
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
      return new Response("Build output not found.", { status: 500 });
    },
  });

  await diag(`a servir na porta ${server.port}`);
  console.log(`Web server listening on port ${server.port}`);
} catch (e: any) {
  await diag(`CRASH: ${e?.stack || e?.message || String(e)}`);
  console.error("Boot crash:", e);
  throw e;
}
