import { Router, type IRouter } from "express";
import { db, eventSpotsTable, eventSpotReservationsTable, eventsTable, trucksTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireRole, requireAuth } from "../lib/auth";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router: IRouter = Router();

router.get("/events/:eventId/spots", async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.eventId, 10);
  const spots = await db.select().from(eventSpotsTable).where(eq(eventSpotsTable.eventId, eventId));
  const reservations = await db.select().from(eventSpotReservationsTable).where(eq(eventSpotReservationsTable.eventId, eventId));

  const spotsWithCounts = spots.map(spot => {
    const spotReservations = reservations.filter(r => r.spotId === spot.id);
    const approved = spotReservations.filter(r => r.status === "approved").length;
    const pending = spotReservations.filter(r => r.status === "pending").length;
    return {
      ...spot,
      reservations: spotReservations,
      approvedCount: approved,
      pendingCount: pending,
      availableSlots: spot.totalSlots - approved,
    };
  });

  res.json(spotsWithCounts);
});

router.post("/events/:eventId/spots", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.eventId, 10);
  const user = (req as any).user;

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  if (event.organizerUserId !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { name, description, totalSlots, priceInCents, platformFeeInCents, requirements, vendorRules, isInstantBook } = req.body;
  if (!name || !totalSlots) {
    res.status(400).json({ error: "name and totalSlots are required" });
    return;
  }

  const [spot] = await db.insert(eventSpotsTable).values({
    eventId,
    name: name.trim(),
    description: description || null,
    totalSlots: parseInt(totalSlots) || 1,
    priceInCents: parseInt(priceInCents) || 0,
    platformFeeInCents: parseInt(platformFeeInCents) || 0,
    requirements: requirements || null,
    vendorRules: vendorRules || null,
    isInstantBook: Boolean(isInstantBook),
    isActive: true,
  }).returning();

  res.status(201).json({ ...spot, approvedCount: 0, pendingCount: 0, availableSlots: spot.totalSlots, reservations: [] });
});

router.put("/events/:eventId/spots/:spotId", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const spotId = parseInt(req.params.spotId, 10);
  const eventId = parseInt(req.params.eventId, 10);
  const user = (req as any).user;

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }
  if (event.organizerUserId !== user.id && user.role !== "admin") { res.status(403).json({ error: "Forbidden" }); return; }

  const { name, description, totalSlots, priceInCents, platformFeeInCents, requirements, vendorRules, isInstantBook, isActive } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (totalSlots !== undefined) updates.totalSlots = parseInt(totalSlots);
  if (priceInCents !== undefined) updates.priceInCents = parseInt(priceInCents);
  if (platformFeeInCents !== undefined) updates.platformFeeInCents = parseInt(platformFeeInCents);
  if (requirements !== undefined) updates.requirements = requirements;
  if (vendorRules !== undefined) updates.vendorRules = vendorRules;
  if (isInstantBook !== undefined) updates.isInstantBook = Boolean(isInstantBook);
  if (isActive !== undefined) updates.isActive = Boolean(isActive);

  const [updated] = await db.update(eventSpotsTable).set(updates).where(eq(eventSpotsTable.id, spotId)).returning();
  res.json(updated);
});

router.delete("/events/:eventId/spots/:spotId", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const spotId = parseInt(req.params.spotId, 10);
  await db.delete(eventSpotsTable).where(eq(eventSpotsTable.id, spotId));
  res.sendStatus(204);
});

router.get("/events/:eventId/spot-reservations", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const eventId = parseInt(req.params.eventId, 10);
  const reservations = await db.select().from(eventSpotReservationsTable).where(eq(eventSpotReservationsTable.eventId, eventId));
  const trucks = await db.select({ id: trucksTable.id, name: trucksTable.name, cuisine: trucksTable.cuisine }).from(trucksTable);
  const truckMap = new Map(trucks.map(t => [t.id, t]));
  res.json(reservations.map(r => ({ ...r, truck: truckMap.get(r.truckId) || null })));
});

router.post("/events/:eventId/spots/:spotId/apply", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const spotId = parseInt(req.params.spotId, 10);
  const eventId = parseInt(req.params.eventId, 10);

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
  if (!truck) { res.status(400).json({ error: "No truck found for this vendor" }); return; }

  const [spot] = await db.select().from(eventSpotsTable).where(eq(eventSpotsTable.id, spotId));
  if (!spot || !spot.isActive) { res.status(404).json({ error: "Spot not found or inactive" }); return; }

  const existing = await db.select().from(eventSpotReservationsTable).where(
    and(eq(eventSpotReservationsTable.spotId, spotId), eq(eventSpotReservationsTable.truckId, truck.id))
  );
  if (existing.length > 0) { res.status(409).json({ error: "Already applied for this spot" }); return; }

  const approvedCount = (await db.select().from(eventSpotReservationsTable).where(
    and(eq(eventSpotReservationsTable.spotId, spotId), eq(eventSpotReservationsTable.status, "approved"))
  )).length;
  if (approvedCount >= spot.totalSlots) { res.status(409).json({ error: "No spots available" }); return; }

  const status = spot.isInstantBook ? "approved" : "pending";
  const [reservation] = await db.insert(eventSpotReservationsTable).values({
    spotId,
    eventId,
    truckId: truck.id,
    status,
    paymentStatus: "unpaid",
    paymentAmountInCents: spot.priceInCents + spot.platformFeeInCents,
    notes: req.body.notes || null,
  }).returning();

  res.status(201).json({ ...reservation, truck: { id: truck.id, name: truck.name } });
});

router.put("/events/:eventId/spot-reservations/:reservationId", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const reservationId = parseInt(req.params.reservationId, 10);
  const { status, organizerMessage } = req.body;

  const updates: any = {};
  if (status) updates.status = status;
  if (organizerMessage !== undefined) updates.organizerMessage = organizerMessage;

  const [updated] = await db.update(eventSpotReservationsTable).set(updates).where(eq(eventSpotReservationsTable.id, reservationId)).returning();
  res.json(updated);
});

router.get("/vendor/spot-reservations", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
  if (!truck) { res.json([]); return; }

  const reservations = await db.select().from(eventSpotReservationsTable).where(eq(eventSpotReservationsTable.truckId, truck.id));
  const spotIds = [...new Set(reservations.map(r => r.spotId))];
  const eventIds = [...new Set(reservations.map(r => r.eventId))];

  let spots: any[] = [];
  let events: any[] = [];
  if (spotIds.length > 0) {
    spots = await db.select().from(eventSpotsTable).where(inArray(eventSpotsTable.id, spotIds));
    events = await db.select({ id: eventsTable.id, name: eventsTable.name, venueName: eventsTable.venueName, city: eventsTable.city, startDateTime: eventsTable.startDateTime }).from(eventsTable).where(inArray(eventsTable.id, eventIds));
  }

  const spotMap = new Map(spots.map(s => [s.id, s]));
  const eventMap = new Map(events.map(e => [e.id, e]));

  res.json(reservations.map(r => ({
    ...r,
    spot: spotMap.get(r.spotId) || null,
    event: eventMap.get(r.eventId) || null,
  })));
});

router.post("/vendor/spot-reservations/:reservationId/checkout", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const reservationId = parseInt(req.params.reservationId, 10);

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
  if (!truck) { res.status(403).json({ error: "No truck found for this vendor" }); return; }

  const [reservation] = await db.select().from(eventSpotReservationsTable)
    .where(and(eq(eventSpotReservationsTable.id, reservationId), eq(eventSpotReservationsTable.truckId, truck.id)));

  if (!reservation) { res.status(404).json({ error: "Reservation not found" }); return; }
  if (reservation.paymentStatus === "paid") { res.status(400).json({ error: "This reservation has already been paid" }); return; }

  const [spot] = await db.select().from(eventSpotsTable).where(eq(eventSpotsTable.id, reservation.spotId));
  if (!spot || spot.priceInCents === 0) { res.status(400).json({ error: "This spot has no payment required" }); return; }

  const [event] = await db.select({ id: eventsTable.id, name: eventsTable.name, organizerUserId: eventsTable.organizerUserId })
    .from(eventsTable).where(eq(eventsTable.id, reservation.eventId));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const [organizer] = await db.select({
    stripeConnectAccountId: usersTable.stripeConnectAccountId,
    stripeConnectOnboardingComplete: usersTable.stripeConnectOnboardingComplete,
  }).from(usersTable).where(eq(usersTable.id, event.organizerUserId));

  if (!organizer?.stripeConnectAccountId || !organizer.stripeConnectOnboardingComplete) {
    res.status(402).json({ error: "The event organizer has not connected their Stripe account yet. Please contact the organizer." });
    return;
  }

  const stripe = await getUncachableStripeClient();

  const applicationFeeAmount = Math.round(spot.priceInCents * 0.10);
  const origin = (req.headers.origin as string) || "http://localhost:5173";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        unit_amount: spot.priceInCents,
        product_data: {
          name: `${spot.name} — ${event.name}`,
          description: spot.description ?? undefined,
        },
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: organizer.stripeConnectAccountId },
    },
    success_url: `${origin}/vendor/event-spots?payment=success&reservation=${reservationId}`,
    cancel_url: `${origin}/vendor/event-spots?payment=cancelled`,
    metadata: { reservationId: String(reservationId), type: "spot_payment" },
  });

  await db.update(eventSpotReservationsTable)
    .set({ stripeCheckoutSessionId: session.id })
    .where(eq(eventSpotReservationsTable.id, reservationId));

  res.json({ url: session.url });
});

export default router;
