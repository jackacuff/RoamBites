import {
  pgTable, text, serial, timestamp, boolean, integer, real, jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { trucksTable } from "./trucks";

export const spotListingsTable = pgTable("spot_listings", {
  id: serial("id").primaryKey(),
  hostUserId: integer("host_user_id").notNull().references(() => usersTable.id),
  title: text("title").notNull(),
  description: text("description"),
  hostName: text("host_name"),
  address: text("address"),
  city: text("city").notNull().default("Oklahoma City"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  spotType: text("spot_type").notNull().default("single_spot"),
  spotsTotal: integer("spots_total").notNull().default(1),
  spotsAvailable: integer("spots_available").notNull().default(1),
  priceInCents: integer("price_in_cents").notNull().default(0),
  isInstantBook: boolean("is_instant_book").notNull().default(false),
  hasWaitlist: boolean("has_waitlist").notNull().default(false),
  scheduleType: text("schedule_type").notNull().default("one_time"),
  requirements: text("requirements"),
  requiresAcknowledgement: boolean("requires_acknowledgement").notNull().default(false),
  tags: jsonb("tags").$type<string[]>().default([]),
  amenities: jsonb("amenities").$type<string[]>().default([]),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spotListingSchedulesTable = pgTable("spot_listing_schedules", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => spotListingsTable.id, { onDelete: "cascade" }),
  date: text("date"),
  dayOfWeek: integer("day_of_week"),
  startTime: text("start_time"),
  endTime: text("end_time"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spotListingApplicationsTable = pgTable("spot_listing_applications", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => spotListingsTable.id, { onDelete: "cascade" }),
  truckId: integer("truck_id").references(() => trucksTable.id),
  vendorUserId: integer("vendor_user_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("pending_host_approval"),
  notes: text("notes"),
  hostMessage: text("host_message"),
  paymentStatus: text("payment_status").default("unpaid"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const spotListingWaitlistTable = pgTable("spot_listing_waitlist", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => spotListingsTable.id, { onDelete: "cascade" }),
  truckId: integer("truck_id").references(() => trucksTable.id),
  vendorUserId: integer("vendor_user_id").notNull().references(() => usersTable.id),
  status: text("status").notNull().default("waiting"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SpotListing = typeof spotListingsTable.$inferSelect;
export type InsertSpotListing = typeof spotListingsTable.$inferInsert;
export type SpotListingSchedule = typeof spotListingSchedulesTable.$inferSelect;
export type SpotListingApplication = typeof spotListingApplicationsTable.$inferSelect;
export type SpotListingWaitlist = typeof spotListingWaitlistTable.$inferSelect;
