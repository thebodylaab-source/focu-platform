import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useState } from "react";
import { Play, Plus, X, Search, Filter } from "lucide-react";

const CATEGORIES = ["Todos", "Semana 1", "Semana 2", "Semana 3", "Semana 4", "Aquecimento", "Glúteos", "Core", "Bónus"];

function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const thumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  if (playing) {
    return (
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full rounded-xl"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="relative cursor-pointer rounded-xl overflow-hidden group" style={{ paddingBottom: "56.25%" }} onClick={() => setPlaying(true)}>
      <img src={thumb} alt={title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        onError={e => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`; }}
      />
      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110" style={{ background: "var(--orange)" }}>
          <Play size={24} fill="white" className="ml-1" style={{ color: "white" }} />
        </div>
      </div>
    </div>
  );
}

export default function VideosPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("Todos");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", youtubeId: "", category: "Semana 1", week: 1, order: 0 });

  const { data, isLoading } = useQuery({ queryKey: ["videos"], queryFn: async () => (await api.videos.$get()).json() });
  const videos = (data as any)?.videos ?? [];

  const addMutation = useMutation({
    mutationFn: async (v: typeof form) => {
      const res = await api.videos.$post({ json: v });
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["videos"] }); setShowAdd(false); setForm({ title: "", description: "", youtubeId: "", category: "Semana 1", week: 1, order: 0 }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.videos[":id"].$delete({ param: { id: String(id) } });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["videos"] }),
  });

  const filtered = videos.filter((v: any) => {
    const matchCat = filter === "Todos" || v.category === filter;
    const matchSearch = !search || v.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Extract YouTube ID from URL or raw ID
  const extractYtId = (input: string) => {
    const match = input.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? match[1] : input.trim();
  };

  return (
    <div className="fade-up space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>Vídeos do Programa 🎬</h1>
          <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>{videos.length} vídeos disponíveis</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white cursor-pointer transition-opacity hover:opacity-90" style={{ background: "var(--orange)" }}>
          <Plus size={18} />
          <span className="hidden sm:inline">Adicionar</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--gray)" }} />
        <input type="text" placeholder="Pesquisar vídeos..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm border outline-none"
          style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)}
            className="shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all"
            style={filter === cat ? { background: "var(--orange)", color: "white" } : { background: "var(--white)", color: "var(--gray)", border: "1px solid var(--gray-lt)" }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Videos grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "var(--peach)", height: "220px" }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Play size={48} className="mx-auto mb-4 opacity-20" style={{ color: "var(--orange)" }} />
          <p className="font-semibold" style={{ color: "var(--gray)" }}>Nenhum vídeo encontrado</p>
          <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>Adiciona vídeos do YouTube clicando em "Adicionar"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v: any) => (
            <div key={v.id} className="rounded-2xl overflow-hidden shadow-sm group" style={{ background: "var(--white)" }}>
              <YouTubeEmbed videoId={v.youtubeId} title={v.title} />
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "var(--peach)", color: "var(--orange)" }}>{v.category}</span>
                    <h3 className="font-bold text-sm mt-2 leading-tight line-clamp-2" style={{ color: "var(--black)" }}>{v.title}</h3>
                    {v.description && <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--gray)" }}>{v.description}</p>}
                  </div>
                  <button onClick={() => deleteMutation.mutate(v.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all cursor-pointer hover:bg-red-50" style={{ color: "#EF4444" }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add video modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl" style={{ background: "var(--white)" }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black" style={{ color: "var(--black)" }}>Adicionar Vídeo</h3>
              <button onClick={() => setShowAdd(false)} className="cursor-pointer"><X size={22} style={{ color: "var(--gray)" }} /></button>
            </div>
            <form onSubmit={e => { e.preventDefault(); addMutation.mutate({ ...form, youtubeId: extractYtId(form.youtubeId) }); }} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>URL ou ID do YouTube</label>
                <input value={form.youtubeId} onChange={e => setForm(f => ({ ...f, youtubeId: e.target.value }))}
                  placeholder="https://youtube.com/watch?v=... ou dQw4w9WgXcQ"
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} required />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Título</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Nome do treino"
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} required />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Descrição (opcional)</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Breve descrição do treino"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Categoria</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                    style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}>
                    {CATEGORIES.filter(c => c !== "Todos").map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Ordem</label>
                  <input type="number" value={form.order} onChange={e => setForm(f => ({ ...f, order: parseInt(e.target.value) }))}
                    className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                    style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                </div>
              </div>
              <button type="submit" disabled={addMutation.isPending}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white cursor-pointer transition-opacity hover:opacity-90"
                style={{ background: "var(--orange)" }}>
                {addMutation.isPending ? "A adicionar..." : "Adicionar Vídeo"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
