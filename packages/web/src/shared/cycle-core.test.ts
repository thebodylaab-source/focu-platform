import { describe, expect, test } from "bun:test";
import { computePhase, isRestForgiven, type CycleSettings } from "./cycle-core";

// Ciclo-base: 28 dias, 5 de menstruação, a começar em 2025-01-01.
// Datas explícitas → testes determinísticos e independentes do fuso/hoje.
const base: CycleSettings = { lastPeriodStart: "2025-01-01", cycleLength: 28, periodLength: 5 };

describe("computePhase — fases num ciclo de 28 dias", () => {
  const cases: [string, string, number][] = [
    ["2025-01-01", "menstrual", 1],
    ["2025-01-05", "menstrual", 5],
    ["2025-01-06", "folicular", 6],
    ["2025-01-12", "folicular", 12],
    ["2025-01-13", "ovulacao", 13],
    ["2025-01-14", "ovulacao", 14],
    ["2025-01-15", "ovulacao", 15],
    ["2025-01-16", "lutea", 16],
    ["2025-01-28", "lutea", 28],
  ];
  for (const [date, phase, day] of cases) {
    test(`${date} → ${phase} (dia ${day})`, () => {
      const r = computePhase(base, date);
      expect(r.phaseId).toBe(phase as any);
      expect(r.cycleDay).toBe(day);
    });
  }
});

describe("computePhase — o ciclo repete-se", () => {
  test("28 dias depois volta ao dia 1 (menstruação)", () => {
    const r = computePhase(base, "2025-01-29");
    expect(r.cycleDay).toBe(1);
    expect(r.phaseId).toBe("menstrual");
  });
  test("dois ciclos depois continua no dia 1", () => {
    const r = computePhase(base, "2025-02-26"); // 56 dias depois
    expect(r.cycleDay).toBe(1);
  });
});

describe("computePhase — previsão da próxima menstruação", () => {
  test("no dia 1, faltam 28 dias e a data é +28", () => {
    const r = computePhase(base, "2025-01-01");
    expect(r.daysUntilNextPeriod).toBe(28);
    expect(r.nextPeriodDate).toBe("2025-01-29");
  });
  test("no dia 28, falta 1 dia", () => {
    const r = computePhase(base, "2025-01-28");
    expect(r.daysUntilNextPeriod).toBe(1);
  });
});

describe("isRestForgiven — descanso protegido", () => {
  test("dias de menstruação são protegidos", () => {
    expect(isRestForgiven(base, "2025-01-03")).toBe(true);
  });
  test("2 dias antes do período são protegidos (lútea tardia)", () => {
    expect(isRestForgiven(base, "2025-01-27")).toBe(true); // dia 27, faltam 2
    expect(isRestForgiven(base, "2025-01-28")).toBe(true); // dia 28, falta 1
  });
  test("fase folicular NÃO é protegida", () => {
    expect(isRestForgiven(base, "2025-01-10")).toBe(false);
  });
  test("meio da fase lútea NÃO é protegido", () => {
    expect(isRestForgiven(base, "2025-01-20")).toBe(false); // dia 20, faltam 9
  });
});

describe("computePhase — valores fora do intervalo são limitados", () => {
  test("ciclo demasiado curto sobe para 20", () => {
    const r = computePhase({ lastPeriodStart: "2025-01-01", cycleLength: 5, periodLength: 5 }, "2025-01-01");
    expect(r.cycleLength).toBe(20);
  });
  test("ciclo demasiado longo desce para 45", () => {
    const r = computePhase({ lastPeriodStart: "2025-01-01", cycleLength: 99, periodLength: 5 }, "2025-01-01");
    expect(r.cycleLength).toBe(45);
  });
});
