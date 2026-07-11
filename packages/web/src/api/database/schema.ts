import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export * from "./auth-schema";

// Videos
export const videos = sqliteTable("videos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  youtubeId: text("youtube_id").notNull(),
  category: text("category").notNull().default("geral"),
  week: integer("week"),
  order: integer("order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Documents (PDFs, ebooks)
export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull().default("pdf"), // pdf | ebook
  fileUrl: text("file_url").notNull(),
  category: text("category").notNull().default("geral"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Food items database (user's custom foods)
export const foodItems = sqliteTable("food_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  servingSize: real("serving_size").notNull().default(100),
  servingUnit: text("serving_unit").notNull().default("g"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Food tracker entries
export const foodLogs = sqliteTable("food_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  foodItemId: integer("food_item_id"),
  foodName: text("food_name").notNull(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  quantity: real("quantity").notNull().default(1),
  servingSize: real("serving_size").notNull().default(100),
  meal: text("meal").notNull().default("almoco"), // pequeno-almoco | almoco | jantar | lanche
  logDate: text("log_date").notNull(), // YYYY-MM-DD
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Calorie goals per user
export const calorieGoals = sqliteTable("calorie_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  dailyCalories: real("daily_calories").notNull().default(2000),
  proteinGoal: real("protein_goal").notNull().default(150),
  carbsGoal: real("carbs_goal").notNull().default(200),
  fatGoal: real("fat_goal").notNull().default(65),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Recipes
export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  calories: real("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  prepTime: integer("prep_time"), // minutes
  cookTime: integer("cook_time"), // minutes
  servings: integer("servings").notNull().default(1),
  ingredients: text("ingredients").notNull(), // JSON string
  steps: text("steps").notNull(), // JSON string
  tags: text("tags").notNull().default("[]"), // JSON array: sem-gluten, sem-lactose, vegan, vegetariano, sem-acucar, alta-proteina
  category: text("category").notNull().default("principal"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Global food database (shared across all users — populated when custom foods are added)
export const globalFoods = sqliteTable("global_foods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  calories: real("calories").notNull(),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  servingSize: real("serving_size").notNull().default(100),
  servingUnit: text("serving_unit").notNull().default("g"),
  // Etiquetas de intolerância (JSON array): sem-gluten | sem-lactose | vegan | vegetariano
  tags: text("tags").notNull().default("[]"),
  addedByUserId: text("added_by_user_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Shopping list items (per user)
export const shoppingList = sqliteTable("shopping_list", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  quantity: text("quantity"), // e.g. "500g", "2 unidades"
  category: text("category").notNull().default("outros"), // legumes | frutas | proteinas | lacticinios | cereais | outros
  // Etiquetas de intolerância herdadas do alimento (JSON array)
  tags: text("tags").notNull().default("[]"),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Emails que completaram um pagamento real (escrito SÓ pelo webhook assinado do
// Stripe). Fonte de verdade para "esta pessoa pagou" — usada para ativar a conta
// como membro, independentemente da ordem (pagar antes ou depois de criar conta).
export const paidCustomers = sqliteTable("paid_customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id"),
  plan: text("plan"), // mensal-recorrente | mensal-avulso
  paidAt: integer("paid_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  // Fim do prazo pago. NULL = sem expiração (legado / vitalício). Quando passa,
  // a reconciliação despromove o membro para pendente.
  expiresAt: integer("expires_at", { mode: "timestamp" }),
});

// Ciclo menstrual — usado para dar orientação diária de treino e nutrição
export const cycleTracking = sqliteTable("cycle_tracking", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  lastPeriodStart: text("last_period_start").notNull(), // YYYY-MM-DD
  cycleLength: integer("cycle_length").notNull().default(28),
  periodLength: integer("period_length").notNull().default(5),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Check-in diário do ciclo (como se sente cada dia) — 1 por dia por aluna
export const cycleCheckins = sqliteTable("cycle_checkins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  checkinDate: text("checkin_date").notNull(), // YYYY-MM-DD
  feeling: text("feeling").notNull(), // otima | bem | media | sem-energia
  // Sintomas do dia (JSON array): colicas | inchaco | humor | sono | desejos
  symptoms: text("symptoms").notNull().default("[]"),
  // Fome do dia — dois eixos, para cruzar com a fase do ciclo ao longo do tempo:
  hungerEmotional: text("hunger_emotional"), // sim | nao | null (não respondeu)
  hungerControl: text("hunger_control"),     // descontrolo | controlo | null
  // Contexto/fatores do dia (JSON array): trabalho | escola | ansiedade |
  // sono-mau | treino | relax — cruza stress da vida com fome e ciclo.
  context: text("context").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Registo de gerações de receitas por IA (controlo de custos: 1/dia por aluno)
export const aiGenerations = sqliteTable("ai_generations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  genDate: text("gen_date").notNull(), // YYYY-MM-DD
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
}, (t) => ({
  // 1 por (utilizador, dia) — trava o limite mesmo com pedidos simultâneos.
  userDay: uniqueIndex("ai_generations_user_day").on(t.userId, t.genDate),
}));

// Subscrições Web Push (uma por browser/dispositivo)
export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Check-ins de treino (um por dia) — alimenta o streak e o calendário semanal
export const workoutCheckins = sqliteTable("workout_checkins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  checkinDate: text("checkin_date").notNull(), // YYYY-MM-DD
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Favoritos do utilizador (vídeos e receitas)
export const favorites = sqliteTable("favorites", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  kind: text("kind").notNull(), // video | recipe
  refId: integer("ref_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// Registo de ações de administração (quem mudou o quê e quando)
export const adminAuditLog = sqliteTable("admin_audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  adminId: text("admin_id").notNull(),
  adminName: text("admin_name").notNull(),
  targetUserId: text("target_user_id").notNull(),
  targetEmail: text("target_email").notNull(),
  action: text("action").notNull(), // ex: "role: pending → member"
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});

// User membership status
export const memberships = sqliteTable("memberships", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  status: text("status").notNull().default("active"), // active | expired | cancelled
  plan: text("plan").notNull().default("mensal"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
});
