import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventTrucksTable = pgTable("event_trucks", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  truckId: integer("truck_id").notNull(),
  status: text("status").notNull().default("invited"),
});

export const insertEventTruckSchema = createInsertSchema(eventTrucksTable).omit({ id: true });
export type InsertEventTruck = z.infer<typeof insertEventTruckSchema>;
export type EventTruck = typeof eventTrucksTable.$inferSelect;
