import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";
import { useState } from "react";
import { Plus, Trash2, Search, X, ChevronLeft, ChevronRight } from "lucide-react";

const MEALS = [
  { id: "pequeno-almoco", label: "Pequeno-almoço", emoji: "🌅" },
  { id: "almoco", label: "Almoço", emoji: "☀️" },
  { id: "lanche", label: "Lanche", emoji: "🍎" },
  { id: "jantar", label: "Jantar", emoji: "🌙" },
];

// Common foods database (PT)
const COMMON_FOODS = [
  { name: "Frango grelhado", calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: 100, servingUnit: "g" },
  { name: "Ovo cozido", calories: 155, protein: 13, carbs: 1.1, fat: 11, servingSize: 100, servingUnit: "g" },
  { name: "Aveia", calories: 389, protein: 17, carbs: 66, fat: 7, servingSize: 100, servingUnit: "g" },
  { name: "Banana", calories: 89, protein: 1.1, carbs: 23, fat: 0.3, servingSize: 100, servingUnit: "g" },
  { name: "Iogurte grego", calories: 59, protein: 10, carbs: 3.6, fat: 0.4, servingSize: 100, servingUnit: "g" },
  { name: "Arroz branco cozido", calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: 100, servingUnit: "g" },
  { name: "Batata-doce", calories: 86, protein: 1.6, carbs: 20, fat: 0.1, servingSize: 100, servingUnit: "g" },
  { name: "Salmão", calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: 100, servingUnit: "g" },
  { name: "Atum em lata", calories: 116, protein: 26, carbs: 0, fat: 1, servingSize: 100, servingUnit: "g" },
  { name: "Bróculos", calories: 34, protein: 2.8, carbs: 7, fat: 0.4, servingSize: 100, servingUnit: "g" },
  { name: "Feijão preto", calories: 132, protein: 8.9, carbs: 24, fat: 0.5, servingSize: 100, servingUnit: "g" },
  { name: "Amêndoas", calories: 579, protein: 21, carbs: 22, fat: 50, servingSize: 30, servingUnit: "g" },
  { name: "Queijo cottage", calories: 98, protein: 11, carbs: 3.4, fat: 4.3, servingSize: 100, servingUnit: "g" },
  { name: "Pão integral", calories: 247, protein: 13, carbs: 41, fat: 4.2, servingSize: 100, servingUnit: "g" },
  { name: "Azeite", calories: 884, protein: 0, carbs: 0, fat: 100, servingSize: 10, servingUnit: "ml" },
  { name: "Maçã", calories: 52, protein: 0.3, carbs: 14, fat: 0.2, servingSize: 150, servingUnit: "g" },
  { name: "Leite meio-gordo", calories: 49, protein: 3.2, carbs: 4.8, fat: 1.5, servingSize: 200, servingUnit: "ml" },
  { name: "Whey protein", calories: 120, protein: 24, carbs: 3, fat: 1.5, servingSize: 30, servingUnit: "g" },
];

export default function FoodTracker() {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [meal, setMeal] = useState("almoco");
  const [customFood, setCustomFood] = useState({ name: "", calories: 0, protein: 0, carbs: 0, fat: 0, servingSize: 100 });
  const [addMode, setAddMode] = useState<"search" | "custom">("search");

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["food-logs", date],
    queryFn: async () => (await api.nutrition.logs.$get({ query: { date } })).json(),
  });
  const logs = (logsData as any)?.logs ?? [];

  // Search global foods DB
  const { data: globalData } = useQuery({
    queryKey: ["global-foods-search", search],
    queryFn: async () => {
      const res = await fetch(`/api/nutrition/global-foods?q=${encodeURIComponent(search)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return res.json();
    },
    enabled: search.length > 1,
  });
  const globalFoods: any[] = (globalData as any)?.foods ?? [];

  const addMutation = useMutation({
    mutationFn: async (entry: any) => (await api.nutrition.logs.$post({ json: entry })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["food-logs"] }); setShowAdd(false); setSelectedFood(null); setSearch(""); setQty(1); },
  });

  const saveGlobalFood = async (food: typeof customFood) => {
    try {
      await fetch("/api/nutrition/global-foods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          name: food.name,
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fat: food.fat,
          servingSize: food.servingSize,
          servingUnit: "g",
        }),
      });
    } catch { /* silently ignore */ }
  };
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => (await api.nutrition.logs[":id"].$delete({ param: { id: String(id) } })).json(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["food-logs"] }),
  });

  const deleteGlobalFoodMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/nutrition/global-foods/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["global-foods-search"] }),
  });

  // Merge: static list + global DB results, deduplicate by name
  const staticFiltered = search.length > 1
    ? COMMON_FOODS.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : COMMON_FOODS;

  const globalFiltered = globalFoods.filter(
    gf => !staticFiltered.some(sf => sf.name.toLowerCase() === gf.name.toLowerCase())
  ).map(gf => ({ ...gf, _fromDB: true }));

  const filteredFoods = [...staticFiltered, ...globalFiltered];

  const prevDay = () => {
    const d = new Date(date); d.setDate(d.getDate() - 1); setDate(d.toISOString().split("T")[0]);
  };
  const nextDay = () => {
    const d = new Date(date); d.setDate(d.getDate() + 1);
    if (d <= new Date()) setDate(d.toISOString().split("T")[0]);
  };

  const handleAdd = () => {
    const food = addMode === "search" ? selectedFood : customFood;
    if (!food) return;
    // If custom food, save to global DB (shared with all users)
    if (addMode === "custom" && customFood.name) {
      saveGlobalFood(customFood);
    }
    addMutation.mutate({
      foodName: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      quantity: qty,
      servingSize: food.servingSize ?? 100,
      meal,
      logDate: date,
    });
  };

  const logsByMeal = MEALS.map(m => ({
    ...m,
    logs: logs.filter((l: any) => l.meal === m.id),
  }));

  const totalCals = logs.reduce((acc: number, l: any) => acc + l.calories * l.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Date navigator */}
      <div className="flex items-center gap-3 rounded-2xl p-4" style={{ background: "var(--white)" }}>
        <button onClick={prevDay} className="p-2 rounded-xl cursor-pointer" style={{ background: "var(--cream)" }}>
          <ChevronLeft size={18} style={{ color: "var(--gray)" }} />
        </button>
        <div className="flex-1 text-center">
          <p className="font-bold text-sm" style={{ color: "var(--black)" }}>
            {new Date(date + "T12:00:00").toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <p className="text-xs" style={{ color: "var(--gray)" }}>{Math.round(totalCals)} kcal totais</p>
        </div>
        <button onClick={nextDay} className="p-2 rounded-xl cursor-pointer" style={{ background: "var(--cream)" }}>
          <ChevronRight size={18} style={{ color: "var(--gray)" }} />
        </button>
      </div>

      {/* Add button */}
      <button onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-sm text-white cursor-pointer"
        style={{ background: "var(--orange)" }}>
        <Plus size={18} />
        Registar alimento
      </button>

      {/* Meals */}
      {isLoading ? (
        <div className="animate-pulse rounded-2xl h-40" style={{ background: "var(--peach)" }} />
      ) : (
        <div className="space-y-3">
          {logsByMeal.map(m => (
            <div key={m.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--white)" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--gray-lt)" }}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{m.emoji}</span>
                  <span className="font-bold text-sm" style={{ color: "var(--black)" }}>{m.label}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: "var(--gray)" }}>
                  {Math.round(m.logs.reduce((a: number, l: any) => a + l.calories * l.quantity, 0))} kcal
                </span>
              </div>
              {m.logs.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "var(--gray)" }}>Nenhum alimento registado</p>
              ) : (
                m.logs.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between px-4 py-2.5 border-b last:border-b-0" style={{ borderColor: "var(--gray-lt)" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--black)" }}>{l.foodName}</p>
                      <p className="text-xs" style={{ color: "var(--gray)" }}>
                        {l.quantity > 1 ? `${l.quantity}× ` : ""}{l.servingSize}g · {Math.round(l.protein * l.quantity)}g P · {Math.round(l.carbs * l.quantity)}g H · {Math.round(l.fat * l.quantity)}g G
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: "var(--orange)" }}>{Math.round(l.calories * l.quantity)} kcal</span>
                      <button onClick={() => deleteMutation.mutate(l.id)} className="p-1.5 rounded-lg cursor-pointer" style={{ color: "#EF4444" }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--white)" }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black" style={{ color: "var(--black)" }}>Registar alimento</h3>
              <button onClick={() => { setShowAdd(false); setSelectedFood(null); setSearch(""); }} className="cursor-pointer">
                <X size={22} style={{ color: "var(--gray)" }} />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-xl p-0.5 mb-4" style={{ background: "var(--peach)" }}>
              {(["search", "custom"] as const).map(m => (
                <button key={m} onClick={() => setAddMode(m)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  style={addMode === m ? { background: "var(--orange)", color: "white" } : { color: "var(--gray)" }}>
                  {m === "search" ? "Pesquisar alimento" : "Alimento personalizado"}
                </button>
              ))}
            </div>

            {addMode === "search" ? (
              <>
                <div className="relative mb-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--gray)" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Pesquisar alimento..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none"
                    style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                  {filteredFoods.length === 0 && (
                    <p className="text-xs text-center py-4" style={{ color: "var(--gray)" }}>Sem resultados. Usa "Alimento personalizado" para adicionar.</p>
                  )}
                  {filteredFoods.map((f: any) => (
                    <div key={f.name} onClick={() => setSelectedFood(f)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all"
                      style={{ background: selectedFood?.name === f.name ? "var(--peach)" : "var(--cream)" }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium" style={{ color: "var(--black)" }}>{f.name}</p>
                          {f._fromDB && (
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "#F07A3020", color: "var(--orange)" }}>
                              personalizado
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: "var(--gray)" }}>{f.calories} kcal/{f.servingSize}{f.servingUnit ?? "g"} · P:{f.protein}g H:{f.carbs}g G:{f.fat}g</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {f._fromDB && (
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteGlobalFoodMutation.mutate(f.id); }}
                            className="p-1 rounded-lg cursor-pointer transition-opacity hover:opacity-70"
                            style={{ color: "#EF4444" }}
                            title="Remover alimento"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {selectedFood?.name === f.name && <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "var(--orange)" }}><span className="text-white text-xs">✓</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Nome</label>
                  <input value={customFood.name} onChange={e => setCustomFood(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                    style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} placeholder="Nome do alimento" />
                </div>
                {[["calories", "Calorias (kcal)"], ["protein", "Proteína (g)"], ["carbs", "Hidratos (g)"], ["fat", "Gorduras (g)"], ["servingSize", "Porção (g)"]].map(([key, label]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>{label}</label>
                    <input type="number" value={(customFood as any)[key]} onChange={e => setCustomFood(f => ({ ...f, [key]: parseFloat(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                      style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                  </div>
                ))}
              </div>
            )}

            {/* Meal + qty */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Refeição</label>
                <select value={meal} onChange={e => setMeal(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}>
                  {MEALS.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>Porções</label>
                <input type="number" step="0.5" min="0.5" value={qty} onChange={e => setQty(parseFloat(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
              </div>
            </div>

            {(selectedFood || addMode === "custom") && (
              <div className="p-3 rounded-xl mb-4" style={{ background: "var(--peach)" }}>
                <p className="text-xs font-semibold" style={{ color: "var(--gray)" }}>Total estimado ({qty} porção{qty !== 1 ? "ões" : ""}):</p>
                <p className="text-lg font-black mt-0.5" style={{ color: "var(--orange)" }}>
                  {Math.round((addMode === "search" ? selectedFood?.calories ?? 0 : customFood.calories) * qty)} kcal
                </p>
              </div>
            )}

            <button onClick={handleAdd} disabled={addMutation.isPending || (!selectedFood && addMode === "search") || (addMode === "custom" && !customFood.name)}
              className="w-full py-3 rounded-xl font-bold text-sm text-white cursor-pointer disabled:opacity-50"
              style={{ background: "var(--orange)" }}>
              {addMutation.isPending ? "A registar..." : "Registar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
