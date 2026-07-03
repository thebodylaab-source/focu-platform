import { useState } from "react";
import { authClient } from "../lib/auth";
import { useLocation } from "wouter";
import { Eye, EyeOff } from "lucide-react";

// Página de destino do link de recuperação (?token=...).
export default function ReporPasswordPage() {
  const [, navigate] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) {
        setError(res.error.message ?? "Link inválido ou expirado. Pede um novo.");
        return;
      }
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setError("Algo correu mal. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--cream)" }}>
      <img src="/focu-logo.jpg" alt="FO.CU" className="w-28 mb-8 rounded-xl" />
      <div className="w-full max-w-md rounded-3xl shadow-xl p-8" style={{ background: "var(--white)" }}>
        <h1 className="text-2xl font-black mb-2" style={{ color: "var(--black)" }}>Nova palavra-passe</h1>
        <p className="text-sm mb-6" style={{ color: "var(--gray)" }}>
          Escolhe uma nova palavra-passe para a tua conta.
        </p>

        {!token && (
          <div className="text-sm font-medium px-4 py-3 rounded-xl mb-4" style={{ background: "#FEE2E2", color: "#DC2626" }}>
            Link inválido. Pede uma nova recuperação a partir do login.
          </div>
        )}

        {done ? (
          <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: "#DCFCE7", color: "#16A34A" }}>
            ✅ Palavra-passe alterada! A redirecionar para o login...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Nova palavra-passe</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm font-medium outline-none border"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                  required minLength={8}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "var(--gray)" }}>
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Confirmar palavra-passe</label>
              <input
                type={showPwd ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none border"
                style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                required minLength={8}
              />
            </div>
            {error && (
              <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</div>
            )}
            <button
              type="submit" disabled={loading || !token}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white cursor-pointer disabled:opacity-60"
              style={{ background: "var(--orange)" }}
            >
              {loading ? "A guardar..." : "Guardar nova palavra-passe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
