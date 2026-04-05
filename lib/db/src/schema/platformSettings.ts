import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const platformSettingsTable = pgTable("platform_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PlatformSetting = typeof platformSettingsTable.$inferSelect;

// ── Default setting keys (used throughout the app) ─────────────────────────
export const SETTINGS_KEYS = {
  PUBLISH_FEE_CENTS:        "publish_fee_cents",        // e.g. "0" = free, "2000" = $20
  FEATURED_EVENT_FEE_CENTS: "featured_event_fee_cents", // e.g. "2900" = $29
  TRANSACTION_FEE_PERCENT:  "transaction_fee_percent",  // e.g. "10" = 10%
  HOMEPAGE_FEATURED_MAX:    "homepage_featured_max",     // e.g. "3"
} as const;

export const DEFAULT_SETTINGS: Record<string, string> = {
  [SETTINGS_KEYS.PUBLISH_FEE_CENTS]:        "0",
  [SETTINGS_KEYS.FEATURED_EVENT_FEE_CENTS]: "2900",
  [SETTINGS_KEYS.TRANSACTION_FEE_PERCENT]:  "10",
  [SETTINGS_KEYS.HOMEPAGE_FEATURED_MAX]:    "3",
};
