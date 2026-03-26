import { Router, type IRouter } from "express";
import { db, notificationPreferencesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const prefs = await db.select().from(notificationPreferencesTable)
    .where(eq(notificationPreferencesTable.userId, user.id));
  res.json(prefs.map(p => ({ ...p, updatedAt: p.updatedAt.toISOString() })));
});

router.post("/notifications", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { truckId, notifyWhenOpen, notifyWhenNearby } = req.body;

  if (!truckId) { res.status(400).json({ error: "truckId is required" }); return; }

  const existing = await db.select().from(notificationPreferencesTable)
    .where(and(
      eq(notificationPreferencesTable.userId, user.id),
      eq(notificationPreferencesTable.truckId, truckId),
    ));

  let result;
  if (existing.length > 0) {
    const [updated] = await db.update(notificationPreferencesTable)
      .set({
        notifyWhenOpen: notifyWhenOpen ?? existing[0].notifyWhenOpen,
        notifyWhenNearby: notifyWhenNearby ?? existing[0].notifyWhenNearby,
        updatedAt: new Date(),
      })
      .where(eq(notificationPreferencesTable.id, existing[0].id))
      .returning();
    result = updated;
  } else {
    const [inserted] = await db.insert(notificationPreferencesTable).values({
      userId: user.id,
      truckId,
      notifyWhenOpen: notifyWhenOpen ?? false,
      notifyWhenNearby: notifyWhenNearby ?? false,
    }).returning();
    result = inserted;
  }

  res.json({ ...result, updatedAt: result.updatedAt.toISOString() });
});

export default router;
