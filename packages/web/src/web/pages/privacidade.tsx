import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";

// NOTA: este é um modelo de Política de Privacidade conforme o RGPD.
// Reveja e ajuste os dados (entidade responsável, contactos, prazos) à sua
// realidade — idealmente com apoio jurídico antes de publicar definitivamente.
export default function PrivacidadePage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen py-10 px-5" style={{ background: "var(--cream)" }}>
      <div className="max-w-2xl mx-auto">
        <button onClick={() => navigate("/loja")} className="flex items-center gap-1 text-sm font-semibold mb-6 cursor-pointer" style={{ color: "var(--orange)" }}>
          <ChevronLeft size={16} /> Voltar
        </button>

        <div className="rounded-3xl p-7 shadow-sm" style={{ background: "var(--white)" }}>
          <h1 className="text-2xl font-black mb-1" style={{ color: "var(--black)" }}>Política de Privacidade</h1>
          <p className="text-xs mb-6" style={{ color: "var(--gray)" }}>Última atualização: junho de 2026</p>

          <div className="space-y-5 text-sm leading-relaxed" style={{ color: "var(--gray)" }}>
            <p>
              A presente Política descreve como a <strong>FO.CU — The Body Lab</strong> ("nós")
              recolhe e trata os teus dados pessoais, em conformidade com o Regulamento Geral
              sobre a Proteção de Dados (RGPD — Regulamento (UE) 2016/679).
            </p>

            <Section title="1. Responsável pelo tratamento">
              <p>FO.CU — The Body Lab. Para qualquer questão sobre os teus dados, contacta-nos
              através de <strong>thebodylaab@gmail.com</strong>.</p>
            </Section>

            <Section title="2. Que dados recolhemos">
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Dados de conta:</strong> nome, email e palavra-passe (encriptada).</li>
                <li><strong>Dados de pagamento:</strong> processados de forma segura pela Stripe.
                Não guardamos os dados do teu cartão.</li>
                <li><strong>Dados de utilização da app:</strong> registos alimentares, lista de
                compras e preferências que escolheres introduzir.</li>
              </ul>
            </Section>

            <Section title="3. Finalidades e base legal">
              <ul className="list-disc pl-5 space-y-1">
                <li>Criar e gerir a tua conta e dar-te acesso ao programa — <em>execução do contrato</em>.</li>
                <li>Processar o teu pagamento — <em>execução do contrato</em>.</li>
                <li>Comunicar contigo sobre o serviço — <em>interesse legítimo / consentimento</em>.</li>
              </ul>
              <p className="mt-2">O registo na plataforma pressupõe o teu <strong>consentimento</strong>
              expresso para o tratamento dos dados aqui descritos.</p>
            </Section>

            <Section title="4. Com quem partilhamos">
              <p>Apenas com prestadores necessários ao funcionamento do serviço, que atuam como
              subcontratantes: <strong>Stripe</strong> (pagamentos), <strong>Railway</strong> e
              <strong> Turso</strong> (alojamento e base de dados) e <strong>Anthropic</strong>
              (geração de receitas por IA). Não vendemos os teus dados a terceiros.</p>
            </Section>

            <Section title="5. Durante quanto tempo">
              <p>Conservamos os teus dados enquanto tiveres conta ativa. Podes pedir a eliminação
              a qualquer momento; alguns dados podem ser conservados pelo período legalmente exigido
              (ex. faturação).</p>
            </Section>

            <Section title="6. Os teus direitos">
              <p>Tens o direito de aceder, retificar, eliminar, limitar ou opor-te ao tratamento dos
              teus dados, à portabilidade, e a <strong>retirar o consentimento</strong> a qualquer
              momento. Para exercer estes direitos, contacta <strong>thebodylaab@gmail.com</strong>.
              Tens ainda o direito de reclamar junto da <strong>CNPD</strong> (Comissão Nacional de
              Proteção de Dados).</p>
            </Section>

            <Section title="7. Segurança">
              <p>Adotamos medidas técnicas e organizativas adequadas para proteger os teus dados
              (encriptação, acesso restrito, ligações seguras HTTPS).</p>
            </Section>
          </div>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--gray)" }}>
          By The Body Lab — todos os direitos reservados
        </p>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-black text-base mb-1.5" style={{ color: "var(--black)" }}>{title}</h2>
      {children}
    </div>
  );
}
