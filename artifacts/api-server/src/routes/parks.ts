import { Router } from "express";
import { db, truckParksTable, parkVacanciesTable, usersTable, trucksTable, parkSpotApplicationsTable, parkWaitlistEntriesTable } from "@workspace/db";
import { eq, and, desc, gte, isNull, or, inArray } from "drizzle-orm";
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

    // Attach live truck count for each park
    const liveTrucks = await db
      .select({ id: trucksTable.id, currentParkId: trucksTable.currentParkId })
      .from(trucksTable)
      .where(and(eq(trucksTable.isLive, true), eq(trucksTable.isApproved, true)));

    const liveTruckCountByPark: Record<number, number> = {};
    for (const t of liveTrucks) {
      if (t.currentParkId) {
        liveTruckCountByPark[t.currentParkId] = (liveTruckCountByPark[t.currentParkId] ?? 0) + 1;
      }
    }

    const result = parks.map((p) => ({
      ...p,
      openSpots: vacancyCountByPark[p.id] ?? 0,
      liveTrucksCount: liveTruckCountByPark[p.id] ?? 0,
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

    // Get trucks currently checked in at this park
    const liveTrucks = await db
      .select({
        id: trucksTable.id,
        name: trucksTable.name,
        slug: trucksTable.slug,
        cuisine: trucksTable.cuisine,
        description: trucksTable.description,
        logoUrl: trucksTable.logoUrl,
        imageUrl: trucksTable.imageUrl,
        isLive: trucksTable.isLive,
        tagline: trucksTable.tagline,
        currentLatitude: trucksTable.currentLatitude,
        currentLongitude: trucksTable.currentLongitude,
      })
      .from(trucksTable)
      .where(
        and(
          eq(trucksTable.currentParkId, id),
          eq(trucksTable.isLive, true),
          eq(trucksTable.isApproved, true)
        )
      );

    res.json({ ...park, host: host ?? null, vacancies, liveTrucks });
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

    // Get trucks currently checked in
    const liveTrucks = await db
      .select({
        id: trucksTable.id,
        name: trucksTable.name,
        cuisine: trucksTable.cuisine,
        logoUrl: trucksTable.logoUrl,
        isLive: trucksTable.isLive,
      })
      .from(trucksTable)
      .where(
        and(
          eq(trucksTable.currentParkId, park.id),
          eq(trucksTable.isLive, true),
          eq(trucksTable.isApproved, true)
        )
      );

    res.json({ ...park, vacancies, liveTrucks });
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

// ── Vendor: check in to a park ────────────────────────────────────────────
router.post("/trucks/:truckId/park-checkin", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const truckId = parseInt(req.params.truckId);
    if (isNaN(truckId)) return res.status(400).json({ error: "Invalid truck id" });

    const { parkId } = req.body;
    if (!parkId) return res.status(400).json({ error: "parkId is required" });

    const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, truckId));
    if (!truck) return res.status(404).json({ error: "Truck not found" });
    if (user.role !== "admin" && truck.vendorUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [park] = await db.select().from(truckParksTable).where(eq(truckParksTable.id, parseInt(parkId)));
    if (!park) return res.status(404).json({ error: "Park not found" });

    const [updated] = await db
      .update(trucksTable)
      .set({
        currentParkId: park.id,
        currentLatitude: park.latitude,
        currentLongitude: park.longitude,
        isLive: true,
      })
      .where(eq(trucksTable.id, truckId))
      .returning();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to check in" });
  }
});

// ── Vendor: check out of park ─────────────────────────────────────────────
router.post("/trucks/:truckId/park-checkout", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const truckId = parseInt(req.params.truckId);
    if (isNaN(truckId)) return res.status(400).json({ error: "Invalid truck id" });

    const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.id, truckId));
    if (!truck) return res.status(404).json({ error: "Truck not found" });
    if (user.role !== "admin" && truck.vendorUserId !== user.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [updated] = await db
      .update(trucksTable)
      .set({ currentParkId: null })
      .where(eq(trucksTable.id, truckId))
      .returning();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to check out" });
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

// ── Vendor: apply for a park spot ────────────────────────────────────────
router.post("/parks/:id/apply", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const parkId = parseInt(req.params.id);
    if (isNaN(parkId)) return res.status(400).json({ error: "Invalid park id" });

    const [park] = await db.select().from(truckParksTable).where(and(eq(truckParksTable.id, parkId), eq(truckParksTable.isActive, true)));
    if (!park) return res.status(404).json({ error: "Park not found" });

    const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
    if (!truck) return res.status(400).json({ error: "No truck found for this vendor" });

    const existing = await db.select().from(parkSpotApplicationsTable).where(
      and(
        eq(parkSpotApplicationsTable.parkId, parkId),
        eq(parkSpotApplicationsTable.truckId, truck.id),
        inArray(parkSpotApplicationsTable.status, ["pending", "approved"])
      )
    );
    if (existing.length > 0) return res.status(409).json({ error: "You already have an active application for this park" });

    const { vacancyId, notes } = req.body;

    const [application] = await db.insert(parkSpotApplicationsTable).values({
      parkId,
      vacancyId: vacancyId ? parseInt(vacancyId) : null,
      truckId: truck.id,
      vendorUserId: user.id,
      status: "pending",
      notes: notes?.trim() ?? null,
    }).returning();

    res.status(201).json({ ...application, truck: { id: truck.id, name: truck.name }, park: { id: park.id, name: park.name } });
  } catch (err) {
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// ── Vendor: join park waitlist ────────────────────────────────────────────
router.post("/parks/:id/waitlist", requireAuth, requireRole("vendor", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const parkId = parseInt(req.params.id);
    if (isNaN(parkId)) return res.status(400).json({ error: "Invalid park id" });

    const [park] = await db.select().from(truckParksTable).where(and(eq(truckParksTable.id, parkId), eq(truckParksTable.isActive, true)));
    if (!park) return res.status(404).json({ error: "Park not found" });

    const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
    if (!truck) return res.status(400).json({ error: "No truck found for this vendor" });

    const existing = await db.select().from(parkWaitlistEntriesTable).where(
      and(
        eq(parkWaitlistEntriesTable.parkId, parkId),
        eq(parkWaitlistEntriesTable.truckId, truck.id),
        inArray(parkWaitlistEntriesTable.status, ["waiting", "contacted"])
      )
    );
    if (existing.length > 0) return res.status(409).json({ error: "You are already on the waitlist for this park" });

    const { notes } = req.body;

    const [entry] = await db.insert(parkWaitlistEntriesTable).values({
      parkId,
      truckId: truck.id,
      vendorUserId: user.id,
      status: "waiting",
      notes: notes?.trim() ?? null,
    }).returning();

    res.status(201).json({ ...entry, truck: { id: truck.id, name: truck.name }, park: { id: park.id, name: park.name } });
  } catch (err) {
    res.status(500).json({ error: "Failed to join waitlist" });
  }
});

// ── Vendor: get my park applications + waitlist entries ───────────────────
router.get("/vendor/park-applications", requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;

    const [truck] = await db.select().from(trucksTable).where(eq(trucksTable.vendorUserId, user.id));
    if (!truck) return res.json({ applications: [], waitlist: [] });

    const applications = await db.select().from(parkSpotApplicationsTable)
      .where(eq(parkSpotApplicationsTable.truckId, truck.id))
      .orderBy(desc(parkSpotApplicationsTable.createdAt));

    const waitlist = await db.select().from(parkWaitlistEntriesTable)
      .where(eq(parkWaitlistEntriesTable.truckId, truck.id))
      .orderBy(desc(parkWaitlistEntriesTable.createdAt));

    const parkIds = [...new Set([
      ...applications.map(a => a.parkId),
      ...waitlist.map(w => w.parkId),
    ])];

    let parks: any[] = [];
    if (parkIds.length > 0) {
      parks = await db.select({ id: truckParksTable.id, name: truckParksTable.name, city: truckParksTable.city, address: truckParksTable.address })
        .from(truckParksTable).where(inArray(truckParksTable.id, parkIds));
    }
    const parkMap = new Map(parks.map(p => [p.id, p]));

    const vacancyIds = applications.map(a => a.vacancyId).filter(Boolean) as number[];
    let vacancies: any[] = [];
    if (vacancyIds.length > 0) {
      vacancies = await db.select().from(parkVacanciesTable).where(inArray(parkVacanciesTable.id, vacancyIds));
    }
    const vacancyMap = new Map(vacancies.map(v => [v.id, v]));

    res.json({
      applications: applications.map(a => ({
        ...a,
        park: parkMap.get(a.parkId) ?? null,
        vacancy: a.vacancyId ? vacancyMap.get(a.vacancyId) ?? null : null,
      })),
      waitlist: waitlist.map(w => ({
        ...w,
        park: parkMap.get(w.parkId) ?? null,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// ── Park host: get applications for my park ───────────────────────────────
router.get("/parks/:id/applications", requireAuth, requireRole("park_host", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const parkId = parseInt(req.params.id);
    if (isNaN(parkId)) return res.status(400).json({ error: "Invalid park id" });

    const [park] = await db.select().from(truckParksTable).where(eq(truckParksTable.id, parkId));
    if (!park) return res.status(404).json({ error: "Park not found" });
    if (user.role !== "admin" && park.hostUserId !== user.id) return res.status(403).json({ error: "Forbidden" });

    const applications = await db.select().from(parkSpotApplicationsTable)
      .where(eq(parkSpotApplicationsTable.parkId, parkId))
      .orderBy(desc(parkSpotApplicationsTable.createdAt));

    const truckIds = [...new Set(applications.map(a => a.truckId))];
    let trucks: any[] = [];
    if (truckIds.length > 0) {
      trucks = await db.select({ id: trucksTable.id, name: trucksTable.name, cuisine: trucksTable.cuisine, logoUrl: trucksTable.logoUrl })
        .from(trucksTable).where(inArray(trucksTable.id, truckIds));
    }
    const truckMap = new Map(trucks.map(t => [t.id, t]));

    const vacancyIds = applications.map(a => a.vacancyId).filter(Boolean) as number[];
    let vacancies: any[] = [];
    if (vacancyIds.length > 0) {
      vacancies = await db.select().from(parkVacanciesTable).where(inArray(parkVacanciesTable.id, vacancyIds));
    }
    const vacancyMap = new Map(vacancies.map(v => [v.id, v]));

    res.json(applications.map(a => ({
      ...a,
      truck: truckMap.get(a.truckId) ?? null,
      vacancy: a.vacancyId ? vacancyMap.get(a.vacancyId) ?? null : null,
    })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// ── Park host: update application ────────────────────────────────────────
router.put("/park-applications/:id", requireAuth, requireRole("park_host", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [application] = await db.select().from(parkSpotApplicationsTable).where(eq(parkSpotApplicationsTable.id, id));
    if (!application) return res.status(404).json({ error: "Application not found" });

    const [park] = await db.select().from(truckParksTable).where(eq(truckParksTable.id, application.parkId));
    if (!park) return res.status(404).json({ error: "Park not found" });
    if (user.role !== "admin" && park.hostUserId !== user.id) return res.status(403).json({ error: "Forbidden" });

    const { status, hostMessage } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (hostMessage !== undefined) updates.hostMessage = hostMessage;

    const [updated] = await db.update(parkSpotApplicationsTable).set(updates).where(eq(parkSpotApplicationsTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update application" });
  }
});

// ── Park host: get waitlist for my park ──────────────────────────────────
router.get("/parks/:id/waitlist-entries", requireAuth, requireRole("park_host", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const parkId = parseInt(req.params.id);
    if (isNaN(parkId)) return res.status(400).json({ error: "Invalid park id" });

    const [park] = await db.select().from(truckParksTable).where(eq(truckParksTable.id, parkId));
    if (!park) return res.status(404).json({ error: "Park not found" });
    if (user.role !== "admin" && park.hostUserId !== user.id) return res.status(403).json({ error: "Forbidden" });

    const entries = await db.select().from(parkWaitlistEntriesTable)
      .where(eq(parkWaitlistEntriesTable.parkId, parkId))
      .orderBy(desc(parkWaitlistEntriesTable.createdAt));

    const truckIds = [...new Set(entries.map(e => e.truckId))];
    let trucks: any[] = [];
    if (truckIds.length > 0) {
      trucks = await db.select({ id: trucksTable.id, name: trucksTable.name, cuisine: trucksTable.cuisine, logoUrl: trucksTable.logoUrl })
        .from(trucksTable).where(inArray(trucksTable.id, truckIds));
    }
    const truckMap = new Map(trucks.map(t => [t.id, t]));

    res.json(entries.map(e => ({ ...e, truck: truckMap.get(e.truckId) ?? null })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch waitlist" });
  }
});

// ── Park host: update waitlist entry ─────────────────────────────────────
router.put("/park-waitlist/:id", requireAuth, requireRole("park_host", "admin"), async (req, res) => {
  try {
    const user = (req as any).user;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [entry] = await db.select().from(parkWaitlistEntriesTable).where(eq(parkWaitlistEntriesTable.id, id));
    if (!entry) return res.status(404).json({ error: "Waitlist entry not found" });

    const [park] = await db.select().from(truckParksTable).where(eq(truckParksTable.id, entry.parkId));
    if (!park) return res.status(404).json({ error: "Park not found" });
    if (user.role !== "admin" && park.hostUserId !== user.id) return res.status(403).json({ error: "Forbidden" });

    const { status, hostMessage } = req.body;
    const updates: any = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (hostMessage !== undefined) updates.hostMessage = hostMessage;

    const [updated] = await db.update(parkWaitlistEntriesTable).set(updates).where(eq(parkWaitlistEntriesTable.id, id)).returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update waitlist entry" });
  }
});

export default router;
