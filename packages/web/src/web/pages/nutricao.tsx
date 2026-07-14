import { useState } from "react";
import CalorieCounter from "../components/nutrition/calorie-counter";
import FoodTracker from "../components/nutrition/food-tracker";
import Recipes from "../components/nutrition/recipes";
import ShoppingList from "../components/nutrition/shopping-list";
import CalorieCalculator from "../components/nutrition/calorie-calculator";
import CycleGuide from "../components/nutrition/cycle-guide";
import { Flame, ListChecks, ChefHat, ShoppingCart, Calculator, Moon } from "lucide-react";
import { useLocation } from "wouter";

const TABS = [
  { id: "ciclo", label: "O Meu Ciclo", icon: Moon },
  { id: "calorias", label: "Contador", icon: Flame },
  { id: "rastreador", label: "Rastreador", icon: ListChecks },
  { id: "receitas", label: "Receitas", icon: ChefHat },
  { id: "compras", label: "Lista de Compras", icon: ShoppingCart },
  { id: "calculador", label: "Calculador", icon: Calculator },
];

export default function NutricaoPage() {
  const [location] = useLocation();
  // O wouter devolve só o caminho (sem a query), por isso juntamos a query
  // do browser para o link "?tab=receitas" (etc.) abrir no separador certo.
  const loc = location + (typeof window !== "undefined" ? window.location.search : "");
  const defaultTab = loc.includes("ciclo")
    ? "ciclo"
    : loc.includes("receitas")
    ? "receitas"
    : loc.includes("compras")
      ? "compras"
      : loc.includes("calculador")
        ? "calculador"
        : "calorias";
  const [tab, setTab] = useState(defaultTab);

  return (
    <div className="fade-up space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>Nutrição 🥗</h1>
        <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>Controla a tua alimentação e descobre receitas saudáveis</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl p-1 overflow-x-auto gap-1" style={{ background: "var(--white)" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 min-w-fit flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all whitespace-nowrap"
            style={tab === id ? { background: "var(--orange)", color: "white" } : { color: "var(--gray)" }}>
            <Icon size={15} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="fade-up">
        {tab === "ciclo" && <CycleGuide />}
        {tab === "calculador" && <CalorieCalculator />}
        {tab === "calorias" && <CalorieCounter />}
        {tab === "rastreador" && <FoodTracker />}
        {tab === "receitas" && <Recipes />}
        {tab === "compras" && <ShoppingList />}
      </div>
    </div>
  );
}
