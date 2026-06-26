// ─────────────────────────────────────────────────────────────────────────
// MONTRA DE ALIMENTOS (catálogo curado)
//
// IMPORTANTE (segurança alimentar): cada produto SÓ inclui uma etiqueta de
// intolerância se a respeitar genuinamente. Ao filtrar, mostra-se apenas
// produtos cujas tags incluem TODAS as restrições selecionadas pelo utilizador.
// Sem preços por decisão de produto — comparam-se produtos e disponibilidade,
// não valores (que ficariam desatualizados).
// ─────────────────────────────────────────────────────────────────────────

export type DietTag = "sem-gluten" | "sem-lactose" | "vegan" | "vegetariano";

export type SupermarketId =
  | "lidl"
  | "aldi"
  | "mercadona"
  | "pingo-doce"
  | "auchan"
  | "continente"
  | "intermarche";

export const SUPERMARKETS: { id: SupermarketId; label: string; color: string }[] = [
  { id: "lidl", label: "Lidl", color: "#0050AA" },
  { id: "aldi", label: "Aldi", color: "#00A0E6" },
  { id: "mercadona", label: "Mercadona", color: "#34A853" },
  { id: "pingo-doce", label: "Pingo Doce", color: "#E30613" },
  { id: "auchan", label: "Auchan", color: "#E2001A" },
  { id: "continente", label: "Continente", color: "#E2001A" },
  { id: "intermarche", label: "Intermarché", color: "#D6001C" },
];

export type CatalogProduct = {
  id: string;
  name: string;
  category: string;
  tags: DietTag[];
  supermarkets: SupermarketId[];
};

const ALL: SupermarketId[] = [
  "lidl", "aldi", "mercadona", "pingo-doce", "auchan", "continente", "intermarche",
];

export const CATALOG_CATEGORIES = [
  { id: "fruta", label: "Fruta", emoji: "🍎" },
  { id: "legumes", label: "Legumes", emoji: "🥦" },
  { id: "proteina", label: "Carne e Peixe", emoji: "🍗" },
  { id: "lacticinios", label: "Lacticínios e Ovos", emoji: "🧀" },
  { id: "vegetal", label: "Alternativas Vegetais", emoji: "🌱" },
  { id: "cereais", label: "Cereais e Massas", emoji: "🌾" },
  { id: "leguminosas", label: "Leguminosas", emoji: "🫘" },
  { id: "frutos-secos", label: "Frutos Secos e Sementes", emoji: "🥜" },
  { id: "mercearia", label: "Mercearia", emoji: "🫙" },
];

// Etiquetas-base reutilizáveis para clareza
const PLANT_NATURAL: DietTag[] = ["sem-gluten", "sem-lactose", "vegan", "vegetariano"]; // fruta/legumes naturais
const MEAT_FISH: DietTag[] = ["sem-gluten", "sem-lactose"]; // carne/peixe puro (não vegan/vegetariano)
const DAIRY: DietTag[] = ["sem-gluten", "vegetariano"]; // lacticínio normal (tem lactose, não vegan)

export const CATALOG: CatalogProduct[] = [
  // ── FRUTA (naturalmente sem glúten, sem lactose, vegan) ──
  { id: "f-banana", name: "Banana", category: "fruta", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "f-maca", name: "Maçã", category: "fruta", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "f-laranja", name: "Laranja", category: "fruta", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "f-morango", name: "Morangos", category: "fruta", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "f-mirtilo", name: "Mirtilos", category: "fruta", tags: PLANT_NATURAL, supermarkets: ["lidl", "aldi", "pingo-doce", "auchan", "continente"] },
  { id: "f-abacate", name: "Abacate", category: "fruta", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "f-limao", name: "Limão", category: "fruta", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "f-pera", name: "Pera", category: "fruta", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "f-manga", name: "Manga", category: "fruta", tags: PLANT_NATURAL, supermarkets: ["lidl", "mercadona", "pingo-doce", "auchan", "continente", "intermarche"] },
  { id: "f-uvas", name: "Uvas", category: "fruta", tags: PLANT_NATURAL, supermarkets: ALL },

  // ── LEGUMES ──
  { id: "l-brocolos", name: "Brócolos", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-cenoura", name: "Cenoura", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-espinafres", name: "Espinafres", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-tomate", name: "Tomate", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-batata-doce", name: "Batata-doce", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-cebola", name: "Cebola", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-alho", name: "Alho", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-pimento", name: "Pimento", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-courgette", name: "Courgette", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-cogumelos", name: "Cogumelos", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-pepino", name: "Pepino", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "l-alface", name: "Alface", category: "legumes", tags: PLANT_NATURAL, supermarkets: ALL },

  // ── CARNE E PEIXE (sem glúten, sem lactose — não vegan/vegetariano) ──
  { id: "p-frango", name: "Peito de frango", category: "proteina", tags: MEAT_FISH, supermarkets: ALL },
  { id: "p-peru", name: "Peru", category: "proteina", tags: MEAT_FISH, supermarkets: ALL },
  { id: "p-vaca", name: "Carne de vaca", category: "proteina", tags: MEAT_FISH, supermarkets: ALL },
  { id: "p-porco", name: "Lombo de porco", category: "proteina", tags: MEAT_FISH, supermarkets: ALL },
  { id: "p-salmao", name: "Salmão", category: "proteina", tags: MEAT_FISH, supermarkets: ALL },
  { id: "p-atum", name: "Atum fresco", category: "proteina", tags: MEAT_FISH, supermarkets: ["lidl", "mercadona", "pingo-doce", "auchan", "continente"] },
  { id: "p-bacalhau", name: "Bacalhau", category: "proteina", tags: MEAT_FISH, supermarkets: ["pingo-doce", "auchan", "continente", "intermarche"] },
  { id: "p-dourada", name: "Dourada", category: "proteina", tags: MEAT_FISH, supermarkets: ["lidl", "pingo-doce", "auchan", "continente"] },
  { id: "p-camarao", name: "Camarão", category: "proteina", tags: MEAT_FISH, supermarkets: ["lidl", "mercadona", "pingo-doce", "auchan", "continente"] },
  { id: "p-ovos", name: "Ovos", category: "proteina", tags: ["sem-gluten", "sem-lactose", "vegetariano"], supermarkets: ALL },

  // ── LACTICÍNIOS E OVOS (têm lactose: vegetariano + sem-glúten, NÃO sem-lactose, NÃO vegan) ──
  { id: "d-leite", name: "Leite de vaca", category: "lacticinios", tags: DAIRY, supermarkets: ALL },
  { id: "d-iogurte-grego", name: "Iogurte grego natural", category: "lacticinios", tags: DAIRY, supermarkets: ALL },
  { id: "d-queijo", name: "Queijo", category: "lacticinios", tags: DAIRY, supermarkets: ALL },
  { id: "d-requeijao", name: "Requeijão", category: "lacticinios", tags: DAIRY, supermarkets: ["pingo-doce", "auchan", "continente", "intermarche"] },
  { id: "d-manteiga", name: "Manteiga", category: "lacticinios", tags: DAIRY, supermarkets: ALL },
  // Versão sem lactose (continua a não ser vegan)
  { id: "d-leite-sl", name: "Leite sem lactose", category: "lacticinios", tags: ["sem-gluten", "sem-lactose", "vegetariano"], supermarkets: ["lidl", "mercadona", "pingo-doce", "auchan", "continente"] },

  // ── ALTERNATIVAS VEGETAIS ──
  // Bebida de aveia NÃO é sem-glúten (aveia não certificada)
  { id: "v-bebida-aveia", name: "Bebida de aveia", category: "vegetal", tags: ["sem-lactose", "vegan", "vegetariano"], supermarkets: ALL },
  { id: "v-bebida-amendoa", name: "Bebida de amêndoa", category: "vegetal", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "v-bebida-soja", name: "Bebida de soja", category: "vegetal", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "v-bebida-coco", name: "Bebida de coco", category: "vegetal", tags: PLANT_NATURAL, supermarkets: ["lidl", "mercadona", "pingo-doce", "auchan", "continente"] },
  { id: "v-tofu", name: "Tofu", category: "vegetal", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "v-iogurte-soja", name: "Iogurte de soja", category: "vegetal", tags: PLANT_NATURAL, supermarkets: ["lidl", "mercadona", "pingo-doce", "auchan", "continente"] },
  { id: "v-hummus", name: "Hummus", category: "vegetal", tags: PLANT_NATURAL, supermarkets: ["lidl", "aldi", "mercadona", "pingo-doce", "auchan", "continente"] },

  // ── CEREAIS E MASSAS ──
  // Trigo: NÃO sem-glúten. Pão/massa comuns são vegan/vegetariano/sem-lactose.
  { id: "c-pao-trigo", name: "Pão de trigo", category: "cereais", tags: ["vegan", "vegetariano", "sem-lactose"], supermarkets: ALL },
  { id: "c-massa-trigo", name: "Massa de trigo (esparguete)", category: "cereais", tags: ["vegan", "vegetariano", "sem-lactose"], supermarkets: ALL },
  { id: "c-arroz", name: "Arroz", category: "cereais", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "c-quinoa", name: "Quinoa", category: "cereais", tags: PLANT_NATURAL, supermarkets: ["lidl", "mercadona", "pingo-doce", "auchan", "continente"] },
  { id: "c-aveia-cert", name: "Aveia certificada sem glúten", category: "cereais", tags: PLANT_NATURAL, supermarkets: ["lidl", "auchan", "continente"] },
  { id: "c-aveia", name: "Flocos de aveia", category: "cereais", tags: ["sem-lactose", "vegan", "vegetariano"], supermarkets: ALL },
  { id: "c-pao-sg", name: "Pão sem glúten", category: "cereais", tags: ["sem-gluten", "vegetariano", "sem-lactose"], supermarkets: ["lidl", "mercadona", "pingo-doce", "auchan", "continente"] },
  { id: "c-massa-milho", name: "Massa de milho e arroz (sem glúten)", category: "cereais", tags: PLANT_NATURAL, supermarkets: ["lidl", "pingo-doce", "auchan", "continente"] },

  // ── LEGUMINOSAS (naturalmente sem glúten, sem lactose, vegan) ──
  { id: "lg-grao", name: "Grão-de-bico", category: "leguminosas", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "lg-feijao-preto", name: "Feijão preto", category: "leguminosas", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "lg-feijao-encarnado", name: "Feijão encarnado", category: "leguminosas", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "lg-lentilhas", name: "Lentilhas", category: "leguminosas", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "lg-ervilhas", name: "Ervilhas", category: "leguminosas", tags: PLANT_NATURAL, supermarkets: ALL },

  // ── FRUTOS SECOS E SEMENTES ──
  { id: "fs-amendoa", name: "Amêndoas", category: "frutos-secos", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "fs-noz", name: "Nozes", category: "frutos-secos", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "fs-caju", name: "Caju", category: "frutos-secos", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "fs-chia", name: "Sementes de chia", category: "frutos-secos", tags: PLANT_NATURAL, supermarkets: ["lidl", "mercadona", "pingo-doce", "auchan", "continente"] },
  { id: "fs-girassol", name: "Sementes de girassol", category: "frutos-secos", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "fs-manteiga-amendoim", name: "Manteiga de amendoim", category: "frutos-secos", tags: PLANT_NATURAL, supermarkets: ALL },

  // ── MERCEARIA ──
  { id: "m-azeite", name: "Azeite", category: "mercearia", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "m-tomate-pelado", name: "Tomate pelado", category: "mercearia", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "m-tamari", name: "Molho de soja sem glúten (tamari)", category: "mercearia", tags: PLANT_NATURAL, supermarkets: ["lidl", "auchan", "continente"] },
  { id: "m-cacau", name: "Cacau em pó", category: "mercearia", tags: PLANT_NATURAL, supermarkets: ALL },
  { id: "m-xarope-acer", name: "Xarope de ácer", category: "mercearia", tags: PLANT_NATURAL, supermarkets: ["lidl", "auchan", "continente"] },
  { id: "m-mel", name: "Mel", category: "mercearia", tags: ["sem-gluten", "sem-lactose", "vegetariano"], supermarkets: ALL },
  { id: "m-canela", name: "Canela", category: "mercearia", tags: PLANT_NATURAL, supermarkets: ALL },
];

// Filtra o catálogo garantindo que TODAS as restrições ativas são respeitadas.
// Re-validação de segurança: um produto só passa se as suas tags incluírem
// cada uma das restrições selecionadas.
export function filterCatalog(
  products: CatalogProduct[],
  activeRestrictions: DietTag[],
  category: string | null,
  query: string
): CatalogProduct[] {
  const q = query.trim().toLowerCase();
  return products.filter((p) => {
    if (category && p.category !== category) return false;
    if (q && !p.name.toLowerCase().includes(q)) return false;
    // SEGURANÇA: todas as restrições têm de estar presentes nas tags do produto
    for (const r of activeRestrictions) {
      if (!p.tags.includes(r)) return false;
    }
    return true;
  });
}
