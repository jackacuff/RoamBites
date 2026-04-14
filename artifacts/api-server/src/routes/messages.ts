import { Router, type IRouter } from "express";
import { db, messagesTable, trucksTable, usersTable, eventsTable, spotListingApplicationsTable, spotListingsTable } from "@workspace/db";
import { eq, and, or, desc, inArray } from "drizzle-orm";
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

export default router;
