import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, Users, Flame, Plus, X, Search, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";
import { getToken } from "../../lib/auth";

const FILTERS = [
  { id: "sem-gluten", label: "Sem Glúten", emoji: "🌾" },
  { id: "sem-lactose", label: "Sem Lactose", emoji: "🥛" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "vegetariano", label: "Vegetariano", emoji: "🥦" },
  { id: "sem-acucar", label: "Sem Açúcar", emoji: "🍬" },
  { id: "alta-proteina", label: "Alta Proteína", emoji: "💪" },
];

// Escala as quantidades numéricas de um ingrediente por um fator.
// Ex: "200g frango" x1.5 -> "300g frango".
function scaleIngredient(ingredient: string, factor: number): string {
  if (factor === 1) return ingredient;
  return ingredient.replace(/(\d+(?:[.,]\d+)?)/g, (m) => {
    const n = parseFloat(m.replace(",", ".")) * factor;
    const rounded = Math.round(n * 10) / 10;
    return (Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1)).replace(".", ",");
  });
}

// Secções da vista "Descobrir" (carrosséis por tipo de refeição).
const CATEGORY_SECTIONS = [
  { id: "pequeno-almoco", label: "Pequeno-almoço", emoji: "🌅" },
  { id: "principal", label: "Almoço / Jantar", emoji: "🍽️" },
  { id: "salada", label: "Saladas", emoji: "🥗" },
  { id: "sopa", label: "Sopas", emoji: "🍲" },
  { id: "snack", label: "Snacks e Lanches", emoji: "🥨" },
  { id: "lanche", label: "Snacks e Lanches", emoji: "🥨" },
  { id: "sobremesa", label: "Sobremesas", emoji: "🍰" },
  { id: "bebida", label: "Bebidas", emoji: "🥤" },
];

function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const DEFAULT_RECIPES = [
  {
    id: -1, title: "Papas de Aveia com Frutos Vermelhos", description: "Pequeno-almoço rico em fibra e proteína",
    imageUrl: "", calories: 320, protein: 14, carbs: 48, fat: 8, prepTime: 5, cookTime: 5, servings: 1,
    ingredients: JSON.stringify(["80g aveia", "250ml leite vegetal", "1 banana", "Frutos vermelhos q.b.", "1 colher sopa manteiga amendoim"]),
    steps: JSON.stringify(["Aquecer o leite", "Adicionar a aveia e mexer 3-4 min", "Servir com banana e frutos vermelhos"]),
    tags: JSON.stringify(["sem-gluten", "sem-lactose", "vegetariano"]), category: "pequeno-almoco",
  },
  {
    id: -2, title: "Frango com Batata-Doce Assada", description: "Refeição equilibrada rica em proteína",
    imageUrl: "", calories: 450, protein: 42, carbs: 38, fat: 12, prepTime: 10, cookTime: 35, servings: 2,
    ingredients: JSON.stringify(["400g peito de frango", "300g batata-doce", "Azeite 2 col. sopa", "Ervas aromáticas", "Sal e pimenta"]),
    steps: JSON.stringify(["Pré-aquecer o forno a 200°C", "Temperar o frango e a batata-doce", "Assar 30-35 min", "Servir com salada verde"]),
    tags: JSON.stringify(["sem-gluten", "sem-lactose", "sem-acucar", "alta-proteina"]), category: "principal",
  },
  {
    id: -3, title: "Bowl Vegan de Quinoa", description: "Bowl nutritivo e colorido para o almoço",
    imageUrl: "", calories: 380, protein: 16, carbs: 54, fat: 11, prepTime: 10, cookTime: 15, servings: 1,
    ingredients: JSON.stringify(["80g quinoa", "Grão de bico 100g", "Abacate 1/2", "Pepino", "Tomate cherry", "Limão e azeite"]),
    steps: JSON.stringify(["Cozinhar a quinoa 15 min", "Montar o bowl com todos os ingredientes", "Temperar com limão e azeite"]),
    tags: JSON.stringify(["sem-gluten", "sem-lactose", "vegan", "vegetariano"]), category: "principal",
  },
  {
    id: -4, title: "Iogurte Grego com Granola", description: "Lanche proteico e saciante",
    imageUrl: "", calories: 280, protein: 18, carbs: 32, fat: 9, prepTime: 2, cookTime: 0, servings: 1,
    ingredients: JSON.stringify(["200g iogurte grego", "30g granola sem açúcar", "Mel 1 col. chá", "Frutos secos q.b."]),
    steps: JSON.stringify(["Colocar o iogurte na taça", "Adicionar granola e frutos secos", "Regar com mel"]),
    tags: JSON.stringify(["sem-gluten", "vegetariano", "alta-proteina"]), category: "lanche",
  },
  {
    id: -5, title: "Salmão com Legumes no Forno", description: "Rico em ómega-3 e proteína de qualidade",
    imageUrl: "", calories: 420, protein: 38, carbs: 18, fat: 22, prepTime: 10, cookTime: 20, servings: 2,
    ingredients: JSON.stringify(["2 postas salmão", "Bróculos 200g", "Cenoura 1", "Azeite 2 col. sopa", "Alho 2 dentes", "Limão"]),
    steps: JSON.stringify(["Pré-aquecer 180°C", "Dispor salmão e legumes em tabuleiro", "Temperar e assar 20 min"]),
    tags: JSON.stringify(["sem-gluten", "sem-lactose", "sem-acucar", "alta-proteina"]), category: "principal",
  },
  {
    id: -6, title: "Smoothie Proteico de Manga", description: "Pós-treino rápido e delicioso",
    imageUrl: "", calories: 290, protein: 22, carbs: 34, fat: 6, prepTime: 3, cookTime: 0, servings: 1,
    ingredients: JSON.stringify(["1 dose whey baunilha", "150g manga congelada", "200ml leite de amêndoa", "1 col. sopa manteiga amêndoa"]),
    steps: JSON.stringify(["Colocar todos os ingredientes no liquidificador", "Bater 30 seg", "Servir imediatamente"]),
    tags: JSON.stringify(["sem-gluten", "alta-proteina"]), category: "lanche",
  },
];

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
};

function RecipeCard({ recipe }: { recipe: any }) {
  const [expanded, setExpanded] = useState(false);
  const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
  const [portions, setPortions] = useState(baseServings);
  const factor = portions / baseServings;
  const tags = typeof recipe.tags === "string" ? JSON.parse(recipe.tags) : (recipe.tags ?? []);
  const ingredients = typeof recipe.ingredients === "string" ? JSON.parse(recipe.ingredients) : (recipe.ingredients ?? []);
  const steps = typeof recipe.steps === "string" ? JSON.parse(recipe.steps) : (recipe.steps ?? []);

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "var(--white)" }}>
      <div className="h-3" style={{ background: "var(--orange)" }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-black text-base leading-tight" style={{ color: "var(--black)" }}>{recipe.title}</h3>
          <span className="text-2xl shrink-0">{tags.includes("vegan") ? "🌱" : tags.includes("alta-proteina") ? "💪" : "🍽️"}</span>
        </div>
        {recipe.description && <p className="text-xs mb-3" style={{ color: "var(--gray)" }}>{recipe.description}</p>}

        <div className="flex gap-3 mb-3">
          {((recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)) > 0 && (
            <div className="flex items-center gap-1 text-xs" style={{ color: "var(--gray)" }}>
              <Clock size={13} />{(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)} min
            </div>
          )}
          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--gray)" }}>
            <Users size={13} />{recipe.servings} {recipe.servings === 1 ? "pessoa" : "pessoas"}
          </div>
          {recipe.calories && (
            <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--orange)" }}>
              <Flame size={13} />{recipe.calories} kcal
            </div>
          )}
        </div>

        {recipe.protein && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[["💪", recipe.protein + "g", "Proteína"], ["🌾", recipe.carbs + "g", "Hidratos"], ["🥑", recipe.fat + "g", "Gorduras"]].map(([e, v, l]) => (
              <div key={l as string} className="text-center py-2 rounded-xl" style={{ background: "var(--cream)" }}>
                <p className="text-sm">{e}</p>
                <p className="text-xs font-bold" style={{ color: "var(--black)" }}>{v}</p>
                <p className="text-[10px]" style={{ color: "var(--gray)" }}>{l}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 mb-3">
          {tags.map((t: string) => {
            const f = FILTERS.find(fl => fl.id === t);
            return f ? (
              <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--peach)", color: "var(--orange)" }}>
                {f.emoji} {f.label}
              </span>
            ) : null;
          })}
        </div>

        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs font-semibold cursor-pointer" style={{ color: "var(--orange)" }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? "Ocultar detalhes" : "Ver receita completa"}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--black)" }}>Ingredientes</h4>
                {/* Ajuste de porções: escala as quantidades */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--gray)" }}>Porções</span>
                  <div className="flex items-center gap-1 rounded-full px-1 py-0.5" style={{ background: "var(--cream)" }}>
                    <button onClick={() => setPortions((p: number) => Math.max(1, p - 1))}
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold cursor-pointer"
                      style={{ background: "var(--white)", color: "var(--orange)" }}>−</button>
                    <span className="w-6 text-center text-sm font-black" style={{ color: "var(--black)" }}>{portions}</span>
                    <button onClick={() => setPortions((p: number) => Math.min(20, p + 1))}
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold cursor-pointer"
                      style={{ background: "var(--white)", color: "var(--orange)" }}>+</button>
                  </div>
                </div>
              </div>
              {factor !== 1 && (
                <p className="text-[10px] mb-2" style={{ color: "var(--orange)" }}>
                  Quantidades ajustadas para {portions} {portions === 1 ? "porção" : "porções"} (base: {baseServings}).
                </p>
              )}
              <ul className="space-y-1">
                {ingredients.map((ing: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "var(--gray)" }}>
                    <span style={{ color: "var(--orange)" }}>·</span>{scaleIngredient(ing, factor)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--black)" }}>Modo de preparação</h4>
              <ol className="space-y-2">
                {steps.map((step: string, i: number) => (
                  <li key={i} className="flex gap-3 text-sm" style={{ color: "var(--gray)" }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5" style={{ background: "var(--orange)" }}>{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  title: "", description: "", calories: "", protein: "", carbs: "", fat: "",
  prepTime: "", cookTime: "", servings: "2", ingredients: "", steps: "", tags: [] as string[], category: "principal",
};

export default function Recipes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"lista" | "descobrir">("lista");
  const [ingredientInput, setIngredientInput] = useState("");
  const [haveIngredients, setHaveIngredients] = useState<string[]>([]);

  const { data } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const res = await fetch("/api/recipes", { headers: authHeaders() });
      return res.json();
    },
  });
  const dbRecipes = (data as any)?.recipes ?? [];
  const allRecipes = [...DEFAULT_RECIPES, ...dbRecipes];

  const toggleFilter = (id: string) => {
    setActiveFilters(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  };

  let filtered = allRecipes.filter(r => {
    const tags = typeof r.tags === "string" ? JSON.parse(r.tags) : (r.tags ?? []);
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    const matchFilters = activeFilters.length === 0 || activeFilters.every(f => tags.includes(f));
    return matchSearch && matchFilters;
  });

  // Pesquisa por ingredientes: conta quantos ingredientes que o utilizador tem
  // aparecem na receita, ordena pelas que mais aproveitam.
  const ingredientMode = haveIngredients.length > 0;
  const matchCounts: Record<string, number> = {};
  if (ingredientMode) {
    filtered = filtered
      .map((r: any) => {
        const ings = typeof r.ingredients === "string" ? JSON.parse(r.ingredients) : (r.ingredients ?? []);
        const text = normalizeText(ings.join(" "));
        matchCounts[r.id] = haveIngredients.filter(h => text.includes(normalizeText(h))).length;
        return r;
      })
      .filter((r: any) => matchCounts[r.id] > 0)
      .sort((a: any, b: any) => matchCounts[b.id] - matchCounts[a.id]);
  }

  const addHaveIngredient = () => {
    const v = ingredientInput.trim();
    if (!v || haveIngredients.some(i => normalizeText(i) === normalizeText(v))) return;
    setHaveIngredients([...haveIngredients, v]);
    setIngredientInput("");
  };

  // Gera receita por IA a partir dos ingredientes disponíveis + filtros ativos.
  const generateFromIngredients = () => {
    const restr = activeFilters.length ? ` Restrições: ${activeFilters.join(", ")}.` : "";
    setAiPrompt(`Cria uma receita saudável usando principalmente estes ingredientes: ${haveIngredients.join(", ")}.${restr}`);
    setShowAI(true);
    setAiError("");
  };

  // Save recipe via fetch direto
  const saveRecipe = async (recipeData: any) => {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(recipeData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.message || "Erro ao guardar receita");
      }
      qc.invalidateQueries({ queryKey: ["recipes"] });
      setShowAdd(false);
      setShowAI(false);
      setForm({ ...EMPTY_FORM });
    } catch (e: any) {
      setSaveError(e.message || "Erro ao guardar receita");
    } finally {
      setSaving(false);
    }
  };

  // Generate with AI
  const generateWithAI = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ prompt: aiPrompt || undefined }),
      });
      const data = await res.json() as any;
      if (!res.ok || data.error) throw new Error(data.error || "Erro ao gerar receita");

      const r = data.recipe;
      // Pre-fill the form with generated data
      const ingredients = typeof r.ingredients === "string" ? JSON.parse(r.ingredients) : (r.ingredients ?? []);
      const steps = typeof r.steps === "string" ? JSON.parse(r.steps) : (r.steps ?? []);
      const tags = typeof r.tags === "string" ? JSON.parse(r.tags) : (r.tags ?? []);

      setForm({
        title: r.title ?? "",
        description: r.description ?? "",
        calories: String(r.calories ?? ""),
        protein: String(r.protein ?? ""),
        carbs: String(r.carbs ?? ""),
        fat: String(r.fat ?? ""),
        prepTime: String(r.prepTime ?? ""),
        cookTime: String(r.cookTime ?? ""),
        servings: String(r.servings ?? "2"),
        ingredients: ingredients.join("\n"),
        steps: steps.join("\n"),
        tags: tags,
        category: r.category ?? "principal",
      });
      setShowAI(false);
      setShowAdd(true);
    } catch (e: any) {
      setAiError(e.message || "Erro ao gerar receita");
    } finally {
      setAiLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveRecipe({
      title: form.title,
      description: form.description || null,
      calories: parseFloat(form.calories) || null,
      protein: parseFloat(form.protein) || null,
      carbs: parseFloat(form.carbs) || null,
      fat: parseFloat(form.fat) || null,
      prepTime: parseInt(form.prepTime) || 0,
      cookTime: parseInt(form.cookTime) || 0,
      servings: parseInt(form.servings as string) || 2,
      ingredients: JSON.stringify(form.ingredients.split("\n").filter(Boolean)),
      steps: JSON.stringify(form.steps.split("\n").filter(Boolean)),
      tags: JSON.stringify(form.tags),
      category: form.category,
    });
  };

  return (
    <div className="space-y-5">
      {/* O que posso cozinhar? — pesquisa por ingredientes */}
      <div className="rounded-2xl p-4" style={{ background: "var(--peach)" }}>
        <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--orange)" }}>
          🥗 O que posso cozinhar?
        </p>
        <div className="flex gap-2 mb-2">
          <input type="text" value={ingredientInput} onChange={e => setIngredientInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addHaveIngredient(); } }}
            placeholder="ex: frango, brócolos, arroz"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
          <button onClick={addHaveIngredient}
            className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white cursor-pointer"
            style={{ background: "var(--orange)" }}>Adicionar</button>
        </div>
        {haveIngredients.length > 0 && (
          <>
            <div className="flex flex-wrap gap-2 mb-2">
              {haveIngredients.map(ing => (
                <span key={ing} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "var(--white)", color: "var(--black)" }}>
                  {ing}
                  <button onClick={() => setHaveIngredients(haveIngredients.filter(i => i !== ing))} className="cursor-pointer" style={{ color: "var(--gray)" }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs" style={{ color: "var(--gray)" }}>
                {filtered.length === 0 ? "Sem receitas com esses ingredientes." : `${filtered.length} receita${filtered.length !== 1 ? "s" : ""} que dá para fazer.`}
              </p>
              <button onClick={generateFromIngredients}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs text-white cursor-pointer"
                style={{ background: "var(--orange)" }}>
                <Sparkles size={14} /> Criar receita à medida com IA
              </button>
            </div>
          </>
        )}
      </div>

      {/* Search + add */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--gray)" }} />
          <input type="text" placeholder="Pesquisar receita..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm border outline-none"
            style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
        </div>
        <button onClick={() => { if (haveIngredients.length > 0) { generateFromIngredients(); } else { setShowAI(true); setAiError(""); setAiPrompt(""); } }}
          className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white cursor-pointer"
          style={{ background: "var(--orange)" }}>
          <Sparkles size={16} />
          <span className="hidden sm:inline">Gerar com IA</span>
        </button>
        <button onClick={() => { setShowAdd(true); setForm({ ...EMPTY_FORM }); setSaveError(""); }}
          className="px-4 py-3 rounded-xl font-semibold text-sm text-white cursor-pointer border"
          style={{ background: "transparent", borderColor: "var(--orange)", color: "var(--orange)" }}>
          <Plus size={18} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => toggleFilter(f.id)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all"
            style={activeFilters.includes(f.id)
              ? { background: "var(--orange)", color: "white" }
              : { background: "var(--white)", color: "var(--gray)", border: "1px solid var(--gray-lt)" }}>
            <span>{f.emoji}</span>{f.label}
          </button>
        ))}
      </div>

      {/* Vista Lista / Descobrir */}
      {!ingredientMode && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex rounded-full p-1" style={{ background: "var(--white)" }}>
            {([["lista", "Lista"], ["descobrir", "Descobrir"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => setViewMode(id)}
                className="px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-all"
                style={viewMode === id ? { background: "var(--orange)", color: "white" } : { color: "var(--gray)" }}>
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--gray)" }}>{filtered.length} receita{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      )}

      {!ingredientMode && viewMode === "descobrir" ? (
        (() => {
          const sections: { label: string; emoji: string; items: any[] }[] = [];
          for (const sec of CATEGORY_SECTIONS) {
            const items = filtered.filter((r: any) => (r.category ?? "principal") === sec.id);
            if (items.length === 0) continue;
            const existing = sections.find(s => s.label === sec.label);
            if (existing) existing.items.push(...items);
            else sections.push({ label: sec.label, emoji: sec.emoji, items });
          }
          if (sections.length === 0) {
            return <p className="text-sm py-6 text-center" style={{ color: "var(--gray)" }}>Nenhuma receita corresponde a estes filtros.</p>;
          }
          return (
            <div className="space-y-6">
              {sections.map(sec => (
                <div key={sec.label}>
                  <h3 className="text-base font-black mb-3" style={{ color: "var(--black)" }}>{sec.emoji} {sec.label}</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {sec.items.map((r: any) => (
                      <div key={r.id} className="shrink-0 w-[280px]"><RecipeCard recipe={r} /></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((r: any) => <RecipeCard key={r.id} recipe={r} />)}
        </div>
      )}

      {/* AI Generate Modal */}
      {showAI && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl" style={{ background: "var(--white)" }}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles size={20} style={{ color: "var(--orange)" }} />
                <h3 className="text-lg font-black" style={{ color: "var(--black)" }}>Gerar Receita com IA</h3>
              </div>
              <button onClick={() => setShowAI(false)} className="cursor-pointer"><X size={22} style={{ color: "var(--gray)" }} /></button>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--gray)" }}>
              Descreve o que queres ou deixa em branco para uma receita saudável surpresa!
            </p>
            <textarea
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              placeholder="Ex: receita de lanche pós-treino sem lactose com aveia, rica em proteína..."
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none mb-4"
              style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
            />
            {aiError && <p className="text-xs text-red-500 mb-3">{aiError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowAI(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer border"
                style={{ borderColor: "var(--gray-lt)", color: "var(--gray)" }}>
                Cancelar
              </button>
              <button onClick={generateWithAI} disabled={aiLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white cursor-pointer"
                style={{ background: "var(--orange)" }}>
                {aiLoading ? <><Loader2 size={16} className="animate-spin" /> A gerar...</> : <><Sparkles size={16} /> Gerar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--white)" }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black" style={{ color: "var(--black)" }}>
                {form.title ? "✨ Receita Gerada por IA" : "Nova Receita"}
              </h3>
              <button onClick={() => { setShowAdd(false); setSaveError(""); }} className="cursor-pointer">
                <X size={22} style={{ color: "var(--gray)" }} />
              </button>
            </div>
            {form.title && (
              <div className="mb-4 px-4 py-3 rounded-xl text-xs font-semibold" style={{ background: "var(--peach)", color: "var(--orange)" }}>
                ✨ Receita gerada pela IA — podes editar antes de guardar
              </div>
            )}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Título *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} required />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Descrição</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["calories", "Calorias (kcal)"], ["protein", "Proteína (g)"], ["carbs", "Hidratos (g)"], ["fat", "Gorduras (g)"], ["prepTime", "Prep. (min)"], ["cookTime", "Cozinha (min)"]].map(([k, l]) => (
                  <div key={k}>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gray)" }}>{l}</label>
                    <input type="number" value={(form as any)[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                      style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Ingredientes (um por linha) *</label>
                <textarea value={form.ingredients} onChange={e => setForm(f => ({ ...f, ingredients: e.target.value }))}
                  rows={4} placeholder={"200g frango\n100g arroz\n..."}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} required />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--gray)" }}>Passos (um por linha) *</label>
                <textarea value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))}
                  rows={4} placeholder={"Pré-aquecer o forno\nTemperar o frango\n..."}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} required />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--gray)" }}>Restrições alimentares</label>
                <div className="flex flex-wrap gap-2">
                  {FILTERS.map(f => (
                    <button key={f.id} type="button"
                      onClick={() => setForm(form => ({ ...form, tags: form.tags.includes(f.id) ? form.tags.filter(t => t !== f.id) : [...form.tags, f.id] }))}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                      style={form.tags.includes(f.id) ? { background: "var(--orange)", color: "white" } : { background: "var(--cream)", color: "var(--gray)", border: "1px solid var(--gray-lt)" }}>
                      {f.emoji} {f.label}
                    </button>
                  ))}
                </div>
              </div>
              {saveError && <p className="text-xs text-red-500">{saveError}</p>}
              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm text-white cursor-pointer"
                style={{ background: "var(--orange)" }}>
                {saving ? <><Loader2 size={16} className="animate-spin" /> A guardar...</> : "Guardar Receita"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
