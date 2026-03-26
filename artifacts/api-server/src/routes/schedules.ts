import { Router, type IRouter } from "express";
import { db, scheduleEntriesTable, trucksTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreateScheduleEntryBody, UpdateScheduleEntryBody } from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get("/schedules", async (req, res): Promise<void> => {
  const { truckId, date } = req.query as any;
  let schedules: any[];

  if (truckId) {
    schedules = await db
      .select()
      .from(scheduleEntriesTable)
      .where(eq(scheduleEntriesTable.truckId, parseInt(truckId)));
  } else {
    schedules = await db.select().from(scheduleEntriesTable);
  }

  if (date) {
    const targetDate = new Date(date);
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);
    schedules = schedules.filter((s) => s.startDateTime >= dayStart && s.startDateTime <= dayEnd);
  }

  const trucks = await db.select({ id: trucksTable.id, name: trucksTable.name }).from(trucksTable);
  const truckMap = new Map(trucks.map((t) => [t.id, t.name]));

  res.json(schedules.map((s) => ({ ...s, truckName: truckMap.get(s.truckId) ?? null })));
});

router.post("/schedules", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const parsed = CreateScheduleEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [entry] = await db
    .insert(scheduleEntriesTable)
    .values({
      truckId: data.truckId,
      title: data.title ?? null,
      venueName: data.venueName,
      address: data.address ?? null,
      city: data.city,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      startDateTime: new Date(data.startDateTime),
      endDateTime: new Date(data.endDateTime),
      isLive: false,
      isRecurring: data.isRecurring ?? false,
      notes: data.notes ?? null,
    })
    .returning();

  const trucks = await db.select({ id: trucksTable.id, name: trucksTable.name }).from(trucksTable);
  const truckMap = new Map(trucks.map((t) => [t.id, t.name]));

  res.status(201).json({ ...entry, truckName: truckMap.get(entry.truckId) ?? null });
});

router.put("/schedules/:id", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const parsed = UpdateScheduleEntryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;
  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.venueName !== null && body.venueName !== undefined) updateData.venueName = body.venueName;
  if (body.address !== undefined) updateData.address = body.address;
  if (body.city !== null && body.city !== undefined) updateData.city = body.city;
  if (body.latitude !== undefined) updateData.latitude = body.latitude;
  if (body.longitude !== undefined) updateData.longitude = body.longitude;
  if (body.startDateTime !== null && body.startDateTime !== undefined) updateData.startDateTime = new Date(body.startDateTime);
  if (body.endDateTime !== null && body.endDateTime !== undefined) updateData.endDateTime = new Date(body.endDateTime);
  if (body.isRecurring !== null && body.isRecurring !== undefined) updateData.isRecurring = body.isRecurring;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const [entry] = await db.update(scheduleEntriesTable).set(updateData).where(eq(scheduleEntriesTable.id, id)).returning();
  if (!entry) {
    res.status(404).json({ error: "Schedule entry not found" });
    return;
  }

  const trucks = await db.select({ id: trucksTable.id, name: trucksTable.name }).from(trucksTable);
  const truckMap = new Map(trucks.map((t) => [t.id, t.name]));
  res.json({ ...entry, truckName: truckMap.get(entry.truckId) ?? null });
});

router.delete("/schedules/:id", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  await db.delete(scheduleEntriesTable).where(eq(scheduleEntriesTable.id, id));
  res.sendStatus(204);
});

router.post("/schedules/:id/setlive", requireRole("vendor", "admin"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [entry] = await db.select().from(scheduleEntriesTable).where(eq(scheduleEntriesTable.id, id));
  if (!entry) {
    res.status(404).json({ error: "Schedule entry not found" });
    return;
  }

  await db
    .update(scheduleEntriesTable)
    .set({ isLive: false })
    .where(eq(scheduleEntriesTable.truckId, entry.truckId));

  await db.update(scheduleEntriesTable).set({ isLive: true }).where(eq(scheduleEntriesTable.id, id));
  await db.update(trucksTable).set({ isLive: true }).where(eq(trucksTable.id, entry.truckId));

  res.json({ message: "Schedule entry set as live" });
});

export default router;
