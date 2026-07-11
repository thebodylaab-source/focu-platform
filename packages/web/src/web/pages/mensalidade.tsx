import { useQuery } from "@tanstack/react-query";
import { authClient, getToken } from "../lib/auth";
import { CreditCard, Check, ShieldCheck, RefreshCw, Calendar } from "lucide-react";

export default function MensalidadePage() {
  const { data: session } = authClient.useSession();
  const email = session?.user?.email ?? "";

  const { data: config } = useQuery({
    queryKey: ["config"],
    queryFn: async () => (await fetch("/api/config")).json() as Promise<{ paymentLink: string; subscriptionLink: string | null }>,
  });
  const { data: me } = useQuery({
    queryKey: ["membership-me"],
    queryFn: async () => {
      const res = await fetch("/api/membership/me", { headers: { Authorization: `Bearer ${getToken()}` } });
      return res.json() as Promise<{ plan: string | null; expiresAt: number | null; active: boolean }>;
    },
  });

  const paymentLink = config?.paymentLink;
  const subscriptionLink = config?.subscriptionLink ?? null;
  const expiresAt = me?.expiresAt ?? null;
  const plan = me?.plan ?? null;

  const emailNote = (
    <p className="text-xs mt-3" style={{ color: "#7a5a48" }}>
      ⚠️ Paga com o <strong>mesmo email da tua conta</strong>{email ? <> (<strong>{email}</strong>)</> : null} para o acesso ativar automaticamente. MB WAY, cartão e Apple Pay disponíveis.
    </p>
  );

  return (
    <div className="fade-up space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>Mensalidade 💳</h1>
        <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>Escolhe como queres manter o teu acesso.</p>
      </div>

      {/* Estado atual */}
      <div className="rounded-2xl p-5" style={{ background: "var(--white)" }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "#DCFCE7" }}>
            <ShieldCheck size={22} style={{ color: "#16A34A" }} />
          </div>
          <div>
            <p className="text-sm font-black" style={{ color: "var(--black)" }}>Acesso ativo</p>
            <p className="text-xs flex items-center gap-1" style={{ color: "var(--gray)" }}>
              {plan === "mensal-recorrente" ? "Subscrição mensal (renova sozinha)"
                : plan === "mensal-avulso" ? "Pagamento mensal (sem renovação automática)"
                : "Plano ativo"}
              {expiresAt && (
                <span className="flex items-center gap-1"><Calendar size={11} /> {plan === "mensal-recorrente" ? "renova" : "expira"} a {new Date(expiresAt).toLocaleDateString("pt-PT")}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Opção 1 — Subscrição recorrente */}
      {subscriptionLink && (
        <div className="rounded-3xl p-6" style={{ background: "var(--white)", border: "2px solid var(--orange)" }}>
          <div className="flex items-center gap-2 mb-1">
            <RefreshCw size={16} style={{ color: "var(--orange)" }} />
            <p className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--orange)" }}>Subscrição mensal</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--peach)", color: "var(--orange)" }}>Recomendado</span>
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--gray)" }}>Renova-se automaticamente todos os meses. Nunca ficas sem acesso e podes cancelar quando quiseres.</p>
          <a href={subscriptionLink} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition-opacity hover:opacity-90"
            style={{ background: "var(--orange)" }}>
            <RefreshCw size={18} /> Subscrever (renovação automática)
          </a>
          {emailNote}
        </div>
      )}

      {/* Opção 2 — Pagamento avulso (expira) */}
      <div className="rounded-3xl p-6" style={{ background: "var(--peach)" }}>
        <div className="flex items-center gap-2 mb-1">
          <CreditCard size={16} style={{ color: "var(--orange)" }} />
          <p className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--orange)" }}>Pagar 1 mês</p>
        </div>
        <p className="text-sm mb-4" style={{ color: "#7a5a48" }}>
          Pagas um mês de cada vez, sem renovação automática. O acesso <strong>expira ao fim de 30 dias</strong> e renovas quando quiseres.
        </p>
        <ul className="space-y-2 mb-5">
          {["🎥 Todos os vídeos", "🥗 Nutrição e receitas", "🌸 O Meu Ciclo", "📄 Ebooks exclusivos"].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm" style={{ color: "var(--black)" }}>
              <Check size={15} style={{ color: "#16A34A" }} /> <span>{item}</span>
            </li>
          ))}
        </ul>
        <a href={paymentLink ?? "#"} target="_blank" rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold text-base transition-opacity hover:opacity-90"
          style={{ background: paymentLink ? "var(--black)" : "var(--gray-lt)", pointerEvents: paymentLink ? "auto" : "none" }}>
          <CreditCard size={18} /> Pagar 1 mês
        </a>
        {emailNote}
      </div>

      <p className="text-xs text-center" style={{ color: "var(--gray)" }}>
        Problemas com o pagamento? <a href="mailto:thebodylaab@gmail.com" className="underline">Contacta-nos</a>.
      </p>
    </div>
  );
}
