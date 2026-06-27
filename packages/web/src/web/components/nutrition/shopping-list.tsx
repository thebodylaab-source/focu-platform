import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useState } from "react";
import { Plus, Trash2, ShoppingCart, Check, X, ChevronDown } from "lucide-react";

const CATEGORIES = [
  { id: "frutas", label: "Frutas", emoji: "🍎" },
  { id: "legumes", label: "Legumes", emoji: "🥦" },
  { id: "proteinas", label: "Proteínas", emoji: "🍗" },
  { id: "lacticinios", label: "Laticínios", emoji: "🥛" },
  { id: "cereais", label: "Cereais", emoji: "🌾" },
  { id: "outros", label: "Outros", emoji: "🛒" },
];

// Filtros de intolerância. Um alimento só aparece/adiciona se respeitar TODAS as
// restrições selecionadas (segurança — ninguém com intolerância pode receber
// um alimento errado).
const RESTRICTIONS = [
  { id: "sem-gluten", label: "Sem Glúten", emoji: "🌾" },
  { id: "sem-lactose", label: "Sem Lactose", emoji: "🥛" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "vegetariano", label: "Vegetariano", emoji: "🥦" },
];

function parseTags(v: any): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return []; } }
  return [];
}

// Adivinha a categoria da lista a partir do nome do alimento (para agrupar).
function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (/(banana|maç|maca|laranja|pera|morango|fruta|uva|manga)/.test(n)) return "frutas";
  if (/(br[óo]colos|batata|cenoura|espinafre|tomate|legume|courgette|cogumelo|alface|pepino)/.test(n)) return "legumes";
  if (/(frango|peru|vaca|carne|porco|salm|atum|peixe|ovo|feij|whey|prote)/.test(n)) return "proteinas";
  if (/(leite|iogurte|queijo|quark|requeij|nata|manteiga)/.test(n)) return "lacticinios";
  if (/(aveia|arroz|p[ãa]o|massa|cereal|quinoa)/.test(n)) return "cereais";
  return "outros";
}

export default function ShoppingList() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("outros");
  const [globalSearch, setGlobalSearch] = useState("");
  const [restrictions, setRestrictions] = useState<string[]>([]);

  // Catálogo (montra) completo de alimentos partilhados, para navegar e filtrar.
  const { data: catalogData } = useQuery({
    queryKey: ["global-foods-all"],
    queryFn: async () => (await (api.nutrition as any)["global-foods"].$get({ query: {} })).json(),
  });
  const catalog = (catalogData as any)?.foods ?? [];

  const { data: listData, isLoading } = useQuery({
    queryKey: ["shopping-list"],
    queryFn: async () => (await (api.nutrition as any).shopping.$get()).json(),
  });
  const items = (listData as any)?.items ?? [];

  const { data: globalData } = useQuery({
    queryKey: ["global-foods", globalSearch],
    queryFn: async () =>
      (await (api.nutrition as any)["global-foods"].$get({ query: { q: globalSearch } })).json(),
    enabled: globalSearch.length > 1,
  });
  const globalFoods = (globalData as any)?.foods ?? [];

  const addMutation = useMutation({
    mutationFn: async (item: any) =>
      (await (api.nutrition as any).shopping.$post({ json: item })).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shopping-list"] });
      setName(""); setQuantity(""); setCategory("outros"); setShowAdd(false); setGlobalSearch("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, checked }: { id: number; checked: boolean }) =>
      (await (api.nutrition as any).shopping[":id"].$patch({ param: { id: String(id) }, json: { checked } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-list"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      (await (api.nutrition as any).shopping[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-list"] }),
  });

  const clearCheckedMutation = useMutation({
    mutationFn: async () =>
      (await (api.nutrition as any).shopping.$delete()).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping-list"] }),
  });

  const checkedCount = items.filter((i: any) => i.checked).length;
  const uncheckedItems = items.filter((i: any) => !i.checked);
  const checkedItems = items.filter((i: any) => i.checked);

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    items: uncheckedItems.filter((i: any) => i.category === cat.id),
  })).filter((g) => g.items.length > 0);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleAdd = () => {
    if (!name.trim()) return;
    addMutation.mutate({ name: name.trim(), quantity: quantity.trim() || null, category, tags: selectedTags });
    setSelectedTags([]);
  };

  const handleSelectGlobal = (food: any) => {
    setName(food.name);
    setSelectedTags(parseTags(food.tags));
    setGlobalSearch("");
  };

  const toggleRestriction = (id: string) =>
    setRestrictions((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));

  // Montra filtrada: SÓ alimentos cujas tags incluem todas as restrições ativas.
  const filteredCatalog = catalog.filter((f: any) => {
    const tags = parseTags(f.tags);
    return restrictions.every((r) => tags.includes(r));
  });
  const namesInList = new Set(items.map((i: any) => String(i.name).toLowerCase()));

  const addFromCatalog = (food: any) => {
    const tags = parseTags(food.tags);
    // Revalidação de segurança antes de adicionar.
    if (!restrictions.every((r) => tags.includes(r))) return;
    addMutation.mutate({
      name: food.name,
      quantity: null,
      category: guessCategory(food.name),
      tags,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart size={20} style={{ color: "var(--orange)" }} />
          <span className="font-bold text-sm" style={{ color: "var(--black)" }}>
            {items.length} {items.length === 1 ? "item" : "itens"}
            {checkedCount > 0 && <span style={{ color: "var(--gray)" }}> · {checkedCount} concluídos</span>}
          </span>
        </div>
        {checkedCount > 0 && (
          <button
            onClick={() => clearCheckedMutation.mutate()}
            className="text-xs px-3 py-1.5 rounded-xl cursor-pointer"
            style={{ background: "#EF444415", color: "#EF4444" }}
          >
            Limpar concluídos
          </button>
        )}
      </div>

      {/* Add button */}
      <button
        onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white cursor-pointer"
        style={{ background: "var(--orange)" }}
      >
        <Plus size={18} />
        Adicionar item
      </button>

      {/* Montra de alimentos com filtros de intolerância */}
      {catalog.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "var(--white)" }}>
          <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: "var(--orange)" }}>
            🛒 Montra de alimentos
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--gray)" }}>
            Filtra pelas tuas intolerâncias — só aparecem alimentos que as respeitam.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {RESTRICTIONS.map((r) => {
              const active = restrictions.includes(r.id);
              return (
                <button key={r.id} onClick={() => toggleRestriction(r.id)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-all"
                  style={active ? { background: "var(--orange)", color: "white" } : { background: "var(--cream)", color: "var(--gray)" }}>
                  {r.emoji} {r.label}
                </button>
              );
            })}
          </div>

          {filteredCatalog.length === 0 ? (
            <p className="text-xs py-3 text-center" style={{ color: "var(--gray)" }}>
              Nenhum alimento da montra respeita esses filtros.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredCatalog.map((f: any) => {
                const tags = parseTags(f.tags);
                const already = namesInList.has(String(f.name).toLowerCase());
                return (
                  <div key={f.id} className="rounded-xl p-3 flex items-center gap-2" style={{ background: "var(--cream)" }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: "var(--black)" }}>{f.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.map((t: string) => {
                          const r = RESTRICTIONS.find((x) => x.id === t);
                          return r ? (
                            <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--peach)", color: "var(--orange)" }}>
                              {r.emoji} {r.label}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                    <button onClick={() => addFromCatalog(f)} disabled={already || addMutation.isPending}
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                      style={already ? { background: "var(--green)", color: "white" } : { background: "var(--orange)", color: "white" }}
                      title={already ? "Já na lista" : "Adicionar à lista"}>
                      {already ? <Check size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="animate-pulse rounded-2xl h-40" style={{ background: "var(--peach)" }} />
      ) : items.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ background: "var(--white)" }}>
          <div className="text-4xl mb-3">🛒</div>
          <p className="font-bold text-sm" style={{ color: "var(--black)" }}>Lista vazia</p>
          <p className="text-xs mt-1" style={{ color: "var(--gray)" }}>Adiciona os itens que precisas de comprar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Unchecked by category */}
          {grouped.map((group) => (
            <div key={group.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--white)" }}>
              <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "var(--gray-lt)" }}>
                <span>{group.emoji}</span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--gray)" }}>{group.label}</span>
              </div>
              {group.items.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--gray-lt)" }}>
                  <button
                    onClick={() => toggleMutation.mutate({ id: item.id, checked: true })}
                    className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all"
                    style={{ borderColor: "var(--orange)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--black)" }}>{item.name}</p>
                    {item.quantity && <p className="text-xs" style={{ color: "var(--gray)" }}>{item.quantity}</p>}
                  </div>
                  <button onClick={() => deleteMutation.mutate(item.id)} className="p-1.5 rounded-lg cursor-pointer shrink-0" style={{ color: "#EF4444" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ))}

          {/* Checked items */}
          {checkedItems.length > 0 && (
            <div className="rounded-2xl overflow-hidden opacity-60" style={{ background: "var(--white)" }}>
              <div className="px-4 py-2.5 border-b" style={{ borderColor: "var(--gray-lt)" }}>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--gray)" }}>✅ Comprado</span>
              </div>
              {checkedItems.map((item: any) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--gray-lt)" }}>
                  <button
                    onClick={() => toggleMutation.mutate({ id: item.id, checked: false })}
                    className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                    style={{ background: "var(--orange)" }}
                  >
                    <Check size={12} color="white" />
                  </button>
                  <p className="flex-1 text-sm line-through" style={{ color: "var(--gray)" }}>{item.name}</p>
                  <button onClick={() => deleteMutation.mutate(item.id)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#EF4444" }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl" style={{ background: "var(--white)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: "var(--black)" }}>Adicionar item</h3>
              <button onClick={() => { setShowAdd(false); setGlobalSearch(""); }} className="cursor-pointer">
                <X size={22} style={{ color: "var(--gray)" }} />
              </button>
            </div>

            {/* Search global foods */}
            <div className="mb-3">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>
                Pesquisar na base de dados partilhada
              </label>
              <input
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Ex: frango, aveia..."
                className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
              />
              {globalFoods.length > 0 && (
                <div className="mt-1 rounded-xl overflow-hidden border" style={{ borderColor: "var(--gray-lt)" }}>
                  {globalFoods.slice(0, 5).map((f: any) => (
                    <div
                      key={f.id}
                      onClick={() => handleSelectGlobal(f)}
                      className="px-3 py-2 text-sm cursor-pointer hover:opacity-70 border-b last:border-b-0"
                      style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                    >
                      {f.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Nome *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Frango, Aveia, Leite..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Quantidade</label>
                  <input
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Ex: 500g, 2 uni..."
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                    style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                    style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={!name.trim() || addMutation.isPending}
              className="w-full mt-4 py-3 rounded-xl font-bold text-sm text-white cursor-pointer disabled:opacity-50"
              style={{ background: "var(--orange)" }}
            >
              {addMutation.isPending ? "A adicionar..." : "Adicionar à lista"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
