import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

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
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
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
