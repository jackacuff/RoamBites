import { Router } from "express";
import { db, truckParksTable, parkVacanciesTable, usersTable } from "@workspace/db";
import { eq, and, desc, gte, isNull, or } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

// ── Public: list all active parks ──────────────────────────────────────────
router.get("/parks", async (req, res) => {
  try {
    const parks = await db
      .select({
        id: truckParksTable.id,
        name: truckParksTable.name,
        description: truckParksTable.description,
        address: truckParksTable.address,
        city: truckParksTable.city,
        latitude: truckParksTable.latitude,
        longitude: truckParksTable.longitude,
        website: truckParksTable.website,
        phone: truckParksTable.phone,
        imageUrl: truckParksTable.imageUrl,
        amenities: truckParksTable.amenities,
        maxTrucks: truckParksTable.maxTrucks,
        createdAt: truckParksTable.createdAt,
      })
      .from(truckParksTable)
      .where(
        and(
          eq(truckParksTable.isActive, true),
          or(isNull(truckParksTable.maxTrucks), gte(truckParksTable.maxTrucks, 2))
        )
      )
      .orderBy(desc(truckParksTable.createdAt));

    // Attach active vacancy count for each park
    const allVacancies = await db
      .select()
      .from(parkVacanciesTable)
      .where(eq(parkVacanciesTable.isActive, true));

    const vacancyCountByPark: Record<number, number> = {};
    for (const v of allVacancies) {
      vacancyCountByPark[v.parkId] = (vacancyCountByPark[v.parkId] ?? 0) + v.spotsAvailable;
    }

    const result = parks.map((p) => ({
      ...p,
      openSpots: vacancyCountByPark[p.id] ?? 0,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch parks" });
  }
});

// ── Public: park detail ────────────────────────────────────────────────────
router.get("/parks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [park] = await db
      .select()
      .from(truckParksTable)
      .where(and(eq(truckParksTable.id, id), eq(truckParksTable.isActive, true)));

    if (!park) return res.status(404).json({ error: "Park not found" });

    const [host] = await db
      .select({ id: usersTable.id, name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, park.hostUserId));

    const vacancies = await db
      .select()
      .from(parkVacanciesTable)
      .where(and(eq(parkVacanciesTable.parkId, id), eq(parkVacanciesTable.isActive, true)))
      .orderBy(desc(parkVacanciesTable.createdAt));

    res.json({ ...park, host: host ?? null, vacancies });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch park" });
  }
});

// ── Park host: create park ────────────────────────────────────────────────
router.post("/parks", requireAuth, requireRole("park_host", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, description, address, city, latitude, longitude, website, phone, imageUrl, amenities, maxTrucks } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "name is required" });
    }
    if (!address || typeof address !== "string" || !address.trim()) {
      return res.status(400).json({ error: "address is required" });
    }
    if (!city || typeof city !== "string" || !city.trim()) {
      return res.status(400).json({ error: "city is required" });
    }

    const [park] = await db
      .insert(truckParksTable)
      .values({
        hostUserId: user.id,
        name: name.trim(),
        description: description?.trim() ?? null,
        address: address.trim(),
        city: city.trim(),
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        website: website?.trim() ?? null,
        phone: phone?.trim() ?? null,
        imageUrl: imageUrl?.trim() ?? null,
        amenities: Array.isArray(amenities) ? amenities : [],
        maxTrucks: maxTrucks ? parseInt(maxTrucks) : null,
      })
      .returning();

    res.status(201).json(park);
  } catch (err) {
    res.status(500).json({ error: "Failed to create park" });
  }
});

// ── Park host: get my park ────────────────────────────────────────────────
router.get("/my-park", requireAuth, requireRole("park_host", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const [park] = await db
      .select()
      .from(truckParksTable)
      .where(eq(truckParksTable.hostUserId, user.id));

    if (!park) return res.status(404).json({ error: "No park found" });

    const vacancies = await db
      .select()
      .from(parkVacanciesTable)
      .where(eq(parkVacanciesTable.parkId, park.id))
      .orderBy(desc(parkVacanciesTable.createdAt));

    res.json({ ...park, vacancies });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch park" });
  }
});

// ── Park host: update my park ─────────────────────────────────────────────
router.put("/parks/:id", requireAuth, requireRole("park_host", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [existing] = await db.select().from(truckParksTable).where(eq(truckParksTable.id, id));
    if (!existing) return res.status(404).json({ error: "Park not found" });

    if (user.role !== "admin" && existing.hostUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name, description, address, city, latitude, longitude, website, phone, imageUrl, amenities, maxTrucks, isActive } = req.body;

    const [updated] = await db
      .update(truckParksTable)
      .set({
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() ?? null }),
        ...(address !== undefined && { address: address.trim() }),
        ...(city !== undefined && { city: city.trim() }),
        ...(latitude !== undefined && { latitude: latitude ? parseFloat(latitude) : null }),
        ...(longitude !== undefined && { longitude: longitude ? parseFloat(longitude) : null }),
        ...(website !== undefined && { website: website?.trim() ?? null }),
        ...(phone !== undefined && { phone: phone?.trim() ?? null }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl?.trim() ?? null }),
        ...(amenities !== undefined && { amenities: Array.isArray(amenities) ? amenities : [] }),
        ...(maxTrucks !== undefined && { maxTrucks: maxTrucks ? parseInt(maxTrucks) : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      })
      .where(eq(truckParksTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update park" });
  }
});

// ── Park host: add vacancy ────────────────────────────────────────────────
router.post("/parks/:id/vacancies", requireAuth, requireRole("park_host", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const parkId = parseInt(req.params.id);
    if (isNaN(parkId)) return res.status(400).json({ error: "Invalid park id" });

    const [park] = await db.select().from(truckParksTable).where(eq(truckParksTable.id, parkId));
    if (!park) return res.status(404).json({ error: "Park not found" });

    if (user.role !== "admin" && park.hostUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { title, description, spotsAvailable, startDate, endDate, dailyRate, weeklyRate, monthlyRate } = req.body;

    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "title is required" });
    }

    const [vacancy] = await db
      .insert(parkVacanciesTable)
      .values({
        parkId,
        title: title.trim(),
        description: description?.trim() ?? null,
        spotsAvailable: spotsAvailable ? parseInt(spotsAvailable) : 1,
        startDate: startDate?.trim() ?? null,
        endDate: endDate?.trim() ?? null,
        dailyRate: dailyRate ? parseFloat(dailyRate) : null,
        weeklyRate: weeklyRate ? parseFloat(weeklyRate) : null,
        monthlyRate: monthlyRate ? parseFloat(monthlyRate) : null,
      })
      .returning();

    res.status(201).json(vacancy);
  } catch (err) {
    res.status(500).json({ error: "Failed to create vacancy" });
  }
});

// ── Park host: update vacancy ─────────────────────────────────────────────
router.put("/vacancies/:id", requireAuth, requireRole("park_host", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [vacancy] = await db.select().from(parkVacanciesTable).where(eq(parkVacanciesTable.id, id));
    if (!vacancy) return res.status(404).json({ error: "Vacancy not found" });

    const [park] = await db.select().from(truckParksTable).where(eq(truckParksTable.id, vacancy.parkId));
    if (!park) return res.status(404).json({ error: "Park not found" });

    if (user.role !== "admin" && park.hostUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { title, description, spotsAvailable, startDate, endDate, dailyRate, weeklyRate, monthlyRate, isActive } = req.body;

    const [updated] = await db
      .update(parkVacanciesTable)
      .set({
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() ?? null }),
        ...(spotsAvailable !== undefined && { spotsAvailable: parseInt(spotsAvailable) }),
        ...(startDate !== undefined && { startDate: startDate?.trim() ?? null }),
        ...(endDate !== undefined && { endDate: endDate?.trim() ?? null }),
        ...(dailyRate !== undefined && { dailyRate: dailyRate ? parseFloat(dailyRate) : null }),
        ...(weeklyRate !== undefined && { weeklyRate: weeklyRate ? parseFloat(weeklyRate) : null }),
        ...(monthlyRate !== undefined && { monthlyRate: monthlyRate ? parseFloat(monthlyRate) : null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      })
      .where(eq(parkVacanciesTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update vacancy" });
  }
});

// ── Park host: delete vacancy ─────────────────────────────────────────────
router.delete("/vacancies/:id", requireAuth, requireRole("park_host", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [vacancy] = await db.select().from(parkVacanciesTable).where(eq(parkVacanciesTable.id, id));
    if (!vacancy) return res.status(404).json({ error: "Vacancy not found" });

    const [park] = await db.select().from(truckParksTable).where(eq(truckParksTable.id, vacancy.parkId));
    if (!park) return res.status(404).json({ error: "Park not found" });

    if (user.role !== "admin" && park.hostUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.delete(parkVacanciesTable).where(eq(parkVacanciesTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete vacancy" });
  }
});

export default router;
