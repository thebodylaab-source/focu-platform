import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useState } from "react";
import { FileText, Download, Book, Plus, X, Search } from "lucide-react";
import { authClient } from "../lib/auth";

export default function ConteudosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"todos" | "pdf" | "ebook">("todos");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "pdf", fileUrl: "", category: "programa" });

  const { data: session } = authClient.useSession();
  const isAdmin = ((session?.user as any)?.role ?? "") === "admin";

  const { data, isLoading } = useQuery({ queryKey: ["documents"], queryFn: async () => (await api.documents.$get()).json() });
  const docs = (data as any)?.documents ?? [];

  const addMutation = useMutation({
    mutationFn: async (d: typeof form) => (await api.documents.$post({ json: d })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); setShowAdd(false); setForm({ title: "", description: "", type: "pdf", fileUrl: "", category: "programa" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await api.documents[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  const filtered = docs.filter((d: any) => {
    const matchType = typeFilter === "todos" || d.type === typeFilter;
    const matchSearch = !search || d.title.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div className="fade-up space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>Conteúdos & Ebooks 📚</h1>
          <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>{docs.length} ficheiros disponíveis para download</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white cursor-pointer transition-opacity hover:opacity-90" style={{ background: "var(--orange)" }}>
            <Plus size={18} />
            <span className="hidden sm:inline">Adicionar</span>
          </button>
        )}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--gray)" }} />
          <input type="text" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm border outline-none"
            style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
        </div>
        <div className="flex gap-1.5 rounded-xl p-1" style={{ background: "var(--peach)" }}>
          {(["todos", "pdf", "ebook"] as const).map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all capitalize"
              style={typeFilter === t ? { background: "var(--orange)", color: "white" } : { color: "var(--gray)" }}>
              {t === "todos" ? "Todos" : t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Content grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="rounded-2xl animate-pulse" style={{ background: "var(--peach)", height: "140px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <FileText size={48} className="mx-auto mb-4 opacity-20" style={{ color: "var(--orange)" }} />
          <p className="font-semibold" style={{ color: "var(--gray)" }}>Nenhum conteúdo encontrado</p>
          <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>Adiciona PDFs e ebooks clicando em "Adicionar"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc: any) => (
            <div key={doc.id} className="rounded-2xl p-5 flex flex-col gap-3 group shadow-sm" style={{ background: "var(--white)" }}>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: doc.type === "ebook" ? "#7C3AED20" : "var(--peach)" }}>
                  {doc.type === "ebook" ? <Book size={22} style={{ color: "#7C3AED" }} /> : <FileText size={22} style={{ color: "var(--orange)" }} />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{ background: "var(--peach)", color: "var(--orange)" }}>
                    {doc.type.toUpperCase()}
                  </span>
                  {isAdmin && (
                    <button onClick={() => deleteMutation.mutate(doc.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg cursor-pointer" style={{ color: "#EF4444" }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight" style={{ color: "var(--black)" }}>{doc.title}</h3>
                {doc.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--gray)" }}>{doc.description}</p>}
              </div>
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 cursor-pointer"
                style={{ background: "var(--orange)" }}>
                <Download size={16} />
                <span>Download</span>
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl" style={{ background: "var(--white)" }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black" style={{ color: "var(--black)" }}>Adicionar Conteúdo</h3>
              <button onClick={() => setShowAdd(false)} className="cursor-pointer"><X size={22} style={{ color: "var(--gray)" }} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); addMutation.mutate(form); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Tipo</label>
                <div className="flex gap-2">
                  {["pdf", "ebook"].map(t => (
                    <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t }))}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                      style={form.type === t ? { background: "var(--orange)", color: "white" } : { background: "var(--cream)", color: "var(--gray)", border: "1px solid var(--gray-lt)" }}>
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Título</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nome do documento"
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} required />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Descrição (opcional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Breve descrição do conteúdo"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Link do ficheiro</label>
                <input value={form.fileUrl} onChange={e => setForm(f => ({ ...f, fileUrl: e.target.value }))}
                  placeholder="https://drive.google.com/... ou link direto"
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} required />
                <p className="text-[10px] mt-1" style={{ color: "var(--gray)" }}>Carrega o PDF/ebook para o Google Drive ou Dropbox e cola aqui o link de partilha.</p>
              </div>
              <button type="submit" disabled={addMutation.isPending}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white cursor-pointer"
                style={{ background: "var(--orange)" }}>
                {addMutation.isPending ? "A adicionar..." : "Adicionar Conteúdo"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
