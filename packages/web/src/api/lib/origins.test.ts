import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { isAllowedWebOrigin, isTrustedOrigin } from "./origins";

describe("isAllowedWebOrigin — CORS de browser", () => {
  test("permite os domínios de produção", () => {
    expect(isAllowedWebOrigin("https://www.focu.pt")).toBe(true);
    expect(isAllowedWebOrigin("https://focu.pt")).toBe(true);
  });
  test("permite localhost em qualquer porta (dev)", () => {
    expect(isAllowedWebOrigin("http://localhost:3000")).toBe(true);
    expect(isAllowedWebOrigin("http://127.0.0.1:5173")).toBe(true);
  });
  test("BLOQUEIA sites arbitrários", () => {
    expect(isAllowedWebOrigin("https://evil.com")).toBe(false);
    expect(isAllowedWebOrigin("https://focu.pt.evil.com")).toBe(false);
    expect(isAllowedWebOrigin("https://notfocu.pt")).toBe(false);
  });
  test("sem origem → não permitido", () => {
    expect(isAllowedWebOrigin(null)).toBe(false);
    expect(isAllowedWebOrigin(undefined)).toBe(false);
  });
});

describe("isTrustedOrigin — CSRF do better-auth", () => {
  test("aceita as origens web permitidas", () => {
    expect(isTrustedOrigin("https://www.focu.pt")).toBe(true);
    expect(isTrustedOrigin("http://localhost:3000")).toBe(true);
  });
  test("aceita esquemas nativos de app (não http)", () => {
    expect(isTrustedOrigin("focu://callback")).toBe(true);
    expect(isTrustedOrigin("myapp://auth")).toBe(true);
  });
  test("BLOQUEIA sites http(s) desconhecidos", () => {
    expect(isTrustedOrigin("https://evil.com")).toBe(false);
    expect(isTrustedOrigin("http://attacker.example")).toBe(false);
  });
});

describe("WEBSITE_URL do ambiente entra na allowlist", () => {
  const prev = process.env.WEBSITE_URL;
  beforeEach(() => { process.env.WEBSITE_URL = "https://focu-web.up.railway.app/"; });
  afterEach(() => { if (prev === undefined) delete process.env.WEBSITE_URL; else process.env.WEBSITE_URL = prev; });

  test("o domínio configurado é permitido (barra final ignorada)", () => {
    expect(isAllowedWebOrigin("https://focu-web.up.railway.app")).toBe(true);
  });
});
