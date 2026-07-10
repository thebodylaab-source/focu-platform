import { useState, useEffect } from "react";
import { authClient, captureToken } from "../lib/auth";
import { useLocation } from "wouter";
import { Eye, EyeOff, Flame } from "lucide-react";

// Logo Google (multicolor) inline — evita depender de recursos externos.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

export default function LoginPage() {
  const [location, navigate] = useLocation();
  // Em /registar ou /register abre logo em modo "criar conta".
  const startSignup = location.includes("regist");
  const [mode, setMode] = useState<"login" | "signup">(startSignup ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acceptedRgpd, setAcceptedRgpd] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotMsg, setForgotMsg] = useState("");
  const [verifyEmailSent, setVerifyEmailSent] = useState(false); // registo feito, à espera de confirmação
  const [needsVerification, setNeedsVerification] = useState(false); // login bloqueado por email não confirmado
  const [resendMsg, setResendMsg] = useState("");
  const [googleAuth, setGoogleAuth] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => setGoogleAuth(!!d.googleAuth))
      .catch(() => {});
  }, []);

  const handleGoogle = async () => {
    setError("");
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/" });
    } catch {
      setError("Não foi possível iniciar com o Google. Tenta novamente.");
    }
  };

  const resendVerification = async () => {
    setResendMsg("");
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: "/" });
      setResendMsg("Email reenviado! Confirma a tua caixa de entrada.");
    } catch {
      setResendMsg("Não foi possível reenviar. Tenta daqui a pouco.");
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setForgotMsg("");
    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/repor-password" });
      // Resposta é sempre neutra — não revela se o email existe.
      setForgotMsg("Se existir uma conta com esse email, vais receber um link para repor a palavra-passe.");
    } catch {
      setError("Erro ao pedir recuperação. Tenta novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && !acceptedRgpd) {
      setError("Tens de aceitar a Política de Privacidade para criar conta.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        const res = await authClient.signUp.email({ name, email, password, callbackURL: "/" } as any, { onSuccess: captureToken });
        if (res.error) { setError(res.error.message ?? "Erro ao criar conta"); return; }
        // Com verificação de email, a conta não entra já — mostra ecrã de confirmação.
        setVerifyEmailSent(true);
        return;
      } else {
        const res = await authClient.signIn.email({ email, password }, { onSuccess: captureToken });
        if (res.error) {
          // Email por confirmar → oferece reenvio em vez de erro genérico.
          if (res.error.status === 403 || /verif/i.test(res.error.message ?? "")) {
            setNeedsVerification(true);
            return;
          }
          setError(res.error.message ?? "Email ou palavra-passe inválidos");
          return;
        }
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
          {/* Ecrã de confirmação de email (registo ou login bloqueado) */}
          {(verifyEmailSent || needsVerification) ? (
            <div className="rounded-3xl p-8 text-center" style={{ background: "var(--white)", boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-2xl font-black mb-2" style={{ color: "var(--black)" }}>Confirma o teu email</h2>
              <p className="text-sm mb-6" style={{ color: "var(--gray)" }}>
                {verifyEmailSent
                  ? <>Enviámos um link de confirmação para <strong style={{ color: "var(--black)" }}>{email}</strong>. Abre-o para ativar a conta e entrar.</>
                  : <>A tua conta ainda não foi confirmada. Verifica o email <strong style={{ color: "var(--black)" }}>{email}</strong> ou reenvia o link.</>}
              </p>
              {resendMsg && (
                <div className="text-sm font-medium px-4 py-3 rounded-xl mb-4" style={{ background: "#DCFCE7", color: "#16A34A" }}>{resendMsg}</div>
              )}
              <button onClick={resendVerification}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white cursor-pointer mb-3"
                style={{ background: "var(--orange)" }}>
                Reenviar email de confirmação
              </button>
              <button onClick={() => { setVerifyEmailSent(false); setNeedsVerification(false); setResendMsg(""); setMode("login"); }}
                className="w-full text-xs underline cursor-pointer" style={{ color: "var(--gray)" }}>
                Voltar ao login
              </button>
            </div>
          ) : (
          <>
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

          {/* Login com Google (só se configurado no servidor) */}
          {googleAuth && !forgotMode && (
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold cursor-pointer border transition-opacity hover:opacity-80"
                style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
              >
                <GoogleIcon />
                {mode === "login" ? "Entrar com Google" : "Criar conta com Google"}
              </button>
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ background: "var(--gray-lt)" }} />
                <span className="text-xs" style={{ color: "var(--gray)" }}>ou</span>
                <div className="flex-1 h-px" style={{ background: "var(--gray-lt)" }} />
              </div>
              {mode === "signup" && (
                <p className="text-[10px] text-center -mt-3 mb-1" style={{ color: "var(--gray)" }}>
                  Ao continuar com o Google aceitas a{" "}
                  <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--orange)" }}>Política de Privacidade</a>.
                </p>
              )}
            </div>
          )}

          {forgotMode ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Email da conta</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="o-teu@email.com"
                  className="w-full px-4 py-3 rounded-xl text-sm font-medium outline-none transition-all border"
                  style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                  required
                />
              </div>
              {forgotMsg && (
                <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: "#DCFCE7", color: "#16A34A" }}>{forgotMsg}</div>
              )}
              {error && (
                <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: "#FEE2E2", color: "#DC2626" }}>{error}</div>
              )}
              <button
                type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 mt-2 cursor-pointer disabled:opacity-60"
                style={{ background: "var(--orange)" }}
              >
                {loading ? "A enviar..." : "Enviar link de recuperação"}
              </button>
              <button
                type="button"
                onClick={() => { setForgotMode(false); setForgotMsg(""); setError(""); }}
                className="w-full text-xs underline cursor-pointer"
                style={{ color: "var(--gray)" }}
              >
                Voltar ao login
              </button>
            </form>
          ) : (
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
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => { setForgotMode(true); setError(""); }}
                  className="text-xs underline mt-1.5 cursor-pointer"
                  style={{ color: "var(--gray)" }}
                >
                  Esqueceste-te da palavra-passe?
                </button>
              )}
            </div>

            {mode === "signup" && (
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox" checked={acceptedRgpd} onChange={e => setAcceptedRgpd(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer" style={{ accentColor: "var(--orange)" }}
                />
                <span className="text-xs leading-snug" style={{ color: "var(--gray)" }}>
                  Li e aceito a{" "}
                  <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline font-semibold" style={{ color: "var(--orange)" }}>
                    Política de Privacidade
                  </a>{" "}
                  e o tratamento dos meus dados de acordo com o RGPD.
                </span>
              </label>
            )}

            {error && (
              <div className="text-sm font-medium px-4 py-3 rounded-xl" style={{ background: "#FEE2E2", color: "#DC2626" }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading || (mode === "signup" && !acceptedRgpd)}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-200 mt-2 cursor-pointer disabled:opacity-60"
              style={{ background: loading ? "var(--orange-lt)" : "var(--orange)" }}
            >
              {loading ? <span className="flex items-center justify-center gap-2"><span className="spinner" />A carregar...</span>
                : mode === "login" ? "Entrar na plataforma" : "Criar conta gratuita"}
            </button>
          </form>
          )}

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
          </>
          )}
        </div>
      </div>
    </div>
  );
}
