import { Router, type IRouter } from "express";
import { db, messagesTable, trucksTable, usersTable, eventsTable } from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

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

  const [users, trucks, events] = await Promise.all([
    userIds.length > 0 ? db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role }).from(usersTable) : [],
    truckIds.length > 0 ? db.select({ id: trucksTable.id, name: trucksTable.name }).from(trucksTable) : [],
    eventIds.length > 0 ? db.select({ id: eventsTable.id, name: eventsTable.name }).from(eventsTable) : [],
  ]);

  const userMap = new Map((users as any[]).map(u => [u.id, u]));
  const truckMap = new Map((trucks as any[]).map(t => [t.id, t]));
  const eventMap = new Map((events as any[]).map(e => [e.id, e]));

  const enriched = msgs.map(m => ({
    ...m,
    fromUser: userMap.get(m.fromUserId) || null,
    toUser: userMap.get(m.toUserId) || null,
    truck: m.truckId ? truckMap.get(m.truckId) || null : null,
    event: m.eventId ? eventMap.get(m.eventId) || null : null,
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
  const { toUserId, truckId, eventId, subject, body, type } = req.body;
  if (!toUserId || !body) {
    res.status(400).json({ error: "toUserId and body are required" });
    return;
  }
  const [msg] = await db.insert(messagesTable).values({
    fromUserId: user.id,
    toUserId: parseInt(toUserId),
    truckId: truckId ? parseInt(truckId) : null,
    eventId: eventId ? parseInt(eventId) : null,
    subject: subject || null,
    body,
    type: type || "message",
  }).returning();
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
