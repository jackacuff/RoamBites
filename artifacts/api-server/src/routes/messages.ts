import { Router, type IRouter } from "express";
import { db, messagesTable, trucksTable, usersTable, eventsTable, spotListingApplicationsTable, spotListingsTable } from "@workspace/db";
import { eq, and, or, desc, asc, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { sendNewMessageEmail } from "../lib/email";

const router: IRouter = Router();

router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(or(eq(messagesTable.toUserId, user.id), eq(messagesTable.fromUserId, user.id)))
    .orderBy(desc(messagesTable.createdAt));

  const fromIds = [...new Set(msgs.map(m => m.fromUserId))];
  const toIds = [...new Set(msgs.map(m => m.toUserId))];
  const userIds = [...new Set([...fromIds, ...toIds])];
  const truckIds = [...new Set(msgs.filter(m => m.truckId).map(m => m.truckId!))];
  const eventIds = [...new Set(msgs.filter(m => m.eventId).map(m => m.eventId!))];
  const appIds = [...new Set(msgs.filter(m => m.spotApplicationId).map(m => m.spotApplicationId!))];

  const [users, trucks, events, apps] = await Promise.all([
    userIds.length > 0 ? db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable) : [],
    truckIds.length > 0 ? db.select({ id: trucksTable.id, name: trucksTable.name }).from(trucksTable) : [],
    eventIds.length > 0 ? db.select({ id: eventsTable.id, name: eventsTable.name }).from(eventsTable) : [],
    appIds.length > 0 ? db.select({
      id: spotListingApplicationsTable.id,
      status: spotListingApplicationsTable.status,
      listingId: spotListingApplicationsTable.listingId,
      listingTitle: spotListingsTable.title,
    })
      .from(spotListingApplicationsTable)
      .leftJoin(spotListingsTable, eq(spotListingApplicationsTable.listingId, spotListingsTable.id))
      .where(inArray(spotListingApplicationsTable.id, appIds)) : [],
  ]);

  const userMap = new Map((users as any[]).map(u => [u.id, u]));
  const truckMap = new Map((trucks as any[]).map(t => [t.id, t]));
  const eventMap = new Map((events as any[]).map(e => [e.id, e]));
  const appMap = new Map((apps as any[]).map(a => [a.id, a]));

  const enriched = msgs.map(m => ({
    ...m,
    fromUser: userMap.get(m.fromUserId) || null,
    toUser: userMap.get(m.toUserId) || null,
    truck: m.truckId ? truckMap.get(m.truckId) || null : null,
    event: m.eventId ? eventMap.get(m.eventId) || null : null,
    spotApplication: m.spotApplicationId ? appMap.get(m.spotApplicationId) || null : null,
  }));

  res.json(enriched);
});

router.get("/messages/unread-count", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.toUserId, user.id), eq(messagesTable.isRead, false)));
  res.json({ count: msgs.length });
});

router.post("/messages", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const { toUserId, truckId, eventId, spotApplicationId, subject, body, type } = req.body;
  if (!toUserId || !body) {
    res.status(400).json({ error: "toUserId and body are required" });
    return;
  }
  const [msg] = await db.insert(messagesTable).values({
    fromUserId: user.id,
    toUserId: parseInt(toUserId),
    truckId: truckId ? parseInt(truckId) : null,
    eventId: eventId ? parseInt(eventId) : null,
    spotApplicationId: spotApplicationId ? parseInt(spotApplicationId) : null,
    subject: subject || null,
    body,
    type: type || "message",
  }).returning();

  // send email notification to recipient (fire-and-forget)
  try {
    const [recipient] = await db
      .select({ name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, parseInt(toUserId)));
    if (recipient?.email) {
      let context: string | undefined;
      if (spotApplicationId) {
        const [app] = await db
          .select({ listingTitle: spotListingsTable.title })
          .from(spotListingApplicationsTable)
          .leftJoin(spotListingsTable, eq(spotListingApplicationsTable.listingId, spotListingsTable.id))
          .where(eq(spotListingApplicationsTable.id, parseInt(spotApplicationId)));
        if (app?.listingTitle) context = `Re: Spot Request — ${app.listingTitle}`;
      }
      sendNewMessageEmail({
        toEmail: recipient.email,
        toName: recipient.name,
        fromName: user.name,
        subject: subject || undefined,
        preview: body,
        context,
      });
    }
  } catch { /* non-critical */ }

  res.status(201).json(msg);
});

router.put("/messages/:id/read", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const id = parseInt(req.params.id);
  await db.update(messagesTable)
    .set({ isRead: true })
    .where(and(eq(messagesTable.id, id), eq(messagesTable.toUserId, user.id)));
  res.json({ ok: true });
});

router.put("/messages/read-all", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  await db.update(messagesTable)
    .set({ isRead: true })
    .where(eq(messagesTable.toUserId, user.id));
  res.json({ ok: true });
});

// ── Conversation threads list ─────────────────────────────────────────────────
// Groups all messages into threads by spotApplicationId (or participant pair
// for non-application messages like event invitations).
router.get("/messages/threads", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = (req as any).user;

    const msgs = await db
      .select()
      .from(messagesTable)
      .where(or(eq(messagesTable.toUserId, user.id), eq(messagesTable.fromUserId, user.id)))
      .orderBy(desc(messagesTable.createdAt));

    // Group messages into threads
    const threadMap = new Map<string, typeof msgs>();
    for (const msg of msgs) {
      const key = msg.spotApplicationId
        ? `app:${msg.spotApplicationId}`
        : `pair:${Math.min(msg.fromUserId, msg.toUserId)}-${Math.max(msg.fromUserId, msg.toUserId)}-${msg.eventId ?? 0}`;
      if (!threadMap.has(key)) threadMap.set(key, []);
      threadMap.get(key)!.push(msg);
    }

    const allUserIds = [...new Set(msgs.flatMap(m => [m.fromUserId, m.toUserId]))];
    const appIds = [...new Set(msgs.filter(m => m.spotApplicationId).map(m => m.spotApplicationId!))];

    const [users, apps] = await Promise.all([
      allUserIds.length > 0
        ? db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
            .from(usersTable)
            .where(inArray(usersTable.id, allUserIds))
        : Promise.resolve([]),
      appIds.length > 0
        ? db.select({
            id: spotListingApplicationsTable.id,
            status: spotListingApplicationsTable.status,
            vendorUserId: spotListingApplicationsTable.vendorUserId,
            listingId: spotListingApplicationsTable.listingId,
            listingTitle: spotListingsTable.title,
            hostUserId: spotListingsTable.hostUserId,
          })
            .from(spotListingApplicationsTable)
            .leftJoin(spotListingsTable, eq(spotListingApplicationsTable.listingId, spotListingsTable.id))
            .where(inArray(spotListingApplicationsTable.id, appIds))
        : Promise.resolve([]),
    ]);

    const userMap = new Map((users as any[]).map(u => [u.id, u]));
    const appMap = new Map((apps as any[]).map(a => [a.id, a]));

    const threads = [];
    for (const [key, threadMsgs] of threadMap.entries()) {
      const latest = threadMsgs[0];
      const unreadCount = threadMsgs.filter(m => m.toUserId === user.id && !m.isRead).length;

      let appInfo: any = null;
      if (latest.spotApplicationId) {
        appInfo = appMap.get(latest.spotApplicationId) || null;
      }

      // Determine the other user
      const otherUserId = appInfo
        ? (appInfo.vendorUserId === user.id ? appInfo.hostUserId : appInfo.vendorUserId)
        : (latest.fromUserId === user.id ? latest.toUserId : latest.fromUserId);

      threads.push({
        key,
        applicationId: latest.spotApplicationId || null,
        listingId: appInfo?.listingId || null,
        listingTitle: appInfo?.listingTitle || null,
        applicationStatus: appInfo?.status || null,
        otherUser: userMap.get(otherUserId) || null,
        lastMessage: {
          body: latest.body,
          createdAt: latest.createdAt,
          fromUserId: latest.fromUserId,
        },
        unreadCount,
        messageCount: threadMsgs.length,
        type: latest.type,
        eventId: latest.eventId || null,
      });
    }

    res.json(threads);
  } catch (err) {
    res.status(500).json({ error: "Failed to load threads" });
  }
});

// ── Single thread view ────────────────────────────────────────────────────────
// Returns all messages for a spot application thread, chronological, with
// application status and participant info.
router.get("/messages/thread/:applicationId", requireAuth, async (req, res): Promise<void> => {
  try {
    const user = (req as any).user;
    const applicationId = parseInt(req.params.applicationId);
    if (isNaN(applicationId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [app] = await db
      .select({
        id: spotListingApplicationsTable.id,
        status: spotListingApplicationsTable.status,
        notes: spotListingApplicationsTable.notes,
        hostMessage: spotListingApplicationsTable.hostMessage,
        vendorUserId: spotListingApplicationsTable.vendorUserId,
        createdAt: spotListingApplicationsTable.createdAt,
        confirmedAt: spotListingApplicationsTable.confirmedAt,
        listingId: spotListingApplicationsTable.listingId,
        listingTitle: spotListingsTable.title,
        listingSpotType: spotListingsTable.spotType,
        hostUserId: spotListingsTable.hostUserId,
      })
      .from(spotListingApplicationsTable)
      .leftJoin(spotListingsTable, eq(spotListingApplicationsTable.listingId, spotListingsTable.id))
      .where(eq(spotListingApplicationsTable.id, applicationId));

    if (!app) { res.status(404).json({ error: "Thread not found" }); return; }

    // Verify caller is a participant
    if (app.vendorUserId !== user.id && app.hostUserId !== user.id) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.spotApplicationId, applicationId))
      .orderBy(asc(messagesTable.createdAt));

    // Mark messages addressed to this user as read
    await db.update(messagesTable)
      .set({ isRead: true })
      .where(and(
        eq(messagesTable.spotApplicationId, applicationId),
        eq(messagesTable.toUserId, user.id),
        eq(messagesTable.isRead, false),
      ));

    const userIds = [...new Set(msgs.flatMap(m => [m.fromUserId, m.toUserId]))];
    const participantIds = [app.vendorUserId, app.hostUserId].filter(Boolean) as number[];
    const allIds = [...new Set([...userIds, ...participantIds])];

    const users = allIds.length > 0
      ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
          .from(usersTable)
          .where(inArray(usersTable.id, allIds))
      : [];

    const userMap = new Map((users as any[]).map(u => [u.id, u]));

    const enriched = msgs.map(m => ({
      ...m,
      fromUser: userMap.get(m.fromUserId) || null,
      toUser: userMap.get(m.toUserId) || null,
    }));

    const otherUserId = app.vendorUserId === user.id ? app.hostUserId : app.vendorUserId;

    res.json({
      application: app,
      otherUser: userMap.get(otherUserId!) || null,
      currentUser: userMap.get(user.id) || null,
      messages: enriched,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load thread" });
  }
});

export default router;
