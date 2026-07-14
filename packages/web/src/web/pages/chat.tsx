import { useEffect, useRef, useState } from "react";
import { authClient, getToken } from "../lib/auth";
import { useChatSocket } from "../lib/chat-socket";
import { Send, Users, MessageCircle, ChevronLeft, Trash2, VolumeX, Volume2, ShieldAlert, ChevronDown, ChevronUp, Plus, Search, X } from "lucide-react";

const RULES = [
  "Respeito acima de tudo — nada de insultos, gozo ou comentários maldosos.",
  "Sem comparações tóxicas nem comentários sobre o corpo das outras.",
  "Isto é um espaço seguro de apoio — celebra as conquistas das outras. 💪",
  "Nada de spam, vendas, links externos ou publicidade a outras marcas.",
  "Não partilhes dados pessoais (telemóvel, morada, redes) na sala.",
  "Sem conselhos médicos — dúvidas de saúde, fala com um profissional.",
  "Proibido conteúdo ofensivo, impróprio ou ilegal.",
  "A treinadora pode apagar mensagens e silenciar quem não respeitar.",
];

type Msg = { id: number; room: string; senderId: string; senderName: string; senderRole: string; body: string; createdAt: number };
type Thread = { userId: string; name: string; lastBody: string; lastRole: string; lastAt: number };
type Student = { id: string; name: string; email: string };

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
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [showNewChat, setShowNewChat] = useState(false);

  // Carregamentos iniciais
  const loadCommunity = () => fetch("/api/chat/community", { headers: authHeaders() }).then((r) => r.json()).then((d) => setCommunity(dedupe(d.messages ?? [])));
  const loadDm = () => fetch("/api/chat/dm", { headers: authHeaders() }).then((r) => r.json()).then((d) => setDm(dedupe(d.messages ?? [])));
  const loadThreads = () => fetch("/api/chat/threads", { headers: authHeaders() }).then((r) => r.json()).then((d) => setThreads(d.threads ?? []));
  const openThread = (uid: string) => { setActiveThread(uid); setShowNewChat(false); setTab("privado"); fetch(`/api/chat/dm/${uid}`, { headers: authHeaders() }).then((r) => r.json()).then((d) => setDm(dedupe(d.messages ?? []))); };
  const loadMutes = () => fetch("/api/chat/mutes", { headers: authHeaders() }).then((r) => r.json()).then((d) => setMuted(new Set(d.muted ?? [])));

  useEffect(() => { loadCommunity(); if (isAdmin) { loadThreads(); loadMutes(); } else loadDm(); /* eslint-disable-next-line */ }, [isAdmin]);

  // Moderação (admin)
  const deleteMsg = async (id: number) => {
    if (!confirm("Apagar esta mensagem?")) return;
    await fetch(`/api/chat/message/${id}`, { method: "DELETE", headers: authHeaders() });
    setCommunity((m) => m.filter((x) => x.id !== id)); setDm((m) => m.filter((x) => x.id !== id));
  };
  const toggleMute = async (uid: string, name: string) => {
    const isMuted = muted.has(uid);
    if (!isMuted && !confirm(`Silenciar ${name} na comunidade? (continua a poder falar contigo em privado)`)) return;
    await fetch(`/api/chat/mute/${uid}`, { method: isMuted ? "DELETE" : "POST", headers: authHeaders() });
    setMuted((s) => { const n = new Set(s); isMuted ? n.delete(uid) : n.add(uid); return n; });
  };

  // Tempo real
  useChatSocket((p) => {
    if (p?.type === "delete") {
      if (p.room === "community") setCommunity((m) => m.filter((x) => x.id !== p.id));
      else setDm((m) => m.filter((x) => x.id !== p.id));
      return;
    }
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
    } else {
      const d = await res.json().catch(() => ({} as any));
      alert(d.message || "Não foi possível enviar a mensagem.");
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
        <div className="flex flex-col flex-1 min-h-0">
          <CommunityRules />
          <ChatWindow messages={community} myId={myId} showNames onSend={send} placeholder="Escreve à comunidade..."
            admin={isAdmin} muted={muted} onDelete={deleteMsg} onMute={toggleMute} />
        </div>
      ) : isAdmin && !activeThread ? (
        <Inbox threads={threads} onOpen={openThread} onNew={() => setShowNewChat(true)} />
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {isAdmin && (
            <button onClick={() => setActiveThread(null)} className="flex items-center gap-1 text-sm font-semibold mb-2 cursor-pointer" style={{ color: "var(--orange)" }}>
              <ChevronLeft size={16} /> Voltar às conversas
            </button>
          )}
          <ChatWindow messages={dm} myId={myId} showNames={isAdmin} onSend={send}
            placeholder={isAdmin ? "Responder à aluna..." : "Escreve à tua treinadora..."}
            admin={isAdmin} muted={muted} onDelete={deleteMsg} onMute={toggleMute} />
        </div>
      )}

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onPick={openThread} />}
    </div>
  );
}

function NewChatModal({ onClose, onPick }: { onClose: () => void; onPick: (uid: string) => void }) {
  const [q, setQ] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/chat/students?q=${encodeURIComponent(q)}`, { headers: authHeaders() })
        .then((r) => r.json()).then((d) => setStudents(d.students ?? [])).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl" style={{ background: "var(--white)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--gray-lt)" }}>
          <p className="font-bold text-sm" style={{ color: "var(--black)" }}>Nova conversa</p>
          <button onClick={onClose} className="cursor-pointer" style={{ color: "var(--gray)" }}><X size={18} /></button>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "var(--cream)" }}>
            <Search size={15} style={{ color: "var(--gray)" }} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar aluna pelo nome..."
              className="flex-1 bg-transparent text-sm outline-none" style={{ color: "var(--black)" }} />
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto px-2 pb-3">
          {loading ? (
            <p className="text-center text-sm py-6" style={{ color: "var(--gray)" }}>A carregar...</p>
          ) : students.length === 0 ? (
            <p className="text-center text-sm py-6" style={{ color: "var(--gray)" }}>Nenhuma aluna encontrada.</p>
          ) : students.map((s) => (
            <button key={s.id} onClick={() => onPick(s.id)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:opacity-80">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0" style={{ background: "var(--orange)" }}>{s.name.charAt(0).toUpperCase()}</div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate" style={{ color: "var(--black)" }}>{s.name}</p>
                <p className="text-xs truncate" style={{ color: "var(--gray)" }}>{s.email}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CommunityRules() {
  // Aberto por defeito na primeira visita; depois fica como a aluna deixou.
  const [open, setOpen] = useState<boolean>(() => { try { return localStorage.getItem("chat-rules-seen") !== "1"; } catch { return true; } });
  const toggle = () => { setOpen((v) => { const n = !v; try { localStorage.setItem("chat-rules-seen", "1"); } catch { /* ignore */ } return n; }); };
  return (
    <div className="rounded-2xl mb-3 overflow-hidden" style={{ background: "#7C3AED10", border: "1px solid #7C3AED25" }}>
      <button onClick={toggle} className="w-full flex items-center gap-2 px-4 py-2.5 cursor-pointer">
        <ShieldAlert size={16} style={{ color: "#7C3AED" }} />
        <span className="text-xs font-bold flex-1 text-left" style={{ color: "#7C3AED" }}>Regras da comunidade</span>
        {open ? <ChevronUp size={16} style={{ color: "#7C3AED" }} /> : <ChevronDown size={16} style={{ color: "#7C3AED" }} />}
      </button>
      {open && (
        <ul className="px-4 pb-3 space-y-1">
          {RULES.map((r, i) => (
            <li key={i} className="text-xs flex gap-2" style={{ color: "#555" }}><span style={{ color: "#7C3AED" }}>•</span> {r}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Inbox({ threads, onOpen, onNew }: { threads: Thread[]; onOpen: (uid: string) => void; onNew: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      <button onClick={onNew}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white cursor-pointer transition-opacity hover:opacity-90"
        style={{ background: "var(--orange)" }}>
        <Plus size={16} /> Nova conversa
      </button>
      {threads.length === 0 && (
        <p className="text-center text-sm py-8" style={{ color: "var(--gray)" }}>Ainda não há conversas. Começa uma com "Nova conversa".</p>
      )}
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

function ChatWindow({ messages, myId, showNames, onSend, placeholder, admin, muted, onDelete, onMute }: { messages: Msg[]; myId?: string; showNames?: boolean; onSend: (b: string) => void; placeholder: string; admin?: boolean; muted?: Set<string>; onDelete?: (id: number) => void; onMute?: (uid: string, name: string) => void }) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-2xl overflow-hidden" style={{ background: "var(--white)" }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.length === 0 && <p className="text-center text-sm mt-8" style={{ color: "var(--gray)" }}>Ainda não há mensagens. Escreve a primeira! 👋</p>}
        {messages.map((m) => {
          const mine = m.senderId === myId;
          const canModerate = admin && m.senderRole !== "admin";
          return (
            <div key={m.id} className={`flex items-center gap-1 group ${mine ? "justify-end" : "justify-start"}`}>
              {canModerate && !mine && (
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onDelete?.(m.id)} title="Apagar mensagem" className="cursor-pointer" style={{ color: "#EF4444" }}><Trash2 size={13} /></button>
                  <button onClick={() => onMute?.(m.senderId, m.senderName)} title={muted?.has(m.senderId) ? "Reativar" : "Silenciar"} className="cursor-pointer" style={{ color: muted?.has(m.senderId) ? "#16A34A" : "var(--gray)" }}>
                    {muted?.has(m.senderId) ? <Volume2 size={13} /> : <VolumeX size={13} />}
                  </button>
                </div>
              )}
              <div className="max-w-[78%] rounded-2xl px-3 py-2" style={mine ? { background: "var(--orange)", color: "white" } : { background: "var(--cream)", color: "var(--black)" }}>
                {showNames && !mine && <p className="text-[10px] font-bold mb-0.5" style={{ color: m.senderRole === "admin" ? "#7C3AED" : "var(--orange)" }}>{m.senderName}{m.senderRole === "admin" ? " · treinadora" : ""}{muted?.has(m.senderId) ? " · silenciada" : ""}</p>}
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                <p className="text-[9px] mt-0.5 text-right" style={{ opacity: 0.6 }}>{timeOf(m.createdAt)}</p>
              </div>
              {admin && mine && onDelete && (
                <button onClick={() => onDelete(m.id)} title="Apagar" className="opacity-0 group-hover:opacity-100 cursor-pointer" style={{ color: "#EF4444" }}><Trash2 size={13} /></button>
              )}
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
