import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { db, eventSpotReservationsTable, vendorSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const STRIPE_STATUS_MAP: Record<string, string> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  canceled: "canceled",
  unpaid: "past_due",
  incomplete: "past_due",
  incomplete_expired: "canceled",
  paused: "past_due",
};

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
          "Received type: " + typeof payload + ". " +
          "This usually means express.json() parsed the body before reaching this handler. " +
          "FIX: Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    try {
      const rawEvent = JSON.parse(payload.toString());
      const eventType: string = rawEvent?.type ?? "";
      const obj = rawEvent?.data?.object;

      // ── Spot reservation payment ──────────────────────────────────────────
      if (
        eventType === "checkout.session.completed" &&
        obj?.metadata?.type === "spot_payment" &&
        obj?.metadata?.reservationId
      ) {
        const reservationId = parseInt(obj.metadata.reservationId, 10);
        const paymentIntentId = typeof obj.payment_intent === "string" ? obj.payment_intent : null;
        await db
          .update(eventSpotReservationsTable)
          .set({ paymentStatus: "paid", stripePaymentIntentId: paymentIntentId, updatedAt: new Date() })
          .where(eq(eventSpotReservationsTable.id, reservationId));
      }

      // ── Vendor subscription checkout completed ────────────────────────────
      if (
        eventType === "checkout.session.completed" &&
        obj?.mode === "subscription" &&
        obj?.metadata?.vendorUserId
      ) {
        const vendorUserId = parseInt(obj.metadata.vendorUserId, 10);
        const customerId = typeof obj.customer === "string" ? obj.customer : null;
        const subscriptionId = typeof obj.subscription === "string" ? obj.subscription : null;

        if (!isNaN(vendorUserId)) {
          const updates: Record<string, any> = { status: "active" };
          if (customerId) updates.stripeCustomerId = customerId;
          if (subscriptionId) updates.stripeSubscriptionId = subscriptionId;

          await db
            .update(vendorSubscriptionsTable)
            .set(updates)
            .where(eq(vendorSubscriptionsTable.vendorUserId, vendorUserId));
        }
      }

      // ── Vendor subscription updated (billing portal, renewal, etc.) ───────
      if (eventType === "customer.subscription.updated" && obj?.id) {
        const stripeSubId: string = obj.id;
        const newStatus = STRIPE_STATUS_MAP[obj.status as string] ?? "past_due";
        const periodEnd = obj.current_period_end
          ? new Date((obj.current_period_end as number) * 1000)
          : null;

        const updates: Record<string, any> = { status: newStatus };
        if (periodEnd) updates.currentPeriodEnd = periodEnd;
        if (newStatus === "canceled") updates.canceledAt = new Date();

        await db
          .update(vendorSubscriptionsTable)
          .set(updates)
          .where(eq(vendorSubscriptionsTable.stripeSubscriptionId, stripeSubId));
      }

      // ── Vendor subscription deleted / canceled ────────────────────────────
      if (eventType === "customer.subscription.deleted" && obj?.id) {
        const stripeSubId: string = obj.id;
        await db
          .update(vendorSubscriptionsTable)
          .set({ status: "canceled", canceledAt: new Date() })
          .where(eq(vendorSubscriptionsTable.stripeSubscriptionId, stripeSubId));
      }
    } catch {
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
}
