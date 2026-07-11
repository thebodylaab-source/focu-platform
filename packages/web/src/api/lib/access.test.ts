import { describe, expect, test } from "bun:test";
import { extendOneTime, isAccessValid, MONTH_MS } from "./access";

describe("extendOneTime — pagamento avulso estende +30 dias", () => {
  const now = new Date("2025-01-10T12:00:00Z");
  test("sem prazo atual → +30 dias a partir de agora", () => {
    expect(extendOneTime(now, null).getTime()).toBe(now.getTime() + MONTH_MS);
  });
  test("prazo já expirado → +30 dias a partir de agora (não do passado)", () => {
    const expired = new Date("2024-12-01T00:00:00Z");
    expect(extendOneTime(now, expired).getTime()).toBe(now.getTime() + MONTH_MS);
  });
  test("prazo ainda válido → estende a partir do prazo (não perde dias)", () => {
    const future = new Date("2025-01-20T12:00:00Z");
    expect(extendOneTime(now, future).getTime()).toBe(future.getTime() + MONTH_MS);
  });
});

describe("isAccessValid — acesso dentro do prazo", () => {
  const now = new Date("2025-06-15T00:00:00Z");
  test("sem expiração (legado/vitalício) → válido", () => {
    expect(isAccessValid(null, now)).toBe(true);
    expect(isAccessValid(undefined, now)).toBe(true);
  });
  test("prazo no futuro → válido", () => {
    expect(isAccessValid(new Date("2025-07-01T00:00:00Z"), now)).toBe(true);
  });
  test("prazo no passado → inválido (expirado)", () => {
    expect(isAccessValid(new Date("2025-06-14T23:59:00Z"), now)).toBe(false);
  });
});
