import { useEffect, useState } from "react";
import { getToken } from "../lib/auth";
import { X, Plus, Trash2, GripVertical, Save, Dumbbell } from "lucide-react";

type Exercise = { name: string; sets: string; reps: string; notes: string; videoId: number | null };
type Day = { name: string; exercises: Exercise[] };

const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });
const emptyExercise = (): Exercise => ({ name: "", sets: "", reps: "", notes: "", videoId: null });

export function TrainingPlanEditor({ userId, userName, onClose }: { userId: string; userName: string; onClose: () => void }) {
  const [title, setTitle] = useState("O teu plano");
  const [notes, setNotes] = useState("");
  const [days, setDays] = useState<Day[]>([]);
  const [videos, setVideos] = useState<Array<{ id: number; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "done" | "error">("idle");

  useEffect(() => {
    (async () => {
      try {
        const [planRes, vidRes] = await Promise.all([
          fetch(`/api/training/${userId}`, { headers: authHeaders() }),
          fetch(`/api/videos`, { headers: authHeaders() }),
        ]);
        const planData = await planRes.json();
        const vidData = await vidRes.json();
        setVideos((vidData?.videos ?? []).map((v: any) => ({ id: v.id, title: v.title })));
        if (planData?.plan) {
          setTitle(planData.plan.title ?? "O teu plano");
          setNotes(planData.plan.notes ?? "");
          try { setDays(JSON.parse(planData.plan.days ?? "[]")); } catch { setDays([]); }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const addDay = () => setDays((d) => [...d, { name: `Dia ${d.length + 1}`, exercises: [emptyExercise()] }]);
  const removeDay = (i: number) => setDays((d) => d.filter((_, idx) => idx !== i));
  const setDayName = (i: number, name: string) => setDays((d) => d.map((day, idx) => idx === i ? { ...day, name } : day));
  const addExercise = (di: number) => setDays((d) => d.map((day, idx) => idx === di ? { ...day, exercises: [...day.exercises, emptyExercise()] } : day));
  const removeExercise = (di: number, ei: number) => setDays((d) => d.map((day, idx) => idx === di ? { ...day, exercises: day.exercises.filter((_, j) => j !== ei) } : day));
  const setExercise = (di: number, ei: number, patch: Partial<Exercise>) =>
    setDays((d) => d.map((day, idx) => idx === di ? { ...day, exercises: day.exercises.map((ex, j) => j === ei ? { ...ex, ...patch } : ex) } : day));

  const save = async () => {
    setSaveState("saving");
    try {
      const res = await fetch(`/api/training/${userId}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ title, notes, days }),
      });
      if (!res.ok) throw new Error();
      setSaveState("done");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-y-auto" style={{ background: "var(--cream)" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: "var(--cream)", borderColor: "var(--gray-lt)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <Dumbbell size={18} style={{ color: "var(--orange)" }} />
            <div className="min-w-0">
              <h3 className="text-base font-black truncate" style={{ color: "var(--black)" }}>Plano de treino</h3>
              <p className="text-xs truncate" style={{ color: "var(--gray)" }}>{userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="cursor-pointer p-1"><X size={22} style={{ color: "var(--gray)" }} /></button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm" style={{ color: "var(--gray)" }}>A carregar…</div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Título + nota geral */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Título do plano</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Nota geral (opcional)</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Ex: Descansa 60-90s entre séries. Foca a técnica."
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none resize-y"
                style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
            </div>

            {/* Dias */}
            {days.map((day, di) => (
              <div key={di} className="rounded-2xl p-4" style={{ background: "var(--white)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <GripVertical size={16} style={{ color: "var(--gray-lt)" }} />
                  <input value={day.name} onChange={(e) => setDayName(di, e.target.value)} placeholder={`Dia ${di + 1}`}
                    className="flex-1 px-3 py-2 rounded-xl text-sm font-bold border outline-none"
                    style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                  <button onClick={() => removeDay(di)} className="p-2 rounded-lg cursor-pointer" style={{ color: "#EF4444" }} title="Remover dia">
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="space-y-3">
                  {day.exercises.map((ex, ei) => (
                    <div key={ei} className="rounded-xl p-3" style={{ background: "var(--cream)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <input value={ex.name} onChange={(e) => setExercise(di, ei, { name: e.target.value })} placeholder="Nome do exercício"
                          className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold border outline-none"
                          style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                        <button onClick={() => removeExercise(di, ei)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#EF4444" }} title="Remover exercício">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input value={ex.sets} onChange={(e) => setExercise(di, ei, { sets: e.target.value })} placeholder="Séries (ex: 4)"
                          className="px-3 py-2 rounded-lg text-sm border outline-none"
                          style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                        <input value={ex.reps} onChange={(e) => setExercise(di, ei, { reps: e.target.value })} placeholder="Reps (ex: 12)"
                          className="px-3 py-2 rounded-lg text-sm border outline-none"
                          style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                      </div>
                      <input value={ex.notes} onChange={(e) => setExercise(di, ei, { notes: e.target.value })} placeholder="Notas (opcional)"
                        className="w-full px-3 py-2 rounded-lg text-sm border outline-none mb-2"
                        style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                      <select value={ex.videoId ?? ""} onChange={(e) => setExercise(di, ei, { videoId: e.target.value ? Number(e.target.value) : null })}
                        className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
                        style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }}>
                        <option value="">— Associar vídeo (opcional) —</option>
                        {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
                      </select>
                    </div>
                  ))}
                  <button onClick={() => addExercise(di)} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer border-2 border-dashed"
                    style={{ borderColor: "var(--gray-lt)", color: "var(--gray)" }}>
                    <Plus size={14} /> Adicionar exercício
                  </button>
                </div>
              </div>
            ))}

            <button onClick={addDay} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl text-sm font-semibold cursor-pointer border-2 border-dashed"
              style={{ borderColor: "var(--orange)", color: "var(--orange)" }}>
              <Plus size={16} /> Adicionar dia
            </button>

            {/* Guardar */}
            <button onClick={save} disabled={saveState === "saving"}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm text-white cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: saveState === "done" ? "#16A34A" : "var(--orange)" }}>
              <Save size={16} />
              {saveState === "saving" ? "A guardar…" : saveState === "done" ? "✓ Plano guardado" : "Guardar plano"}
            </button>
            {saveState === "error" && <p className="text-xs text-center text-red-500">Erro ao guardar. Tenta novamente.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
