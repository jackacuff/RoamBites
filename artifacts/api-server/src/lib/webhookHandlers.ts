import { getStripeSync, getUncachableStripeClient } from "./stripeClient";
import { db, eventSpotReservationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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
      const stripe = await getUncachableStripeClient();
      const rawEvent = JSON.parse(payload.toString());

      if (rawEvent?.type === "checkout.session.completed") {
        const session = rawEvent.data?.object;
        if (session?.metadata?.type === "spot_payment" && session?.metadata?.reservationId) {
          const reservationId = parseInt(session.metadata.reservationId, 10);
          const paymentIntentId = typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;

          await db.update(eventSpotReservationsTable)
            .set({
              paymentStatus: "paid",
              stripePaymentIntentId: paymentIntentId,
              updatedAt: new Date(),
            })
            .where(eq(eventSpotReservationsTable.id, reservationId));
        }
      }
    } catch {
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
}
