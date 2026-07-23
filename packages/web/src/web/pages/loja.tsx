import { useLocation } from "wouter";
import { ShoppingBag, Play, FileText, Salad, ChevronRight, Star, CheckCircle2, MessageCircle } from "lucide-react";

const PAYMENT_LINK = "https://buy.stripe.com/14AfZj0jY7mZ5HB4dMfjG00";
const WHATSAPP_LINK = "https://wa.me/351913159587?text=Ol%C3%A1%2C+tenho+d%C3%BAvidas+sobre+o+FO.CU+%F0%9F%8D%91";

const FEATURES = [
  { icon: <Play size={18} />, label: "Vídeos do desafio", desc: "4 semanas de treinos guiados passo a passo" },
  { icon: <FileText size={18} />, label: "PDFs & Ebooks", desc: "Guias exclusivos para maximizar resultados" },
  { icon: <Salad size={18} />, label: "Plano nutricional", desc: "Contador de calorias + rastreador de alimentos" },
  { icon: <CheckCircle2 size={18} />, label: "Receitas personalizadas", desc: "Sem glúten, sem lactose, vegan, alta proteína..." },
];

const TESTIMONIALS = [
  { name: "Ana Costa", text: "Ganhei 2cm de anca em 4 semanas. Os treinos são curtos mas intensos!", stars: 5 },
  { name: "Mariana S.", text: "Finalmente um programa que dá resultados a sério. Adoro os vídeos!", stars: 5 },
  { name: "Sofia L.", text: "As receitas são incríveis e o suporte é muito bom. Recomendo!", stars: 5 },
];

export default function LojaPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen" style={{ background: "var(--cream)", fontFamily: "Poppins, sans-serif" }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <img src="/focu-logo.jpg" alt="FO.CU" className="h-10 object-contain" />
        <button
          onClick={() => navigate("/login")}
          className="text-sm font-semibold px-4 py-2 rounded-xl border cursor-pointer transition-opacity hover:opacity-70"
          style={{ borderColor: "var(--orange)", color: "var(--orange)" }}
        >
          Já tenho acesso
        </button>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-10 pb-16 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full mb-6"
          style={{ background: "#F07A3018", color: "var(--orange)" }}>
          🍑 DESAFIO 4 SEMANAS
        </div>
        <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6" style={{ color: "var(--black)" }}>
          Transforma o teu corpo<br />
          <span style={{ color: "var(--orange)" }}>em 4 semanas.</span>
        </h1>
        <p className="text-base md:text-lg max-w-xl mx-auto mb-10" style={{ color: "#666" }}>
          O programa de glúteos mais completo de Portugal. Treinos, nutrição e receitas — tudo numa plataforma.
        </p>

        {/* CTA principal */}
        <a
          href={PAYMENT_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-8 py-5 rounded-2xl text-white font-black text-lg shadow-lg transition-transform hover:scale-105"
          style={{ background: "var(--orange)" }}
        >
          <ShoppingBag size={22} />
          Comprar Agora
          <ChevronRight size={18} />
        </a>

        <p className="text-xs mt-4" style={{ color: "#999" }}>
          Pagamento seguro via Stripe
        </p>

        {/* Pós-pagamento instrução */}
        <div className="mt-6 inline-block rounded-2xl px-6 py-4 text-left max-w-sm"
          style={{ background: "#F07A3012", border: "1.5px solid #F07A3030" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--orange)" }}>✅ Após o pagamento:</p>
          <p className="text-xs" style={{ color: "#555" }}>
            Cria a tua conta em{" "}
            <button onClick={() => navigate("/register")} className="underline font-bold cursor-pointer"
              style={{ color: "var(--orange)" }}>
              focu.pt/register
            </button>{" "}
            com o mesmo email usado no pagamento para teres acesso imediato.
          </p>
        </div>

        {/* WhatsApp */}
        <div className="mt-4">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
            style={{ background: "#25D36620", color: "#128C7E" }}
          >
            <MessageCircle size={14} />
            Tens dúvidas? Fala connosco no WhatsApp
          </a>
        </div>
      </section>

      {/* O que inclui */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-black text-center mb-8" style={{ color: "var(--black)" }}>
          O que está incluído
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex items-start gap-4 rounded-2xl p-5 shadow-sm"
              style={{ background: "var(--white)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                style={{ background: "var(--orange)" }}>
                {f.icon}
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: "var(--black)" }}>{f.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#888" }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testemunhos */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-black text-center mb-8" style={{ color: "var(--black)" }}>
          O que dizem as nossas alunas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl p-5 shadow-sm" style={{ background: "var(--white)" }}>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={14} fill="#F07A30" stroke="none" />
                ))}
              </div>
              <p className="text-sm mb-4" style={{ color: "#444" }}>"{t.text}"</p>
              <p className="text-xs font-bold" style={{ color: "var(--orange)" }}>— {t.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="max-w-5xl mx-auto px-6 pb-20 text-center">
        <div className="rounded-3xl p-10 shadow-sm" style={{ background: "var(--white)" }}>
          <div className="text-4xl mb-4">🍑</div>
          <h2 className="text-2xl font-black mb-3" style={{ color: "var(--black)" }}>
            Pronta para começar?
          </h2>
          <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: "#666" }}>
            Junta-te a centenas de mulheres que já transformaram o seu corpo com o FO.CU.
          </p>
          <a
            href={PAYMENT_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-5 rounded-2xl text-white font-black text-lg shadow-lg transition-transform hover:scale-105"
            style={{ background: "var(--orange)" }}
          >
            <ShoppingBag size={22} />
            Quero o meu acesso
            <ChevronRight size={18} />
          </a>
          <p className="text-xs mt-4" style={{ color: "#999" }}>
            Já compraste?{" "}
            <button onClick={() => navigate("/register")} className="underline font-bold cursor-pointer"
              style={{ color: "var(--orange)" }}>
              Cria a tua conta aqui
            </button>
            {" "}ou{" "}
            <button onClick={() => navigate("/login")} className="underline cursor-pointer"
              style={{ color: "var(--orange)" }}>
              entra na tua conta
            </button>
          </p>

          {/* WhatsApp CTA bottom */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: "#eee" }}>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl transition-opacity hover:opacity-80"
              style={{ background: "#25D36615", color: "#128C7E" }}
            >
              <MessageCircle size={16} />
              Dúvidas? Fala connosco no WhatsApp
            </a>
          </div>

          <p className="text-center text-xs mt-6">
            <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--gray)" }}>
              Política de Privacidade
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
