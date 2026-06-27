FROM oven/bun:1.3.14

WORKDIR /app

# Instala dependências (inclui devDependencies para o build)
COPY package.json bun.lock ./
COPY packages/web/package.json packages/web/
COPY packages/mobile/package.json packages/mobile/
COPY packages/desktop/package.json packages/desktop/
RUN bun install

# Copia o resto do código e compila o frontend
COPY . .
RUN cd packages/web && bun run build

EXPOSE 3000

CMD ["sh", "-c", "cd packages/web && bun src/server.ts"]
