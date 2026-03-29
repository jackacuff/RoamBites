import Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient";
import postgres from "postgres";

interface PlanConfig {
  name: string;
  description: string;
  price: number;
}

const PLANS: PlanConfig[] = [
  { name: "Vendor Base", description: "Essential tools for your food truck on RoamBites", price: 1499 },
  { name: "Vendor Pro", description: "Full access to RoamBites with featured placement and marketing tools", price: 2999 },
];

async function seedStripeProducts() {
  console.log("Creating Stripe products for RoamBites vendor plans...");
  const stripe = await getUncachableStripeClient();
  const sql = postgres(process.env["DATABASE_URL"]!);

  for (const plan of PLANS) {
    console.log(`\nProcessing "${plan.name}"...`);

    const existing = await stripe.products.search({
      query: `name:'${plan.name}' AND active:'true'`,
    });

    let priceId: string;

    if (existing.data.length > 0) {
      console.log(`  Product already exists: ${existing.data[0].id}`);
      const prices = await stripe.prices.list({ product: existing.data[0].id, active: true });
      const monthly = prices.data.find((p) => p.recurring?.interval === "month");
      if (!monthly) {
        const price = await stripe.prices.create({
          product: existing.data[0].id,
          unit_amount: plan.price,
          currency: "usd",
          recurring: { interval: "month" },
        });
        priceId = price.id;
        console.log(`  Created new price: ${priceId} ($${(plan.price / 100).toFixed(2)}/mo)`);
      } else {
        priceId = monthly.id;
        console.log(`  Using existing price: ${priceId}`);
      }
    } else {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
      });
      console.log(`  Created product: ${product.id}`);

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.price,
        currency: "usd",
        recurring: { interval: "month" },
      });
      priceId = price.id;
      console.log(`  Created price: ${priceId} ($${(plan.price / 100).toFixed(2)}/mo)`);
    }

    const plans = await sql`SELECT id FROM plans WHERE name = ${plan.name} LIMIT 1`;
    if (plans.length > 0) {
      await sql`UPDATE plans SET stripe_price_id = ${priceId} WHERE name = ${plan.name}`;
      console.log(`  Updated DB plan "${plan.name}" with stripe_price_id: ${priceId}`);
    } else {
      console.warn(`  WARNING: No DB plan found with name "${plan.name}"`);
    }
  }

  await sql.end();
  console.log("\nAll done!");
}

seedStripeProducts().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
