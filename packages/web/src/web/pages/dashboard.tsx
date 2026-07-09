import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { authClient, getToken } from "../lib/auth";
import { Play, FileText, Apple, Flame, ChevronRight, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { PushToggle } from "../components/push-toggle";
import { DailyCyclePrompt } from "../components/daily-cycle-prompt";

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const qc = useQueryClient();

  const { data: progressData } = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const res = await fetch("/api/progress", { headers: { Authorization: `Bearer ${getToken()}` } });
      return res.json() as Promise<{ checkins: string[]; streak: number }>;
    },
  });
  const checkinToggle = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/progress/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({}),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["progress"] }),
  });

  const { data: videosData } = useQuery({ queryKey: ["videos"], queryFn: async () => (await api.videos.$get()).json() });
  const { data: docsData } = useQuery({ queryKey: ["documents"], queryFn: async () => (await api.documents.$get()).json() });

  const today = new Date().toISOString().split("T")[0];
  const { data: logsData } = useQuery({
    queryKey: ["food-logs", today],
    queryFn: async () => (await api.nutrition.logs.$get({ query: { date: today } })).json(),
  });

  const totalCalToday = (logsData as any)?.logs?.reduce((acc: number, l: any) => acc + (l.calories * l.quantity), 0) ?? 0;
  const videoCount = (videosData as any)?.videos?.length ?? 0;
  const docCount = (docsData as any)?.documents?.length ?? 0;

  const firstName = session?.user?.name?.split(" ")[0] ?? "Membro";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const statsCards = [
    { icon: Play, label: "Vídeos disponíveis", value: videoCount, path: "/videos", color: "var(--orange)" },
    { icon: FileText, label: "Conteúdos & PDFs", value: docCount, path: "/conteudos", color: "#7C3AED" },
    { icon: Flame, label: "Calorias hoje", value: Math.round(totalCalToday) + " kcal", path: "/nutricao", color: "#EF4444" },
    { icon: Apple, label: "Nutrição", value: "Ver plano", path: "/nutricao", color: "var(--green)" },
  ];

  const quickLinks = [
    { label: "Treino de hoje", desc: "Acede ao vídeo do teu treino", path: "/videos", icon: Play, tag: "VÍDEO" },
    { label: "Receitas saudáveis", desc: "Ideias para alimentação equilibrada", path: "/nutricao?tab=receitas", icon: Apple, tag: "NUTRIÇÃO" },
    { label: "Ebooks & PDFs", desc: "Guias e materiais do programa", path: "/conteudos", icon: FileText, tag: "CONTEÚDO" },
  ];

  return (
    <div className="fade-up space-y-8">
      {/* Header */}
      <div className="rounded-3xl p-8 relative overflow-hidden" style={{ background: "var(--orange)" }}>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-20" style={{ background: "white" }} />
        <div className="absolute -right-4 -bottom-12 w-56 h-56 rounded-full opacity-10" style={{ background: "white" }} />
        <div className="relative z-10">
          <p className="font-medium mb-1" style={{ color: "var(--black)" }}>{greeting}, {firstName}! 👋</p>
          <h1 className="text-3xl font-black mb-2" style={{ color: "var(--black)" }}>O teu painel FO.CU 🍑</h1>
          <p className="text-sm max-w-md" style={{ color: "var(--black)", opacity: 0.75 }}>
            Continua o teu progresso. Cada treino conta. Tens acesso completo a todos os conteúdos do programa.
          </p>
          <div className="mt-4">
            <PushToggle />
          </div>
        </div>
      </div>

      {/* Pergunta diária do ciclo */}
      <DailyCyclePrompt />

      {/* Streak de treino + calendário semanal */}
      {(() => {
        const checkins = new Set(progressData?.checkins ?? []);
        const streak = progressData?.streak ?? 0;
        const doneToday = checkins.has(today);
        // Semana atual: segunda a domingo
        const now = new Date();
        const monday = new Date(now);
        monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        const week = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          return d.toISOString().split("T")[0];
        });
        const labels = ["S", "T", "Q", "Q", "S", "S", "D"];
        return (
          <div className="rounded-2xl p-5 shadow-sm" style={{ background: "var(--white)" }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "var(--peach)" }}>
                  🔥
                </div>
                <div>
                  <p className="text-2xl font-black" style={{ color: "var(--black)" }}>
                    {streak} {streak === 1 ? "dia" : "dias"}
                  </p>
                  <p className="text-xs" style={{ color: "var(--gray)" }}>de treino seguidos</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                {week.map((d, i) => (
                  <div key={d} className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold" style={{ color: "var(--gray)" }}>{labels[i]}</span>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={checkins.has(d)
                        ? { background: "var(--orange)", color: "white" }
                        : d === today
                          ? { border: "2px dashed var(--orange)", color: "var(--gray)" }
                          : { background: "var(--cream)", color: "var(--gray)" }}>
                      {checkins.has(d) ? "✓" : ""}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => checkinToggle.mutate()}
                disabled={checkinToggle.isPending}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-60"
                style={doneToday ? { background: "#DCFCE7", color: "#16A34A" } : { background: "var(--orange)", color: "white" }}
              >
                <CheckCircle2 size={16} />
                {doneToday ? "Treino feito hoje!" : "Marcar treino de hoje"}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map(({ icon: Icon, label, value, path, color }) => (
          <Link key={label} to={path}>
            <div className="rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5" style={{ background: "var(--white)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}20` }}>
                <Icon size={20} style={{ color }} />
              </div>
              <p className="text-2xl font-black mb-1" style={{ color: "var(--black)" }}>{value}</p>
              <p className="text-xs font-medium" style={{ color: "var(--gray)" }}>{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick access */}
      <div>
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--black)" }}>Acesso rápido</h2>
        <div className="space-y-3">
          {quickLinks.map(({ label, desc, path, icon: Icon, tag }) => (
            <Link key={label} to={path}>
              <div className="flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-sm" style={{ background: "var(--white)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "var(--peach)" }}>
                  <Icon size={22} style={{ color: "var(--orange)" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold" style={{ color: "var(--black)" }}>{label}</p>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--peach)", color: "var(--orange)" }}>{tag}</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--gray)" }}>{desc}</p>
                </div>
                <ChevronRight size={18} style={{ color: "var(--orange)" }} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Motivation */}
      <div className="rounded-2xl p-6 text-center" style={{ background: "var(--peach)" }}>
        <p className="text-3xl mb-2">🍑</p>
        <p className="font-black text-lg mb-1" style={{ color: "var(--black)" }}>"A consistência bate a perfeição."</p>
        <p className="text-sm" style={{ color: "var(--gray)" }}>Faz hoje o que o teu futuro eu vai agradecer.</p>
      </div>
    </div>
  );
}
