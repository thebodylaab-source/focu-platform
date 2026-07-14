import { describe, expect, test } from "bun:test";
import { computePhase, isRestForgiven, averageCycleAndPeriodLengths, type CycleSettings, type PeriodRecord } from "./cycle-core";

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

describe("averageCycleAndPeriodLengths — histórico de ciclos", () => {
  test("sem histórico devolve null nos dois", () => {
    const r = averageCycleAndPeriodLengths([]);
    expect(r.avgCycleLength).toBeNull();
    expect(r.avgPeriodLength).toBeNull();
    expect(r.cycleCount).toBe(0);
    expect(r.periodCount).toBe(0);
  });

  test("1 ciclo fechado dá a duração da menstruação mas não a do ciclo (precisa de 2 inícios)", () => {
    const rows: PeriodRecord[] = [{ startDate: "2025-01-01", endDate: "2025-01-05" }];
    const r = averageCycleAndPeriodLengths(rows);
    expect(r.avgPeriodLength).toBe(5); // 1 a 5 = 5 dias
    expect(r.avgCycleLength).toBeNull();
    expect(r.periodCount).toBe(1);
    expect(r.cycleCount).toBe(0);
  });

  test("2 ciclos consecutivos calculam a média da duração do ciclo", () => {
    const rows: PeriodRecord[] = [
      { startDate: "2025-01-01", endDate: "2025-01-05" },
      { startDate: "2025-01-29", endDate: "2025-02-02" }, // 28 dias depois
    ];
    const r = averageCycleAndPeriodLengths(rows);
    expect(r.avgCycleLength).toBe(28);
    expect(r.avgPeriodLength).toBe(5); // média de 5 e 5
    expect(r.cycleCount).toBe(1);
    expect(r.periodCount).toBe(2);
  });

  test("ciclo em aberto (sem endDate) não entra na média de duração da menstruação", () => {
    const rows: PeriodRecord[] = [
      { startDate: "2025-01-01", endDate: "2025-01-05" },
      { startDate: "2025-01-29", endDate: null },
    ];
    const r = averageCycleAndPeriodLengths(rows);
    expect(r.avgPeriodLength).toBe(5);
    expect(r.periodCount).toBe(1);
    // mas conta para a média da duração do ciclo (só precisa da data de início)
    expect(r.avgCycleLength).toBe(28);
  });

  test("usa só os últimos 6 ciclos, não distorce com histórico muito antigo", () => {
    // 8 ciclos de 30 dias seguidos de 1 anómalo de 20 — a média dos últimos 6 deve ignorar os 2 primeiros de 30.
    const rows: PeriodRecord[] = [];
    let d = new Date("2025-01-01T12:00:00");
    for (let i = 0; i < 8; i++) {
      rows.push({ startDate: d.toISOString().split("T")[0], endDate: null });
      d = new Date(d.getTime() + 30 * 86400_000);
    }
    const r = averageCycleAndPeriodLengths(rows, 6);
    expect(r.avgCycleLength).toBe(30);
    expect(r.cycleCount).toBe(6);
  });

  test("valores fora do intervalo plausível são limitados (clamp)", () => {
    const rows: PeriodRecord[] = [
      { startDate: "2025-01-01", endDate: "2025-01-01" }, // 1 dia -> clamp para 2
      { startDate: "2025-02-01", endDate: null }, // ciclo de 31 dias, dentro do limite
    ];
    const r = averageCycleAndPeriodLengths(rows);
    expect(r.avgPeriodLength).toBe(2); // clamped ao mínimo
  });
});
