import { Redirect } from "wouter";
import { authClient } from "../lib/auth";

export function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cream)" }}>
        <div className="flex flex-col items-center gap-4">
          <img src="/focu-logo.jpg" alt="FO.CU" className="w-20 h-20 object-contain" />
          <div className="spinner" style={{ borderTopColor: "var(--orange)", borderColor: "var(--peach)" }} />
        </div>
      </div>
    );
  }

  if (!session) return <Redirect to="/loja" />;

  const role = (session.user as any).role as string ?? "pending";

  // Admin-only route guard
  if (adminOnly && role !== "admin") return <Redirect to="/" />;

  // Pending users → payment wall (except admin)
  if (role === "pending" && role !== "admin") return <Redirect to="/acesso-pendente" />;

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute adminOnly>{children}</ProtectedRoute>;
}
