// Lógica pura do ciclo menstrual, partilhada entre o servidor (API) e o cliente.
// Sem conteúdo de UI — só o cálculo da fase para uma data.

export type CycleSettings = {
  lastPeriodStart: string; // YYYY-MM-DD
  cycleLength: number;
  periodLength: number;
};

export type PhaseId = "menstrual" | "folicular" | "ovulacao" | "lutea";

export type CycleComputation = {
  phaseId: PhaseId;
  cycleDay: number;
  cycleLength: number;
  ovulationDay: number;
  daysUntilNextPeriod: number;
  nextPeriodDate: string;
};

const MS_DAY = 86400_000;
const atNoon = (isoDate: string) => new Date(isoDate + "T12:00:00");
const toISO = (d: Date) => d.toISOString().split("T")[0];

export function computePhase(settings: CycleSettings, forDate?: string): CycleComputation {
  const cycleLength = Math.max(20, Math.min(45, settings.cycleLength || 28));
  const periodLength = Math.max(2, Math.min(10, settings.periodLength || 5));
  const start = atNoon(settings.lastPeriodStart);
  const today = forDate ? atNoon(forDate) : atNoon(toISO(new Date()));

  const daysSince = Math.floor((today.getTime() - start.getTime()) / MS_DAY);
  const cycleDay = (((daysSince % cycleLength) + cycleLength) % cycleLength) + 1;

  // A fase lútea dura ~14 dias; a ovulação acontece por volta de (ciclo - 14).
  const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);

  let phaseId: PhaseId;
  if (cycleDay <= periodLength) phaseId = "menstrual";
  else if (cycleDay < ovulationDay - 1) phaseId = "folicular";
  else if (cycleDay <= ovulationDay + 1) phaseId = "ovulacao";
  else phaseId = "lutea";

  const daysUntilNextPeriod = cycleLength - cycleDay + 1;
  const next = new Date(today.getTime() + daysUntilNextPeriod * MS_DAY);

  return { phaseId, cycleDay, cycleLength, ovulationDay, daysUntilNextPeriod, nextPeriodDate: toISO(next) };
}

// Dias em que descansar NÃO deve quebrar o streak: menstruação e os 2 dias
// antes do período (fase lútea tardia, quando a energia está no fundo).
export function isRestForgiven(settings: CycleSettings, dateStr: string): boolean {
  const c = computePhase(settings, dateStr);
  return c.phaseId === "menstrual" || c.daysUntilNextPeriod <= 2;
}
