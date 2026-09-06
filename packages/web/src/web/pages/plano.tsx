import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "../lib/auth";
import { Dumbbell, PlayCircle, StickyNote, Plus, TrendingUp, X, Trash2, Check } from "lucide-react";
import { Link } from "wouter";

type Exercise = { name: string; sets?: string; reps?: string; notes?: string; videoId?: number | null };
type Day = { name: string; exercises: Exercise[] };
type Plan = { title: string; days: string; notes?: string | null; updatedAt?: number } | null;
type Log = { id: number; exercise: string; weight: number | null; reps: string | null; notes: string | null; logDate: string };

const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });

// Linha de um exercício, com registo de carga e histórico.
function ExerciseRow({ ex, logs, onChanged }: { ex: Exercise; logs: Log[]; onChanged: () => void }) {
  const [logging, setLogging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState(ex.reps ?? "");

  const mine = logs.filter((l) => l.exercise.trim().toLowerCase() === ex.name.trim().toLowerCase());
  const last = mine[0]; // já vem ordenado por data desc

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/training/log", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ exercise: ex.name, weight: weight ? Number(weight.replace(",", ".")) : null, reps }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => { setLogging(false); setWeight(""); onChanged(); },
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/training/log/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
    },
    onSuccess: onChanged,
  });

  return (
    <div className="px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm" style={{ color: "var(--black)" }}>{ex.name}</p>
          {(ex.sets || ex.reps) && (
            <p className="text-xs mt-0.5" style={{ color: "var(--orange)" }}>
              {ex.sets && `${ex.sets} série${ex.sets === "1" ? "" : "s"}`}
              {ex.sets && ex.reps && " · "}
              {ex.reps && `${ex.reps} reps`}
            </p>
          )}
          {ex.notes && ex.notes.trim() && (
            <p className="text-xs mt-1 whitespace-pre-wrap" style={{ color: "var(--gray)" }}>{ex.notes}</p>
          )}
          {/* Última carga registada */}
          {last && (
            <button onClick={() => setShowHistory(!showHistory)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold cursor-pointer" style={{ color: "var(--green)" }}>
              <TrendingUp size={12} />
              Última: {last.weight != null ? `${last.weight} kg` : "—"}{last.reps ? ` × ${last.reps}` : ""} · {new Date(last.logDate + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {ex.videoId != null && (
            <Link to={`/videos?v=${ex.videoId}`}>
              <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer" style={{ background: "var(--peach)", color: "var(--orange)" }}>
                <PlayCircle size={14} /> Vídeo
              </button>
            </Link>
          )}
          <button onClick={() => setLogging(!logging)} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer text-white" style={{ background: "var(--orange)" }}>
            <Plus size={14} /> Carga
          </button>
        </div>
      </div>

      {/* Formulário de registo */}
      {logging && (
        <div className="mt-3 rounded-xl p-3 flex items-end gap-2 flex-wrap" style={{ background: "var(--cream)" }}>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Peso (kg)</label>
            <input type="number" step="0.5" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ex: 20"
              className="w-24 px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Reps</label>
            <input type="text" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="ex: 12"
              className="w-20 px-3 py-2 rounded-lg text-sm border outline-none" style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
          </div>
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold text-white cursor-pointer disabled:opacity-60" style={{ background: "var(--green)" }}>
            <Check size={15} /> Guardar
          </button>
          <button onClick={() => setLogging(false)} className="p-2 rounded-lg cursor-pointer" style={{ color: "var(--gray)" }}><X size={15} /></button>
        </div>
      )}

      {/* Histórico */}
      {showHistory && mine.length > 0 && (
        <div className="mt-2 rounded-xl p-2" style={{ background: "var(--cream)" }}>
          {mine.slice(0, 8).map((l) => (
            <div key={l.id} className="flex items-center justify-between px-2 py-1.5 text-xs">
              <span style={{ color: "var(--gray)" }}>{new Date(l.logDate + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}</span>
              <span className="font-semibold" style={{ color: "var(--black)" }}>{l.weight != null ? `${l.weight} kg` : "—"}{l.reps ? ` × ${l.reps}` : ""}</span>
              <button onClick={() => del.mutate(l.id)} className="p-1 rounded cursor-pointer" style={{ color: "#EF4444" }}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlanoPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["training-plan-me"],
    queryFn: async () => {
      const res = await fetch("/api/training/me", { headers: authHeaders() });
      return res.json() as Promise<{ plan: Plan }>;
    },
  });

  const { data: logsData } = useQuery({
    queryKey: ["training-logs-me"],
    queryFn: async () => {
      const res = await fetch("/api/training/logs", { headers: authHeaders() });
      return res.json() as Promise<{ logs: Log[] }>;
    },
  });
  const logs = logsData?.logs ?? [];
  const refreshLogs = () => qc.invalidateQueries({ queryKey: ["training-logs-me"] });

  const plan = data?.plan ?? null;
  let days: Day[] = [];
  try { days = plan?.days ? JSON.parse(plan.days) : []; } catch { days = []; }
  const hasContent = plan && (days.length > 0 || (plan.notes && plan.notes.trim()));

  return (
    <div className="fade-up space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>O meu plano 🎯</h1>
        <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>
          Plano de treino personalizado. Regista a carga em cada exercício para acompanhares a tua evolução.
        </p>
      </div>

      {isLoading ? (
        <div className="animate-pulse rounded-2xl h-40" style={{ background: "var(--peach)" }} />
      ) : !hasContent ? (
        <div className="rounded-2xl p-8 text-center" style={{ background: "var(--white)" }}>
          <div className="text-5xl mb-3">📝</div>
          <p className="font-bold text-base mb-1" style={{ color: "var(--black)" }}>Ainda não tens um plano personalizado</p>
          <p className="text-sm" style={{ color: "var(--gray)" }}>
            Assim que a tua treinadora criar o teu plano, ele aparece aqui.
            Entretanto tens acesso a todos os vídeos e conteúdos do programa.
          </p>
          <Link to="/videos">
            <button className="mt-4 px-5 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer" style={{ background: "var(--orange)" }}>
              Ver treinos do programa
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Título do plano + nota geral */}
          <div className="rounded-2xl p-5" style={{ background: "var(--orange)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--black)", opacity: 0.7 }}>O teu plano</p>
            <h2 className="text-xl font-black" style={{ color: "var(--black)" }}>{plan!.title}</h2>
            {plan!.notes && plan!.notes.trim() && (
              <div className="mt-3 rounded-xl p-3 flex gap-2" style={{ background: "rgba(255,255,255,0.55)" }}>
                <StickyNote size={16} className="shrink-0 mt-0.5" style={{ color: "var(--black)" }} />
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--black)" }}>{plan!.notes}</p>
              </div>
            )}
          </div>

          {/* Dias */}
          {days.map((day, i) => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "var(--white)" }}>
              <div className="flex items-center gap-2 px-5 py-3 border-b" style={{ borderColor: "var(--gray-lt)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--peach)" }}>
                  <Dumbbell size={15} style={{ color: "var(--orange)" }} />
                </div>
                <h3 className="font-black text-sm" style={{ color: "var(--black)" }}>{day.name || `Dia ${i + 1}`}</h3>
              </div>
              {day.exercises.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "var(--gray)" }}>Sem exercícios neste dia.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--gray-lt)" }}>
                  {day.exercises.map((ex, j) => (
                    <ExerciseRow key={j} ex={ex} logs={logs} onChanged={refreshLogs} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
