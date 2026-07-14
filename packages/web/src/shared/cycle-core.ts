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

export type PeriodRecord = { startDate: string; endDate: string | null };
export type HistoryAverages = {
  avgCycleLength: number | null; avgPeriodLength: number | null; cycleCount: number; periodCount: number;
};

const dayDiff = (a: string, b: string) => Math.round((atNoon(b).getTime() - atNoon(a).getTime()) / MS_DAY);

// Média dos últimos ciclos registados (histórico de "começou/acabou hoje").
// Usa no máximo os `maxSamples` mais recentes, para a previsão acompanhar
// mudanças recentes sem um único ciclo atípico distorcer tudo demasiado.
// `rows` tem de vir ordenado por startDate ascendente.
export function averageCycleAndPeriodLengths(rows: PeriodRecord[], maxSamples = 6): HistoryAverages {
  const periodLens = rows.filter(r => r.endDate).map(r => dayDiff(r.startDate, r.endDate!) + 1);
  const lastPeriodLens = periodLens.slice(-maxSamples);

  const cycleLens: number[] = [];
  for (let i = 1; i < rows.length; i++) cycleLens.push(dayDiff(rows[i - 1].startDate, rows[i].startDate));
  const lastCycleLens = cycleLens.slice(-maxSamples);

  const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const clamp = (v: number | null, min: number, max: number) => v === null ? null : Math.max(min, Math.min(max, v));

  return {
    avgCycleLength: clamp(avg(lastCycleLens), 20, 45),
    avgPeriodLength: clamp(avg(lastPeriodLens), 2, 10),
    cycleCount: lastCycleLens.length,
    periodCount: lastPeriodLens.length,
  };
}
