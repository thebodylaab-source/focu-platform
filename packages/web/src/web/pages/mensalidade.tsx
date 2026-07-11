import { useQuery } from "@tanstack/react-query";
import { authClient, getToken } from "../lib/auth";
import { CreditCard, Check, ShieldCheck } from "lucide-react";

export default function MensalidadePage() {
  const { data: session } = authClient.useSession();
  const email = session?.user?.email ?? "";

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => (await fetch("/api/config")).json() as Promise<{ paymentLink: string }>,
  });
  const { data: membership } = useQuery({
    queryKey: ["membership-me"],
    queryFn: async () => {
      const res = await fetch("/api/membership/me", { headers: { Authorization: `Bearer ${getToken()}` } });
      return res.json() as Promise<{ membership: { status: string; plan: string; expiresAt: number | null } }>;
    },
  });

  const paymentLink = config?.paymentLink;
  const plan = membership?.membership?.plan ?? "mensal";
  const expiresAt = membership?.membership?.expiresAt ?? null;

  return (
    <div className="fade-up space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>Mensalidade 💳</h1>
        <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>Renova o teu acesso à plataforma por mais um mês.</p>
      </div>

      {/* Estado atual */}
      <div className="rounded-2xl p-5" style={{ background: "var(--white)" }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#DCFCE7" }}>
            <ShieldCheck size={22} style={{ color: "#16A34A" }} />
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: "var(--black)" }}>Acesso ativo</p>
            <p className="text-xs" style={{ color: "var(--gray)" }}>
              Plano {plan}{expiresAt ? ` · válido até ${new Date(expiresAt).toLocaleDateString("pt-PT")}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Card de renovação */}
      <div className="rounded-3xl p-6" style={{ background: "var(--peach)" }}>
        <p className="text-sm font-black uppercase tracking-wider mb-3" style={{ color: "var(--orange)" }}>Renovar por mais 1 mês</p>
        <ul className="space-y-2 mb-6">
          {[
            "🎥 Todos os vídeos do programa",
            "🥗 Nutrição, receitas e lista de compras",
            "🌸 O Meu Ciclo — orientação diária",
            "📄 Ebooks e conteúdos exclusivos",
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--black)" }}>
              <Check size={15} style={{ color: "#16A34A" }} /> <span>{item}</span>
            </li>
          ))}
        </ul>

        <a
          href={paymentLink ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition-opacity hover:opacity-90"
          style={{ background: paymentLink ? "var(--orange)" : "var(--gray-lt)", pointerEvents: paymentLink ? "auto" : "none" }}
        >
          <CreditCard size={18} /> Pagar mensalidade
        </a>

        <p className="text-xs mt-4" style={{ color: "#7a5a48" }}>
          ⚠️ Importante: paga com o <strong>mesmo email da tua conta</strong>{email ? <> (<strong>{email}</strong>)</> : null} para o acesso renovar automaticamente. MB WAY, cartão e Apple Pay disponíveis.
        </p>
      </div>

      <p className="text-xs text-center" style={{ color: "var(--gray)" }}>
        Problemas com o pagamento? <a href="mailto:thebodylaab@gmail.com" className="underline">Contacta-nos</a>.
      </p>
    </div>
  );
}
