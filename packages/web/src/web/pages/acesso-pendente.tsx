import { authClient, clearToken } from "../lib/auth";
import { LogOut } from "lucide-react";

const PAYMENT_LINK = "https://buy.stripe.com/14AfZj0jY7mZ5HB4dMfjG00";

export default function AcessoPendentePage() {
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    clearToken();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "var(--cream)" }}>
      {/* Logo */}
      <img src="/focu-logo.jpg" alt="FO.CU" className="w-28 object-contain mb-8" />

      {/* Card */}
      <div className="w-full max-w-md rounded-3xl shadow-xl p-8 text-center" style={{ background: "var(--white)" }}>
        <div className="text-5xl mb-4">🍑</div>
        <h1 className="text-2xl font-black mb-2" style={{ color: "var(--black)" }}>
          Acesso Pendente
        </h1>
        <p className="text-sm mb-6" style={{ color: "var(--gray)" }}>
          Olá{session?.user?.name ? `, ${session.user.name}` : ""}! O teu acesso ainda não foi ativado.
          <br />
          Completa o pagamento para desbloquear a plataforma FO.CU.
        </p>

        {/* Benefits */}
        <ul className="text-left mb-8 space-y-2 text-sm" style={{ color: "var(--black)" }}>
          {[
            "🎥 Vídeos do desafio 4 semanas",
            "📄 PDFs e ebooks exclusivos",
            "🥗 Plano nutricional completo",
            "🍽️ Receitas com filtros personalizados",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <a
          href={PAYMENT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 rounded-2xl text-white font-bold text-base transition-opacity hover:opacity-90 mb-4"
          style={{ background: "var(--orange)" }}
        >
          Ativar Acesso Agora
        </a>

        <p className="text-xs mb-4" style={{ color: "var(--gray)" }}>
          Após o pagamento, o acesso é ativado automaticamente em segundos.
        </p>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-xs mx-auto hover:opacity-70 transition-opacity cursor-pointer"
          style={{ color: "var(--gray)" }}
        >
          <LogOut size={14} />
          <span>Sair da conta</span>
        </button>
      </div>

      <p className="text-xs mt-6" style={{ color: "var(--gray)" }}>
        Já pagaste e continua a aparecer esta página?{" "}
        <a href="mailto:thebodylaab@gmail.com" className="underline">Contacta-nos</a>
      </p>
    </div>
  );
}
