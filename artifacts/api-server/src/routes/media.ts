import { Router, type IRouter } from "express";
import { db, truckMediaTable, trucksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireRole, optionalAuth } from "../lib/auth";

const router: IRouter = Router();

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_PDF_TYPES = ["application/pdf"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;
const VALID_MEDIA_TYPES = ["logo", "cover", "gallery", "menu_image", "menu_pdf"];

router.get("/trucks/:id/media", optionalAuth, async (req, res): Promise<void> => {
  let truckId = parseInt(req.params.id, 10);
  if (isNaN(truckId)) {
    const rows = await db.select({ id: trucksTable.id }).from(trucksTable).where(eq(trucksTable.slug, req.params.id));
    if (!rows[0]) { res.status(404).json({ error: "Truck not found" }); return; }
    truckId = rows[0].id;
  }

  const media = await db.select().from(truckMediaTable)
    .where(eq(truckMediaTable.truckId, truckId))
    .orderBy(truckMediaTable.sortOrder, truckMediaTable.createdAt);

  res.json(media.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

router.post("/trucks/:id/media", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const truckId = parseInt(req.params.id, 10);
  if (isNaN(truckId)) { res.status(400).json({ error: "Invalid truck id" }); return; }

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, truckId));
  if (!truck) { res.status(404).json({ error: "Truck not found" }); return; }
  if (user.role !== "admin" && truck.vendorUserId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const { type, url, fileName, altText, sortOrder, contentType, size } = req.body;

  if (!VALID_MEDIA_TYPES.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${VALID_MEDIA_TYPES.join(", ")}` }); return;
  }
  if (!url || !fileName) {
    res.status(400).json({ error: "url and fileName are required" }); return;
  }

  if (contentType && !ALLOWED_TYPES.includes(contentType)) {
    res.status(400).json({ error: "File type not allowed" }); return;
  }
  if (size && contentType) {
    const maxBytes = ALLOWED_PDF_TYPES.includes(contentType) ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;
    if (size > maxBytes) {
      res.status(400).json({ error: `File too large. Max size: ${maxBytes / (1024 * 1024)}MB` }); return;
    }
  }

  if (type === "logo" || type === "cover") {
    const existing = await db.select().from(truckMediaTable)
      .where(and(eq(truckMediaTable.truckId, truckId), eq(truckMediaTable.type, type)));
    if (existing.length > 0) {
      await db.delete(truckMediaTable).where(eq(truckMediaTable.id, existing[0].id));
    }
  }

  const [media] = await db.insert(truckMediaTable).values({
    truckId,
    type,
    url,
    fileName,
    altText: altText || `${truck.name} ${type}`,
    sortOrder: sortOrder ?? 0,
  }).returning();

  if (type === "logo") {
    await db.update(trucksTable).set({ logoUrl: url }).where(eq(trucksTable.id, truckId));
  }
  if (type === "cover") {
    await db.update(trucksTable).set({ coverImageUrl: url }).where(eq(trucksTable.id, truckId));
  }

  res.status(201).json({ ...media, createdAt: media.createdAt.toISOString() });
});

router.put("/trucks/:id/media/:mediaId", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const truckId = parseInt(req.params.id, 10);
  const mediaId = parseInt(req.params.mediaId, 10);

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, truckId));
  if (!truck) { res.status(404).json({ error: "Truck not found" }); return; }
  if (user.role !== "admin" && truck.vendorUserId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [media] = await db.select().from(truckMediaTable).where(eq(truckMediaTable.id, mediaId));
  if (!media || media.truckId !== truckId) { res.status(404).json({ error: "Media not found" }); return; }

  const { altText, sortOrder } = req.body;
  const [updated] = await db.update(truckMediaTable)
    .set({
      ...(altText !== undefined ? { altText } : {}),
      ...(sortOrder !== undefined ? { sortOrder: parseInt(sortOrder, 10) } : {}),
    })
    .where(eq(truckMediaTable.id, mediaId))
    .returning();

  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/trucks/:id/media/:mediaId", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const truckId = parseInt(req.params.id, 10);
  const mediaId = parseInt(req.params.mediaId, 10);

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, truckId));
  if (!truck) { res.status(404).json({ error: "Truck not found" }); return; }
  if (user.role !== "admin" && truck.vendorUserId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [media] = await db.select().from(truckMediaTable).where(eq(truckMediaTable.id, mediaId));
  if (!media || media.truckId !== truckId) { res.status(404).json({ error: "Media not found" }); return; }

  await db.delete(truckMediaTable).where(eq(truckMediaTable.id, mediaId));

  if (media.type === "logo") {
    await db.update(trucksTable).set({ logoUrl: null }).where(eq(trucksTable.id, truckId));
  }
  if (media.type === "cover") {
    await db.update(trucksTable).set({ coverImageUrl: null }).where(eq(trucksTable.id, truckId));
  }

  res.sendStatus(204);
});

router.post("/trucks/:id/media/:mediaId/set-featured", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const truckId = parseInt(req.params.id, 10);
  const mediaId = parseInt(req.params.mediaId, 10);

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, truckId));
  if (!truck) { res.status(404).json({ error: "Truck not found" }); return; }
  if (user.role !== "admin" && truck.vendorUserId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const [media] = await db.select().from(truckMediaTable).where(eq(truckMediaTable.id, mediaId));
  if (!media || media.truckId !== truckId) { res.status(404).json({ error: "Media not found" }); return; }

  await db.update(trucksTable).set({ imageUrl: media.url }).where(eq(trucksTable.id, truckId));

  res.json({ message: "Set as featured image", imageUrl: media.url });
});

export default router;
