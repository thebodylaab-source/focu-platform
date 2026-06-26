import { Hono } from "hono";
import { db } from "../database";
import * as schema from "../database/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export const shoppingRoute = new Hono()
  // List all items for the current user
  .get("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const items = await db
      .select()
      .from(schema.shoppingListItems)
      .where(eq(schema.shoppingListItems.userId, user.id));
    return c.json({ items }, 200);
  })
  // Add an item
  .post("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    const body = await c.req.json<{
      name: string;
      category?: string;
      tags?: string[];
      supermarkets?: string[];
      quantity?: number;
    }>();
    if (!body.name || !body.name.trim()) {
      return c.json({ error: "Indica o nome do produto." }, 400);
    }
    const [item] = await db
      .insert(schema.shoppingListItems)
      .values({
        userId: user.id,
        name: body.name.trim(),
        category: body.category ?? "outros",
        tags: JSON.stringify(body.tags ?? []),
        supermarkets: JSON.stringify(body.supermarkets ?? []),
        quantity: body.quantity ?? 1,
      })
      .returning();
    return c.json({ item }, 201);
  })
  // Toggle checked / update quantity
  .patch("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json<{ checked?: boolean; quantity?: number }>();
    const updates: Record<string, unknown> = {};
    if (typeof body.checked === "boolean") updates.checked = body.checked;
    if (typeof body.quantity === "number") updates.quantity = body.quantity;
    const [item] = await db
      .update(schema.shoppingListItems)
      .set(updates)
      .where(
        and(
          eq(schema.shoppingListItems.id, id),
          eq(schema.shoppingListItems.userId, user.id)
        )
      )
      .returning();
    return c.json({ item }, 200);
  })
  // Remove an item
  .delete("/:id", requireAuth, async (c) => {
    const user = c.get("user")!;
    const id = parseInt(c.req.param("id"));
    await db
      .delete(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.id, id),
          eq(schema.shoppingListItems.userId, user.id)
        )
      );
    return c.json({ ok: true }, 200);
  })
  // Clear all checked items
  .delete("/", requireAuth, async (c) => {
    const user = c.get("user")!;
    await db
      .delete(schema.shoppingListItems)
      .where(
        and(
          eq(schema.shoppingListItems.userId, user.id),
          eq(schema.shoppingListItems.checked, true)
        )
      );
    return c.json({ ok: true }, 200);
  });
