import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const parkSpotApplicationsTable = pgTable("park_spot_applications", {
  id: serial("id").primaryKey(),
  parkId: integer("park_id").notNull(),
  vacancyId: integer("vacancy_id"),
  truckId: integer("truck_id").notNull(),
  vendorUserId: integer("vendor_user_id").notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  hostMessage: text("host_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const parkWaitlistEntriesTable = pgTable("park_waitlist_entries", {
  id: serial("id").primaryKey(),
  parkId: integer("park_id").notNull(),
  truckId: integer("truck_id").notNull(),
  vendorUserId: integer("vendor_user_id").notNull(),
  status: text("status").notNull().default("waiting"),
  notes: text("notes"),
  hostMessage: text("host_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ParkSpotApplication = typeof parkSpotApplicationsTable.$inferSelect;
export type InsertParkSpotApplication = typeof parkSpotApplicationsTable.$inferInsert;
export type ParkWaitlistEntry = typeof parkWaitlistEntriesTable.$inferSelect;
export type InsertParkWaitlistEntry = typeof parkWaitlistEntriesTable.$inferInsert;
