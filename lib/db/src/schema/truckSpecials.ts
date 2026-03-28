import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";

export const truckSpecialsTable = pgTable("truck_specials", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  title: text("title").notNull(),
  body: text("body"),
  type: text("type").notNull().default("announcement"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TruckSpecial = typeof truckSpecialsTable.$inferSelect;
