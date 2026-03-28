import { pgTable, text, serial, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trucksTable = pgTable("trucks", {
  id: serial("id").primaryKey(),
  vendorUserId: integer("vendor_user_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  cuisine: text("cuisine").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  phone: text("phone"),
  website: text("website"),
  isApproved: boolean("is_approved").notNull().default(false),
  isLive: boolean("is_live").notNull().default(false),
  logoUrl: text("logo_url"),
  coverImageUrl: text("cover_image_url"),
  isOpenForReservations: boolean("is_open_for_reservations").notNull().default(false),
  reservationEmail: text("reservation_email"),
  reservationPhone: text("reservation_phone"),
  reservationContactPreference: text("reservation_contact_preference").default("email"),
  reservationNotes: text("reservation_notes"),
  twitterHandle: text("twitter_handle"),
  instagramHandle: text("instagram_handle"),
  facebookUrl: text("facebook_url"),
  tiktokHandle: text("tiktok_handle"),
  youtubeUrl: text("youtube_url"),
  currentLatitude: real("current_latitude"),
  currentLongitude: real("current_longitude"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTruckSchema = createInsertSchema(trucksTable).omit({ id: true, createdAt: true });
export type InsertTruck = z.infer<typeof insertTruckSchema>;
export type Truck = typeof trucksTable.$inferSelect;
