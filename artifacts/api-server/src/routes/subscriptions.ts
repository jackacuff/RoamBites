import { Router, type IRouter } from "express";
import { db, plansTable, vendorSubscriptionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { getUncachableStripeClient } from "../lib/stripeClient";

// ── Public: list active plans ─────────────────────────────────────────────
const publicRouter = Router();
publicRouter.get("/plans", async (_req, res): Promise<void> => {
  try {
    const plans = await db.select().from(plansTable).where(eq(plansTable.isActive, true));
    res.json(plans);
  } catch {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});
export { publicRouter as publicPlansRouter };

const router: IRouter = Router();

router.get("/vendor/subscription", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;

  const [sub] = await db
    .select({
      id: vendorSubscriptionsTable.id,
      status: vendorSubscriptionsTable.status,
      trialEndsAt: vendorSubscriptionsTable.trialEndsAt,
      currentPeriodEnd: vendorSubscriptionsTable.currentPeriodEnd,
      stripeCustomerId: vendorSubscriptionsTable.stripeCustomerId,
      stripeSubscriptionId: vendorSubscriptionsTable.stripeSubscriptionId,
      canceledAt: vendorSubscriptionsTable.canceledAt,
      createdAt: vendorSubscriptionsTable.createdAt,
      planId: plansTable.id,
      planName: plansTable.name,
      planDescription: plansTable.description,
      monthlyPrice: plansTable.monthlyPrice,
      trialDays: plansTable.trialDays,
      features: plansTable.features,
      stripePriceId: plansTable.stripePriceId,
    })
    .from(vendorSubscriptionsTable)
    .innerJoin(plansTable, eq(vendorSubscriptionsTable.planId, plansTable.id))
    .where(eq(vendorSubscriptionsTable.vendorUserId, userId));

  if (!sub) {
    res.json(null);
    return;
  }

  const now = new Date();
  let computedStatus = sub.status;
  if (computedStatus === "trialing" && sub.trialEndsAt && sub.trialEndsAt < now) {
    computedStatus = "past_due";
    await db
      .update(vendorSubscriptionsTable)
      .set({ status: "past_due" })
      .where(eq(vendorSubscriptionsTable.id, sub.id));
  }

  const trialDaysLeft =
    sub.trialEndsAt && computedStatus === "trialing"
      ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - now.getTime()) / 86400000))
      : null;

  res.json({
    ...sub,
    status: computedStatus,
    trialDaysLeft,
  });
});

router.post("/vendor/subscription/portal", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const [sub] = await db
    .select()
    .from(vendorSubscriptionsTable)
    .where(eq(vendorSubscriptionsTable.vendorUserId, userId));

  if (!sub?.stripeCustomerId) {
    res.status(400).json({ error: "No Stripe customer found. Subscribe first." });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${req.headers.origin ?? "https://roambites.com"}/vendor/dashboard`,
    });
    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/vendor/subscription/subscribe", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const body = req.body as { successUrl?: string; cancelUrl?: string };

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [sub] = await db
    .select({ id: vendorSubscriptionsTable.id, planId: vendorSubscriptionsTable.planId, stripeCustomerId: vendorSubscriptionsTable.stripeCustomerId })
    .from(vendorSubscriptionsTable)
    .where(eq(vendorSubscriptionsTable.vendorUserId, userId));

  const [plan] = await db
    .select()
    .from(plansTable)
    .where(eq(plansTable.id, sub?.planId ?? 0));

  if (!plan?.stripePriceId) {
    res.status(400).json({ error: "This plan does not have a Stripe price configured yet. Contact an admin." });
    return;
  }

  try {
    const stripe = await getUncachableStripeClient();

    let customerId = sub?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name });
      customerId = customer.id;
      if (sub) {
        await db.update(vendorSubscriptionsTable).set({ stripeCustomerId: customerId }).where(eq(vendorSubscriptionsTable.id, sub.id));
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: body.successUrl ?? `${req.headers.origin ?? ""}/vendor/dashboard?subscribed=1`,
      cancel_url: body.cancelUrl ?? `${req.headers.origin ?? ""}/vendor/dashboard`,
      metadata: { vendorUserId: String(userId) },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
