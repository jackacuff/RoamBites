import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const eventSpotReservationsTable = pgTable("event_spot_reservations", {
  id: serial("id").primaryKey(),
  spotId: integer("spot_id").notNull(),
  eventId: integer("event_id").notNull(),
  truckId: integer("truck_id").notNull(),
  status: text("status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  paymentAmountInCents: integer("payment_amount_in_cents").notNull().default(0),
  notes: text("notes"),
  organizerMessage: text("organizer_message"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EventSpotReservation = typeof eventSpotReservationsTable.$inferSelect;
