import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "../lib/auth";
import { KeyRound, Plus, Trash2, Check, Clock, Infinity as InfinityIcon } from "lucide-react";

const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });

type Customer = {
  email: string;
  plan: string | null;
  paidAt: number | null;
  expiresAt: number | null;
  accountRole: string | null;
};

export function ManualAccessSection() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [duration, setDuration] = useState<"month" | "lifetime">("month");
  const [msg, setMsg] = useState("");

  const { data } = useQuery({
    queryKey: ["paid-emails"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/paid-emails", { headers: authHeaders() });
      if (!res.ok) throw new Error();
      return res.json() as Promise<{ customers: Customer[] }>;
    },
  });

  const addEmail = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/paid-emails", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ email, duration }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erro");
      return d as { promoted: boolean; hasAccount: boolean };
    },
    onSuccess: (d) => {
      setMsg(d.hasAccount
        ? (d.promoted ? "✅ Email autorizado e conta ativada." : "✅ Email autorizado (a conta já tinha acesso).")
        : "✅ Email autorizado. Fica ativo assim que a pessoa criar conta com este email.");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["paid-emails"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setTimeout(() => setMsg(""), 5000);
    },
    onError: (e: any) => setMsg(e.message || "Erro ao autorizar."),
  });

  const removeEmail = useMutation({
    mutationFn: async (em: string) => {
      const res = await fetch(`/api/admin/paid-emails/${encodeURIComponent(em)}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paid-emails"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const customers = data?.customers ?? [];
  const fmt = (t: number | null) => t ? new Date(t).toLocaleDateString("pt-PT") : null;

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: "var(--white)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-6 py-4 cursor-pointer">
        <KeyRound size={18} style={{ color: "var(--orange)" }} />
        <h2 className="font-bold flex-1 text-left" style={{ color: "var(--black)" }}>Acesso manual (pagamentos fora da plataforma)</h2>
        <span className="text-xs" style={{ color: "var(--gray)" }}>{open ? "Fechar" : "Abrir"}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-4 border-t" style={{ borderColor: "var(--gray-lt)" }}>
          <p className="text-sm mt-4" style={{ color: "var(--gray)" }}>
            Autoriza o acesso de alguém que pagou por fora (MB Way, transferência, etc.). Se a pessoa já tiver conta pendente, é ativada na hora; se ainda não tiver, fica autorizada e entra automaticamente assim que criar conta com este email.
          </p>

          {/* Adicionar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="flex-1 px-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
            />
            <select value={duration} onChange={(e) => setDuration(e.target.value as "month" | "lifetime")}
              className="px-3 py-2.5 rounded-xl text-sm border outline-none cursor-pointer"
              style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}>
              <option value="month">1 mês</option>
              <option value="lifetime">Sem expiração</option>
            </select>
            <button
              onClick={() => email.trim() && addEmail.mutate()}
              disabled={addEmail.isPending || !email.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer disabled:opacity-50"
              style={{ background: "var(--orange)" }}>
              <Plus size={16} /> Autorizar
            </button>
          </div>
          {msg && <p className="text-xs font-medium" style={{ color: msg.startsWith("✅") ? "#16A34A" : "#EF4444" }}>{msg}</p>}

          {/* Lista */}
          {customers.length > 0 && (
            <div className="divide-y rounded-xl border" style={{ borderColor: "var(--gray-lt)" }}>
              {customers.map((cst) => {
                const expired = cst.expiresAt != null && cst.expiresAt < Date.now();
                return (
                  <div key={cst.email} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--black)" }}>{cst.email}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--peach)", color: "var(--orange)" }}>
                          {cst.plan === "manual" ? "Manual" : cst.plan === "mensal-recorrente" ? "Stripe recorrente" : cst.plan === "mensal-avulso" ? "Stripe avulso" : (cst.plan ?? "—")}
                        </span>
                        <span className="text-[11px] flex items-center gap-1" style={{ color: expired ? "#EF4444" : "var(--gray)" }}>
                          {cst.expiresAt == null ? <><InfinityIcon size={11} /> sem expiração</> : <><Clock size={11} /> {expired ? "expirou" : "até"} {fmt(cst.expiresAt)}</>}
                        </span>
                        {cst.accountRole == null
                          ? <span className="text-[11px]" style={{ color: "var(--gray)" }}>· ainda sem conta</span>
                          : cst.accountRole === "member"
                            ? <span className="text-[11px] flex items-center gap-0.5" style={{ color: "#16A34A" }}><Check size={11} /> ativa</span>
                            : cst.accountRole === "admin"
                              ? <span className="text-[11px]" style={{ color: "#7C3AED" }}>· admin</span>
                              : <span className="text-[11px]" style={{ color: "#D97706" }}>· conta pendente</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => { if (confirm(`Revogar o acesso de ${cst.email}?`)) removeEmail.mutate(cst.email); }}
                      className="p-2 rounded-lg cursor-pointer shrink-0" style={{ color: "#EF4444" }} title="Revogar acesso">
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
