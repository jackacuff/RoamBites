import { Router, type IRouter } from "express";
import { db, truckSpecialsTable, trucksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/trucks/:truckId/specials", optionalAuth, async (req, res): Promise<void> => {
  const truckId = parseInt(req.params.truckId, 10);
  const specials = await db.select().from(truckSpecialsTable)
    .where(and(eq(truckSpecialsTable.truckId, truckId), eq(truckSpecialsTable.isActive, true)));
  const now = new Date();
  res.json(specials.filter(s => !s.expiresAt || s.expiresAt > now));
});

router.get("/vendor/specials", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
  if (!truck) { res.json([]); return; }
  const specials = await db.select().from(truckSpecialsTable).where(eq(truckSpecialsTable.truckId, truck.id));
  res.json(specials);
});

router.post("/vendor/specials", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
  if (!truck) { res.status(400).json({ error: "No truck found" }); return; }

  const { title, body, type, expiresAt } = req.body;
  if (!title) { res.status(400).json({ error: "title is required" }); return; }

  const [special] = await db.insert(truckSpecialsTable).values({
    truckId: truck.id,
    title: title.trim(),
    body: body || null,
    type: type || "announcement",
    isActive: true,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();

  res.status(201).json(special);
});

router.put("/vendor/specials/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params.id, 10);
  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
  if (!truck) { res.status(403).json({ error: "Forbidden" }); return; }

  const [existing] = await db.select().from(truckSpecialsTable).where(and(eq(truckSpecialsTable.id, id), eq(truckSpecialsTable.truckId, truck.id)));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const { title, body, type, isActive, expiresAt } = req.body;
  const updates: any = {};
  if (title !== undefined) updates.title = title;
  if (body !== undefined) updates.body = body;
  if (type !== undefined) updates.type = type;
  if (isActive !== undefined) updates.isActive = Boolean(isActive);
  if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;

  const [updated] = await db.update(truckSpecialsTable).set(updates).where(eq(truckSpecialsTable.id, id)).returning();
  res.json(updated);
});

router.delete("/vendor/specials/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params.id, 10);
  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
  if (!truck) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.delete(truckSpecialsTable).where(and(eq(truckSpecialsTable.id, id), eq(truckSpecialsTable.truckId, truck.id)));
  res.sendStatus(204);
});

export default router;
