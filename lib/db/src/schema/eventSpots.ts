import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const eventSpotsTable = pgTable("event_spots", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull(),
  name: text("name").notNull().default("Vendor Spot"),
  description: text("description"),
  totalSlots: integer("total_slots").notNull().default(1),
  priceInCents: integer("price_in_cents").notNull().default(0),
  platformFeeInCents: integer("platform_fee_in_cents").notNull().default(0),
  requirements: text("requirements"),
  vendorRules: text("vendor_rules"),
  isInstantBook: boolean("is_instant_book").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EventSpot = typeof eventSpotsTable.$inferSelect;
