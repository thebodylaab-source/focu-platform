import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, X, Printer } from "lucide-react";
import { getToken } from "../../lib/auth";

const dayStr = (d: Date) => d.toISOString().split("T")[0];

// Relatório dos últimos 7 dias: totais diários + médias. O botão Imprimir
// usa o diálogo do browser, que permite "Guardar como PDF".
export function WeeklyReport() {
  const [open, setOpen] = useState(false);

  const to = dayStr(new Date());
  const fromD = new Date();
  fromD.setDate(fromD.getDate() - 6);
  const from = dayStr(fromD);

  const { data, isLoading } = useQuery({
    queryKey: ["logs-range", from, to],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/nutrition/logs/range?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return res.json() as Promise<{ logs: any[] }>;
    },
  });

  const { data: goalData } = useQuery({
    queryKey: ["calorie-goal"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/nutrition/goal", { headers: { Authorization: `Bearer ${getToken()}` } });
      return res.json() as Promise<{ goal: { dailyCalories: number } | null }>;
    },
  });

  const logs = data?.logs ?? [];
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(fromD);
    d.setDate(fromD.getDate() + i);
    return dayStr(d);
  });
  const byDay = days.map((d) => {
    const dayLogs = logs.filter((l) => l.logDate === d);
    const sum = (k: string) => dayLogs.reduce((acc, l) => acc + (l[k] ?? 0) * (l.quantity ?? 1), 0);
    return { date: d, calories: sum("calories"), protein: sum("protein"), carbs: sum("carbs"), fat: sum("fat"), count: dayLogs.length };
  });
  const daysWithLogs = byDay.filter((d) => d.count > 0);
  const avg = (k: "calories" | "protein" | "carbs" | "fat") =>
    daysWithLogs.length ? Math.round(daysWithLogs.reduce((a, d) => a + d[k], 0) / daysWithLogs.length) : 0;
  const goal = goalData?.goal?.dailyCalories ?? null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border transition-opacity hover:opacity-80"
        style={{ borderColor: "var(--orange)", color: "var(--orange)", background: "transparent" }}
      >
        <FileDown size={13} /> Relatório semanal
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0 print:bg-white" style={{ background: "rgba(0,0,0,0.5)" }}>
          <style>{`@media print {
            body * { visibility: hidden; }
            #weekly-report, #weekly-report * { visibility: visible; }
            #weekly-report { position: absolute; left: 0; top: 0; width: 100%; }
          }`}</style>
          <div className="w-full max-w-lg max-h-[90vh] overflow-auto rounded-3xl p-6 shadow-2xl print:shadow-none print:max-w-full print:max-h-none print:rounded-none" style={{ background: "var(--white)" }} id="weekly-report">
            <div className="flex items-center justify-between mb-1 print:hidden">
              <h3 className="text-lg font-black" style={{ color: "var(--black)" }}>Relatório Semanal 📊</h3>
              <button onClick={() => setOpen(false)} className="cursor-pointer"><X size={22} style={{ color: "var(--gray)" }} /></button>
            </div>
            <h3 className="hidden print:block text-lg font-black mb-1">FO.CU — Relatório Semanal de Nutrição</h3>
            <p className="text-xs mb-5" style={{ color: "var(--gray)" }}>
              {new Date(from + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} — {new Date(to + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}
            </p>

            {isLoading ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--gray)" }}>A carregar...</p>
            ) : daysWithLogs.length === 0 ? (
              <p className="text-sm py-8 text-center" style={{ color: "var(--gray)" }}>
                Sem registos esta semana. Regista as tuas refeições no Rastreador para veres o relatório.
              </p>
            ) : (
              <>
                {/* Médias */}
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {[
                    ["🔥", avg("calories"), "kcal/dia"],
                    ["💪", avg("protein") + "g", "Proteína"],
                    ["🌾", avg("carbs") + "g", "Hidratos"],
                    ["🥑", avg("fat") + "g", "Gorduras"],
                  ].map(([e, v, l]) => (
                    <div key={l as string} className="text-center py-3 rounded-xl" style={{ background: "var(--cream)" }}>
                      <p className="text-base">{e}</p>
                      <p className="text-sm font-black" style={{ color: "var(--black)" }}>{v}</p>
                      <p className="text-[10px]" style={{ color: "var(--gray)" }}>{l}</p>
                    </div>
                  ))}
                </div>
                {goal && (
                  <p className="text-xs mb-4" style={{ color: "var(--gray)" }}>
                    Objetivo diário: <strong>{Math.round(goal)} kcal</strong> — média da semana{" "}
                    <strong style={{ color: avg("calories") <= goal ? "#16A34A" : "#DC2626" }}>
                      {avg("calories") <= goal ? "dentro do objetivo ✓" : `${avg("calories") - Math.round(goal)} kcal acima`}
                    </strong>
                  </p>
                )}

                {/* Tabela diária */}
                <div className="rounded-xl overflow-hidden border mb-5" style={{ borderColor: "var(--gray-lt)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: "var(--cream)" }}>
                        {["Dia", "Kcal", "Prot.", "Hidr.", "Gord."].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-bold" style={{ color: "var(--gray)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {byDay.map((d) => (
                        <tr key={d.date} className="border-t" style={{ borderColor: "var(--gray-lt)" }}>
                          <td className="px-3 py-2 font-semibold" style={{ color: "var(--black)" }}>
                            {new Date(d.date + "T12:00:00").toLocaleDateString("pt-PT", { weekday: "short", day: "numeric" })}
                          </td>
                          {d.count === 0 ? (
                            <td colSpan={4} className="px-3 py-2 italic" style={{ color: "var(--gray)" }}>Sem registos</td>
                          ) : (
                            <>
                              <td className="px-3 py-2 font-bold" style={{ color: "var(--orange)" }}>{Math.round(d.calories)}</td>
                              <td className="px-3 py-2" style={{ color: "var(--gray)" }}>{Math.round(d.protein)}g</td>
                              <td className="px-3 py-2" style={{ color: "var(--gray)" }}>{Math.round(d.carbs)}g</td>
                              <td className="px-3 py-2" style={{ color: "var(--gray)" }}>{Math.round(d.fat)}g</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white cursor-pointer print:hidden"
                  style={{ background: "var(--orange)" }}
                >
                  <Printer size={16} /> Imprimir / Guardar PDF
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
