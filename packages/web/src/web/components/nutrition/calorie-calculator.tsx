import { useState } from "react";
import { Calculator, ChevronRight, RotateCcw, Info, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getToken } from "../../lib/auth";

const ACTIVITY_LEVELS = [
  { id: "sedentary", label: "Sedentário", desc: "Sem exercício ou muito pouco", multiplier: 1.2 },
  { id: "light", label: "Levemente ativo", desc: "1–3 dias/semana de exercício", multiplier: 1.375 },
  { id: "moderate", label: "Moderadamente ativo", desc: "3–5 dias/semana de exercício", multiplier: 1.55 },
  { id: "active", label: "Muito ativo", desc: "6–7 dias/semana de exercício intenso", multiplier: 1.725 },
  { id: "extreme", label: "Extremamente ativo", desc: "Treino 2x/dia ou trabalho físico pesado", multiplier: 1.9 },
];

const WORK_TYPES = [
  { id: "desk", label: "Secretária / Sentado", desc: "Home office, escritório, motorista", adjustment: 0 },
  { id: "mixed", label: "Misto", desc: "Em pé parte do dia, alguma movimentação", adjustment: 0.05 },
  { id: "standing", label: "Em pé / Ativo", desc: "Professor, vendedor, armazém leve", adjustment: 0.1 },
  { id: "heavy", label: "Trabalho físico pesado", desc: "Construção, agricultura, carga pesada", adjustment: 0.2 },
];

const SLEEP_ADJUSTMENTS: Record<string, { label: string; adjustment: number; note: string }> = {
  "less5": { label: "< 5h", adjustment: -0.05, note: "Privação severa de sono aumenta cortisol e dificulta perda de gordura" },
  "5-6": { label: "5–6h", adjustment: -0.03, note: "Sono insuficiente reduz leptina e aumenta grelina (fome)" },
  "7-8": { label: "7–8h", adjustment: 0, note: "Ideal para recuperação e regulação hormonal" },
  "9+": { label: "9h+", adjustment: -0.02, note: "Sono excessivo pode indicar fadiga acumulada" },
};

const GOALS = [
  { id: "deficit_aggressive", label: "Perda agressiva", desc: "-1 kg/semana", delta: -1000, color: "#EF4444" },
  { id: "deficit_moderate", label: "Perda moderada", desc: "-0.5 kg/semana", delta: -500, color: "#F97316" },
  { id: "deficit_light", label: "Perda suave", desc: "-0.25 kg/semana", delta: -250, color: "#F59E0B" },
  { id: "maintenance", label: "Manutenção", desc: "Manter peso atual", delta: 0, color: "#10B981" },
  { id: "surplus_light", label: "Ganho suave", desc: "+0.25 kg/semana", delta: 250, color: "#3B82F6" },
  { id: "surplus_moderate", label: "Ganho moderado", desc: "+0.5 kg/semana", delta: 500, color: "#6366F1" },
];

interface Result {
  bmr: number;
  tdee: number;
  target: number;
  protein: number;
  carbs: number;
  fat: number;
  sleepNote: string;
  goalDelta: number;
}

export default function CalorieCalculator() {
  const [step, setStep] = useState<"form" | "result">("form");
  const [sex, setSex] = useState<"female" | "male">("female");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [workType, setWorkType] = useState("desk");
  const [sleep, setSleep] = useState("7-8");
  const [goal, setGoal] = useState("deficit_moderate");
  const [result, setResult] = useState<Result | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseFloat(age);
    if (!w || !h || !a) return;

    // Mifflin-St Jeor BMR
    let bmr = sex === "female"
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5;

    // Activity multiplier
    const actLevel = ACTIVITY_LEVELS.find(l => l.id === activity)!;
    let tdee = bmr * actLevel.multiplier;

    // Work adjustment
    const workAdj = WORK_TYPES.find(t => t.id === workType)!;
    tdee = tdee * (1 + workAdj.adjustment);

    // Sleep adjustment
    const sleepAdj = SLEEP_ADJUSTMENTS[sleep];
    tdee = tdee * (1 + sleepAdj.adjustment);

    // Goal
    const goalObj = GOALS.find(g => g.id === goal)!;
    const target = tdee + goalObj.delta;

    // Macros
    // Protein: 2g/kg body weight (high protein for active women)
    const protein = Math.round(w * 2);
    // Fat: 25% of target calories
    const fat = Math.round((target * 0.25) / 9);
    // Carbs: remaining
    const carbs = Math.round((target - protein * 4 - fat * 9) / 4);

    setResult({
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target: Math.round(target),
      protein,
      carbs: Math.max(carbs, 0),
      fat,
      sleepNote: sleepAdj.note,
      goalDelta: goalObj.delta,
    });
    setStep("result");
  };

  const reset = () => { setStep("form"); setResult(null); setSaveState("idle"); };

  const qc = useQueryClient();
  const [saveState, setSaveState] = useState<"idle" | "saving" | "done" | "error">("idle");

  // Guarda o resultado como objetivo diário (usado pelo Contador e Relatório).
  const saveAsGoal = async () => {
    if (!result) return;
    setSaveState("saving");
    try {
      const res = await fetch("/api/nutrition/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          dailyCalories: result.target,
          proteinGoal: result.protein,
          carbsGoal: result.carbs,
          fatGoal: result.fat,
        }),
      });
      if (!res.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ["calorie-goal"] });
      setSaveState("done");
    } catch {
      setSaveState("error");
    }
  };

  const goalObj = GOALS.find(g => g.id === goal)!;
  const canCalculate = age && weight && height;

  if (step === "result" && result) {
    const macroTotal = result.protein * 4 + result.carbs * 4 + result.fat * 9;
    const protPct = Math.round((result.protein * 4 / macroTotal) * 100);
    const carbPct = Math.round((result.carbs * 4 / macroTotal) * 100);
    const fatPct = Math.round((result.fat * 9 / macroTotal) * 100);

    return (
      <div className="space-y-4 fade-up">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-black text-lg" style={{ color: "var(--black)" }}>Os teus resultados</h2>
          <button onClick={reset} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer"
            style={{ background: "var(--cream)", color: "var(--gray)" }}>
            <RotateCcw size={13} /> Recalcular
          </button>
        </div>

        {/* Main target */}
        <div className="rounded-3xl p-6 text-center" style={{ background: goalObj.color + "15", border: `2px solid ${goalObj.color}30` }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: goalObj.color }}>
            {goalObj.label} · {goalObj.desc}
          </p>
          <p className="text-6xl font-black my-2" style={{ color: "var(--black)" }}>
            {result.target.toLocaleString("pt-PT")}
          </p>
          <p className="text-sm font-semibold" style={{ color: "var(--gray)" }}>calorias por dia</p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "BMR", value: result.bmr, desc: "Metabolismo basal", color: "#94A3B8" },
            { label: "TDEE", value: result.tdee, desc: "Gasto total diário", color: "#F97316" },
            { label: result.goalDelta >= 0 ? "+" + result.goalDelta : result.goalDelta.toString(), value: result.target, desc: "Objetivo", color: goalObj.color },
          ].map(item => (
            <div key={item.label} className="rounded-2xl p-4 text-center" style={{ background: "var(--white)" }}>
              <p className="text-xs font-bold mb-1" style={{ color: item.color }}>{item.label}</p>
              <p className="text-xl font-black" style={{ color: "var(--black)" }}>{item.value.toLocaleString("pt-PT")}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--gray)" }}>{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Macros */}
        <div className="rounded-2xl p-5" style={{ background: "var(--white)" }}>
          <p className="font-black text-sm mb-4" style={{ color: "var(--black)" }}>Distribuição de macros sugerida</p>

          {/* Bar */}
          <div className="flex rounded-full overflow-hidden h-4 mb-4">
            <div style={{ width: `${protPct}%`, background: "#F07A30" }} />
            <div style={{ width: `${carbPct}%`, background: "#FCD34D" }} />
            <div style={{ width: `${fatPct}%`, background: "#60A5FA" }} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Proteína", value: result.protein, unit: "g", pct: protPct, color: "#F07A30", kcal: result.protein * 4 },
              { label: "Hidratos", value: result.carbs, unit: "g", pct: carbPct, color: "#F59E0B", kcal: result.carbs * 4 },
              { label: "Gordura", value: result.fat, unit: "g", pct: fatPct, color: "#3B82F6", kcal: result.fat * 9 },
            ].map(m => (
              <div key={m.label} className="text-center p-3 rounded-xl" style={{ background: m.color + "10" }}>
                <div className="w-2 h-2 rounded-full mx-auto mb-2" style={{ background: m.color }} />
                <p className="text-xl font-black" style={{ color: "var(--black)" }}>{m.value}<span className="text-xs font-normal">{m.unit}</span></p>
                <p className="text-xs font-semibold" style={{ color: m.color }}>{m.pct}% · {m.kcal} kcal</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--gray)" }}>{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Guardar como objetivo */}
        <button
          onClick={saveAsGoal}
          disabled={saveState === "saving" || saveState === "done"}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-70"
          style={saveState === "done" ? { background: "#DCFCE7", color: "#16A34A" } : { background: "var(--orange)", color: "white" }}
        >
          <Save size={16} />
          {saveState === "done" ? "✓ Guardado como objetivo diário" : saveState === "saving" ? "A guardar..." : "Usar como objetivo diário"}
        </button>
        {saveState === "error" && (
          <p className="text-xs text-center text-red-500">Erro ao guardar. Tenta novamente.</p>
        )}
        {saveState === "done" && (
          <p className="text-xs text-center" style={{ color: "var(--gray)" }}>
            O Contador de Calorias e o Relatório Semanal passam a usar estes valores.
          </p>
        )}

        {/* Sleep note */}
        {sleep !== "7-8" && (
          <div className="flex gap-3 rounded-2xl p-4" style={{ background: "#F59E0B15", border: "1px solid #F59E0B30" }}>
            <Info size={16} className="shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
            <p className="text-xs" style={{ color: "#92400E" }}>{result.sleepNote}</p>
          </div>
        )}

        {/* Tip */}
        <div className="rounded-2xl p-4" style={{ background: "var(--peach)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--orange)" }}>💡 Dica</p>
          <p className="text-xs" style={{ color: "#666" }}>
            Estes valores são uma estimativa baseada em fórmulas validadas (Mifflin-St Jeor). Monitoriza o teu peso durante 2–3 semanas e ajusta ±100–200 kcal conforme necessário.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 fade-up">
      <div className="flex items-center gap-2">
        <Calculator size={20} style={{ color: "var(--orange)" }} />
        <div>
          <p className="font-black text-sm" style={{ color: "var(--black)" }}>Calculador de Calorias</p>
          <p className="text-xs" style={{ color: "var(--gray)" }}>Personalizado para o teu estilo de vida</p>
        </div>
      </div>

      {/* Sexo */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>Sexo</label>
        <div className="grid grid-cols-2 gap-2">
          {(["female", "male"] as const).map(s => (
            <button key={s} onClick={() => setSex(s)}
              className="py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
              style={sex === s ? { background: "var(--orange)", color: "white" } : { background: "var(--white)", color: "var(--gray)" }}>
              {s === "female" ? "👩 Feminino" : "👨 Masculino"}
            </button>
          ))}
        </div>
      </div>

      {/* Dados pessoais */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>Dados pessoais</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { key: "age", label: "Idade", unit: "anos", val: age, set: setAge, min: 15, max: 80 },
            { key: "weight", label: "Peso", unit: "kg", val: weight, set: setWeight, min: 30, max: 250 },
            { key: "height", label: "Altura", unit: "cm", val: height, set: setHeight, min: 100, max: 220 },
          ].map(f => (
            <div key={f.key} className="rounded-xl p-3" style={{ background: "var(--white)" }}>
              <label className="block text-xs font-semibold mb-1" style={{ color: "var(--gray)" }}>{f.label}</label>
              <input
                type="number" value={f.val} onChange={e => f.set(e.target.value)}
                min={f.min} max={f.max}
                placeholder="–"
                className="w-full text-lg font-black outline-none bg-transparent"
                style={{ color: "var(--black)" }}
              />
              <p className="text-xs" style={{ color: "var(--gray)" }}>{f.unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Exercício */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>Nível de exercício</label>
        <div className="space-y-2">
          {ACTIVITY_LEVELS.map(l => (
            <button key={l.id} onClick={() => setActivity(l.id)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left cursor-pointer transition-all"
              style={activity === l.id
                ? { background: "var(--orange)", color: "white" }
                : { background: "var(--white)", color: "var(--black)" }}>
              <div>
                <p className="text-sm font-semibold">{l.label}</p>
                <p className="text-xs opacity-70">{l.desc}</p>
              </div>
              {activity === l.id && <ChevronRight size={16} />}
            </button>
          ))}
        </div>
      </div>

      {/* Trabalho */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>Tipo de trabalho</label>
        <div className="space-y-2">
          {WORK_TYPES.map(t => (
            <button key={t.id} onClick={() => setWorkType(t.id)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left cursor-pointer transition-all"
              style={workType === t.id
                ? { background: "var(--orange)", color: "white" }
                : { background: "var(--white)", color: "var(--black)" }}>
              <div>
                <p className="text-sm font-semibold">{t.label}</p>
                <p className="text-xs opacity-70">{t.desc}</p>
              </div>
              {workType === t.id && <ChevronRight size={16} />}
            </button>
          ))}
        </div>
      </div>

      {/* Sono */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>Horas de sono por noite</label>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(SLEEP_ADJUSTMENTS).map(([key, val]) => (
            <button key={key} onClick={() => setSleep(key)}
              className="py-3 rounded-xl text-sm font-bold cursor-pointer transition-all"
              style={sleep === key
                ? { background: "var(--orange)", color: "white" }
                : { background: "var(--white)", color: "var(--gray)" }}>
              {val.label}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--gray)" }}>{SLEEP_ADJUSTMENTS[sleep].note}</p>
      </div>

      {/* Objetivo */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>Objetivo</label>
        <div className="space-y-2">
          {GOALS.map(g => (
            <button key={g.id} onClick={() => setGoal(g.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left cursor-pointer transition-all border-2"
              style={goal === g.id
                ? { background: g.color + "15", borderColor: g.color }
                : { background: "var(--white)", borderColor: "transparent" }}>
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: g.color }} />
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: "var(--black)" }}>{g.label}</p>
                <p className="text-xs" style={{ color: "var(--gray)" }}>{g.desc}</p>
              </div>
              {goal === g.id && <ChevronRight size={16} style={{ color: g.color }} />}
            </button>
          ))}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={calculate}
        disabled={!canCalculate}
        className="w-full py-4 rounded-2xl font-black text-base text-white cursor-pointer disabled:opacity-40 transition-all"
        style={{ background: "var(--orange)" }}
      >
        Calcular as minhas calorias
      </button>
    </div>
  );
}
