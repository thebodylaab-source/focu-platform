// Lógica do ciclo menstrual: a partir da data da última menstruação e da
// duração do ciclo, calcula a fase de hoje e a orientação de treino/nutrição.
// Conteúdo curado (sem IA) — orientação geral de bem-estar, não é aconselhamento médico.

export type CycleSettings = {
  lastPeriodStart: string; // YYYY-MM-DD
  cycleLength: number;
  periodLength: number;
};

export type PhaseId = "menstrual" | "folicular" | "ovulacao" | "lutea";

export type PhaseContent = {
  id: PhaseId;
  label: string;
  emoji: string;
  color: string;
  energy: number; // 1-5
  energyLabel: string;
  energyText: string;
  training: { title: string; text: string };
  nutrition: { title: string; text: string };
  tip: string;
};

export const PHASES: Record<PhaseId, PhaseContent> = {
  menstrual: {
    id: "menstrual",
    label: "Menstruação",
    emoji: "🌙",
    color: "#DC2626",
    energy: 2,
    energyLabel: "Energia baixa",
    energyText: "O corpo está a renovar-se. É normal sentires-te mais cansada e com menos disposição.",
    training: {
      title: "Treino suave ou descanso",
      text: "Caminhadas, mobilidade, alongamentos ou treino leve. Se te sentires bem, podes treinar normal — mas ouve o corpo. Hoje não é dia de recordes.",
    },
    nutrition: {
      title: "Foco no ferro",
      text: "Perdes ferro com o período. Aposta em carnes magras, leguminosas e espinafres, com vitamina C (limão, laranja) para absorver melhor. Hidrata-te bem.",
    },
    tip: "Se tiveres cólicas, o movimento leve e o calor ajudam mais do que ficares parada.",
  },
  folicular: {
    id: "folicular",
    label: "Fase Folicular",
    emoji: "🌱",
    color: "#16A34A",
    energy: 4,
    energyLabel: "Energia a subir",
    energyText: "Os estrogénios sobem e a energia acompanha. Ótima altura para dar gás.",
    training: {
      title: "Puxa mais! 💪",
      text: "Fase ideal para treinos intensos e sobrecarga progressiva — o corpo recupera mais rápido e ganhas força. Aproveita para os treinos de glúteos mais pesados.",
    },
    nutrition: {
      title: "Constrói",
      text: "Bom momento para proteína e hidratos de qualidade que sustentam os treinos fortes. O apetite tende a estar mais controlado.",
    },
    tip: "É a melhor semana para tentares progredir cargas ou repetições.",
  },
  ovulacao: {
    id: "ovulacao",
    label: "Ovulação",
    emoji: "✨",
    color: "#E8590C",
    energy: 5,
    energyLabel: "Energia no pico",
    energyText: "Força e energia no máximo do ciclo. Hoje estás imparável.",
    training: {
      title: "Dia de dar o máximo 🔥",
      text: "Se há dia para puxar por ti, é hoje. Treinos mais exigentes, mais peso, mais intensidade.",
    },
    nutrition: {
      title: "Sustenta a intensidade",
      text: "Mantém a proteína alta e não cortes hidratos — precisas de combustível para o pico de performance.",
    },
    tip: "Com mais força e articulações mais laxas nesta fase, mantém a técnica correta para evitar lesões.",
  },
  lutea: {
    id: "lutea",
    label: "Fase Lútea",
    emoji: "🌗",
    color: "#7C3AED",
    energy: 3,
    energyLabel: "Energia a descer",
    energyText: "A progesterona sobe e a energia começa a baixar, sobretudo perto do período. A TPM pode aparecer.",
    training: {
      title: "Modera e ouve o corpo",
      text: "Mantém o movimento mas baixa a intensidade à medida que se aproxima o período. Treinos moderados, mais foco em técnica e recuperação.",
    },
    nutrition: {
      title: "Comer um pouco mais é normal",
      text: "O corpo gasta mais calorias nesta fase e os desejos aumentam — é normal precisares de ~100–200 kcal a mais. Escolhe hidratos complexos e magnésio (chocolate preto, frutos secos) para os desejos e o humor.",
    },
    tip: "Não te martirizes com os desejos — são fisiológicos. Dormir bem faz diferença no humor e na retenção de líquidos.",
  },
};

export type CycleToday = {
  phase: PhaseContent;
  cycleDay: number;
  cycleLength: number;
  daysUntilNextPeriod: number;
  nextPeriodDate: string;
};

const MS_DAY = 86400_000;
const atNoon = (isoDate: string) => new Date(isoDate + "T12:00:00");
const toISO = (d: Date) => d.toISOString().split("T")[0];

// Calcula a fase e restantes dados para uma data (por defeito, hoje).
export function computeCycle(settings: CycleSettings, forDate?: string): CycleToday {
  const cycleLength = Math.max(20, Math.min(45, settings.cycleLength || 28));
  const periodLength = Math.max(2, Math.min(10, settings.periodLength || 5));
  const start = atNoon(settings.lastPeriodStart);
  const today = forDate ? atNoon(forDate) : atNoon(toISO(new Date()));

  const daysSince = Math.floor((today.getTime() - start.getTime()) / MS_DAY);
  // cycleDay em [1, cycleLength] mesmo que a data de início esteja no passado distante
  const cycleDay = ((daysSince % cycleLength) + cycleLength) % cycleLength + 1;

  // A fase lútea dura ~14 dias; a ovulação acontece por volta de (ciclo - 14).
  const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);

  let phaseId: PhaseId;
  if (cycleDay <= periodLength) phaseId = "menstrual";
  else if (cycleDay < ovulationDay - 1) phaseId = "folicular";
  else if (cycleDay <= ovulationDay + 1) phaseId = "ovulacao";
  else phaseId = "lutea";

  const daysUntilNextPeriod = cycleLength - cycleDay + 1;
  const next = new Date(today.getTime() + daysUntilNextPeriod * MS_DAY);

  return {
    phase: PHASES[phaseId],
    cycleDay,
    cycleLength,
    daysUntilNextPeriod,
    nextPeriodDate: toISO(next),
  };
}
