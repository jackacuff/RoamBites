import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromUserId: integer("from_user_id").notNull(),
  toUserId: integer("to_user_id").notNull(),
  truckId: integer("truck_id"),
  eventId: integer("event_id"),
  spotApplicationId: integer("spot_application_id"),
  subject: text("subject"),
  body: text("body").notNull(),
  type: text("type").notNull().default("message"),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
