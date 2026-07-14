export type Meal = { id: string; label: string; emoji: string };

export const BASE_MEALS: Meal[] = [
  { id: "pequeno-almoco", label: "Pequeno-almoço", emoji: "🌅" },
  { id: "lanche-manha", label: "Lanche da manhã", emoji: "🍏" },
  { id: "almoco", label: "Almoço", emoji: "☀️" },
  { id: "lanche", label: "Lanche da tarde", emoji: "🍎" },
  { id: "jantar", label: "Jantar", emoji: "🌙" },
  { id: "ceia", label: "Ceia", emoji: "🌛" },
];

const STORAGE_KEY = "focu-extra-meals";

export function getExtraMeals(): Meal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addExtraMeal(label: string, emoji = "🍽️"): Meal {
  const meal: Meal = { id: `extra-${Date.now()}`, label, emoji };
  const extras = getExtraMeals();
  extras.push(meal);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(extras));
  return meal;
}

export function removeExtraMeal(id: string) {
  const extras = getExtraMeals().filter(m => m.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(extras));
}

export function getAllMeals(): Meal[] {
  return [...BASE_MEALS, ...getExtraMeals()];
}
