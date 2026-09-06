import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "../lib/auth";
import { KeyRound, Plus, Trash2, Check, Clock, Infinity as InfinityIcon, Link2, Copy, TrendingUp } from "lucide-react";

const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });

type Customer = {
  email: string;
  plan: string | null;
  paidAt: number | null;
  expiresAt: number | null;
  amount: number | null; // cêntimos
  method: string | null;
  accountRole: string | null;
};

const METHOD_LABELS: Record<string, string> = {
  stripe: "Stripe", mbway: "MB Way", transferencia: "Transferência", dinheiro: "Dinheiro", outro: "Outro",
};

const eur = (cents: number) => (cents / 100).toLocaleString("pt-PT", { style: "currency", currency: "EUR" });

export function ManualAccessSection() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [duration, setDuration] = useState<"month" | "lifetime">("month");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mbway");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["paid-emails"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/paid-emails", { headers: authHeaders() });
      if (!res.ok) throw new Error();
      return res.json() as Promise<{ customers: Customer[] }>;
    },
  });

  const { data: revenue } = useQuery({
    queryKey: ["admin-revenue"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/admin/revenue", { headers: authHeaders() });
      if (!res.ok) throw new Error();
      return res.json() as Promise<{ totalCents: number; monthCents: number; withAmount: number; totalRecords: number; byMethod: Record<string, number> }>;
    },
  });

  const { data: config } = useQuery({
    queryKey: ["public-config"],
    enabled: open,
    queryFn: async () => (await fetch("/api/config")).json() as Promise<{ paymentLink?: string; subscriptionLink?: string }>,
  });

  const addEmail = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/paid-emails", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ email, duration, amount, method }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erro");
      return d as { promoted: boolean; hasAccount: boolean };
    },
    onSuccess: (d) => {
      setMsg(d.hasAccount
        ? (d.promoted ? "✅ Email autorizado e conta ativada." : "✅ Email autorizado (a conta já tinha acesso).")
        : "✅ Email autorizado. Fica ativo assim que a pessoa criar conta com este email.");
      setEmail(""); setAmount("");
      qc.invalidateQueries({ queryKey: ["paid-emails"] });
      qc.invalidateQueries({ queryKey: ["admin-revenue"] });
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
      qc.invalidateQueries({ queryKey: ["admin-revenue"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const copy = (label: string, text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  };

  const customers = data?.customers ?? [];
  const fmt = (t: number | null) => t ? new Date(t).toLocaleDateString("pt-PT") : null;

  return (
    <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: "var(--white)" }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-6 py-4 cursor-pointer">
        <KeyRound size={18} style={{ color: "var(--orange)" }} />
        <h2 className="font-bold flex-1 text-left" style={{ color: "var(--black)" }}>Acessos & pagamentos</h2>
        <span className="text-xs" style={{ color: "var(--gray)" }}>{open ? "Fechar" : "Abrir"}</span>
      </button>

      {open && (
        <div className="px-6 pb-6 space-y-5 border-t" style={{ borderColor: "var(--gray-lt)" }}>
          {/* Resumo de receita */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            <div className="rounded-xl p-4" style={{ background: "var(--peach)" }}>
              <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={14} style={{ color: "var(--orange)" }} /><span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--orange)" }}>Total</span></div>
              <p className="text-xl font-black" style={{ color: "var(--black)" }}>{eur(revenue?.totalCents ?? 0)}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: "var(--cream)" }}>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--gray)" }}>Este mês</span>
              <p className="text-xl font-black mt-1" style={{ color: "var(--black)" }}>{eur(revenue?.monthCents ?? 0)}</p>
            </div>
            <div className="rounded-xl p-4 col-span-2 sm:col-span-1" style={{ background: "var(--cream)" }}>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--gray)" }}>Pagamentos registados</span>
              <p className="text-xl font-black mt-1" style={{ color: "var(--black)" }}>{revenue?.withAmount ?? 0}</p>
            </div>
          </div>
          {revenue && Object.keys(revenue.byMethod).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(revenue.byMethod).map(([m, cents]) => (
                <span key={m} className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--cream)", color: "var(--gray)" }}>
                  {METHOD_LABELS[m] ?? m}: <strong style={{ color: "var(--black)" }}>{eur(cents)}</strong>
                </span>
              ))}
            </div>
          )}

          {/* Links de pagamento */}
          {(config?.paymentLink || config?.subscriptionLink) && (
            <div className="rounded-xl p-4" style={{ background: "var(--cream)" }}>
              <div className="flex items-center gap-1.5 mb-2"><Link2 size={14} style={{ color: "var(--orange)" }} /><span className="text-xs font-bold" style={{ color: "var(--black)" }}>Links de pagamento (para enviar à aluna)</span></div>
              <div className="flex flex-col gap-2">
                {config?.paymentLink && (
                  <button onClick={() => copy("avulso", config.paymentLink!)} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ background: "var(--white)", color: "var(--black)" }}>
                    <span className="truncate">Pagamento avulso (1 mês)</span>
                    <span className="flex items-center gap-1 text-xs font-semibold shrink-0" style={{ color: "var(--orange)" }}>{copied === "avulso" ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}</span>
                  </button>
                )}
                {config?.subscriptionLink && (
                  <button onClick={() => copy("recorrente", config.subscriptionLink!)} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ background: "var(--white)", color: "var(--black)" }}>
                    <span className="truncate">Subscrição mensal (recorrente)</span>
                    <span className="flex items-center gap-1 text-xs font-semibold shrink-0" style={{ color: "var(--orange)" }}>{copied === "recorrente" ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar</>}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Autorizar acesso manual */}
          <div>
            <p className="text-sm font-bold mb-2" style={{ color: "var(--black)" }}>Autorizar acesso (pagamento fora da plataforma)</p>
            <p className="text-xs mb-3" style={{ color: "var(--gray)" }}>
              Para quem pagou por fora (MB Way, transferência…). Se já tiver conta pendente, é ativada na hora; senão, fica autorizada e entra ao criar conta com este email.
            </p>
            <div className="space-y-2">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com"
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <select value={duration} onChange={(e) => setDuration(e.target.value as "month" | "lifetime")}
                  className="px-3 py-2.5 rounded-xl text-sm border outline-none cursor-pointer"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}>
                  <option value="month">1 mês</option>
                  <option value="lifetime">Sem expiração</option>
                </select>
                <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor €"
                  className="px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                <select value={method} onChange={(e) => setMethod(e.target.value)}
                  className="px-3 py-2.5 rounded-xl text-sm border outline-none cursor-pointer"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}>
                  <option value="mbway">MB Way</option>
                  <option value="transferencia">Transferência</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="outro">Outro</option>
                </select>
                <button onClick={() => email.trim() && addEmail.mutate()} disabled={addEmail.isPending || !email.trim()}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer disabled:opacity-50"
                  style={{ background: "var(--orange)" }}>
                  <Plus size={16} /> Autorizar
                </button>
              </div>
            </div>
            {msg && <p className="text-xs font-medium mt-2" style={{ color: msg.startsWith("✅") ? "#16A34A" : "#EF4444" }}>{msg}</p>}
          </div>

          {/* Lista */}
          {customers.length > 0 && (
            <div className="divide-y rounded-xl border" style={{ borderColor: "var(--gray-lt)" }}>
              {customers.map((cst) => {
                const expired = cst.expiresAt != null && cst.expiresAt < Date.now();
                return (
                  <div key={cst.email} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--black)" }}>{cst.email}</p>
                        {cst.amount != null && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#DCFCE7", color: "#16A34A" }}>
                            {eur(cst.amount)}{cst.method ? ` · ${METHOD_LABELS[cst.method] ?? cst.method}` : ""}
                          </span>
                        )}
                      </div>
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
                    <button onClick={() => { if (confirm(`Revogar o acesso de ${cst.email}?`)) removeEmail.mutate(cst.email); }}
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
