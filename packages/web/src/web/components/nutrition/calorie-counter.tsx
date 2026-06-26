import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useState } from "react";
import { Target, Flame, Drumstick, Wheat, Droplets, Settings, Check } from "lucide-react";

function MacroRing({ value, goal, color, label }: { value: number; goal: number; color: string; label: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(goal, 1)) * 100));
  const r = 28, c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" stroke="var(--peach)" />
          <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" stroke={color}
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.5s ease" }} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>
      <p className="text-xs font-semibold" style={{ color: "var(--black)" }}>{Math.round(value)}g</p>
      <p className="text-[10px]" style={{ color: "var(--gray)" }}>{label}</p>
    </div>
  );
}

export default function CalorieCounter() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [goalForm, setGoalForm] = useState({ dailyCalories: 2000, proteinGoal: 150, carbsGoal: 200, fatGoal: 65 });

  const { data: goalData } = useQuery({
    queryKey: ["calorie-goal"],
    queryFn: async () => {
      const res = await api.nutrition.goal.$get();
      return res.json();
    },
  });

  // Sync goal form when data loads
  const goal = (goalData as any)?.goal;
  // Use effect-like approach: update form if goal loaded
  if (goal && goalForm.dailyCalories === 2000 && goal.dailyCalories !== 2000) {
    setGoalForm({ dailyCalories: goal.dailyCalories, proteinGoal: goal.proteinGoal, carbsGoal: goal.carbsGoal, fatGoal: goal.fatGoal });
  }

  const today = new Date().toISOString().split("T")[0];
  const { data: logsData } = useQuery({
    queryKey: ["food-logs", today],
    queryFn: async () => (await api.nutrition.logs.$get({ query: { date: today } })).json(),
  });

  const saveMutation = useMutation({
    mutationFn: async (g: typeof goalForm) => (await api.nutrition.goal.$post({ json: g })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["calorie-goal"] }); setEditing(false); },
  });

  const logs = (logsData as any)?.logs ?? [];

  const totalCals = logs.reduce((acc: number, l: any) => acc + l.calories * l.quantity, 0);
  const totalProtein = logs.reduce((acc: number, l: any) => acc + l.protein * l.quantity, 0);
  const totalCarbs = logs.reduce((acc: number, l: any) => acc + l.carbs * l.quantity, 0);
  const totalFat = logs.reduce((acc: number, l: any) => acc + l.fat * l.quantity, 0);

  const calGoal = goal?.dailyCalories ?? 2000;
  const remaining = Math.max(0, calGoal - totalCals);
  const calPct = Math.min(100, Math.round((totalCals / calGoal) * 100));

  return (
    <div className="space-y-6">
      {/* Main calorie card */}
      <div className="rounded-2xl p-6" style={{ background: "var(--white)" }}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-lg" style={{ color: "var(--black)" }}>Hoje — {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}</h3>
          <button onClick={() => setEditing(!editing)} className="p-2 rounded-xl cursor-pointer" style={{ background: "var(--cream)" }}>
            {editing ? <Check size={18} style={{ color: "var(--green)" }} /> : <Settings size={18} style={{ color: "var(--gray)" }} />}
          </button>
        </div>

        {editing ? (
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(goalForm); }} className="space-y-4">
            <p className="text-sm font-semibold" style={{ color: "var(--gray)" }}>Define os teus objetivos diários:</p>
            {[
              { key: "dailyCalories", label: "Calorias (kcal)", icon: Flame },
              { key: "proteinGoal", label: "Proteína (g)", icon: Drumstick },
              { key: "carbsGoal", label: "Hidratos (g)", icon: Wheat },
              { key: "fatGoal", label: "Gorduras (g)", icon: Droplets },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3">
                <Icon size={18} style={{ color: "var(--orange)" }} />
                <label className="text-sm font-medium w-36" style={{ color: "var(--black)" }}>{label}</label>
                <input type="number" value={(goalForm as any)[key]} onChange={e => setGoalForm(f => ({ ...f, [key]: parseFloat(e.target.value) }))}
                  className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
              </div>
            ))}
            <button type="submit" disabled={saveMutation.isPending}
              className="w-full py-3 rounded-xl font-bold text-sm text-white cursor-pointer"
              style={{ background: "var(--orange)" }}>
              {saveMutation.isPending ? "A guardar..." : "Guardar objetivos"}
            </button>
          </form>
        ) : (
          <>
            {/* Big calorie display */}
            <div className="flex items-center gap-6 mb-6">
              <div className="relative w-32 h-32">
                <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
                  <circle cx="64" cy="64" r="54" fill="none" strokeWidth="10" stroke="var(--peach)" />
                  <circle cx="64" cy="64" r="54" fill="none" strokeWidth="10" stroke="var(--orange)"
                    strokeDasharray={`${(calPct / 100) * 2 * Math.PI * 54} ${2 * Math.PI * 54}`}
                    strokeLinecap="round" style={{ transition: "stroke-dasharray 0.7s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black" style={{ color: "var(--black)" }}>{Math.round(totalCals)}</span>
                  <span className="text-xs font-medium" style={{ color: "var(--gray)" }}>kcal</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-medium mb-1" style={{ color: "var(--gray)" }}>
                    <span>Consumidas</span><span>{Math.round(totalCals)} kcal</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--peach)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${calPct}%`, background: "var(--orange)" }} />
                  </div>
                </div>
                <div className="flex justify-between">
                  <div className="text-center">
                    <p className="font-black" style={{ color: "var(--black)" }}>{calGoal}</p>
                    <p className="text-xs" style={{ color: "var(--gray)" }}>Objetivo</p>
                  </div>
                  <div className="text-center">
                    <p className="font-black" style={{ color: remaining > 0 ? "var(--green)" : "#EF4444" }}>{Math.round(remaining)}</p>
                    <p className="text-xs" style={{ color: "var(--gray)" }}>Restantes</p>
                  </div>
                  <div className="text-center">
                    <p className="font-black" style={{ color: totalCals > calGoal ? "#EF4444" : "var(--gray)" }}>{totalCals > calGoal ? Math.round(totalCals - calGoal) : 0}</p>
                    <p className="text-xs" style={{ color: "var(--gray)" }}>Excesso</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Macros */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t" style={{ borderColor: "var(--gray-lt)" }}>
              <MacroRing value={totalProtein} goal={goal?.proteinGoal ?? 150} color="#EF4444" label="Proteína" />
              <MacroRing value={totalCarbs} goal={goal?.carbsGoal ?? 200} color="#F07A30" label="Hidratos" />
              <MacroRing value={totalFat} goal={goal?.fatGoal ?? 65} color="#7C3AED" label="Gorduras" />
            </div>
          </>
        )}
      </div>

      {/* Tip */}
      <div className="rounded-2xl p-4 flex gap-3" style={{ background: "var(--peach)" }}>
        <span className="text-2xl">💡</span>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--black)" }}>Dica do programa</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--gray)" }}>
            {calPct < 80 ? "Ainda tens espaço para comer bem. Não saltes refeições — o metabolismo agradece!" :
             calPct < 100 ? "Estás no bom caminho! Equilibra as refeições restantes com proteína e legumes." :
             "Atingiste o objetivo! Escolhe alimentos nutricionalmente densos para o resto do dia."}
          </p>
        </div>
      </div>
    </div>
  );
}
