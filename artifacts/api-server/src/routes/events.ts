import { Router, type IRouter } from "express";
import { db, eventsTable, eventTrucksTable, trucksTable, scheduleEntriesTable, messagesTable, eventDaysTable, eventSpotsTable } from "@workspace/db";
import { eq, and, gt, inArray } from "drizzle-orm";
import { InviteTruckToEventBody, RespondToEventInviteBody } from "@workspace/api-zod";
import { requireRole, requireAuth, optionalAuth } from "../lib/auth";
import { slugify, computeTruckStatus } from "../lib/truckStatus";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { z } from "zod";

const EventWriteSchema = z.object({
  name: z.string(),
  description: z.string().nullish(),
  venueName: z.string(),
  address: z.string().nullish(),
  city: z.string(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  startDateTime: z.coerce.date(),
  endDateTime: z.coerce.date(),
  publicNotes: z.string().nullish(),
  vendorNotes: z.string().nullish(),
  isPublished: z.boolean().optional(),
  bannerImageUrl: z.string().nullish(),
  websiteUrl: z.string().nullish(),
  photoUrls: z.string().nullish(),
  thumbnailUrl: z.string().nullish(),
  contactFirstName: z.string().nullish(),
  contactLastName: z.string().nullish(),
  contactEmail: z.string().nullish(),
  contactPhone: z.string().nullish(),
  howHeardAboutUs: z.string().nullish(),
  availableHookups: z.string().nullish(),
  vendorFeeStructure: z.string().nullish(),
  spotFeeAmount: z.number().nullish(),
  vendorPaymentMethod: z.string().nullish(),
  expectedAttendance: z.number().nullish(),
  eventType: z.string().nullish(),
  notificationMethod: z.string().nullish(),
  additionalInfo: z.string().nullish(),
});

const EventDaySchema = z.object({
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  label: z.string().optional(),
});

const EventSpotInputSchema = z.object({
  name: z.string().min(1).optional(),
  totalSlots: z.number().int().min(1),
  priceInCents: z.number().int().min(0),
  isInstantBook: z.boolean().optional(),
  requirements: z.string().optional(),
  vendorRules: z.string().optional(),
});

const CreateEventSchema = EventWriteSchema.extend({
  name: z.string().min(1),
  venueName: z.string().min(1),
  city: z.string().min(1),
  startDateTime: z.coerce.date().optional(),
  endDateTime: z.coerce.date().optional(),
  days: z.array(EventDaySchema).optional(),
  spot: EventSpotInputSchema.optional(),
});

const UpdateEventSchema = EventWriteSchema.partial();

const router: IRouter = Router();

async function buildEventSummary(event: any) {
  const eventTrucks = await db
    .select()
    .from(eventTrucksTable)
    .where(and(eq(eventTrucksTable.eventId, event.id), eq(eventTrucksTable.status, "confirmed")));
  const now = new Date();
  const isActiveFeatured = event.isFeatured && event.featuredUntil && event.featuredUntil > now;
  return {
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description,
    venueName: event.venueName,
    address: event.address,
    city: event.city,
    latitude: event.latitude,
    longitude: event.longitude,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    organizerUserId: event.organizerUserId,
    confirmedTruckCount: eventTrucks.length,
    isPublished: event.isPublished,
    bannerImageUrl: event.bannerImageUrl,
    websiteUrl: event.websiteUrl,
    isFeatured: isActiveFeatured,
    featuredUntil: event.featuredUntil,
    publicNotes: event.publicNotes,
  };
}

router.get("/events", optionalAuth, async (req, res): Promise<void> => {
  const { upcoming, organizerId } = req.query as any;
  let events = await db.select().from(eventsTable);

  if (upcoming === "true") {
    const now = new Date();
    events = events.filter((e) => e.endDateTime >= now);
  }
  if (organizerId) {
    events = events.filter((e) => e.organizerUserId === parseInt(organizerId));
  }

  // Sort: active featured first, then by date
  const now = new Date();
  events.sort((a, b) => {
    const aFeatured = a.isFeatured && a.featuredUntil && a.featuredUntil > now ? 1 : 0;
    const bFeatured = b.isFeatured && b.featuredUntil && b.featuredUntil > now ? 1 : 0;
    if (bFeatured !== aFeatured) return bFeatured - aFeatured;
    return a.startDateTime.getTime() - b.startDateTime.getTime();
  });

  const summaries = await Promise.all(events.map(buildEventSummary));
  res.json(summaries);
});

router.get("/events/:id", optionalAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

  let event: any;
  const numId = parseInt(rawId, 10);
  if (!isNaN(numId)) {
    const rows = await db.select().from(eventsTable).where(eq(eventsTable.id, numId));
    event = rows[0];
  }
  if (!event) {
    const rows = await db.select().from(eventsTable).where(eq(eventsTable.slug, rawId));
    event = rows[0];
  }
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const eventTrucks = await db.select().from(eventTrucksTable).where(eq(eventTrucksTable.eventId, event.id));
  const truckIds = eventTrucks.map((et) => et.truckId);
  let trucks: any[] = [];
  if (truckIds.length > 0) {
    const rawTrucks = await db.select().from(trucksTable).where(inArray(trucksTable.id, truckIds));
    const allSchedules = await db.select().from(scheduleEntriesTable);

    trucks = await Promise.all(
      eventTrucks.map(async (et) => {
        const truck = rawTrucks.find((t) => t.id === et.truckId);
        if (!truck) return { id: et.id, eventId: et.eventId, truckId: et.truckId, status: et.status, truck: null };
        const schedules = allSchedules.filter((s) => s.truckId === truck.id);
        const { status, activeSchedule, currentLocation, currentCity } = computeTruckStatus(schedules, truck.isLive);
        return {
          id: et.id,
          eventId: et.eventId,
          truckId: et.truckId,
          status: et.status,
          truck: {
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
            activeSchedule: activeSchedule ? { ...activeSchedule, truckName: truck.name } : null,
            vendorUserId: truck.vendorUserId,
          },
        };
      })
    );
  }

  // Fetch event days
  const days = await db.select().from(eventDaysTable)
    .where(eq(eventDaysTable.eventId, event.id))
    .orderBy(eventDaysTable.sortOrder);

  res.json({
    id: event.id,
    name: event.name,
    slug: event.slug,
    description: event.description,
    venueName: event.venueName,
    address: event.address,
    city: event.city,
    latitude: event.latitude,
    longitude: event.longitude,
    startDateTime: event.startDateTime,
    endDateTime: event.endDateTime,
    publicNotes: event.publicNotes,
    vendorNotes: event.vendorNotes,
    isPublished: event.isPublished,
    bannerImageUrl: event.bannerImageUrl,
    websiteUrl: event.websiteUrl,
    organizerUserId: event.organizerUserId,
    createdAt: event.createdAt,
    trucks,
    days,
  });
});

router.post("/events", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const parsed = CreateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userId = (req as any).user.id;
  const data = parsed.data;
  const { days, spot, ...eventData } = data;

  // Derive startDateTime / endDateTime from days if provided
  let startDateTime: Date;
  let endDateTime: Date;
  if (days && days.length > 0) {
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    startDateTime = new Date(`${sorted[0].date}T${sorted[0].startTime}:00`);
    endDateTime = new Date(`${sorted[sorted.length - 1].date}T${sorted[sorted.length - 1].endTime}:00`);
  } else if (eventData.startDateTime && eventData.endDateTime) {
    startDateTime = new Date(eventData.startDateTime);
    endDateTime = new Date(eventData.endDateTime);
  } else {
    res.status(400).json({ error: "Either days or startDateTime+endDateTime is required" });
    return;
  }

  const baseSlug = slugify(data.name);
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await db.select().from(eventsTable).where(eq(eventsTable.slug, slug));
    if (existing.length === 0) break;
    slug = `${baseSlug}-${counter++}`;
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      ...eventData,
      organizerUserId: userId,
      slug,
      startDateTime,
      endDateTime,
      latitude: eventData.latitude ?? null,
      longitude: eventData.longitude ?? null,
    })
    .returning();

  // Insert event days if provided
  let insertedDays: any[] = [];
  if (days && days.length > 0) {
    insertedDays = await db.insert(eventDaysTable).values(
      days.map((d, i) => ({
        eventId: event.id,
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
        label: d.label ?? `Day ${i + 1}`,
        sortOrder: i,
      }))
    ).returning();
  }

  // Insert event spot if provided
  let insertedSpot: any = null;
  if (spot) {
    const [s] = await db.insert(eventSpotsTable).values({
      eventId: event.id,
      name: spot.name ?? "Vendor Spot",
      totalSlots: spot.totalSlots,
      priceInCents: spot.priceInCents,
      isInstantBook: spot.isInstantBook ?? false,
      requirements: spot.requirements ?? null,
      vendorRules: spot.vendorRules ?? null,
      isActive: true,
    }).returning();
    insertedSpot = s;
  }

  res.status(201).json({ ...event, trucks: [], days: insertedDays, spot: insertedSpot });
});

router.put("/events/:id", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = UpdateEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const user = (req as any).user;
  if (user.role !== "admin" && existing.organizerUserId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const body = parsed.data;
  const updateData: any = {};
  if (body.name !== null && body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.venueName !== null && body.venueName !== undefined) updateData.venueName = body.venueName;
  if (body.address !== undefined) updateData.address = body.address;
  if (body.city !== null && body.city !== undefined) updateData.city = body.city;
  if (body.latitude !== undefined) updateData.latitude = body.latitude;
  if (body.longitude !== undefined) updateData.longitude = body.longitude;
  if (body.startDateTime !== null && body.startDateTime !== undefined) updateData.startDateTime = new Date(body.startDateTime);
  if (body.endDateTime !== null && body.endDateTime !== undefined) updateData.endDateTime = new Date(body.endDateTime);
  if (body.publicNotes !== undefined) updateData.publicNotes = body.publicNotes;
  if (body.vendorNotes !== undefined) updateData.vendorNotes = body.vendorNotes;
  if (body.isPublished !== undefined) updateData.isPublished = Boolean(body.isPublished);
  if (body.bannerImageUrl !== undefined) updateData.bannerImageUrl = body.bannerImageUrl;
  if (body.websiteUrl !== undefined) updateData.websiteUrl = body.websiteUrl;
  if (body.photoUrls !== undefined) updateData.photoUrls = body.photoUrls;
  if (body.thumbnailUrl !== undefined) updateData.thumbnailUrl = body.thumbnailUrl;
  if (body.contactFirstName !== undefined) updateData.contactFirstName = body.contactFirstName;
  if (body.contactLastName !== undefined) updateData.contactLastName = body.contactLastName;
  if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail;
  if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone;
  if (body.howHeardAboutUs !== undefined) updateData.howHeardAboutUs = body.howHeardAboutUs;
  if (body.availableHookups !== undefined) updateData.availableHookups = body.availableHookups;
  if (body.vendorFeeStructure !== undefined) updateData.vendorFeeStructure = body.vendorFeeStructure;
  if (body.spotFeeAmount !== undefined) updateData.spotFeeAmount = body.spotFeeAmount;
  if (body.vendorPaymentMethod !== undefined) updateData.vendorPaymentMethod = body.vendorPaymentMethod;
  if (body.expectedAttendance !== undefined) updateData.expectedAttendance = body.expectedAttendance;
  if (body.eventType !== undefined) updateData.eventType = body.eventType;
  if (body.notificationMethod !== undefined) updateData.notificationMethod = body.notificationMethod;
  if (body.additionalInfo !== undefined) updateData.additionalInfo = body.additionalInfo;

  const [updated] = await db.update(eventsTable).set(updateData).where(eq(eventsTable.id, id)).returning();
  res.json({ ...updated, trucks: [] });
});

router.delete("/events/:id", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  await db.delete(eventTrucksTable).where(eq(eventTrucksTable.eventId, id));
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.sendStatus(204);
});

router.post("/events/:id/invite", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const eventId = parseInt(rawId, 10);
  const parsed = InviteTruckToEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { truckId } = parsed.data;

  const existing = await db
    .select()
    .from(eventTrucksTable)
    .where(and(eq(eventTrucksTable.eventId, eventId), eq(eventTrucksTable.truckId, truckId)));
  if (existing.length > 0) {
    res.status(409).json({ error: "Truck already invited" });
    return;
  }

  const [et] = await db
    .insert(eventTrucksTable)
    .values({ eventId, truckId, status: "invited" })
    .returning();

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, truckId));
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  const organizer = (req as any).user;

  if (truck && event) {
    const customMessage = req.body.message || null;
    const defaultBody = `You've been invited to participate in **${event.name}** at ${event.venueName}, ${event.city} on ${new Date(event.startDateTime).toLocaleDateString()}.${customMessage ? `\n\n${customMessage}` : ""}`;
    await db.insert(messagesTable).values({
      fromUserId: organizer.id,
      toUserId: truck.vendorUserId,
      truckId: truck.id,
      eventId: event.id,
      subject: `Event invitation: ${event.name}`,
      body: defaultBody,
      type: "invitation",
    });
  }

  res.status(201).json({ ...et, truck: truck ?? null });
});

router.post("/events/:id/respond", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const eventId = parseInt(rawId, 10);
  const parsed = RespondToEventInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { truckId, status } = parsed.data;

  const [et] = await db
    .update(eventTrucksTable)
    .set({ status })
    .where(and(eq(eventTrucksTable.eventId, eventId), eq(eventTrucksTable.truckId, truckId)))
    .returning();

  if (!et) {
    res.status(404).json({ error: "Invitation not found" });
    return;
  }

  res.json(et);
});

// Admin: toggle featured status on an event
router.post("/admin/events/:id/feature", requireRole("admin", "superadmin"), async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id, 10);
  const { isFeatured, durationDays = 30 } = req.body as { isFeatured: boolean; durationDays?: number };
  const [rows] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!rows) { res.status(404).json({ error: "Event not found" }); return; }

  const featuredUntil = isFeatured ? new Date(Date.now() + durationDays * 86400000) : null;
  const [updated] = await db
    .update(eventsTable)
    .set({ isFeatured, featuredUntil })
    .where(eq(eventsTable.id, eventId))
    .returning();

  res.json({ isFeatured: updated.isFeatured, featuredUntil: updated.featuredUntil });
});

// Organizer: create Stripe checkout session to purchase featured placement ($29 / 30 days)
router.post("/organizer/events/:id/feature-checkout", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id, 10);
  const user = (req as any).user;
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  if (user.role !== "admin" && event.organizerUserId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const origin = (req.headers.origin as string) ?? "https://roambites.com";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: 2900,
          product_data: {
            name: "Featured Event — 30 Days",
            description: `Boost "${event.name}" to the top of the events listing for 30 days.`,
          },
        },
        quantity: 1,
      }],
      metadata: { type: "featured_event", eventId: event.id.toString() },
      success_url: `${origin}/events?featured_success=${event.id}`,
      cancel_url: `${origin}/organizer/events/${event.id}`,
    });
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Stripe error" });
  }
});

// Organizer: verify payment success and activate featured status
router.post("/organizer/events/:id/feature-activate", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.id, 10);
  const user = (req as any).user;
  const { sessionId } = req.body as { sessionId: string };
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  if (user.role !== "admin" && event.organizerUserId !== user.id) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }

  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid" || session.metadata?.eventId !== eventId.toString()) {
      res.status(400).json({ error: "Payment not confirmed" }); return;
    }
    const featuredUntil = new Date(Date.now() + 30 * 86400000);
    await db.update(eventsTable).set({ isFeatured: true, featuredUntil }).where(eq(eventsTable.id, eventId));
    res.json({ success: true, featuredUntil });
  } catch (err: any) {
    res.status(500).json({ error: err.message ?? "Verification failed" });
  }
});

export default router;
