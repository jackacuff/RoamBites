import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const truckMediaTable = pgTable("truck_media", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  fileName: text("file_name").notNull(),
  altText: text("alt_text"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTruckMediaSchema = createInsertSchema(truckMediaTable).omit({ id: true, createdAt: true });
export type InsertTruckMedia = z.infer<typeof insertTruckMediaSchema>;
export type TruckMedia = typeof truckMediaTable.$inferSelect;
