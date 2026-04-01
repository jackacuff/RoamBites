import { pgTable, text, serial, integer, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = pgTable("events", {
  id: serial("id").primaryKey(),
  organizerUserId: integer("organizer_user_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  venueName: text("venue_name").notNull(),
  address: text("address"),
  city: text("city").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  startDateTime: timestamp("start_date_time", { withTimezone: true }).notNull(),
  endDateTime: timestamp("end_date_time", { withTimezone: true }).notNull(),
  publicNotes: text("public_notes"),
  vendorNotes: text("vendor_notes"),
  isPublished: boolean("is_published").notNull().default(false),
  bannerImageUrl: text("banner_image_url"),
  websiteUrl: text("website_url"),
  isFeatured: boolean("is_featured").notNull().default(false),
  featuredUntil: timestamp("featured_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

  // Organizer questionnaire fields
  contactFirstName: text("contact_first_name"),
  contactLastName: text("contact_last_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  howHeardAboutUs: text("how_heard_about_us"),
  availableHookups: text("available_hookups"),        // "water_electric" | "water_only" | "electric_only" | "none" | "unknown"
  vendorFeeStructure: text("vendor_fee_structure"),   // "none" | "flat" | "percentage"
  spotFeeAmount: real("spot_fee_amount"),
  vendorPaymentMethod: text("vendor_payment_method"), // "attendees" | "organizer"
  expectedAttendance: integer("expected_attendance"),
  eventType: text("event_type"),                      // "public" | "private" | "both"
  notificationMethod: text("notification_method"),    // "list" | "application"
  additionalInfo: text("additional_info"),

  // Event photos (comma-separated URLs or JSON array stored as text)
  photoUrls: text("photo_urls"),
  thumbnailUrl: text("thumbnail_url"),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
