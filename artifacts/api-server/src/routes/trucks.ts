import { Router, type IRouter } from "express";
import { db, trucksTable, scheduleEntriesTable, menuItemsTable, eventsTable, eventTrucksTable, usersTable, reviewsTable, vendorSubscriptionsTable } from "@workspace/db";
import { eq, and, ilike, or, inArray, avg, count, asc } from "drizzle-orm";
import { CreateTruckBody, UpdateTruckBody, CheckInTruckBody } from "@workspace/api-zod";
import { requireAuth, requireRole, optionalAuth } from "../lib/auth";
import { computeTruckStatus, slugify } from "../lib/truckStatus";

const router: IRouter = Router();

async function buildTruckSummary(truck: any, schedules: any[]) {
  const { status, activeSchedule, currentLocation, currentCity } = computeTruckStatus(schedules, truck.isLive);
  return {
    id: truck.id,
    name: truck.name,
    slug: truck.slug,
    cuisine: truck.cuisine,
    description: truck.description,
    imageUrl: truck.imageUrl,
    isApproved: truck.isApproved,
    isLive: truck.isLive,
    status,
    currentLocation,
    currentCity,
    activeSchedule: activeSchedule
      ? {
          id: activeSchedule.id,
          truckId: activeSchedule.truckId,
          title: activeSchedule.title,
          venueName: activeSchedule.venueName,
          address: activeSchedule.address,
          city: activeSchedule.city,
          latitude: activeSchedule.latitude,
          longitude: activeSchedule.longitude,
          startDateTime: activeSchedule.startDateTime,
          endDateTime: activeSchedule.endDateTime,
          isLive: activeSchedule.isLive,
          isRecurring: activeSchedule.isRecurring,
          notes: activeSchedule.notes,
          truckName: truck.name,
        }
      : null,
    vendorUserId: truck.vendorUserId,
    currentLatitude: truck.currentLatitude,
    currentLongitude: truck.currentLongitude,
  };
}

router.get("/trucks", optionalAuth, async (req, res): Promise<void> => {
  const { city, cuisine, openNow, search, eventId, mine } = req.query as any;

  // ?mine=true — return only the authenticated vendor's own trucks (skip approval filter)
  if (mine === "true") {
    const user = (req as any).user;
    if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
    const myTrucks = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id)).orderBy(asc(trucksTable.id));
    const allSchedules = await db.select().from(scheduleEntriesTable);
    const results = await Promise.all(
      myTrucks.map(truck => buildTruckSummary(truck, allSchedules.filter(s => s.truckId === truck.id)))
    );
    res.json(results);
    return;
  }

  const allTrucks = await db.select().from(trucksTable).where(eq(trucksTable.isApproved, true));
  const allSchedules = await db.select().from(scheduleEntriesTable);

  let results = await Promise.all(
    allTrucks.map(async (truck) => {
      const schedules = allSchedules.filter((s) => s.truckId === truck.id);
      return buildTruckSummary(truck, schedules);
    })
  );

  if (city) {
    results = results.filter((t) => t.currentCity?.toLowerCase().includes(city.toLowerCase()));
  }
  if (cuisine) {
    results = results.filter((t) => t.cuisine.toLowerCase().includes(cuisine.toLowerCase()));
  }
  if (openNow === "true") {
    results = results.filter((t) => t.status === "open");
  }
  if (search) {
    results = results.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  }
  if (eventId) {
    const ets = await db
      .select()
      .from(eventTrucksTable)
      .where(and(eq(eventTrucksTable.eventId, parseInt(eventId)), eq(eventTrucksTable.status, "confirmed")));
    const truckIds = ets.map((et) => et.truckId);
    results = results.filter((t) => truckIds.includes(t.id));
  }

  // Sort: open first, then opening_later, then closed
  const order = { open: 0, closing_soon: 1, opening_later: 2, closed: 3 };
  results.sort((a, b) => {
    const aOrder = order[a.status] ?? 3;
    const bOrder = order[b.status] ?? 3;
    return aOrder - bOrder;
  });

  res.json(results);
});

router.get("/trucks/:id", optionalAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  
  let truck: any;
  const numId = parseInt(rawId, 10);
  if (!isNaN(numId)) {
    const rows = await db.select().from(trucksTable).where(eq(trucksTable.id, numId));
    truck = rows[0];
  }
  if (!truck) {
    const rows = await db.select().from(trucksTable).where(eq(trucksTable.slug, rawId));
    truck = rows[0];
  }

  if (!truck) {
    res.status(404).json({ error: "Truck not found" });
    return;
  }

  const [schedules, menuItems, eventTrucks, reviewStats] = await Promise.all([
    db.select().from(scheduleEntriesTable).where(eq(scheduleEntriesTable.truckId, truck.id)),
    db.select().from(menuItemsTable).where(eq(menuItemsTable.truckId, truck.id)),
    db.select().from(eventTrucksTable).where(eq(eventTrucksTable.truckId, truck.id)),
    db.select({ avgRating: avg(reviewsTable.rating), total: count(reviewsTable.id) })
      .from(reviewsTable).where(eq(reviewsTable.truckId, truck.id)),
  ]);

  const eventIds = eventTrucks.map((et) => et.eventId);
  let truckEvents: any[] = [];
  if (eventIds.length > 0) {
    const evts = await db.select().from(eventsTable).where(inArray(eventsTable.id, eventIds));
    truckEvents = evts.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      description: e.description,
      venueName: e.venueName,
      city: e.city,
      startDateTime: e.startDateTime,
      endDateTime: e.endDateTime,
      organizerUserId: e.organizerUserId,
      confirmedTruckCount: 0,
    }));
  }

  const { status, activeSchedule, currentLocation, currentCity } = computeTruckStatus(schedules, truck.isLive);
  const avgRating = reviewStats[0]?.avgRating ? parseFloat(reviewStats[0].avgRating as string) : null;
  const reviewCount = Number(reviewStats[0]?.total ?? 0);

  res.json({
    id: truck.id,
    name: truck.name,
    slug: truck.slug,
    cuisine: truck.cuisine,
    description: truck.description,
    imageUrl: truck.imageUrl,
    phone: truck.phone,
    website: truck.website,
    isApproved: truck.isApproved,
    isLive: truck.isLive,
    isOpenForReservations: truck.isOpenForReservations,
    reservationEmail: truck.reservationEmail,
    reservationPhone: truck.reservationPhone,
    reservationContactPreference: truck.reservationContactPreference,
    reservationNotes: truck.reservationNotes,
    twitterHandle: truck.twitterHandle,
    instagramHandle: truck.instagramHandle,
    facebookUrl: truck.facebookUrl,
    tiktokHandle: truck.tiktokHandle,
    youtubeUrl: truck.youtubeUrl,
    currentLatitude: truck.currentLatitude,
    currentLongitude: truck.currentLongitude,
    status,
    currentLocation,
    currentCity,
    avgRating,
    reviewCount,
    vendorUserId: truck.vendorUserId,
    createdAt: truck.createdAt,
    menuItems,
    scheduleEntries: schedules.map((s) => ({
      ...s,
      truckName: truck.name,
    })),
    events: truckEvents,
    activeSchedule: activeSchedule
      ? { ...activeSchedule, truckName: truck.name }
      : null,
  });
});

router.post("/trucks", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const parsed = CreateTruckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = (req as any).user.id;
  const baseSlug = slugify(parsed.data.name);
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await db.select().from(trucksTable).where(eq(trucksTable.slug, slug));
    if (existing.length === 0) break;
    slug = `${baseSlug}-${counter++}`;
  }

  const [truck] = await db
    .insert(trucksTable)
    .values({ ...parsed.data, vendorUserId: userId, slug, isApproved: false, isLive: false })
    .returning();

  res.status(201).json({
    ...truck,
    status: "closed",
    isLive: truck.isLive,
    currentLocation: null,
    currentCity: null,
    menuItems: [],
    scheduleEntries: [],
    events: [],
    activeSchedule: null,
  });
});

router.put("/trucks/:id", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = UpdateTruckBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, id));
  if (!truck) {
    res.status(404).json({ error: "Truck not found" });
    return;
  }

  const user = (req as any).user;
  if (user.role !== "admin" && truck.vendorUserId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updateData: any = {};
  const body = parsed.data;
  const rawBody = req.body;
  if (body.name !== undefined && body.name !== null) updateData.name = body.name;
  if (body.cuisine !== undefined && body.cuisine !== null) updateData.cuisine = body.cuisine;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.website !== undefined) updateData.website = body.website;
  if (rawBody.isOpenForReservations !== undefined) updateData.isOpenForReservations = !!rawBody.isOpenForReservations;
  if (rawBody.reservationEmail !== undefined) updateData.reservationEmail = rawBody.reservationEmail || null;
  if (rawBody.reservationPhone !== undefined) updateData.reservationPhone = rawBody.reservationPhone || null;
  if (rawBody.reservationContactPreference !== undefined) updateData.reservationContactPreference = rawBody.reservationContactPreference || "email";
  if (rawBody.reservationNotes !== undefined) updateData.reservationNotes = rawBody.reservationNotes || null;
  if (rawBody.twitterHandle !== undefined) updateData.twitterHandle = rawBody.twitterHandle || null;
  if (rawBody.instagramHandle !== undefined) updateData.instagramHandle = rawBody.instagramHandle || null;
  if (rawBody.facebookUrl !== undefined) updateData.facebookUrl = rawBody.facebookUrl || null;
  if (rawBody.tiktokHandle !== undefined) updateData.tiktokHandle = rawBody.tiktokHandle || null;
  if (rawBody.youtubeUrl !== undefined) updateData.youtubeUrl = rawBody.youtubeUrl || null;

  const [updated] = await db.update(trucksTable).set(updateData).where(eq(trucksTable.id, id)).returning();
  const schedules = await db.select().from(scheduleEntriesTable).where(eq(scheduleEntriesTable.truckId, id));
  const menuItems = await db.select().from(menuItemsTable).where(eq(menuItemsTable.truckId, id));
  const { status, activeSchedule, currentLocation, currentCity } = computeTruckStatus(schedules, updated.isLive);

  res.json({
    ...updated,
    status,
    currentLocation,
    currentCity,
    menuItems,
    scheduleEntries: schedules,
    events: [],
    activeSchedule: activeSchedule ? { ...activeSchedule, truckName: updated.name } : null,
  });
});

router.delete("/trucks/:id", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, id));
  if (!truck) {
    res.status(404).json({ error: "Truck not found" });
    return;
  }

  const user = (req as any).user;
  if (user.role !== "admin" && truck.vendorUserId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(trucksTable).where(eq(trucksTable.id, id));
  res.sendStatus(204);
});

router.post("/trucks/:id/checkin", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = CheckInTruckBody.safeParse(req.body);

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, id));
  if (!truck) {
    res.status(404).json({ error: "Truck not found" });
    return;
  }

  const effectiveUserId = (req as any).effectiveUser?.id ?? req.user!.id;
  const effectiveRole = (req as any).effectiveUser?.role ?? req.user!.role;

  if (effectiveRole === "vendor") {
    const [sub] = await db
      .select({ status: vendorSubscriptionsTable.status, trialEndsAt: vendorSubscriptionsTable.trialEndsAt })
      .from(vendorSubscriptionsTable)
      .where(eq(vendorSubscriptionsTable.vendorUserId, effectiveUserId));

    const isTrialingValid = sub?.status === "trialing" && sub.trialEndsAt && sub.trialEndsAt > new Date();
    const isActive = sub?.status === "active";

    if (!isTrialingValid && !isActive) {
      res.status(403).json({
        error: "An active subscription is required to go live.",
        code: "SUBSCRIPTION_REQUIRED",
      });
      return;
    }
  }

  const lat = parsed.success ? parsed.data.latitude ?? null : null;
  const lng = parsed.success ? parsed.data.longitude ?? null : null;

  await db.update(trucksTable)
    .set({
      isLive: true,
      ...(lat !== null && lng !== null ? { currentLatitude: lat, currentLongitude: lng } : {}),
    })
    .where(eq(trucksTable.id, id));

  if (parsed.success && parsed.data.scheduleEntryId) {
    await db
      .update(scheduleEntriesTable)
      .set({ isLive: true })
      .where(eq(scheduleEntriesTable.id, parsed.data.scheduleEntryId));
  }

  res.json({ message: "Truck checked in as live", latitude: lat, longitude: lng });
});

router.post("/trucks/:id/checkout", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.update(trucksTable)
    .set({ isLive: false, currentLatitude: null, currentLongitude: null })
    .where(eq(trucksTable.id, id));
  await db
    .update(scheduleEntriesTable)
    .set({ isLive: false })
    .where(eq(scheduleEntriesTable.truckId, id));

  res.json({ message: "Truck checked out" });
});

export default router;
