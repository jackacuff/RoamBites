import { pgTable, serial, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationPreferencesTable = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  truckId: integer("truck_id").notNull(),
  notifyWhenOpen: boolean("notify_when_open").notNull().default(false),
  notifyWhenNearby: boolean("notify_when_nearby").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniq: unique().on(t.userId, t.truckId),
}));

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferencesTable).omit({ id: true, updatedAt: true });
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type NotificationPreference = typeof notificationPreferencesTable.$inferSelect;
