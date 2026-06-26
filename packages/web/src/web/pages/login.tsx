import { useState } from "react";
import { authClient, captureToken } from "../lib/auth";
import { useLocation } from "wouter";
import { Eye, EyeOff, Flame } from "lucide-react";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({ name, email, password }, { onSuccess: captureToken });
        if (res.error) { setError(res.error.message ?? "Erro ao criar conta"); return; }
      } else {
        const res = await authClient.signIn.email({ email, password }, { onSuccess: captureToken });
        if (res.error) { setError(res.error.message ?? "Email ou palavra-passe inválidos"); return; }
      }
      navigate("/");
    } catch (err: any) {
      setError(err.message ?? "Algo correu mal. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "var(--cream)" }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden" style={{ background: "var(--orange)" }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-20" style={{ background: "var(--peach)" }} />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-10" style={{ background: "white" }} />
        <div className="relative z-10 text-center">
          <img src="/focu-logo.jpg" alt="FO.CU" className="w-44 mx-auto mb-8 rounded-2xl shadow-xl" />
          <h1 className="text-4xl font-black text-white mb-4 leading-tight">
            A tua transformação<br />começa aqui. 🍑
          </h1>
          <p className="text-white/80 text-lg font-medium max-w-xs mx-auto">
            Desafio de 4 semanas para glúteos que funcionam de verdade.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[["100+", "Exercícios"], ["4", "Semanas"], ["∞", "Resultados"]].map(([val, label]) => (
              <div key={label} className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.2)" }}>
                <p className="text-2xl font-black text-white">{val}</p>
                <p className="text-xs text-white/70 font-medium mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Mobile logo */}
        <img src="/focu-logo.jpg" alt="FO.CU" className="w-28 mb-8 lg:hidden rounded-xl" />

        <div className="w-full max-w-md">
          {/* Mode toggle */}
          <div className="flex rounded-2xl p-1 mb-8" style={{ background: "var(--peach)" }}>
            {(["login", "signup"] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
                style={mode === m ? { background: "var(--orange)", color: "white" } : { color: "var(--gray)" }}
              >
                {m === "login" ? "Entrar" : "Criar Conta"}
              </button>
            ))}
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--black)" }}>
            {mode === "login" ? "Bem-vinda de volta! 👋" : "Junta-te ao desafio!"}
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--gray)" }}>
            {mode === "login" ? "Entra na tua conta para continuar o desafio." : "Cria a tua conta e começa hoje."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Nome</label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="O teu nome"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
                  style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="o-teu@email.com"
                className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
                style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Palavra-passe</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm font-medium outline-none transition-all border"
                  style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                  required minLength={8}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" style={{ color: "var(--gray)" }}>
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 mt-2 cursor-pointer"
              style={{ background: loading ? "var(--orange-lt)" : "var(--orange)" }}
            >
              {loading ? <span className="flex items-center justify-center gap-2"><span className="spinner" />A carregar...</span>
                : mode === "login" ? "Entrar na plataforma" : "Criar conta gratuita"}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: "var(--gray)" }}>
            Ainda não tens acesso?{" "}
            <button onClick={() => navigate("/loja")} className="underline font-semibold cursor-pointer"
              style={{ color: "var(--orange)" }}>
              Ver o programa
            </button>
          </p>
          <p className="text-center text-xs mt-2" style={{ color: "var(--gray)" }}>
            By The Body Lab — todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
