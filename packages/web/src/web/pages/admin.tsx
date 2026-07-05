import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getToken } from "../lib/auth";
import { Shield, Users, CheckCircle, Clock, Crown, Search, History, ChevronLeft, ChevronRight, BarChart3, Send, Bell } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin: { label: "Admin", color: "#7C3AED", icon: <Crown size={14} /> },
  member: { label: "Membro", color: "#16A34A", icon: <CheckCircle size={14} /> },
  pending: { label: "Pendente", color: "#D97706", icon: <Clock size={14} /> },
};

const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

export default function AdminPage() {
  const qc = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; name: string; role: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showAudit, setShowAudit] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const [broadcast, setBroadcast] = useState({ title: "", body: "" });
  const [broadcastState, setBroadcastState] = useState<"idle" | "sending" | string>("idle");

  const { data: metricsData } = useQuery({
    queryKey: ["admin-metrics"],
    enabled: showMetrics,
    queryFn: async () => {
      const res = await fetch("/api/admin/metrics", { headers: authHeaders() });
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{
        series: Array<{ day: string; signups: number; foodLogs: number; checkins: number }>;
        active7d: number;
        pushSubscribers: number;
      }>;
    },
  });

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setBroadcastState("sending");
    try {
      const res = await fetch("/api/push/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ title: broadcast.title, body: broadcast.body, url: "/" }),
      });
      const data = await res.json() as any;
      if (!res.ok) throw new Error(data.error || data.message || "Erro");
      setBroadcastState(`✅ Enviada a ${data.sent} de ${data.total} dispositivos.`);
      setBroadcast({ title: "", body: "" });
    } catch (err: any) {
      setBroadcastState(`Erro: ${err.message}`);
    }
  };

  const { data: statsData } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats", { headers: authHeaders() });
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{ stats: { total: number; members: number; pending: number; admins: number; new7d: number; new30d: number } }>;
    },
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users", search, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search.trim()) params.set("q", search.trim());
      const res = await fetch(`/api/admin/users?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{ users: Array<{ id: string; name: string; email: string; role: string; createdAt: number }>; total: number; page: number; pageSize: number }>;
    },
  });

  const { data: auditData } = useQuery({
    queryKey: ["admin-audit"],
    enabled: showAudit,
    queryFn: async () => {
      const res = await fetch("/api/admin/audit", { headers: authHeaders() });
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{ logs: Array<{ id: number; adminName: string; targetEmail: string; action: string; createdAt: number }> }>;
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error || "Failed");
      }
      return res.json();
    },
    onMutate: ({ id }) => setLoadingId(id),
    onSettled: () => {
      setLoadingId(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-audit"] });
    },
  });

  const stats = statsData?.stats;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--orange)" }}>
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>Painel Admin</h1>
            <p className="text-sm" style={{ color: "var(--gray)" }}>Gestão de utilizadores FO.CU</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMetrics(!showMetrics)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border transition-opacity hover:opacity-80"
            style={showMetrics ? { background: "var(--orange)", color: "white", borderColor: "var(--orange)" } : { borderColor: "var(--gray-lt)", color: "var(--gray)" }}
          >
            <BarChart3 size={16} /> Métricas
          </button>
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer border transition-opacity hover:opacity-80"
            style={showAudit ? { background: "var(--orange)", color: "white", borderColor: "var(--orange)" } : { borderColor: "var(--gray-lt)", color: "var(--gray)" }}
          >
            <History size={16} /> Histórico
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total", value: stats.total, color: "var(--orange)" },
            { label: "Membros", value: stats.members, color: "#16A34A" },
            { label: "Pendentes", value: stats.pending, color: "#D97706" },
            { label: "Admins", value: stats.admins, color: "#7C3AED" },
            { label: "Novos (7 dias)", value: stats.new7d, color: "#0891B2" },
            { label: "Novos (30 dias)", value: stats.new30d, color: "#0891B2" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl p-5 shadow-sm" style={{ background: "var(--white)" }}>
              <p className="text-3xl font-black" style={{ color }}>{value}</p>
              <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Métricas de engagement */}
      {showMetrics && (
        <div className="space-y-4">
          {metricsData && (
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl p-5 shadow-sm" style={{ background: "var(--white)" }}>
                <p className="text-3xl font-black" style={{ color: "#0891B2" }}>{metricsData.active7d}</p>
                <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>Ativos últimos 7 dias</p>
              </div>
              <div className="rounded-2xl p-5 shadow-sm" style={{ background: "var(--white)" }}>
                <p className="text-3xl font-black" style={{ color: "#7C3AED" }}>{metricsData.pushSubscribers}</p>
                <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>Dispositivos com notificações</p>
              </div>
            </div>
          )}

          {/* Gráficos 30 dias */}
          {metricsData && ([
            ["Registos de novos utilizadores", "signups", "var(--orange)"],
            ["Refeições registadas", "foodLogs", "#16A34A"],
            ["Treinos marcados", "checkins", "#0891B2"],
          ] as const).map(([label, key, color]) => {
            const max = Math.max(1, ...metricsData.series.map((s) => s[key]));
            return (
              <div key={key} className="rounded-2xl p-5 shadow-sm" style={{ background: "var(--white)" }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold" style={{ color: "var(--black)" }}>{label}</p>
                  <p className="text-xs" style={{ color: "var(--gray)" }}>
                    últimos 30 dias · total {metricsData.series.reduce((a, s) => a + s[key], 0)}
                  </p>
                </div>
                <div className="flex items-end gap-[2px] h-20">
                  {metricsData.series.map((s) => (
                    <div key={s.day} className="flex-1 rounded-t group relative" title={`${new Date(s.day + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}: ${s[key]}`}
                      style={{ background: s[key] > 0 ? color : "var(--cream)", height: `${Math.max(4, (s[key] / max) * 100)}%`, opacity: s[key] > 0 ? 0.9 : 1 }} />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px]" style={{ color: "var(--gray)" }}>
                    {new Date(metricsData.series[0]?.day + "T12:00:00").toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                  </span>
                  <span className="text-[9px]" style={{ color: "var(--gray)" }}>hoje</span>
                </div>
              </div>
            );
          })}

          {/* Broadcast de notificações */}
          <div className="rounded-2xl p-5 shadow-sm" style={{ background: "var(--white)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Bell size={16} style={{ color: "var(--orange)" }} />
              <p className="text-sm font-bold" style={{ color: "var(--black)" }}>Enviar notificação a todos</p>
            </div>
            <form onSubmit={sendBroadcast} className="space-y-3">
              <input
                type="text" value={broadcast.title}
                onChange={(e) => setBroadcast((b) => ({ ...b, title: e.target.value }))}
                placeholder="Título — ex: Novo treino disponível! 🍑"
                className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
                style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                required maxLength={80}
              />
              <textarea
                value={broadcast.body}
                onChange={(e) => setBroadcast((b) => ({ ...b, body: e.target.value }))}
                placeholder="Mensagem (opcional)"
                rows={2} maxLength={200}
                className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none resize-none"
                style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
              />
              <div className="flex items-center gap-3">
                <button
                  type="submit" disabled={broadcastState === "sending"}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer disabled:opacity-60"
                  style={{ background: "var(--orange)" }}
                >
                  <Send size={14} /> {broadcastState === "sending" ? "A enviar..." : "Enviar"}
                </button>
                {broadcastState !== "idle" && broadcastState !== "sending" && (
                  <p className="text-xs" style={{ color: broadcastState.startsWith("✅") ? "#16A34A" : "#DC2626" }}>{broadcastState}</p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit log */}
      {showAudit && (
        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: "var(--white)" }}>
          <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--gray-lt)" }}>
            <History size={18} style={{ color: "var(--orange)" }} />
            <h2 className="font-bold" style={{ color: "var(--black)" }}>Histórico de ações</h2>
          </div>
          {auditData?.logs?.length === 0 && (
            <p className="p-6 text-sm text-center" style={{ color: "var(--gray)" }}>Ainda não há ações registadas.</p>
          )}
          <div className="divide-y" style={{ borderColor: "var(--gray-lt)" }}>
            {auditData?.logs?.map((l) => (
              <div key={l.id} className="px-6 py-3 flex items-center justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <span className="font-semibold" style={{ color: "var(--black)" }}>{l.adminName}</span>
                  <span style={{ color: "var(--gray)" }}> alterou </span>
                  <span className="font-semibold" style={{ color: "var(--black)" }}>{l.targetEmail}</span>
                  <span style={{ color: "var(--gray)" }}> — {l.action}</span>
                </div>
                <span className="text-xs shrink-0" style={{ color: "var(--gray)" }}>
                  {l.createdAt ? new Date(l.createdAt).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users table */}
      <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: "var(--white)" }}>
        <div className="px-6 py-4 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: "var(--gray-lt)" }}>
          <div className="flex items-center gap-2">
            <Users size={18} style={{ color: "var(--orange)" }} />
            <h2 className="font-bold" style={{ color: "var(--black)" }}>Utilizadores</h2>
            {data && <span className="text-xs" style={{ color: "var(--gray)" }}>({data.total})</span>}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--gray)" }} />
            <input
              type="text"
              placeholder="Pesquisar por nome ou email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-sm border outline-none"
              style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
            />
          </div>
        </div>

        {isLoading && (
          <div className="p-12 text-center text-sm" style={{ color: "var(--gray)" }}>A carregar...</div>
        )}
        {error && (
          <div className="p-12 text-center text-sm text-red-500">Sem permissão ou erro de carregamento.</div>
        )}
        {data?.users?.length === 0 && (
          <div className="p-12 text-center text-sm" style={{ color: "var(--gray)" }}>Nenhum utilizador encontrado.</div>
        )}

        {data?.users && data.users.length > 0 && (
          <div className="divide-y" style={{ borderColor: "var(--gray-lt)" }}>
            {data.users.map((u) => {
              const roleInfo = ROLE_LABELS[u.role] ?? ROLE_LABELS.pending;
              return (
                <div key={u.id} className="flex items-center gap-4 px-6 py-4">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: "var(--orange)" }}>
                    {u.name?.charAt(0).toUpperCase() ?? "?"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: "var(--black)" }}>{u.name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--gray)" }}>{u.email}</p>
                  </div>

                  {/* Registo */}
                  <span className="text-xs hidden md:block shrink-0" style={{ color: "var(--gray)" }}>
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString("pt-PT") : ""}
                  </span>

                  {/* Current role badge */}
                  <div className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${roleInfo.color}18`, color: roleInfo.color }}>
                    {roleInfo.icon}
                    <span>{roleInfo.label}</span>
                  </div>

                  {/* Role change buttons */}
                  <div className="flex gap-2 shrink-0">
                    {u.role === "pending" && (
                      <button
                        disabled={loadingId === u.id}
                        onClick={() => changeRole.mutate({ id: u.id, role: "member" })}
                        className="text-xs px-3 py-1.5 rounded-xl font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-40"
                        style={{ background: "#DCFCE7", color: "#16A34A" }}
                      >
                        Ativar
                      </button>
                    )}
                    {u.role === "member" && (
                      <button
                        disabled={loadingId === u.id}
                        onClick={() => setConfirmAction({ id: u.id, name: u.name, role: "pending" })}
                        className="text-xs px-3 py-1.5 rounded-xl font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-40"
                        style={{ background: "#FEF3C7", color: "#D97706" }}
                      >
                        Suspender
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginação */}
        {data && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-6 py-4 border-t" style={{ borderColor: "var(--gray-lt)" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-xl cursor-pointer disabled:opacity-30"
              style={{ color: "var(--gray)" }}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm" style={{ color: "var(--gray)" }}>Página {page} de {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-xl cursor-pointer disabled:opacity-30"
              style={{ color: "var(--gray)" }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Confirmação de suspensão */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl" style={{ background: "var(--white)" }}>
            <h3 className="text-lg font-black mb-2" style={{ color: "var(--black)" }}>Suspender acesso?</h3>
            <p className="text-sm mb-6" style={{ color: "var(--gray)" }}>
              <strong>{confirmAction.name}</strong> vai perder o acesso à plataforma imediatamente e voltar ao estado pendente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer border"
                style={{ borderColor: "var(--gray-lt)", color: "var(--gray)" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => { changeRole.mutate({ id: confirmAction.id, role: confirmAction.role }); setConfirmAction(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white cursor-pointer"
                style={{ background: "#D97706" }}
              >
                Suspender
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
