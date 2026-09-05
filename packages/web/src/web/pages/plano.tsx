import { useQuery } from "@tanstack/react-query";
import { getToken } from "../lib/auth";
import { Dumbbell, PlayCircle, StickyNote } from "lucide-react";
import { Link } from "wouter";

type Exercise = { name: string; sets?: string; reps?: string; notes?: string; videoId?: number | null };
type Day = { name: string; exercises: Exercise[] };
type Plan = { title: string; days: string; notes?: string | null; updatedAt?: number } | null;

export default function PlanoPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["training-plan-me"],
    queryFn: async () => {
      const res = await fetch("/api/training/me", { headers: { Authorization: `Bearer ${getToken()}` } });
      return res.json() as Promise<{ plan: Plan }>;
    },
  });

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
          Plano de treino personalizado, feito pela tua treinadora só para ti.
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
                    <div key={j} className="px-5 py-3">
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
                        </div>
                        {ex.videoId != null && (
                          <Link to={`/videos`}>
                            <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer shrink-0" style={{ background: "var(--peach)", color: "var(--orange)" }}>
                              <PlayCircle size={14} /> Vídeo
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
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
