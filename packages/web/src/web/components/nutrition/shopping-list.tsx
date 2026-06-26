import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useState, useMemo } from "react";
import { Plus, X, Search, Check, Trash2, ShoppingCart, Store } from "lucide-react";
import {
  CATALOG,
  SUPERMARKETS,
  CATALOG_CATEGORIES,
  filterCatalog,
  type DietTag,
  type SupermarketId,
  type CatalogProduct,
} from "./food-catalog";

const RESTRICTIONS: { id: DietTag; label: string; emoji: string }[] = [
  { id: "sem-gluten", label: "Sem Glúten", emoji: "🌾" },
  { id: "sem-lactose", label: "Sem Lactose", emoji: "🥛" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "vegetariano", label: "Vegetariano", emoji: "🥦" },
];

function smLabel(id: string) {
  return SUPERMARKETS.find((s) => s.id === id)?.label ?? id;
}
function smColor(id: string) {
  return SUPERMARKETS.find((s) => s.id === id)?.color ?? "var(--gray)";
}

export default function ShoppingList() {
  const qc = useQueryClient();
  const [restrictions, setRestrictions] = useState<DietTag[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");

  const { data } = useQuery({
    queryKey: ["shopping"],
    queryFn: async () => (await api.shopping.$get()).json(),
  });
  const items: any[] = (data as any)?.items ?? [];

  const addMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      category?: string;
      tags?: string[];
      supermarkets?: string[];
    }) => (await api.shopping.$post({ json: payload })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
  });

  const patchMutation = useMutation({
    mutationFn: async ({ id, checked }: { id: number; checked: boolean }) =>
      (await api.shopping[":id"].$patch({ param: { id: String(id) }, json: { checked } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      (await api.shopping[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
  });

  const clearCheckedMutation = useMutation({
    mutationFn: async () => (await api.shopping.$delete()).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["shopping"] }),
  });

  const filtered = useMemo(
    () => filterCatalog(CATALOG, restrictions, category, search),
    [restrictions, category, search]
  );

  // ids já na lista (por nome) para evitar duplicados visuais
  const namesInList = useMemo(
    () => new Set(items.map((i) => i.name.toLowerCase())),
    [items]
  );

  function toggleRestriction(id: DietTag) {
    setRestrictions((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }

  function addProduct(p: CatalogProduct) {
    // SEGURANÇA: revalida que o produto respeita TODAS as restrições ativas
    // antes de o adicionar à lista.
    const ok = restrictions.every((r) => p.tags.includes(r));
    if (!ok) return;
    addMutation.mutate({
      name: p.name,
      category: p.category,
      tags: p.tags,
      supermarkets: p.supermarkets,
    });
  }

  function addCustom() {
    const name = customName.trim();
    if (!name) return;
    addMutation.mutate({ name, category: "outros", tags: restrictions, supermarkets: [] });
    setCustomName("");
  }

  const pending = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  return (
    <div className="space-y-6">
      {/* ── A MINHA LISTA ── */}
      <div className="rounded-2xl p-5" style={{ background: "var(--white)" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-lg flex items-center gap-2" style={{ color: "var(--black)" }}>
            <ShoppingCart size={20} style={{ color: "var(--orange)" }} /> A minha lista de compras
          </h2>
          {done.length > 0 && (
            <button
              onClick={() => clearCheckedMutation.mutate()}
              className="text-xs font-semibold flex items-center gap-1 cursor-pointer"
              style={{ color: "var(--gray)" }}
            >
              <Trash2 size={13} /> Limpar comprados
            </button>
          )}
        </div>

        {/* Adicionar item livre */}
        <div className="flex gap-2 mb-4">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="Adicionar um produto à mão…"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--cream)", color: "var(--black)" }}
          />
          <button
            onClick={addCustom}
            disabled={!customName.trim() || addMutation.isPending}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white cursor-pointer flex items-center gap-1"
            style={{ background: "var(--orange)" }}
          >
            <Plus size={16} /> Adicionar
          </button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm py-4 text-center" style={{ color: "var(--gray)" }}>
            A tua lista está vazia. Adiciona produtos da montra abaixo. 🛒
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map((it) => (
              <ListRow
                key={it.id}
                item={it}
                onToggle={() => patchMutation.mutate({ id: it.id, checked: true })}
                onRemove={() => deleteMutation.mutate(it.id)}
              />
            ))}
            {done.length > 0 && (
              <p className="text-[11px] font-bold uppercase tracking-wider pt-3 pb-1" style={{ color: "var(--gray)" }}>
                Já comprado ({done.length})
              </p>
            )}
            {done.map((it) => (
              <ListRow
                key={it.id}
                item={it}
                checked
                onToggle={() => patchMutation.mutate({ id: it.id, checked: false })}
                onRemove={() => deleteMutation.mutate(it.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── MONTRA DE ALIMENTOS ── */}
      <div className="rounded-2xl p-5" style={{ background: "var(--white)" }}>
        <h2 className="font-black text-lg flex items-center gap-2 mb-1" style={{ color: "var(--black)" }}>
          <Store size={20} style={{ color: "var(--orange)" }} /> Montra de alimentos
        </h2>
        <p className="text-xs mb-4" style={{ color: "var(--gray)" }}>
          Escolhe os teus produtos e vê em que supermercados existem. Filtra pelas tuas
          intolerâncias — só aparecem alimentos que as respeitam.
        </p>

        {/* Filtros de restrição (segurança) */}
        <div className="flex flex-wrap gap-2 mb-3">
          {RESTRICTIONS.map((r) => {
            const active = restrictions.includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => toggleRestriction(r.id)}
                className="text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-all"
                style={
                  active
                    ? { background: "var(--orange)", color: "white" }
                    : { background: "var(--cream)", color: "var(--gray)" }
                }
              >
                {r.emoji} {r.label}
              </button>
            );
          })}
        </div>

        {restrictions.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg mb-3 w-fit" style={{ background: "#EAF3EC", color: "var(--green)" }}>
            <Check size={12} /> A mostrar apenas produtos {restrictions.map((r) => RESTRICTIONS.find((x) => x.id === r)?.label).join(" + ")}
          </div>
        )}

        {/* Pesquisa + categorias */}
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--gray)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar alimento…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--cream)", color: "var(--black)" }}
          />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setCategory(null)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer"
            style={!category ? { background: "var(--black)", color: "white" } : { background: "var(--cream)", color: "var(--gray)" }}
          >
            Tudo
          </button>
          {CATALOG_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer"
              style={category === c.id ? { background: "var(--black)", color: "white" } : { background: "var(--cream)", color: "var(--gray)" }}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {/* Grelha de produtos */}
        {filtered.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: "var(--gray)" }}>
            Nenhum produto corresponde a estes filtros.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((p) => {
              const already = namesInList.has(p.name.toLowerCase());
              return (
                <div key={p.id} className="rounded-xl p-3.5 flex flex-col gap-2.5" style={{ background: "var(--cream)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm" style={{ color: "var(--black)" }}>{p.name}</span>
                    <button
                      onClick={() => addProduct(p)}
                      disabled={already || addMutation.isPending}
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                      style={already ? { background: "var(--green)", color: "white" } : { background: "var(--orange)", color: "white" }}
                      title={already ? "Já na lista" : "Adicionar à lista"}
                    >
                      {already ? <Check size={15} /> : <Plus size={15} />}
                    </button>
                  </div>

                  {/* Tags de intolerância */}
                  <div className="flex flex-wrap gap-1">
                    {p.tags.map((t) => {
                      const r = RESTRICTIONS.find((x) => x.id === t);
                      return r ? (
                        <span key={t} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--peach)", color: "var(--orange)" }}>
                          {r.emoji} {r.label}
                        </span>
                      ) : null;
                    })}
                  </div>

                  {/* Supermercados */}
                  <div className="flex flex-wrap gap-1">
                    {p.supermarkets.map((s: SupermarketId) => (
                      <span
                        key={s}
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: "white", color: smColor(s), border: `1px solid ${smColor(s)}33` }}
                      >
                        {smLabel(s)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ListRow({
  item,
  checked,
  onToggle,
  onRemove,
}: {
  item: any;
  checked?: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const supermarkets: string[] = typeof item.supermarkets === "string" ? JSON.parse(item.supermarkets) : item.supermarkets ?? [];
  const tags: string[] = typeof item.tags === "string" ? JSON.parse(item.tags) : item.tags ?? [];
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "var(--cream)" }}>
      <button
        onClick={onToggle}
        className="shrink-0 w-5 h-5 rounded-md flex items-center justify-center cursor-pointer"
        style={checked ? { background: "var(--green)" } : { background: "white", border: "2px solid var(--gray)" }}
      >
        {checked && <Check size={13} color="white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: checked ? "var(--gray)" : "var(--black)", textDecoration: checked ? "line-through" : "none" }}>
          {item.name}
        </p>
        {supermarkets.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {supermarkets.slice(0, 4).map((s) => (
              <span key={s} className="text-[9px] font-bold" style={{ color: smColor(s) }}>{smLabel(s)}</span>
            ))}
            {supermarkets.length > 4 && <span className="text-[9px]" style={{ color: "var(--gray)" }}>+{supermarkets.length - 4}</span>}
          </div>
        )}
      </div>
      {tags.length > 0 && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: "var(--peach)", color: "var(--orange)" }}>
          {tags.length} ✓
        </span>
      )}
      <button onClick={onRemove} className="shrink-0 cursor-pointer" style={{ color: "var(--gray)" }} title="Remover">
        <X size={16} />
      </button>
    </div>
  );
}
