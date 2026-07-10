import { describe, expect, test } from "bun:test";
import { PHASES, computeCycle } from "./cycle";
import type { PhaseId } from "../../shared/cycle-core";

const CATEGORIES = ["Todos", "Semana 1", "Semana 2", "Semana 3", "Semana 4", "Aquecimento", "Glúteos", "Core", "Bónus"];
const ALL: PhaseId[] = ["menstrual", "folicular", "ovulacao", "lutea"];

describe("PHASES — conteúdo completo por fase", () => {
  for (const id of ALL) {
    const p = PHASES[id];
    test(`${id} tem todo o conteúdo obrigatório`, () => {
      expect(p.label.length).toBeGreaterThan(0);
      expect(p.training.text.length).toBeGreaterThan(0);
      expect(p.nutrition.text.length).toBeGreaterThan(0);
      expect(p.whatsHappening.length).toBeGreaterThan(0);
      expect(p.energy).toBeGreaterThanOrEqual(1);
      expect(p.energy).toBeLessThanOrEqual(5);
    });
    test(`${id} sugere uma categoria de vídeo válida`, () => {
      expect(CATEGORIES).toContain(p.suggestedCategory);
    });
  }
});

describe("PHASES — regras de negócio", () => {
  test("só a fase lútea ajusta calorias", () => {
    expect(PHASES.lutea.calorieAdjust).toBe(150);
    expect(PHASES.menstrual.calorieAdjust).toBe(0);
    expect(PHASES.folicular.calorieAdjust).toBe(0);
    expect(PHASES.ovulacao.calorieAdjust).toBe(0);
  });
  test("menstruação e lútea têm mensagem tranquilizadora", () => {
    expect(PHASES.menstrual.reassurance).toBeTruthy();
    expect(PHASES.lutea.reassurance).toBeTruthy();
  });
  test("ovulação é o pico de energia", () => {
    expect(PHASES.ovulacao.energy).toBe(5);
  });
});

describe("computeCycle — devolve o conteúdo da fase certa", () => {
  test("dia de menstruação devolve a fase menstrual", () => {
    const r = computeCycle({ lastPeriodStart: "2025-01-01", cycleLength: 28, periodLength: 5 }, "2025-01-02");
    expect(r.phase.id).toBe("menstrual");
  });
});
