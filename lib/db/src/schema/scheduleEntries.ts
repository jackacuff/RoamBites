import { pgTable, text, serial, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scheduleEntriesTable = pgTable("schedule_entries", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  title: text("title"),
  venueName: text("venue_name").notNull(),
  address: text("address"),
  city: text("city").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  startDateTime: timestamp("start_date_time", { withTimezone: true }).notNull(),
  endDateTime: timestamp("end_date_time", { withTimezone: true }).notNull(),
  isLive: boolean("is_live").notNull().default(false),
  isRecurring: boolean("is_recurring").notNull().default(false),
  notes: text("notes"),
});

export const insertScheduleEntrySchema = createInsertSchema(scheduleEntriesTable).omit({ id: true });
export type InsertScheduleEntry = z.infer<typeof insertScheduleEntrySchema>;
export type ScheduleEntry = typeof scheduleEntriesTable.$inferSelect;
