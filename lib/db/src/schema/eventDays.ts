import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const eventDaysTable = pgTable("event_days", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  date: text("date").notNull(),            // "2025-05-15"
  startTime: text("start_time").notNull(), // "16:00"
  endTime: text("end_time").notNull(),     // "22:00"
  label: text("label"),                    // optional: "Day 1", "Friday", etc.
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EventDay = typeof eventDaysTable.$inferSelect;
export type InsertEventDay = typeof eventDaysTable.$inferInsert;
