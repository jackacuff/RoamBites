import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const socialPostsTable = pgTable("social_posts", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  templateType: text("template_type").notNull(),
  caption: text("caption").notNull(),
  platform: text("platform"),
  status: text("status").notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SocialPost = typeof socialPostsTable.$inferSelect;
