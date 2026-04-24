import { pgTable, serial, integer, real, timestamp, text, index } from "drizzle-orm/pg-core";

export const truckLocationHistoryTable = pgTable(
  "truck_location_history",
  {
    id: serial("id").primaryKey(),
    truckId: integer("truck_id").notNull(),
    liveStartedAt: timestamp("live_started_at", { withTimezone: true }),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    accuracyMeters: real("accuracy_meters"),
    headingDegrees: real("heading_degrees"),
    speedMps: real("speed_mps"),
    source: text("source").notNull().default("gps"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    truckRecordedIdx: index("truck_loc_hist_truck_recorded_idx").on(t.truckId, t.recordedAt),
  }),
);

export type TruckLocationHistory = typeof truckLocationHistoryTable.$inferSelect;
export type InsertTruckLocationHistory = typeof truckLocationHistoryTable.$inferInsert;
