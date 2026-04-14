import { Router } from "express";
import {
  db, usersTable, trucksTable,
  spotListingsTable, spotListingSchedulesTable,
  spotListingApplicationsTable, spotListingWaitlistTable,
} from "@workspace/db";
import { eq, and, desc, asc, ilike, or, sql, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

// ── helpers ────────────────────────────────────────────────────────────────
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function attachSchedules(listingIds: number[]) {
  if (!listingIds.length) return {} as Record<number, any[]>;
  const rows = await db
    .select()
    .from(spotListingSchedulesTable)
    .where(
      and(
        eq(spotListingSchedulesTable.isActive, true),
        inArray(spotListingSchedulesTable.listingId, listingIds)
      )
    );
  const map: Record<number, any[]> = {};
  for (const r of rows) {
    if (!map[r.listingId]) map[r.listingId] = [];
    map[r.listingId].push(r);
  }
  return map;
}

// ── PUBLIC: browse spot listings ────────────────────────────────────────────
router.get("/spots", async (req, res) => {
  try {
    const {
      city, spotType, scheduleType, minPrice, maxPrice,
      isInstantBook, hasWaitlist, search,
      lat, lng, radiusKm = "50",
      sortBy = "newest",
      limit = "30", offset = "0",
    } = req.query as Record<string, string>;

    let rows = await db
      .select({
        id: spotListingsTable.id,
        hostUserId: spotListingsTable.hostUserId,
        title: spotListingsTable.title,
        description: spotListingsTable.description,
        hostName: spotListingsTable.hostName,
        address: spotListingsTable.address,
        city: spotListingsTable.city,
        latitude: spotListingsTable.latitude,
        longitude: spotListingsTable.longitude,
        spotType: spotListingsTable.spotType,
        spotsTotal: spotListingsTable.spotsTotal,
        spotsAvailable: spotListingsTable.spotsAvailable,
        priceInCents: spotListingsTable.priceInCents,
        isInstantBook: spotListingsTable.isInstantBook,
        hasWaitlist: spotListingsTable.hasWaitlist,
        scheduleType: spotListingsTable.scheduleType,
        requirements: spotListingsTable.requirements,
        requiresAcknowledgement: spotListingsTable.requiresAcknowledgement,
        tags: spotListingsTable.tags,
        amenities: spotListingsTable.amenities,
        imageUrl: spotListingsTable.imageUrl,
        createdAt: spotListingsTable.createdAt,
        hostDisplayName: usersTable.name,
      })
      .from(spotListingsTable)
      .leftJoin(usersTable, eq(spotListingsTable.hostUserId, usersTable.id))
      .where(
        and(
          eq(spotListingsTable.isActive, true),
          eq(spotListingsTable.isPublished, true)
        )
      )
      .orderBy(desc(spotListingsTable.createdAt));

    // filters
    if (city) rows = rows.filter(r => r.city?.toLowerCase().includes(city.toLowerCase()));
    if (spotType) rows = rows.filter(r => r.spotType === spotType);
    if (scheduleType) rows = rows.filter(r => r.scheduleType === scheduleType);
    if (minPrice) rows = rows.filter(r => r.priceInCents >= parseInt(minPrice) * 100);
    if (maxPrice && maxPrice !== "") rows = rows.filter(r => r.priceInCents <= parseInt(maxPrice) * 100);
    if (isInstantBook === "true") rows = rows.filter(r => r.isInstantBook);
    if (hasWaitlist === "true") rows = rows.filter(r => r.hasWaitlist);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q) ||
        (r.hostName ?? "").toLowerCase().includes(q) ||
        (r.address ?? "").toLowerCase().includes(q)
      );
    }

    // distance filter & sort
    let withDistance = rows.map(r => ({
      ...r,
      distanceKm: lat && lng && r.latitude && r.longitude
        ? haversineKm(parseFloat(lat), parseFloat(lng), r.latitude, r.longitude)
        : null,
    }));

    if (lat && lng) {
      const radius = parseFloat(radiusKm);
      withDistance = withDistance.filter(r => r.distanceKm === null || r.distanceKm <= radius);
    }

    if (sortBy === "distance" && lat && lng) {
      withDistance.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
    } else if (sortBy === "price_asc") {
      withDistance.sort((a, b) => a.priceInCents - b.priceInCents);
    } else if (sortBy === "price_desc") {
      withDistance.sort((a, b) => b.priceInCents - a.priceInCents);
    } else if (sortBy === "spots") {
      withDistance.sort((a, b) => b.spotsAvailable - a.spotsAvailable);
    }

    // pagination
    const total = withDistance.length;
    const paginated = withDistance.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

    // attach schedules
    const scheduleMap = await attachSchedules(paginated.map(r => r.id));
    const result = paginated.map(r => ({ ...r, schedules: scheduleMap[r.id] ?? [] }));

    res.json({ listings: result, total, offset: parseInt(offset), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch spot listings" });
  }
});

// ── PUBLIC: spot listing detail ─────────────────────────────────────────────
router.get("/spots/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [listing] = await db
      .select()
      .from(spotListingsTable)
      .where(and(eq(spotListingsTable.id, id), eq(spotListingsTable.isActive, true)));

    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const [host] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, listing.hostUserId));

    const schedules = await db
      .select()
      .from(spotListingSchedulesTable)
      .where(and(eq(spotListingSchedulesTable.listingId, id), eq(spotListingSchedulesTable.isActive, true)))
      .orderBy(asc(spotListingSchedulesTable.id));

    const applicationCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(spotListingApplicationsTable)
      .where(and(
        eq(spotListingApplicationsTable.listingId, id),
        eq(spotListingApplicationsTable.status, "pending")
      ));

    res.json({ ...listing, host, schedules, pendingApplications: applicationCount[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch listing" });
  }
});

// ── AUTH: create a spot listing (any logged-in user) ────────────────────────
router.post("/spots", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const {
      title, description, hostName, address, city,
      latitude, longitude, spotType, spotsTotal, priceInCents,
      isInstantBook, hasWaitlist, scheduleType, requirements,
      requiresAcknowledgement, tags, amenities, imageUrl,
      schedules = [],
    } = req.body;

    if (!title || !spotType) return res.status(400).json({ error: "title and spotType are required" });

    const [listing] = await db
      .insert(spotListingsTable)
      .values({
        hostUserId: userId,
        title: title.trim(),
        description: description ?? null,
        hostName: hostName ?? null,
        address: address ?? null,
        city: city ?? "Oklahoma City",
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        spotType: spotType ?? "single_spot",
        spotsTotal: spotsTotal ?? 1,
        spotsAvailable: spotsTotal ?? 1,
        priceInCents: priceInCents ?? 0,
        isInstantBook: isInstantBook ?? false,
        hasWaitlist: hasWaitlist ?? false,
        scheduleType: scheduleType ?? "one_time",
        requirements: requirements ?? null,
        requiresAcknowledgement: requiresAcknowledgement ?? false,
        tags: tags ?? [],
        amenities: amenities ?? [],
        imageUrl: imageUrl ?? null,
        isPublished: true,
      })
      .returning();

    // auto-upgrade user to spot_host if they're a customer
    const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
    if (user?.role === "customer") {
      await db.update(usersTable).set({ role: "spot_host" }).where(eq(usersTable.id, userId));
    }

    // insert schedules
    if (schedules.length > 0) {
      await db.insert(spotListingSchedulesTable).values(
        schedules.map((s: any) => ({
          listingId: listing.id,
          date: s.date ?? null,
          dayOfWeek: s.dayOfWeek ?? null,
          startTime: s.startTime ?? null,
          endTime: s.endTime ?? null,
        }))
      );
    }

    res.status(201).json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create listing" });
  }
});

// ── AUTH: update a listing (host only) ─────────────────────────────────────
router.put("/spots/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [existing] = await db.select().from(spotListingsTable).where(eq(spotListingsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.hostUserId !== userId) return res.status(403).json({ error: "Forbidden" });

    const allowed = [
      "title","description","hostName","address","city","latitude","longitude",
      "spotType","spotsTotal","spotsAvailable","priceInCents","isInstantBook",
      "hasWaitlist","scheduleType","requirements","requiresAcknowledgement",
      "tags","amenities","imageUrl","isPublished","isActive",
    ] as const;

    const updates: Record<string, any> = { updatedAt: new Date() };
    for (const key of allowed) {
      if (key in req.body) updates[key] = req.body[key];
    }

    const [updated] = await db.update(spotListingsTable).set(updates).where(eq(spotListingsTable.id, id)).returning();

    // replace schedules if provided
    if (req.body.schedules) {
      await db.delete(spotListingSchedulesTable).where(eq(spotListingSchedulesTable.listingId, id));
      if (req.body.schedules.length > 0) {
        await db.insert(spotListingSchedulesTable).values(
          req.body.schedules.map((s: any) => ({
            listingId: id,
            date: s.date ?? null,
            dayOfWeek: s.dayOfWeek ?? null,
            startTime: s.startTime ?? null,
            endTime: s.endTime ?? null,
          }))
        );
      }
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update listing" });
  }
});

// ── AUTH: delete / deactivate a listing ────────────────────────────────────
router.delete("/spots/:id", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userRole = (req as any).user.role;
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [existing] = await db.select().from(spotListingsTable).where(eq(spotListingsTable.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.hostUserId !== userId && !["admin","superadmin"].includes(userRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.update(spotListingsTable).set({ isActive: false }).where(eq(spotListingsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete listing" });
  }
});

// ── AUTH: vendor apply for a spot ──────────────────────────────────────────
router.post("/spots/:id/apply", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) return res.status(400).json({ error: "Invalid id" });

    const [listing] = await db
      .select()
      .from(spotListingsTable)
      .where(and(eq(spotListingsTable.id, listingId), eq(spotListingsTable.isActive, true)));
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    // check no duplicate pending application
    const [existing] = await db
      .select()
      .from(spotListingApplicationsTable)
      .where(
        and(
          eq(spotListingApplicationsTable.listingId, listingId),
          eq(spotListingApplicationsTable.vendorUserId, userId),
          or(
            eq(spotListingApplicationsTable.status, "pending"),
            eq(spotListingApplicationsTable.status, "approved")
          )
        )
      );
    if (existing) return res.status(409).json({ error: "Already applied" });

    // get vendor's truck (first active truck)
    const [truck] = await db
      .select({ id: trucksTable.id })
      .from(trucksTable)
      .where(and(eq(trucksTable.userId, userId), eq(trucksTable.isApproved, true)))
      .limit(1);

    const { notes } = req.body;

    const initialStatus = listing.isInstantBook ? "approved" : "pending";

    const [application] = await db
      .insert(spotListingApplicationsTable)
      .values({
        listingId,
        truckId: truck?.id ?? null,
        vendorUserId: userId,
        status: initialStatus,
        notes: notes ?? null,
      })
      .returning();

    // decrement spots if instant book
    if (listing.isInstantBook && listing.spotsAvailable > 0) {
      await db
        .update(spotListingsTable)
        .set({ spotsAvailable: listing.spotsAvailable - 1 })
        .where(eq(spotListingsTable.id, listingId));
    }

    res.status(201).json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to apply" });
  }
});

// ── AUTH: vendor join waitlist ──────────────────────────────────────────────
router.post("/spots/:id/waitlist", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) return res.status(400).json({ error: "Invalid id" });

    const [listing] = await db
      .select()
      .from(spotListingsTable)
      .where(and(eq(spotListingsTable.id, listingId), eq(spotListingsTable.isActive, true)));
    if (!listing) return res.status(404).json({ error: "Listing not found" });

    const [existing] = await db
      .select()
      .from(spotListingWaitlistTable)
      .where(
        and(
          eq(spotListingWaitlistTable.listingId, listingId),
          eq(spotListingWaitlistTable.vendorUserId, userId)
        )
      );
    if (existing) return res.status(409).json({ error: "Already on waitlist" });

    const [truck] = await db
      .select({ id: trucksTable.id })
      .from(trucksTable)
      .where(and(eq(trucksTable.userId, userId), eq(trucksTable.isApproved, true)))
      .limit(1);

    const [entry] = await db
      .insert(spotListingWaitlistTable)
      .values({
        listingId,
        truckId: truck?.id ?? null,
        vendorUserId: userId,
        notes: req.body.notes ?? null,
      })
      .returning();

    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ error: "Failed to join waitlist" });
  }
});

// ── AUTH: vendor - get my applications ─────────────────────────────────────
router.get("/vendor/spot-applications", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const applications = await db
      .select({
        id: spotListingApplicationsTable.id,
        listingId: spotListingApplicationsTable.listingId,
        status: spotListingApplicationsTable.status,
        notes: spotListingApplicationsTable.notes,
        hostMessage: spotListingApplicationsTable.hostMessage,
        createdAt: spotListingApplicationsTable.createdAt,
        listing: {
          title: spotListingsTable.title,
          address: spotListingsTable.address,
          city: spotListingsTable.city,
          spotType: spotListingsTable.spotType,
          priceInCents: spotListingsTable.priceInCents,
        },
      })
      .from(spotListingApplicationsTable)
      .leftJoin(spotListingsTable, eq(spotListingApplicationsTable.listingId, spotListingsTable.id))
      .where(eq(spotListingApplicationsTable.vendorUserId, userId))
      .orderBy(desc(spotListingApplicationsTable.createdAt));

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// ── AUTH: host - get my listings ────────────────────────────────────────────
router.get("/host/spots", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;

    const listings = await db
      .select()
      .from(spotListingsTable)
      .where(and(eq(spotListingsTable.hostUserId, userId), eq(spotListingsTable.isActive, true)))
      .orderBy(desc(spotListingsTable.createdAt));

    const scheduleMap = await attachSchedules(listings.map(l => l.id));
    const result = listings.map(l => ({ ...l, schedules: scheduleMap[l.id] ?? [] }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch host listings" });
  }
});

// ── AUTH: host - get applications for a listing ─────────────────────────────
router.get("/host/spots/:id/applications", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) return res.status(400).json({ error: "Invalid id" });

    const [listing] = await db
      .select({ hostUserId: spotListingsTable.hostUserId })
      .from(spotListingsTable)
      .where(eq(spotListingsTable.id, listingId));
    if (!listing || listing.hostUserId !== userId) return res.status(403).json({ error: "Forbidden" });

    const applications = await db
      .select({
        id: spotListingApplicationsTable.id,
        status: spotListingApplicationsTable.status,
        notes: spotListingApplicationsTable.notes,
        hostMessage: spotListingApplicationsTable.hostMessage,
        createdAt: spotListingApplicationsTable.createdAt,
        vendorUserId: spotListingApplicationsTable.vendorUserId,
        truckId: spotListingApplicationsTable.truckId,
        vendor: { name: usersTable.name, email: usersTable.email },
        truck: { name: trucksTable.name, cuisine: trucksTable.cuisine },
      })
      .from(spotListingApplicationsTable)
      .leftJoin(usersTable, eq(spotListingApplicationsTable.vendorUserId, usersTable.id))
      .leftJoin(trucksTable, eq(spotListingApplicationsTable.truckId, trucksTable.id))
      .where(eq(spotListingApplicationsTable.listingId, listingId))
      .orderBy(desc(spotListingApplicationsTable.createdAt));

    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// ── AUTH: host - update application status ──────────────────────────────────
router.patch("/host/spots/applications/:applicationId", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const appId = parseInt(req.params.applicationId);
    if (isNaN(appId)) return res.status(400).json({ error: "Invalid id" });

    const [app] = await db
      .select()
      .from(spotListingApplicationsTable)
      .where(eq(spotListingApplicationsTable.id, appId));
    if (!app) return res.status(404).json({ error: "Not found" });

    const [listing] = await db
      .select({ hostUserId: spotListingsTable.hostUserId, spotsAvailable: spotListingsTable.spotsAvailable })
      .from(spotListingsTable)
      .where(eq(spotListingsTable.id, app.listingId));
    if (!listing || listing.hostUserId !== userId) return res.status(403).json({ error: "Forbidden" });

    const { status, hostMessage } = req.body;
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (hostMessage !== undefined) updates.hostMessage = hostMessage;

    const [updated] = await db
      .update(spotListingApplicationsTable)
      .set(updates)
      .where(eq(spotListingApplicationsTable.id, appId))
      .returning();

    // adjust available spots
    if (status === "approved" && app.status !== "approved" && listing.spotsAvailable > 0) {
      await db
        .update(spotListingsTable)
        .set({ spotsAvailable: listing.spotsAvailable - 1 })
        .where(eq(spotListingsTable.id, app.listingId));
    } else if (status === "rejected" && app.status === "approved") {
      await db
        .update(spotListingsTable)
        .set({ spotsAvailable: listing.spotsAvailable + 1 })
        .where(eq(spotListingsTable.id, app.listingId));
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update application" });
  }
});

// ── AUTH: host - get waitlist for a listing ─────────────────────────────────
router.get("/host/spots/:id/waitlist", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const listingId = parseInt(req.params.id);
    if (isNaN(listingId)) return res.status(400).json({ error: "Invalid id" });

    const [listing] = await db
      .select({ hostUserId: spotListingsTable.hostUserId })
      .from(spotListingsTable)
      .where(eq(spotListingsTable.id, listingId));
    if (!listing || listing.hostUserId !== userId) return res.status(403).json({ error: "Forbidden" });

    const entries = await db
      .select({
        id: spotListingWaitlistTable.id,
        status: spotListingWaitlistTable.status,
        notes: spotListingWaitlistTable.notes,
        createdAt: spotListingWaitlistTable.createdAt,
        vendor: { name: usersTable.name, email: usersTable.email },
        truck: { name: trucksTable.name, cuisine: trucksTable.cuisine },
      })
      .from(spotListingWaitlistTable)
      .leftJoin(usersTable, eq(spotListingWaitlistTable.vendorUserId, usersTable.id))
      .leftJoin(trucksTable, eq(spotListingWaitlistTable.truckId, trucksTable.id))
      .where(eq(spotListingWaitlistTable.listingId, listingId))
      .orderBy(asc(spotListingWaitlistTable.createdAt));

    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch waitlist" });
  }
});

export default router;
