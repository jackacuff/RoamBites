import Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";
import postgres from "postgres";

async function seedStripeProducts() {
  console.log("Creating Stripe products for RoamBites vendor plans...");
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({
    query: "name:'Vendor Pro' AND active:'true'",
  });

  let priceId: string;

  if (existingProducts.data.length > 0) {
    console.log("Vendor Pro product already exists in Stripe.");
    const prices = await stripe.prices.list({
      product: existingProducts.data[0].id,
      active: true,
    });
    const monthlyPrice = prices.data.find((p) => p.recurring?.interval === "month");
    if (!monthlyPrice) {
      throw new Error("No monthly price found for existing Vendor Pro product");
    }
    priceId = monthlyPrice.id;
    console.log(`Using existing price: ${priceId}`);
  } else {
    const product = await stripe.products.create({
      name: "Vendor Pro",
      description: "Full access to the RoamBites vendor platform",
    });
    console.log(`Created Stripe product: ${product.id}`);

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 2999,
      currency: "usd",
      recurring: { interval: "month" },
    });
    priceId = price.id;
    console.log(`Created Stripe price: ${priceId} ($29.99/month)`);
  }

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  const sql = postgres(databaseUrl);
  const plans = await sql`SELECT id FROM plans WHERE name = 'Vendor Pro' LIMIT 1`;
  if (plans.length > 0) {
    await sql`UPDATE plans SET stripe_price_id = ${priceId} WHERE name = 'Vendor Pro'`;
    console.log(`Updated plan #${plans[0].id} with stripePriceId: ${priceId}`);
  } else {
    console.warn('"Vendor Pro" plan not found in DB — seed the app first');
  }
  await sql.end();

  console.log("Done!");
}

seedStripeProducts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
