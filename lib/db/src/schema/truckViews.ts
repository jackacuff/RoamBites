import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const truckViewsTable = pgTable("truck_views", {
  id: serial("id").primaryKey(),
  truckId: integer("truck_id").notNull(),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TruckView = typeof truckViewsTable.$inferSelect;
