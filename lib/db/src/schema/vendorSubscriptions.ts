import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { plansTable } from "./plans";

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled" | "free";

export const vendorSubscriptionsTable = pgTable("vendor_subscriptions", {
  id: serial("id").primaryKey(),
  vendorUserId: integer("vendor_user_id").notNull().references(() => usersTable.id),
  planId: integer("plan_id").notNull().references(() => plansTable.id),
  status: text("status").notNull().default("trialing"),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VendorSubscription = typeof vendorSubscriptionsTable.$inferSelect;
export type InsertVendorSubscription = typeof vendorSubscriptionsTable.$inferInsert;
