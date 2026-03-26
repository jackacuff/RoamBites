import { Router, type IRouter } from "express";
import { db, menuItemsTable, trucksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateMenuItemBody, UpdateMenuItemBody } from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get("/trucks/:id/menu", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const truckId = parseInt(rawId, 10);
  const items = await db.select().from(menuItemsTable).where(eq(menuItemsTable.truckId, truckId));
  res.json(items);
});

router.post("/trucks/:id/menu", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const truckId = parseInt(rawId, 10);
  const parsed = CreateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(menuItemsTable).values({ ...parsed.data, truckId }).returning();
  res.status(201).json(item);
});

router.put("/menu-items/:id", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = UpdateMenuItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: any = {};
  const body = parsed.data;
  if (body.name !== null && body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.price !== null && body.price !== undefined) updateData.price = body.price;
  if (body.category !== undefined) updateData.category = body.category;

  const [item] = await db.update(menuItemsTable).set(updateData).where(eq(menuItemsTable.id, id)).returning();
  if (!item) {
    res.status(404).json({ error: "Menu item not found" });
    return;
  }
  res.json(item);
});

router.delete("/menu-items/:id", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
  res.sendStatus(204);
});

export default router;
