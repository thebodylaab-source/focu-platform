import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, Moon } from "lucide-react";
import { getToken } from "../lib/auth";
import { computeCycle } from "../lib/cycle";

const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });

type CycleRow = { lastPeriodStart: string; cycleLength: number; periodLength: number } | null;
type Checkin = { feeling: string } | null;

const FEELINGS = [
  { id: "otima", emoji: "🔥", label: "Cheia de energia" },
  { id: "bem", emoji: "🙂", label: "Bem" },
  { id: "media", emoji: "😐", label: "Mais ou menos" },
  { id: "sem-energia", emoji: "😴", label: "Sem energia" },
];

// Bloco diário no dashboard: mostra a fase do ciclo e pergunta como te sentes
// (uma vez por dia). Se o ciclo ainda não estiver configurado, convida a fazê-lo.
export function DailyCyclePrompt() {
  const qc = useQueryClient();

  const { data: cycleData, isLoading } = useQuery({
    queryKey: ["cycle"],
    queryFn: async () => {
      const res = await fetch("/api/cycle", { headers: { Authorization: `Bearer ${getToken()}` } });
      return res.json() as Promise<{ cycle: CycleRow }>;
    },
  });

  const { data: checkinData } = useQuery({
    queryKey: ["cycle-checkin"],
    enabled: !!cycleData?.cycle,
    queryFn: async () => {
      const res = await fetch("/api/cycle/checkin", { headers: { Authorization: `Bearer ${getToken()}` } });
      return res.json() as Promise<{ checkin: Checkin }>;
    },
  });

  const checkin = useMutation({
    mutationFn: async (feeling: string) => {
      const res = await fetch("/api/cycle/checkin", { method: "POST", headers: authHeaders(), body: JSON.stringify({ feeling }) });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cycle-checkin"] }),
  });

  if (isLoading) return null;

  // Sem ciclo configurado → convite
  if (!cycleData?.cycle) {
    return (
      <Link to="/ciclo">
        <div className="rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md flex items-center gap-3" style={{ background: "var(--peach)" }}>
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--white)" }}>
            <Moon size={20} style={{ color: "var(--orange)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black" style={{ color: "var(--black)" }}>Configura o teu ciclo 🌸</p>
            <p className="text-xs" style={{ color: "#7a5a48" }}>Recebe orientação diária de treino e alimentação ajustada à tua fase.</p>
          </div>
          <ChevronRight size={18} style={{ color: "var(--orange)" }} />
        </div>
      </Link>
    );
  }

  const t = computeCycle(cycleData.cycle);
  const p = t.phase;
  const done = checkinData?.checkin ?? null;

  return (
    <div className="rounded-2xl p-5" style={{ background: p.color + "12", border: `1.5px solid ${p.color}30` }}>
      {/* Fase de hoje */}
      <Link to="/ciclo">
        <div className="flex items-center gap-3 cursor-pointer">
          <span className="text-3xl">{p.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-black" style={{ color: "var(--black)" }}>{p.label}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: p.color + "20", color: p.color }}>{p.energyLabel}</span>
            </div>
            <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--gray)" }}>{p.training.title} · {p.nutrition.title}</p>
          </div>
          <ChevronRight size={18} style={{ color: p.color }} />
        </div>
      </Link>

      {/* Pergunta diária */}
      <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${p.color}25` }}>
        {done ? (
          <p className="text-xs font-medium" style={{ color: "var(--gray)" }}>
            {(() => {
              const f = FEELINGS.find(x => x.id === done.feeling);
              return <>Hoje sentes-te: <span style={{ color: "var(--black)", fontWeight: 700 }}>{f?.emoji} {f?.label}</span>. Bom treino! 💪</>;
            })()}
          </p>
        ) : (
          <>
            <p className="text-xs font-bold mb-2.5" style={{ color: "var(--black)" }}>Como te sentes hoje?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FEELINGS.map(f => (
                <button key={f.id} onClick={() => checkin.mutate(f.id)} disabled={checkin.isPending}
                  className="flex flex-col items-center gap-1 py-2.5 rounded-xl cursor-pointer transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: "var(--white)" }}>
                  <span className="text-xl">{f.emoji}</span>
                  <span className="text-[10px] font-semibold text-center leading-tight" style={{ color: "var(--gray)" }}>{f.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
