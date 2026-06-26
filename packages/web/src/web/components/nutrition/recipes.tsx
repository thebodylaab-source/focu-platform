import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useState } from "react";
import { Clock, Users, Flame, Plus, X, Search, ChevronDown, ChevronUp, Sparkles, Wand2 } from "lucide-react";

const FILTERS = [
  { id: "sem-gluten", label: "Sem Glúten", emoji: "🌾" },
  { id: "sem-lactose", label: "Sem Lactose", emoji: "🥛" },
  { id: "vegan", label: "Vegan", emoji: "🌱" },
  { id: "vegetariano", label: "Vegetariano", emoji: "🥦" },
  { id: "sem-acucar", label: "Sem Açúcar", emoji: "🍬" },
  { id: "alta-proteina", label: "Alta Proteína", emoji: "💪" },
];

const SPECIAL_CONDITIONS = [
  { id: "celiac", label: "Celíaco", emoji: "🚫🌾" },
  { id: "endometriose", label: "Endometriose", emoji: "🎗️" },
];

const ENDOMETRIOSIS_EXCLUDED_KEYWORDS = [
  "carne vermelha", "vaca", "porco", "bacon", "salsicha", "açúcar refinado",
  "pão branco", "álcool", "vinho", "cerveja", "fritos", "margarina", "refrigerante",
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function getIngredientsArray(r: any): string[] {
  return typeof r.ingredients === "string" ? JSON.parse(r.ingredients) : r.ingredients;
}

// Escala as quantidades numéricas de um ingrediente por um fator (gramas, ml,
// unidades). Mantém o texto restante intacto. Ex: "200g frango" x1.5 -> "300g frango".
function scaleIngredient(ingredient: string, factor: number): string {
  if (factor === 1) return ingredient;
  return ingredient.replace(/(\d+(?:[.,]\d+)?)/g, (m) => {
    const n = parseFloat(m.replace(",", ".")) * factor;
    const rounded = Math.round(n * 10) / 10;
    return (Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1)).replace(".", ",");
  });
}

// Categorias para a vista "Descobrir" (carrosséis por tipo de refeição)
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

function countIngredientMatches(recipe: any, haveIngredients: string[]): number {
  const ingredientText = normalize(getIngredientsArray(recipe).join(" "));
  return haveIngredients.filter((have) => ingredientText.includes(normalize(have))).length;
}

function violatesEndometriosisFilter(recipe: any): boolean {
  const text = normalize(getIngredientsArray(recipe).join(" ") + " " + (recipe.title ?? ""));
  return ENDOMETRIOSIS_EXCLUDED_KEYWORDS.some((kw) => text.includes(normalize(kw)));
}

// Default recipes
const DEFAULT_RECIPES = [
  {
    id: -1, title: "Papas de Aveia com Frutos Vermelhos", description: "Pequeno-almoço rico em fibra e proteína",
    imageUrl: "", calories: 320, protein: 14, carbs: 48, fat: 8, prepTime: 5, cookTime: 5, servings: 1,
    ingredients: JSON.stringify(["80g aveia certificada sem glúten", "250ml leite vegetal", "1 banana", "Frutos vermelhos q.b.", "1 colher sopa manteiga amendoim"]),
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
    ingredients: JSON.stringify(["200g iogurte grego", "30g granola certificada sem glúten e sem açúcar", "Mel 1 col. chá", "Frutos secos q.b."]),
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

function RecipeCard({ recipe, matchCount, isAiPreview, onSave, saving }: {
  recipe: any;
  matchCount?: number;
  isAiPreview?: boolean;
  onSave?: () => void;
  saving?: boolean;
}) {
  const [expanded, setExpanded] = useState(Boolean(isAiPreview));
  const baseServings = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
  const [portions, setPortions] = useState(baseServings);
  const tags = typeof recipe.tags === "string" ? JSON.parse(recipe.tags) : recipe.tags;
  const ingredients = getIngredientsArray(recipe);
  const steps = typeof recipe.steps === "string" ? JSON.parse(recipe.steps) : recipe.steps;
  const factor = portions / baseServings;

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ background: "var(--white)" }}>
      <div className="h-3" style={{ background: isAiPreview ? "var(--green)" : "var(--orange)" }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-black text-base leading-tight" style={{ color: "var(--black)" }}>{recipe.title}</h3>
          <span className="text-2xl shrink-0">{tags.includes("vegan") ? "🌱" : tags.includes("alta-proteina") ? "💪" : "🍽️"}</span>
        </div>
        {recipe.description && <p className="text-xs mb-3" style={{ color: "var(--gray)" }}>{recipe.description}</p>}

        {isAiPreview && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3 w-fit" style={{ background: "#EAF3EC", color: "var(--green)" }}>
            <Sparkles size={12} /> Receita criada por IA
          </div>
        )}
        {!isAiPreview && matchCount !== undefined && matchCount > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full mb-3 w-fit" style={{ background: "var(--peach)", color: "var(--orange)" }}>
            {matchCount} ingrediente{matchCount !== 1 ? "s" : ""} que tens
          </div>
        )}

        {/* Meta */}
        <div className="flex gap-3 mb-3">
          {(recipe.prepTime || recipe.cookTime) > 0 && (
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

        {/* Macros */}
        {recipe.protein && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[["💪", recipe.protein + "g", "Proteína"], ["🌾", recipe.carbs + "g", "Hidratos"], ["🥑", recipe.fat + "g", "Gorduras"]].map(([e, v, l]) => (
              <div key={l} className="text-center py-2 rounded-xl" style={{ background: "var(--cream)" }}>
                <p className="text-sm">{e}</p>
                <p className="text-xs font-bold" style={{ color: "var(--black)" }}>{v}</p>
                <p className="text-[10px]" style={{ color: "var(--gray)" }}>{l}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
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

        {/* Expand */}
        {!isAiPreview && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs font-semibold cursor-pointer" style={{ color: "var(--orange)" }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expanded ? "Ocultar detalhes" : "Ver receita completa"}
          </button>
        )}

        {expanded && (
          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                <h4 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--black)" }}>Ingredientes</h4>
                {/* Gramas ⇄ Porções: ajusta as quantidades */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--gray)" }}>Porções</span>
                  <div className="flex items-center gap-1 rounded-full px-1 py-0.5" style={{ background: "var(--cream)" }}>
                    <button onClick={() => setPortions((p) => Math.max(1, p - 1))}
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold cursor-pointer"
                      style={{ background: "var(--white)", color: "var(--orange)" }}>−</button>
                    <span className="w-6 text-center text-sm font-black" style={{ color: "var(--black)" }}>{portions}</span>
                    <button onClick={() => setPortions((p) => Math.min(20, p + 1))}
                      className="w-6 h-6 rounded-full flex items-center justify-center font-bold cursor-pointer"
                      style={{ background: "var(--white)", color: "var(--orange)" }}>+</button>
                  </div>
                </div>
              </div>
              {factor !== 1 && (
                <p className="text-[10px] mb-2" style={{ color: "var(--orange)" }}>
                  Quantidades ajustadas para {portions} {portions === 1 ? "porção" : "porções"} (receita base: {baseServings}).
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
            {isAiPreview && onSave && (
              <button onClick={onSave} disabled={saving}
                className="w-full py-3 rounded-xl font-bold text-sm text-white cursor-pointer flex items-center justify-center gap-2"
                style={{ background: "var(--green)" }}>
                {saving ? "A guardar..." : "Guardar nas minhas receitas"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Recipes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activeSpecial, setActiveSpecial] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", calories: "", protein: "", carbs: "", fat: "",
    prepTime: "", cookTime: "", servings: 2, ingredients: "", steps: "", tags: [] as string[], category: "principal",
  });

  // Ingredient-based search ("O que posso cozinhar?")
  const [ingredientInput, setIngredientInput] = useState("");
  const [haveIngredients, setHaveIngredients] = useState<string[]>([]);
  const [aiRecipe, setAiRecipe] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Vista "Descobrir" (carrosséis) vs "Lista", e pedido de receita
  const [viewMode, setViewMode] = useState<"lista" | "descobrir">("lista");
  const [showRequest, setShowRequest] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  const { data } = useQuery({ queryKey: ["recipes"], queryFn: async () => (await api.recipes.$get()).json() });
  const dbRecipes = (data as any)?.recipes ?? [];
  const allRecipes = [...DEFAULT_RECIPES, ...dbRecipes];

  const addMutation = useMutation({
    mutationFn: async (r: any) => (await api.recipes.$post({ json: r })).json(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["recipes"] }); setShowAdd(false); setAiRecipe(null); },
  });

  const aiGenerateMutation = useMutation({
    mutationFn: async () => {
      const effectiveTags = [...activeFilters, ...(activeSpecial.includes("celiac") ? ["sem-gluten"] : [])];
      const res = await api.recipes["ai-generate"].$post({
        json: {
          ingredients: haveIngredients,
          tags: effectiveTags,
          avoidInflammatory: activeSpecial.includes("endometriose"),
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro a gerar receita.");
      return json.recipe;
    },
    onSuccess: (recipe) => { setAiRecipe(recipe); setAiError(null); },
    onError: (err: any) => setAiError(err.message),
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const res = await api.recipes.request.$post({ json: { text: requestText.trim() } });
      const json = await res.json();
      if (!res.ok) throw new Error((json as any).error ?? "Erro ao enviar pedido.");
      return json;
    },
    onSuccess: () => { setRequestSent(true); setRequestText(""); },
  });

  const toggleFilter = (id: string) => {
    setActiveFilters(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  };
  const toggleSpecial = (id: string) => {
    setActiveSpecial(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);
  };

  function addHaveIngredient() {
    const value = ingredientInput.trim();
    if (!value || haveIngredients.some(i => normalize(i) === normalize(value))) return;
    setHaveIngredients([...haveIngredients, value]);
    setIngredientInput("");
    setAiRecipe(null);
  }

  const ingredientMode = haveIngredients.length > 0;
  const wantsCeliac = activeSpecial.includes("celiac");
  const wantsEndometriose = activeSpecial.includes("endometriose");

  let filtered = allRecipes.filter(r => {
    const tags = typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags;
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase());
    const matchFilters = activeFilters.length === 0 || activeFilters.every((f: string) => tags.includes(f));
    const matchCeliac = !wantsCeliac || tags.includes("sem-gluten");
    const matchEndometriose = !wantsEndometriose || !violatesEndometriosisFilter(r);
    return matchSearch && matchFilters && matchCeliac && matchEndometriose;
  });

  let matchCounts: Record<number, number> = {};
  if (ingredientMode) {
    filtered = filtered
      .map(r => { matchCounts[r.id] = countIngredientMatches(r, haveIngredients); return r; })
      .filter(r => matchCounts[r.id] > 0)
      .sort((a, b) => matchCounts[b.id] - matchCounts[a.id]);
  }

  return (
    <div className="space-y-5">
      {/* "O que posso cozinhar?" — pesquisa por ingredientes */}
      <div className="rounded-2xl p-4" style={{ background: "var(--peach)" }}>
        <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--orange)" }}>
          🥗 O que posso cozinhar?
        </p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={ingredientInput}
            onChange={e => setIngredientInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addHaveIngredient())}
            placeholder="ex: frango, brócolos, arroz"
            className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none"
            style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }}
          />
          <button onClick={addHaveIngredient}
            className="px-4 py-2.5 rounded-xl font-semibold text-sm text-white cursor-pointer"
            style={{ background: "var(--orange)" }}>
            Adicionar
          </button>
        </div>
        {haveIngredients.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {haveIngredients.map(ing => (
              <span key={ing} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full" style={{ background: "var(--white)", color: "var(--black)" }}>
                {ing}
                <button onClick={() => { setHaveIngredients(haveIngredients.filter(i => i !== ing)); setAiRecipe(null); }} className="cursor-pointer" style={{ color: "var(--gray)" }}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Condições especiais */}
        <div className="flex gap-2 flex-wrap">
          {SPECIAL_CONDITIONS.map(s => (
            <button key={s.id} onClick={() => toggleSpecial(s.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
              style={activeSpecial.includes(s.id)
                ? { background: "var(--black)", color: "white" }
                : { background: "var(--white)", color: "var(--gray)", border: "1px solid var(--gray-lt)" }}>
              <span>{s.emoji}</span>{s.label}
            </button>
          ))}
        </div>

        {ingredientMode && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            <p className="text-xs mb-2" style={{ color: "var(--gray)" }}>
              {filtered.length === 0
                ? "Não encontrámos receitas com esses ingredientes."
                : `${filtered.length} receita${filtered.length !== 1 ? "s" : ""} que dá para fazer.`}
            </p>
            <button onClick={() => aiGenerateMutation.mutate()} disabled={aiGenerateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-white cursor-pointer"
              style={{ background: "var(--green)" }}>
              <Wand2 size={16} />
              {aiGenerateMutation.isPending ? "A criar receita..." : "✨ Criar receita à medida com IA"}
            </button>
            {aiError && <p className="text-xs mt-2" style={{ color: "#C0392B" }}>{aiError}</p>}
          </div>
        )}
      </div>

      {aiRecipe && (
        <RecipeCard
          recipe={aiRecipe}
          isAiPreview
          saving={addMutation.isPending}
          onSave={() => addMutation.mutate({
            ...aiRecipe,
            ingredients: JSON.stringify(aiRecipe.ingredients),
            steps: JSON.stringify(aiRecipe.steps),
            tags: JSON.stringify(aiRecipe.tags),
          })}
        />
      )}

      {/* Search + add */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "var(--gray)" }} />
          <input type="text" placeholder="Pesquisar receita..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl text-sm border outline-none"
            style={{ background: "var(--white)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-4 py-3 rounded-xl font-semibold text-sm text-white cursor-pointer"
          style={{ background: "var(--orange)" }}>
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

      {/* Vista (Lista / Descobrir) + Pedir para adicionar */}
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
          <button onClick={() => { setShowRequest(true); setRequestSent(false); }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-full cursor-pointer"
            style={{ background: "var(--peach)", color: "var(--orange)" }}>
            <Plus size={14} /> Pedir para adicionar
          </button>
        </div>
      )}

      {/* Count */}
      {!ingredientMode && (
        <p className="text-xs" style={{ color: "var(--gray)" }}>{filtered.length} receita{filtered.length !== 1 ? "s" : ""}</p>
      )}

      {/* DESCOBRIR: carrosséis por categoria */}
      {!ingredientMode && viewMode === "descobrir" ? (
        (() => {
          const sections: { label: string; emoji: string; items: any[] }[] = [];
          for (const sec of CATEGORY_SECTIONS) {
            const items = filtered.filter((r: any) => (r.category ?? "principal") === sec.id);
            if (items.length === 0) continue;
            const existing = sections.find((s) => s.label === sec.label);
            if (existing) existing.items.push(...items);
            else sections.push({ label: sec.label, emoji: sec.emoji, items });
          }
          if (sections.length === 0) {
            return <p className="text-sm py-6 text-center" style={{ color: "var(--gray)" }}>Nenhuma receita corresponde a estes filtros.</p>;
          }
          return (
            <div className="space-y-6">
              {sections.map((sec) => (
                <div key={sec.label}>
                  <h3 className="text-base font-black mb-3" style={{ color: "var(--black)" }}>{sec.emoji} {sec.label}</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                    {sec.items.map((r: any) => (
                      <div key={r.id} className="shrink-0 w-[280px]">
                        <RecipeCard recipe={r} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()
      ) : (
        /* LISTA: grelha */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((r: any) => (
            <RecipeCard key={r.id} recipe={r} matchCount={ingredientMode ? matchCounts[r.id] : undefined} />
          ))}
        </div>
      )}

      {/* Pedir para adicionar modal */}
      {showRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-md rounded-3xl p-6 shadow-2xl" style={{ background: "var(--white)" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-black" style={{ color: "var(--black)" }}>Pedir para adicionar</h3>
              <button onClick={() => setShowRequest(false)} className="cursor-pointer"><X size={22} style={{ color: "var(--gray)" }} /></button>
            </div>
            {requestSent ? (
              <div className="py-6 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-sm font-semibold" style={{ color: "var(--black)" }}>Pedido enviado!</p>
                <p className="text-xs mt-1" style={{ color: "var(--gray)" }}>A nossa equipa vai analisar a tua sugestão.</p>
                <button onClick={() => setShowRequest(false)}
                  className="mt-4 px-5 py-2.5 rounded-xl font-bold text-sm text-white cursor-pointer"
                  style={{ background: "var(--orange)" }}>Fechar</button>
              </div>
            ) : (
              <>
                <p className="text-xs mb-4" style={{ color: "var(--gray)" }}>
                  Há uma receita ou alimento que gostavas de ver na app? Diz-nos e nós tratamos disso. 🧑‍🍳
                </p>
                <textarea value={requestText} onChange={(e) => setRequestText(e.target.value)}
                  rows={4} placeholder="ex: Panqueca de proteína sem lactose, ou bolachas de arroz integrais…"
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none mb-3"
                  style={{ background: "var(--cream)", borderColor: "var(--gray-lt)", color: "var(--black)" }} />
                {requestMutation.isError && (
                  <p className="text-xs mb-2" style={{ color: "#C0392B" }}>{(requestMutation.error as any)?.message}</p>
                )}
                <button onClick={() => requestMutation.mutate()} disabled={!requestText.trim() || requestMutation.isPending}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white cursor-pointer"
                  style={{ background: "var(--orange)" }}>
                  {requestMutation.isPending ? "A enviar..." : "Enviar pedido"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="w-full max-w-lg rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: "var(--white)" }}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black" style={{ color: "var(--black)" }}>Nova Receita</h3>
              <button onClick={() => setShowAdd(false)} className="cursor-pointer"><X size={22} style={{ color: "var(--gray)" }} /></button>
            </div>
            <form onSubmit={e => {
              e.preventDefault();
              addMutation.mutate({
                ...form,
                calories: parseFloat(form.calories) || null,
                protein: parseFloat(form.protein) || null,
                carbs: parseFloat(form.carbs) || null,
                fat: parseFloat(form.fat) || null,
                prepTime: parseInt(form.prepTime) || 0,
                cookTime: parseInt(form.cookTime) || 0,
                ingredients: JSON.stringify(form.ingredients.split("\n").filter(Boolean)),
                steps: JSON.stringify(form.steps.split("\n").filter(Boolean)),
                tags: JSON.stringify(form.tags),
              });
            }} className="space-y-4">
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
                    <button key={f.id} type="button" onClick={() => setForm(form => ({ ...form, tags: form.tags.includes(f.id) ? form.tags.filter(t => t !== f.id) : [...form.tags, f.id] }))}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                      style={form.tags.includes(f.id) ? { background: "var(--orange)", color: "white" } : { background: "var(--cream)", color: "var(--gray)", border: "1px solid var(--gray-lt)" }}>
                      {f.emoji} {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={addMutation.isPending}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white cursor-pointer"
                style={{ background: "var(--orange)" }}>
                {addMutation.isPending ? "A adicionar..." : "Adicionar Receita"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
