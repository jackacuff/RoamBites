import { Router, type IRouter } from "express";
import { db, plansTable, vendorSubscriptionsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

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
  const STRIPE_SECRET = process.env["STRIPE_SECRET_KEY"];
  if (!STRIPE_SECRET) {
    res.status(503).json({ error: "Stripe is not configured. Please contact an admin." });
    return;
  }

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
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-11-20.acacia" });
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
  const STRIPE_SECRET = process.env["STRIPE_SECRET_KEY"];
  if (!STRIPE_SECRET) {
    res.status(503).json({ error: "Stripe is not configured. Please contact an admin." });
    return;
  }

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
    res.status(400).json({ error: "This plan does not have a Stripe price configured yet." });
    return;
  }

  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2024-11-20.acacia" });

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
