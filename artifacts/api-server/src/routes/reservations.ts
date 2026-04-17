import { Router, type IRouter } from "express";
import { db, reservationRequestsTable, trucksTable, scheduleEntriesTable, eventsTable, eventSpotReservationsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireRole, optionalAuth } from "../lib/auth";

const router: IRouter = Router();

// Helper — extract YYYY-MM-DD in UTC from any Date / timestamp
function toDateStr(d: Date | string): string {
  return new Date(d).toISOString().slice(0, 10);
}

router.post("/reservations", optionalAuth, async (req, res): Promise<void> => {
  const { truckId, name, email, phone, eventDate, eventLocation, message } = req.body;

  if (!truckId || !name || !email || !eventDate || !eventLocation || !message) {
    res.status(400).json({ error: "truckId, name, email, eventDate, eventLocation, and message are required" });
    return;
  }

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, truckId));
  if (!truck) { res.status(404).json({ error: "Truck not found" }); return; }

  // ── Conflict detection ────────────────────────────────────────────────────

  // 1. Schedule entries on the same calendar day
  const scheduleEntries = await db
    .select()
    .from(scheduleEntriesTable)
    .where(eq(scheduleEntriesTable.truckId, truckId));

  const scheduleConflicts = scheduleEntries.filter(
    e => toDateStr(e.startDateTime) === eventDate
  );

  // 2. Confirmed event spot reservations on the same calendar day
  const spotRows = await db
    .select({ reservation: eventSpotReservationsTable, event: eventsTable })
    .from(eventSpotReservationsTable)
    .leftJoin(eventsTable, eq(eventSpotReservationsTable.eventId, eventsTable.id))
    .where(
      and(
        eq(eventSpotReservationsTable.truckId, truckId),
        inArray(eventSpotReservationsTable.status, ["approved", "confirmed"])
      )
    );

  const eventConflicts = spotRows.filter(
    r => r.event && toDateStr(r.event.startDateTime) === eventDate
  );

  if (scheduleConflicts.length > 0 || eventConflicts.length > 0) {
    const descriptions = [
      ...scheduleConflicts.map(s => `already scheduled at ${s.venueName}`),
      ...eventConflicts.map(r => r.event ? `confirmed for "${r.event.name}"` : "another event"),
    ];
    res.status(409).json({
      error: `${truck.name} is not available on ${eventDate} — they are ${descriptions.join(" and ")}. Please choose a different date.`,
      conflicts: descriptions,
    });
    return;
  }

  // ── Insert ────────────────────────────────────────────────────────────────

  const [request] = await db.insert(reservationRequestsTable).values({
    truckId,
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || null,
    eventDate: eventDate.trim(),
    eventLocation: eventLocation.trim(),
    message: message.trim(),
  }).returning();

  console.log(`[RESERVATION] New request for truck "${truck.name}" from ${name} (${email}) on ${eventDate}`);

  res.status(201).json({ ...request, createdAt: request.createdAt.toISOString() });
});

router.get("/vendor/reservations", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const user = (req as any).user;

  const myTrucks = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
  const truckIds = myTrucks.map(t => t.id);

  if (truckIds.length === 0) {
    res.json([]);
    return;
  }

  const requests = await db.select().from(reservationRequestsTable)
    .orderBy(reservationRequestsTable.createdAt);

  const myRequests = requests.filter(r => truckIds.includes(r.truckId));
  const truckMap = Object.fromEntries(myTrucks.map(t => [t.id, t.name]));

  res.json(myRequests.map(r => ({
    ...r,
    truckName: truckMap[r.truckId] || "Unknown",
    createdAt: r.createdAt.toISOString(),
  })));
});

export default router;
