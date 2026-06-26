import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { hc } from "hono/client";
import type { AppType } from "../../api";
import { getToken } from "../lib/auth";
import { Shield, Users, CheckCircle, Clock, Crown } from "lucide-react";

const api = hc<AppType>("/", {
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
});

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin: { label: "Admin", color: "#7C3AED", icon: <Crown size={14} /> },
  member: { label: "Membro", color: "#16A34A", icon: <CheckCircle size={14} /> },
  pending: { label: "Pendente", color: "#D97706", icon: <Clock size={14} /> },
};

export default function AdminPage() {
  const qc = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Forbidden");
      return res.json() as Promise<{ users: Array<{ id: string; name: string; email: string; role: string; createdAt: number }> }>;
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onMutate: ({ id }) => setLoadingId(id),
    onSettled: () => {
      setLoadingId(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const stats = data?.users
    ? {
        total: data.users.length,
        members: data.users.filter((u) => u.role === "member").length,
        pending: data.users.filter((u) => u.role === "pending").length,
        admins: data.users.filter((u) => u.role === "admin").length,
      }
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--orange)" }}>
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>Painel Admin</h1>
          <p className="text-sm" style={{ color: "var(--gray)" }}>Gestão de utilizadores FO.CU</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "var(--orange)" },
            { label: "Membros", value: stats.members, color: "#16A34A" },
            { label: "Pendentes", value: stats.pending, color: "#D97706" },
            { label: "Admins", value: stats.admins, color: "#7C3AED" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl p-5 shadow-sm" style={{ background: "var(--white)" }}>
              <p className="text-3xl font-black" style={{ color }}>{value}</p>
              <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Users table */}
      <div className="rounded-2xl shadow-sm overflow-hidden" style={{ background: "var(--white)" }}>
        <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "var(--gray-lt)" }}>
          <Users size={18} style={{ color: "var(--orange)" }} />
          <h2 className="font-bold" style={{ color: "var(--black)" }}>Utilizadores</h2>
        </div>

        {isLoading && (
          <div className="p-12 text-center text-sm" style={{ color: "var(--gray)" }}>A carregar...</div>
        )}
        {error && (
          <div className="p-12 text-center text-sm text-red-500">Sem permissão ou erro de carregamento.</div>
        )}

        {data?.users && (
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

                  {/* Current role badge */}
                  <div className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: `${roleInfo.color}18`, color: roleInfo.color }}>
                    {roleInfo.icon}
                    <span>{roleInfo.label}</span>
                  </div>

                  {/* Role change buttons */}
                  <div className="flex gap-2 shrink-0">
                    {u.role !== "member" && (
                      <button
                        disabled={loadingId === u.id}
                        onClick={() => changeRole.mutate({ id: u.id, role: "member" })}
                        className="text-xs px-3 py-1.5 rounded-xl font-semibold cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-40"
                        style={{ background: "#DCFCE7", color: "#16A34A" }}
                      >
                        Ativar
                      </button>
                    )}
                    {u.role !== "pending" && u.role !== "admin" && (
                      <button
                        disabled={loadingId === u.id}
                        onClick={() => changeRole.mutate({ id: u.id, role: "pending" })}
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
      </div>
    </div>
  );
}
