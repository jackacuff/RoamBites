import { Router, type IRouter } from "express";
import { db, truckViewsTable, favoritesTable, reviewsTable, reservationRequestsTable, trucksTable } from "@workspace/db";
import { eq, and, gte, sql, count, avg } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/trucks/:id/view", async (req, res): Promise<void> => {
  const truckId = parseInt(req.params.id, 10);
  if (isNaN(truckId)) { res.status(400).json({ error: "Invalid truck ID" }); return; }

  const { sessionId } = req.body || {};

  if (sessionId) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const [existing] = await db
      .select({ id: truckViewsTable.id })
      .from(truckViewsTable)
      .where(
        and(
          eq(truckViewsTable.truckId, truckId),
          eq(truckViewsTable.sessionId, sessionId),
          gte(truckViewsTable.createdAt, since)
        )
      )
      .limit(1);

    if (existing) {
      res.json({ recorded: false });
      return;
    }
  }

  await db.insert(truckViewsTable).values({ truckId, sessionId: sessionId || null });
  res.json({ recorded: true });
});

router.get("/vendor/analytics", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;

  const [truck] = await db
    .select({ id: trucksTable.id, name: trucksTable.name })
    .from(trucksTable)
    .where(eq(trucksTable.vendorUserId, user.id));

  if (!truck) {
    res.json({
      truckName: null,
      totalViews: 0,
      views30d: 0,
      views7d: 0,
      viewsByDay: [],
      favoriteCount: 0,
      reviewCount: 0,
      avgRating: null,
      reservationCount: 0,
    });
    return;
  }

  const truckId = truck.id;
  const now = new Date();
  const ago30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ago7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [totalViewsRow] = await db
    .select({ count: count() })
    .from(truckViewsTable)
    .where(eq(truckViewsTable.truckId, truckId));

  const [views30dRow] = await db
    .select({ count: count() })
    .from(truckViewsTable)
    .where(and(eq(truckViewsTable.truckId, truckId), gte(truckViewsTable.createdAt, ago30)));

  const [views7dRow] = await db
    .select({ count: count() })
    .from(truckViewsTable)
    .where(and(eq(truckViewsTable.truckId, truckId), gte(truckViewsTable.createdAt, ago7)));

  const viewsByDayRaw = await db.execute(sql`
    SELECT
      to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
      count(*)::int AS views
    FROM truck_views
    WHERE truck_id = ${truckId}
      AND created_at >= ${ago30}
    GROUP BY day
    ORDER BY day ASC
  `);

  const viewsByDayMap = new Map<string, number>();
  for (const row of viewsByDayRaw.rows as any[]) {
    viewsByDayMap.set(row.day, Number(row.views));
  }

  const viewsByDay: { date: string; views: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    viewsByDay.push({ date: key, views: viewsByDayMap.get(key) ?? 0 });
  }

  const [favRow] = await db
    .select({ count: count() })
    .from(favoritesTable)
    .where(eq(favoritesTable.truckId, truckId));

  const [reviewAgg] = await db
    .select({ count: count(), avg: avg(reviewsTable.rating) })
    .from(reviewsTable)
    .where(eq(reviewsTable.truckId, truckId));

  const [resRow] = await db
    .select({ count: count() })
    .from(reservationRequestsTable)
    .where(eq(reservationRequestsTable.truckId, truckId));

  res.json({
    truckName: truck.name,
    totalViews: Number(totalViewsRow?.count ?? 0),
    views30d: Number(views30dRow?.count ?? 0),
    views7d: Number(views7dRow?.count ?? 0),
    viewsByDay,
    favoriteCount: Number(favRow?.count ?? 0),
    reviewCount: Number(reviewAgg?.count ?? 0),
    avgRating: reviewAgg?.avg ? parseFloat(reviewAgg.avg as any) : null,
    reservationCount: Number(resRow?.count ?? 0),
  });
});

export default router;
