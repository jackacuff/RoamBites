import { Router, type IRouter } from "express";
import { db, favoritesTable, trucksTable, scheduleEntriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { computeTruckStatus } from "../lib/truckStatus";

const router: IRouter = Router();

router.get("/favorites", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const favRows = await db.select({
    id: favoritesTable.id,
    truckId: favoritesTable.truckId,
    createdAt: favoritesTable.createdAt,
    truckName: trucksTable.name,
    truckSlug: trucksTable.slug,
    truckCuisine: trucksTable.cuisine,
    truckDescription: trucksTable.description,
    truckImageUrl: trucksTable.imageUrl,
    truckIsLive: trucksTable.isLive,
    truckIsApproved: trucksTable.isApproved,
  })
    .from(favoritesTable)
    .leftJoin(trucksTable, eq(favoritesTable.truckId, trucksTable.id))
    .where(eq(favoritesTable.userId, user.id));

  const allSchedules = await db.select().from(scheduleEntriesTable);

  const results = favRows.map(row => {
    const schedules = allSchedules.filter(s => s.truckId === row.truckId);
    const truckObj = { isLive: row.truckIsLive ?? false };
    const { status } = computeTruckStatus(schedules, row.truckIsLive ?? false);
    return {
      id: row.id,
      truckId: row.truckId,
      createdAt: row.createdAt.toISOString(),
      truck: {
        id: row.truckId,
        name: row.truckName,
        slug: row.truckSlug,
        cuisine: row.truckCuisine,
        description: row.truckDescription,
        imageUrl: row.truckImageUrl,
        isLive: row.truckIsLive,
        isApproved: row.truckIsApproved,
        status,
      },
    };
  });

  res.json(results);
});

router.post("/favorites", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { truckId } = req.body;

  if (!truckId) { res.status(400).json({ error: "truckId is required" }); return; }

  const existing = await db.select().from(favoritesTable)
    .where(and(eq(favoritesTable.userId, user.id), eq(favoritesTable.truckId, truckId)));

  if (existing.length > 0) {
    res.json({ ...existing[0], createdAt: existing[0].createdAt.toISOString() });
    return;
  }

  const [fav] = await db.insert(favoritesTable).values({ userId: user.id, truckId }).returning();
  res.status(201).json({ ...fav, createdAt: fav.createdAt.toISOString() });
});

router.delete("/favorites/:truckId", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const truckId = parseInt(req.params.truckId, 10);

  await db.delete(favoritesTable)
    .where(and(eq(favoritesTable.userId, user.id), eq(favoritesTable.truckId, truckId)));

  res.sendStatus(204);
});

export default router;
