import { Router, type IRouter } from "express";
import { db, reviewsTable, trucksTable, usersTable } from "@workspace/db";
import { eq, and, avg, count } from "drizzle-orm";
import { requireAuth, optionalAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/trucks/:id/reviews", optionalAuth, async (req, res): Promise<void> => {
  let truckId = parseInt(req.params.id, 10);
  if (isNaN(truckId)) {
    const rows = await db.select({ id: trucksTable.id }).from(trucksTable).where(eq(trucksTable.slug, req.params.id));
    if (!rows[0]) { res.status(404).json({ error: "Truck not found" }); return; }
    truckId = rows[0].id;
  }

  const reviews = await db.select({
    id: reviewsTable.id,
    userId: reviewsTable.userId,
    truckId: reviewsTable.truckId,
    rating: reviewsTable.rating,
    comment: reviewsTable.comment,
    createdAt: reviewsTable.createdAt,
    userName: usersTable.name,
  })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.truckId, truckId))
    .orderBy(reviewsTable.createdAt);

  const stats = await db.select({
    avgRating: avg(reviewsTable.rating),
    total: count(reviewsTable.id),
  }).from(reviewsTable).where(eq(reviewsTable.truckId, truckId));

  res.json({
    reviews: reviews.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
    avgRating: stats[0]?.avgRating ? parseFloat(stats[0].avgRating as string) : null,
    total: Number(stats[0]?.total ?? 0),
  });
});

router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { truckId, rating, comment } = req.body;

  if (!truckId || !rating || !comment) {
    res.status(400).json({ error: "truckId, rating, and comment are required" });
    return;
  }
  if (rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be between 1 and 5" });
    return;
  }

  const existing = await db.select().from(reviewsTable)
    .where(and(eq(reviewsTable.userId, user.id), eq(reviewsTable.truckId, truckId)));
  if (existing.length > 0) {
    res.status(409).json({ error: "You have already reviewed this truck" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    userId: user.id,
    truckId,
    rating: Math.round(rating),
    comment: comment.trim(),
  }).returning();

  res.status(201).json({ ...review, createdAt: review.createdAt.toISOString() });
});

router.put("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params.id, 10);
  const { rating, comment } = req.body;

  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  if (review.userId !== user.id) { res.status(403).json({ error: "Forbidden" }); return; }

  const [updated] = await db.update(reviewsTable)
    .set({
      ...(rating !== undefined ? { rating: Math.round(rating) } : {}),
      ...(comment !== undefined ? { comment: comment.trim() } : {}),
    })
    .where(eq(reviewsTable.id, id))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/reviews/:id", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params.id, 10);

  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  if (review.userId !== user.id && user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.sendStatus(204);
});

export default router;
