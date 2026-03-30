import { Router, type IRouter } from "express";
import { db, notificationPreferencesTable, trucksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const rows = await db
    .select({
      id: notificationPreferencesTable.id,
      userId: notificationPreferencesTable.userId,
      truckId: notificationPreferencesTable.truckId,
      notifyWhenOpen: notificationPreferencesTable.notifyWhenOpen,
      notifyWhenNearby: notificationPreferencesTable.notifyWhenNearby,
      updatedAt: notificationPreferencesTable.updatedAt,
      truckName: trucksTable.name,
      truckCuisine: trucksTable.cuisine,
      truckSlug: trucksTable.slug,
      truckImageUrl: trucksTable.imageUrl,
      truckIsLive: trucksTable.isLive,
    })
    .from(notificationPreferencesTable)
    .leftJoin(trucksTable, eq(notificationPreferencesTable.truckId, trucksTable.id))
    .where(eq(notificationPreferencesTable.userId, user.id));

  res.json(rows.map(p => ({ ...p, updatedAt: p.updatedAt.toISOString() })));
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

router.delete("/notifications/:truckId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const truckId = parseInt(req.params.truckId, 10);
  if (isNaN(truckId)) { res.status(400).json({ error: "Invalid truckId" }); return; }

  await db.delete(notificationPreferencesTable).where(
    and(
      eq(notificationPreferencesTable.userId, user.id),
      eq(notificationPreferencesTable.truckId, truckId),
    )
  );
  res.sendStatus(204);
});

export default router;
