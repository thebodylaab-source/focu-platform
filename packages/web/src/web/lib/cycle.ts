// Conteúdo de UI do ciclo (curado, sem IA). A matemática vive em shared/cycle-core.
// Orientação geral de bem-estar, não é aconselhamento médico.
import { computePhase, type CycleSettings, type PhaseId } from "../../shared/cycle-core";

export type { CycleSettings, PhaseId };

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
  // #6 micro-educação: o que se passa no corpo
  whatsHappening: string;
  // #3 tranquilizar sobre a balança/desejos (só onde faz sentido)
  reassurance?: string;
  // #2 ajuste calórico do dia (kcal a somar ao objetivo)
  calorieAdjust: number;
  // #5 categoria de vídeo sugerida para a fase (link para /videos?cat=)
  suggestedCategory: string;
  suggestedTraining: string;
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
    whatsHappening: "Os estrogénios e a progesterona estão no mínimo — por isso a energia está em baixo. É o teu corpo a começar um novo ciclo. Descansar agora é produtivo, não preguiça.",
    reassurance: "Descansar durante o período conta como recuperação. Não vais perder o teu progresso por parares uns dias.",
    calorieAdjust: 0,
    suggestedCategory: "Aquecimento",
    suggestedTraining: "Mobilidade e caminhada",
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
    whatsHappening: "Os estrogénios sobem e preparam o corpo para a ovulação. Recuperas mais depressa, ganhas força mais facilmente e o humor tende a estar melhor. É a tua janela para evoluir.",
    calorieAdjust: 0,
    suggestedCategory: "Glúteos",
    suggestedTraining: "Glúteos com carga",
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
    whatsHappening: "Os estrogénios atingem o pico e há uma subida de testosterona — daí a força e a energia máximas. É o melhor momento do ciclo para os teus treinos mais fortes.",
    calorieAdjust: 0,
    suggestedCategory: "Glúteos",
    suggestedTraining: "Treino intenso de glúteos",
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
    whatsHappening: "A progesterona sobe para preparar o corpo. Isso aumenta o gasto de energia (por isso a fome), retém líquidos e pode dar TPM. Nada disto é falta de disciplina — é fisiologia.",
    reassurance: "Se a balança subiu 1–2 kg nesta fase, é água e não gordura. Volta ao normal depois do período — não entres em pânico nem cortes à bruta.",
    calorieAdjust: 150,
    suggestedCategory: "Core",
    suggestedTraining: "Core leve e mobilidade",
  },
};

export type CycleToday = {
  phase: PhaseContent;
  cycleDay: number;
  cycleLength: number;
  daysUntilNextPeriod: number;
  nextPeriodDate: string;
};

export function computeCycle(settings: CycleSettings, forDate?: string): CycleToday {
  const c = computePhase(settings, forDate);
  return {
    phase: PHASES[c.phaseId],
    cycleDay: c.cycleDay,
    cycleLength: c.cycleLength,
    daysUntilNextPeriod: c.daysUntilNextPeriod,
    nextPeriodDate: c.nextPeriodDate,
  };
}
