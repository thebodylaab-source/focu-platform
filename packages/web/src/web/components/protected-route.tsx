import { useEffect } from "react";
import { Redirect } from "wouter";
import { authClient } from "../lib/auth";

const FALLBACK_PAYMENT_LINK = "https://buy.stripe.com/14AfZj0jY7mZ5HB4dMfjG00";

// Ecrã de espera enquanto encaminha o utilizador (sem acesso pago) direto
// para a página de pagamento do Stripe, em vez da página "Acesso Pendente".
function RedirectToPayment() {
  useEffect(() => {
    let done = false;
    const go = (url: string) => { if (!done) { done = true; window.location.href = url; } };
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => go(d?.paymentLink || FALLBACK_PAYMENT_LINK))
      .catch(() => go(FALLBACK_PAYMENT_LINK));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--cream)" }}>
      <div className="flex flex-col items-center gap-4 text-center">
        <img src="/focu-logo.jpg" alt="FO.CU" className="w-20 h-20 object-contain" />
        <div className="spinner" style={{ borderTopColor: "var(--orange)", borderColor: "var(--peach)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--gray)" }}>
          A encaminhar para o pagamento...
        </p>
        <p className="text-xs" style={{ color: "var(--gray)" }}>
          Se não abrir, <a href="/acesso-pendente" className="underline" style={{ color: "var(--orange)" }}>clica aqui</a>.
        </p>
      </div>
    </div>
  );
}

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

  if (!session) return <Redirect to="/login" />;

  const role = (session.user as any).role as string ?? "pending";

  // Admin-only route guard
  if (adminOnly && role !== "admin") return <Redirect to="/" />;

  // Utilizadores sem acesso pago → direto para o pagamento (Stripe).
  // (A página /acesso-pendente continua a existir como rede de segurança.)
  if (role === "pending" && role !== "admin") return <RedirectToPayment />;

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute adminOnly>{children}</ProtectedRoute>;
}
