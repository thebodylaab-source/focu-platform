import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "../../lib/auth";
import { computeCycle, PHASES, type PhaseId } from "../../lib/cycle";
import { Link } from "wouter";
import { Dumbbell, Apple, Lightbulb, Settings2, Droplet, Loader2, Battery, Info, HeartHandshake, Play } from "lucide-react";

const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });
const todayStr = () => new Date().toISOString().split("T")[0];

const SYMPTOM_LABELS: Record<string, string> = {
  colicas: "🩸 cólicas", inchaco: "🎈 inchaço", humor: "😔 humor em baixo", desejos: "🍫 desejos",
  cansada: "🥱 cansada", irritada: "😤 irritada", ansiedade: "😰 ansiedade", "sono-mau": "🌙 dormir mal",
  trabalho: "💼 stress do trabalho", escola: "📚 stress da escola", sono: "😴 sono fraco",
  "humor-bom": "😊 bem-disposta", motivada: "💪 motivada", "energia-boa": "⚡ energia", "pele-boa": "✨ pele bonita",
  libido: "🔥 libido alta", "sono-bom": "🛌 dormir bem", treino: "🏃 treino", produtiva: "🎯 produtiva",
  grata: "🥰 grata", hidratada: "💧 hidratada", "comi-bem": "🍎 comi bem", relax: "🧘 dias calmos",
};

type CycleRow = { lastPeriodStart: string; cycleLength: number; periodLength: number } | null;

export default function CycleGuide() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ lastPeriodStart: todayStr(), cycleLength: "28", periodLength: "5" });
  const [formError, setFormError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["cycle"],
    queryFn: async () => {
      const res = await fetch("/api/cycle", { headers: { Authorization: `Bearer ${getToken()}` } });
      return res.json() as Promise<{ cycle: CycleRow }>;
    },
  });

  const { data: insightsData } = useQuery({
    queryKey: ["cycle-insights"],
    enabled: !!data?.cycle,
    queryFn: async () => {
      const res = await fetch("/api/cycle/insights", { headers: { Authorization: `Bearer ${getToken()}` } });
      return res.json() as Promise<{ insights: null | {
        totalCheckins: number;
        lowestEnergyPhase: PhaseId | null;
        topSymptoms: { id: string; count: number }[];
        emotionalHungerPhase: { phase: PhaseId; rate: number; occurrences: number } | null;
        descontroloPhase: { phase: PhaseId; rate: number; occurrences: number } | null;
        headsUp: { descontroloNow: boolean; emotionalNow: boolean };
      } }>;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cycle", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          lastPeriodStart: form.lastPeriodStart,
          cycleLength: parseInt(form.cycleLength),
          periodLength: parseInt(form.periodLength),
        }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error((e as any).message || "Erro ao guardar"); }
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cycle"] }); setEditing(false); setFormError(""); },
    onError: (e: any) => setFormError(e.message),
  });

  const periodStarted = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cycle/period-started", { method: "POST", headers: authHeaders(), body: JSON.stringify({}) });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cycle"] }),
  });

  if (isLoading) {
    return <div className="py-16 text-center text-sm" style={{ color: "var(--gray)" }}>A carregar...</div>;
  }

  const cycle = data?.cycle ?? null;
  const showForm = !cycle || editing;

  // Onboarding / edição
  if (showForm) {
    return (
      <div className="space-y-5 fade-up">
        <div className="rounded-2xl p-5" style={{ background: "var(--peach)" }}>
          <p className="text-sm font-black mb-1" style={{ color: "var(--orange)" }}>🌸 O teu ciclo, o teu ritmo</p>
          <p className="text-xs" style={{ color: "#7a5a48" }}>
            Regista o teu ciclo e recebe todos os dias uma orientação de treino e alimentação ajustada à tua fase — quando podes puxar mais e quando deves abrandar.
          </p>
        </div>

        <div className="rounded-2xl p-5 space-y-4" style={{ background: "var(--white)" }}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Primeiro dia da última menstruação</label>
            <input type="date" max={todayStr()} value={form.lastPeriodStart}
              onChange={e => setForm(f => ({ ...f, lastPeriodStart: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
              style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Duração do ciclo (dias)</label>
              <input type="number" min={20} max={45} value={form.cycleLength}
                onChange={e => setForm(f => ({ ...f, cycleLength: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
              <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>Normalmente 28. Do 1º dia de um período ao 1º do seguinte.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Dias de menstruação</label>
              <input type="number" min={2} max={10} value={form.periodLength}
                onChange={e => setForm(f => ({ ...f, periodLength: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
              <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>Quantos dias costuma durar o período.</p>
            </div>
          </div>
          {formError && <p className="text-xs text-red-500">{formError}</p>}
          <div className="flex gap-3">
            {cycle && (
              <button onClick={() => { setEditing(false); setFormError(""); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer border"
                style={{ borderColor: "var(--gray-lt)", color: "var(--gray)" }}>Cancelar</button>
            )}
            <button onClick={() => save.mutate()} disabled={save.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white cursor-pointer disabled:opacity-60"
              style={{ background: "var(--orange)" }}>
              {save.isPending ? <><Loader2 size={15} className="animate-spin" /> A guardar...</> : "Ver a minha orientação"}
            </button>
          </div>
        </div>

        <Disclaimer />
      </div>
    );
  }

  // Guia diário
  const t = computeCycle(cycle);
  const p = t.phase;
  const phaseOrder: PhaseId[] = ["menstrual", "folicular", "ovulacao", "lutea"];

  return (
    <div className="space-y-4 fade-up">
      {/* Cartão principal da fase */}
      <div className="rounded-3xl p-6 relative overflow-hidden" style={{ background: p.color + "12", border: `2px solid ${p.color}30` }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: p.color }}>Hoje · Dia {t.cycleDay} do ciclo</p>
            <h2 className="text-2xl font-black mt-1 flex items-center gap-2" style={{ color: "var(--black)" }}>
              <span className="text-3xl">{p.emoji}</span> {p.label}
            </h2>
          </div>
          <button onClick={() => { setForm({ lastPeriodStart: cycle.lastPeriodStart, cycleLength: String(cycle.cycleLength), periodLength: String(cycle.periodLength) }); setEditing(true); }}
            className="p-2 rounded-xl cursor-pointer shrink-0" style={{ background: "var(--white)", color: "var(--gray)" }} title="Editar ciclo">
            <Settings2 size={16} />
          </button>
        </div>

        {/* Medidor de energia */}
        <div className="mt-4 flex items-center gap-3">
          <Battery size={18} style={{ color: p.color }} />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold" style={{ color: "var(--black)" }}>{p.energyLabel}</span>
              <span className="text-[10px]" style={{ color: "var(--gray)" }}>{p.energy}/5</span>
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-2 flex-1 rounded-full" style={{ background: i <= p.energy ? p.color : "var(--gray-lt)" }} />
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs mt-3" style={{ color: "#555" }}>{p.energyText}</p>
      </div>

      {/* #6 O que se passa no corpo */}
      <div className="rounded-2xl p-4 flex gap-3" style={{ background: "var(--white)" }}>
        <Info size={18} className="shrink-0 mt-0.5" style={{ color: p.color }} />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: p.color }}>O que se passa no teu corpo</p>
          <p className="text-xs leading-relaxed" style={{ color: "#555" }}>{p.whatsHappening}</p>
        </div>
      </div>

      {/* Treino */}
      <GuidanceCard icon={<Dumbbell size={18} />} color={p.color} eyebrow="Treino" title={p.training.title} text={p.training.text} />

      {/* #5 Treino sugerido para hoje */}
      <Link to={`/videos?cat=${encodeURIComponent(p.suggestedCategory)}`}>
        <div className="rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all hover:shadow-md" style={{ background: p.color + "12", border: `1.5px solid ${p.color}30` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: p.color, color: "white" }}>
            <Play size={18} fill="white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: p.color }}>Treino sugerido para hoje</p>
            <p className="text-sm font-black" style={{ color: "var(--black)" }}>{p.suggestedTraining}</p>
          </div>
          <span className="text-xs font-semibold shrink-0" style={{ color: p.color }}>Ver treinos →</span>
        </div>
      </Link>

      {/* Nutrição */}
      <GuidanceCard icon={<Apple size={18} />} color={p.color} eyebrow="Alimentação" title={p.nutrition.title} text={p.nutrition.text} />

      {/* #3 Tranquilizar (balança/desejos) */}
      {p.reassurance && (
        <div className="rounded-2xl p-4 flex gap-3" style={{ background: p.color + "12", border: `1.5px solid ${p.color}30` }}>
          <HeartHandshake size={18} className="shrink-0 mt-0.5" style={{ color: p.color }} />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: p.color }}>Respira fundo</p>
            <p className="text-xs leading-relaxed" style={{ color: "#555" }}>{p.reassurance}</p>
          </div>
        </div>
      )}

      {/* Aviso preventivo de fome (baseado no teu histórico nesta fase) */}
      {(() => {
        const ins = insightsData?.insights;
        if (!ins?.headsUp) return null;
        const { descontroloNow, emotionalNow } = ins.headsUp;
        if (!descontroloNow && !emotionalNow) return null;
        return (
          <div className="rounded-2xl p-4 flex gap-3" style={{ background: "#DC262612", border: "1.5px solid #DC262630" }}>
            <span className="text-lg shrink-0">🌀</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "#DC2626" }}>Atenção nesta fase</p>
              <p className="text-xs leading-relaxed" style={{ color: "#555" }}>
                {descontroloNow
                  ? "Nos teus registos, é nesta fase que costumas ter mais descontrolo com a comida. "
                  : "Nos teus registos, é nesta fase que costumas ter mais fome emocional. "}
                Prepara lanches saudáveis à mão e sê gentil contigo — saber que vem aí já é meio caminho para gerir.
              </p>
            </div>
          </div>
        );
      })()}

      {/* Dica */}
      <div className="rounded-2xl p-4 flex gap-3" style={{ background: "var(--peach)" }}>
        <Lightbulb size={18} className="shrink-0 mt-0.5" style={{ color: "var(--orange)" }} />
        <p className="text-xs" style={{ color: "#7a5a48" }}><strong>Dica:</strong> {p.tip}</p>
      </div>

      {/* Linha temporal das fases */}
      <div className="rounded-2xl p-5" style={{ background: "var(--white)" }}>
        <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "var(--gray)" }}>As tuas fases</p>
        <div className="flex gap-1.5 mb-3">
          {phaseOrder.map(id => (
            <div key={id} className="flex-1 text-center">
              <div className="h-1.5 rounded-full mb-1.5" style={{ background: id === p.id ? PHASES[id].color : PHASES[id].color + "35" }} />
              <span className="text-[10px] font-semibold" style={{ color: id === p.id ? PHASES[id].color : "var(--gray)" }}>
                {PHASES[id].emoji}
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--gray)" }}>
          Próxima menstruação estimada em <strong style={{ color: "var(--black)" }}>{t.daysUntilNextPeriod} {t.daysUntilNextPeriod === 1 ? "dia" : "dias"}</strong>{" "}
          ({new Date(t.nextPeriodDate + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "long" })}).
        </p>
      </div>

      {/* #4 Os teus padrões */}
      {(() => {
        const ins = insightsData?.insights;
        if (!ins) return null;
        if (ins.totalCheckins < 5) {
          return (
            <div className="rounded-2xl p-4" style={{ background: "var(--white)" }}>
              <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Os teus padrões</p>
              <p className="text-xs" style={{ color: "var(--gray)" }}>
                Continua a registar como te sentes todos os dias. A partir de alguns registos, mostramos aqui o padrão do teu corpo ({ins.totalCheckins}/5).
              </p>
            </div>
          );
        }
        const low = ins.lowestEnergyPhase ? PHASES[ins.lowestEnergyPhase] : null;
        return (
          <div className="rounded-2xl p-5" style={{ background: "var(--white)" }}>
            <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: "var(--gray)" }}>Os teus padrões 📈</p>
            {low && (
              <p className="text-sm mb-2" style={{ color: "var(--black)" }}>
                Costumas ter <strong>menos energia</strong> na <strong style={{ color: low.color }}>{low.label} {low.emoji}</strong>. É normal e previsível — planeia descanso para essa fase.
              </p>
            )}
            {ins.topSymptoms.length > 0 && (
              <p className="text-xs mb-2" style={{ color: "var(--gray)" }}>
                Sintomas mais frequentes: {ins.topSymptoms.map(s => SYMPTOM_LABELS[s.id] ?? s.id).join(", ")}.
              </p>
            )}
            {ins.descontroloPhase && (
              <p className="text-sm mb-1" style={{ color: "var(--black)" }}>
                O <strong>descontrolo com a comida</strong> acontece mais na <strong style={{ color: PHASES[ins.descontroloPhase.phase].color }}>{PHASES[ins.descontroloPhase.phase].label}</strong> ({Math.round(ins.descontroloPhase.rate * 100)}% dos dias que registaste fome).
              </p>
            )}
            {ins.emotionalHungerPhase && (
              <p className="text-sm mb-1" style={{ color: "var(--black)" }}>
                A <strong>fome emocional</strong> aparece mais na <strong style={{ color: PHASES[ins.emotionalHungerPhase.phase].color }}>{PHASES[ins.emotionalHungerPhase.phase].label}</strong>.
              </p>
            )}
            <p className="text-[10px] mt-2" style={{ color: "var(--gray)" }}>Baseado nos teus {ins.totalCheckins} registos dos últimos 90 dias. Quanto mais registares, mais fiável fica.</p>
          </div>
        );
      })()}

      {/* Atalho período começou */}
      <button onClick={() => periodStarted.mutate()} disabled={periodStarted.isPending}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold cursor-pointer border transition-opacity hover:opacity-80 disabled:opacity-60"
        style={{ borderColor: "#DC2626", color: "#DC2626", background: "transparent" }}>
        {periodStarted.isPending ? <Loader2 size={15} className="animate-spin" /> : <Droplet size={15} />}
        O período começou hoje
      </button>

      {/* Corrigir dados caso o registo esteja errado */}
      <button onClick={() => { setForm({ lastPeriodStart: cycle.lastPeriodStart, cycleLength: String(cycle.cycleLength), periodLength: String(cycle.periodLength) }); setEditing(true); }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-80"
        style={{ background: "var(--cream)", color: "var(--gray)" }}>
        <Settings2 size={15} />
        Corrigir dados do ciclo
      </button>

      <Disclaimer />
    </div>
  );
}

function GuidanceCard({ icon, color, eyebrow, title, text }: { icon: React.ReactNode; color: string; eyebrow: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--white)" }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: color + "18", color }}>{icon}</div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{eyebrow}</p>
          <p className="text-sm font-black" style={{ color: "var(--black)" }}>{title}</p>
        </div>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "#555" }}>{text}</p>
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="text-[10px] leading-relaxed px-2" style={{ color: "var(--gray)" }}>
      ⚠️ Isto é orientação geral de bem-estar, não aconselhamento médico. Cada corpo é único — ouve o teu e fala com um profissional de saúde se tiveres ciclos irregulares, dores fortes ou qualquer dúvida.
    </p>
  );
}
