import { useEffect, useRef, useState } from "react";
import { authClient, getToken } from "../lib/auth";
import { useChatSocket } from "../lib/chat-socket";
import { Send, Users, MessageCircle, ChevronLeft } from "lucide-react";

type Msg = { id: number; room: string; senderId: string; senderName: string; senderRole: string; body: string; createdAt: number };
type Thread = { userId: string; name: string; lastBody: string; lastRole: string; lastAt: number };

const authHeaders = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });
const dedupe = (list: Msg[]) => Array.from(new Map(list.map((m) => [m.id, m])).values()).sort((a, b) => a.id - b.id);
const timeOf = (t: number) => new Date(t).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

export default function ChatPage() {
  const { data: session } = authClient.useSession();
  const myId = (session?.user as any)?.id as string | undefined;
  const isAdmin = ((session?.user as any)?.role ?? "") === "admin";

  const [tab, setTab] = useState<"comunidade" | "privado">("comunidade");
  const [community, setCommunity] = useState<Msg[]>([]);
  const [dm, setDm] = useState<Msg[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null); activeRef.current = activeThread;

  // Carregamentos iniciais
  const loadCommunity = () => fetch("/api/chat/community", { headers: authHeaders() }).then((r) => r.json()).then((d) => setCommunity(dedupe(d.messages ?? [])));
  const loadDm = () => fetch("/api/chat/dm", { headers: authHeaders() }).then((r) => r.json()).then((d) => setDm(dedupe(d.messages ?? [])));
  const loadThreads = () => fetch("/api/chat/threads", { headers: authHeaders() }).then((r) => r.json()).then((d) => setThreads(d.threads ?? []));
  const openThread = (uid: string) => { setActiveThread(uid); fetch(`/api/chat/dm/${uid}`, { headers: authHeaders() }).then((r) => r.json()).then((d) => setDm(dedupe(d.messages ?? []))); };

  useEffect(() => { loadCommunity(); if (isAdmin) loadThreads(); else loadDm(); /* eslint-disable-next-line */ }, [isAdmin]);

  // Tempo real
  useChatSocket((p) => {
    if (p?.type !== "message") return;
    if (p.room === "community") { setCommunity((m) => dedupe([...m, p])); return; }
    if (typeof p.room === "string" && p.room.startsWith("dm:")) {
      const uid = p.room.slice(3);
      if (isAdmin) { loadThreads(); if (activeRef.current === uid) setDm((m) => dedupe([...m, p])); }
      else setDm((m) => dedupe([...m, p]));
    }
  });

  const send = async (body: string) => {
    const text = body.trim();
    if (!text) return;
    let url = "/api/chat/community";
    if (tab === "privado") url = isAdmin ? `/api/chat/dm/${activeThread}` : "/api/chat/dm";
    const res = await fetch(url, { method: "POST", headers: authHeaders(), body: JSON.stringify({ body: text }) });
    if (res.ok) { const d = await res.json(); const msg = d.message as Msg;
      if (msg.room === "community") setCommunity((m) => dedupe([...m, msg])); else setDm((m) => dedupe([...m, msg]));
    }
  };

  return (
    <div className="fade-up flex flex-col" style={{ height: "calc(100vh - 7rem)" }}>
      <div className="mb-4">
        <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>Chat 💬</h1>
        <p className="text-sm" style={{ color: "var(--gray)" }}>Fala com a comunidade e com a tua treinadora.</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl p-1 mb-4" style={{ background: "var(--white)" }}>
        {([["comunidade", "Comunidade", Users], ["privado", isAdmin ? "Conversas" : "Treinadora", MessageCircle]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => { setTab(id); if (id === "privado" && !isAdmin) loadDm(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-all"
            style={tab === id ? { background: "var(--orange)", color: "white" } : { color: "var(--gray)" }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {tab === "comunidade" ? (
        <ChatWindow messages={community} myId={myId} showNames onSend={send} placeholder="Escreve à comunidade..." />
      ) : isAdmin && !activeThread ? (
        <Inbox threads={threads} onOpen={openThread} />
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {isAdmin && (
            <button onClick={() => setActiveThread(null)} className="flex items-center gap-1 text-sm font-semibold mb-2 cursor-pointer" style={{ color: "var(--orange)" }}>
              <ChevronLeft size={16} /> Voltar às conversas
            </button>
          )}
          <ChatWindow messages={dm} myId={myId} showNames={isAdmin} onSend={send}
            placeholder={isAdmin ? "Responder à aluna..." : "Escreve à tua treinadora..."} />
        </div>
      )}
    </div>
  );
}

function Inbox({ threads, onOpen }: { threads: Thread[]; onOpen: (uid: string) => void }) {
  if (threads.length === 0) return <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "var(--gray)" }}>Ainda não há conversas.</div>;
  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      {threads.map((t) => (
        <button key={t.userId} onClick={() => onOpen(t.userId)} className="w-full text-left rounded-2xl p-4 cursor-pointer transition-all hover:shadow-sm flex items-center gap-3" style={{ background: "var(--white)" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shrink-0" style={{ background: "var(--orange)" }}>{t.name.charAt(0).toUpperCase()}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: "var(--black)" }}>{t.name}</p>
            <p className="text-xs truncate" style={{ color: "var(--gray)" }}>{t.lastRole === "admin" ? "Tu: " : ""}{t.lastBody}</p>
          </div>
          <span className="text-[10px] shrink-0" style={{ color: "var(--gray)" }}>{timeOf(t.lastAt)}</span>
        </button>
      ))}
    </div>
  );
}

function ChatWindow({ messages, myId, showNames, onSend, placeholder }: { messages: Msg[]; myId?: string; showNames?: boolean; onSend: (b: string) => void; placeholder: string }) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ background: "var(--white)" }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && <p className="text-center text-sm mt-8" style={{ color: "var(--gray)" }}>Ainda não há mensagens. Escreve a primeira! 👋</p>}
        {messages.map((m) => {
          const mine = m.senderId === myId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[78%] rounded-2xl px-3 py-2" style={mine ? { background: "var(--orange)", color: "white" } : { background: "var(--cream)", color: "var(--black)" }}>
                {showNames && !mine && <p className="text-[10px] font-bold mb-0.5" style={{ color: m.senderRole === "admin" ? "#7C3AED" : "var(--orange)" }}>{m.senderName}{m.senderRole === "admin" ? " · treinadora" : ""}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                <p className="text-[9px] mt-0.5 text-right" style={{ opacity: 0.6 }}>{timeOf(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onSend(text); setText(""); }} className="flex gap-2 p-3 border-t" style={{ borderColor: "var(--gray-lt)" }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={1000}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none" style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
        <button type="submit" className="px-4 rounded-xl text-white cursor-pointer" style={{ background: "var(--orange)" }}><Send size={18} /></button>
      </form>
    </div>
  );
}
