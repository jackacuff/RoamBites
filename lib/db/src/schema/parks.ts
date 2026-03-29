import { pgTable, text, serial, timestamp, boolean, integer, real, jsonb } from "drizzle-orm/pg-core";

export const truckParksTable = pgTable("truck_parks", {
  id: serial("id").primaryKey(),
  hostUserId: integer("host_user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  latitude: real("latitude"),
  longitude: real("longitude"),
  website: text("website"),
  phone: text("phone"),
  imageUrl: text("image_url"),
  amenities: jsonb("amenities").$type<string[]>().default([]),
  maxTrucks: integer("max_trucks"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const parkVacanciesTable = pgTable("park_vacancies", {
  id: serial("id").primaryKey(),
  parkId: integer("park_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  spotsAvailable: integer("spots_available").notNull().default(1),
  startDate: text("start_date"),
  endDate: text("end_date"),
  dailyRate: real("daily_rate"),
  weeklyRate: real("weekly_rate"),
  monthlyRate: real("monthly_rate"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TruckPark = typeof truckParksTable.$inferSelect;
export type InsertTruckPark = typeof truckParksTable.$inferInsert;
export type ParkVacancy = typeof parkVacanciesTable.$inferSelect;
export type InsertParkVacancy = typeof parkVacanciesTable.$inferInsert;
