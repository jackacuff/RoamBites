import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reservationRequestsTable = pgTable("reservation_requests", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  eventDate: text("event_date").notNull(),
  eventLocation: text("event_location").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReservationRequestSchema = createInsertSchema(reservationRequestsTable).omit({ id: true, createdAt: true });
export type InsertReservationRequest = z.infer<typeof insertReservationRequestSchema>;
export type ReservationRequest = typeof reservationRequestsTable.$inferSelect;
