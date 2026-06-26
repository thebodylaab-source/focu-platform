import { useState } from "react";
import CalorieCounter from "../components/nutrition/calorie-counter";
import FoodTracker from "../components/nutrition/food-tracker";
import Recipes from "../components/nutrition/recipes";
import { Flame, ListChecks, ChefHat } from "lucide-react";
import { useLocation } from "wouter";

const TABS = [
  { id: "calorias", label: "Contador", icon: Flame },
  { id: "rastreador", label: "Rastreador", icon: ListChecks },
  { id: "receitas", label: "Receitas", icon: ChefHat },
];

export default function NutricaoPage() {
  const [location] = useLocation();
  const defaultTab = location.includes("receitas") ? "receitas" : "calorias";
  const [tab, setTab] = useState(defaultTab);

  return (
    <div className="fade-up space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--black)" }}>Nutrição 🥗</h1>
        <p className="text-sm mt-1" style={{ color: "var(--gray)" }}>Controla a tua alimentação e descobre receitas saudáveis</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl p-1" style={{ background: "var(--white)" }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all"
            style={tab === id ? { background: "var(--orange)", color: "white" } : { color: "var(--gray)" }}>
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="fade-up">
        {tab === "calorias" && <CalorieCounter />}
        {tab === "rastreador" && <FoodTracker />}
        {tab === "receitas" && <Recipes />}
      </div>
    </div>
  );
}
