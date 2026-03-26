import { Router, type IRouter } from "express";
import { db, reservationRequestsTable, trucksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole, optionalAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/reservations", optionalAuth, async (req, res): Promise<void> => {
  const { truckId, name, email, phone, eventDate, eventLocation, message } = req.body;

  if (!truckId || !name || !email || !eventDate || !eventLocation || !message) {
    res.status(400).json({ error: "truckId, name, email, eventDate, eventLocation, and message are required" });
    return;
  }

  const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, truckId));
  if (!truck) { res.status(404).json({ error: "Truck not found" }); return; }

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
