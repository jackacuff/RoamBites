import app from "./app";
import { logger } from "./lib/logger";
import { seedIfEmpty } from "./lib/seed";
import { startExpireStaleShiftsJob } from "./jobs/expireStaleShifts";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  try {
    const { runMigrations } = await import("stripe-replit-sync");
    const databaseUrl = process.env["DATABASE_URL"];
    if (!databaseUrl) throw new Error("DATABASE_URL required");

    await runMigrations({ databaseUrl, schema: "stripe" });
    logger.info("Stripe schema ready");

    const { getStripeSync } = await import("./lib/stripeClient");
    const stripeSync = await getStripeSync();

    const domains = process.env["REPLIT_DOMAINS"]?.split(",")[0];
    if (domains) {
      const webhookUrl = `https://${domains}/api/stripe/webhook`;
      try {
        await stripeSync.findOrCreateManagedWebhook(webhookUrl);
        logger.info({ webhookUrl }, "Stripe webhook configured");
      } catch (webhookErr: any) {
        logger.warn({ err: webhookErr }, "Stripe webhook setup failed (non-fatal) — will retry on next restart");
      }
    }

    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe data synced"))
      .catch((err: any) => logger.warn({ err }, "Stripe syncBackfill error (non-fatal)"));
  } catch (err: any) {
    logger.warn({ err }, "Stripe init skipped (not connected or error)");
  }
}

await seedIfEmpty();
await initStripe();

if (process.env["FEATURE_LIVE_TRACKING"] !== "false") {
  startExpireStaleShiftsJob();
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
