import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../lib/auth";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router: IRouter = Router();

const BASE_URL = process.env["REPLIT_DEV_DOMAIN"]
  ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
  : "http://localhost:5173";

router.get("/organizer/connect/status", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const [me] = await db.select({
    stripeConnectAccountId: usersTable.stripeConnectAccountId,
    stripeConnectOnboardingComplete: usersTable.stripeConnectOnboardingComplete,
  }).from(usersTable).where(eq(usersTable.id, user.id));

  if (!me) { res.status(404).json({ error: "User not found" }); return; }

  if (!me.stripeConnectAccountId) {
    res.json({ connected: false, onboardingComplete: false, accountId: null });
    return;
  }

  const stripe = await getUncachableStripeClient();

  try {
    const account = await stripe.accounts.retrieve(me.stripeConnectAccountId);
    const onboardingComplete = account.details_submitted && account.charges_enabled;

    if (onboardingComplete && !me.stripeConnectOnboardingComplete) {
      await db.update(usersTable)
        .set({ stripeConnectOnboardingComplete: true })
        .where(eq(usersTable.id, user.id));
    }

    res.json({
      connected: true,
      onboardingComplete,
      accountId: me.stripeConnectAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch {
    res.json({ connected: false, onboardingComplete: false, accountId: null });
  }
});

router.post("/organizer/connect/onboard", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const stripe = await getUncachableStripeClient();

  const [me] = await db.select({
    stripeConnectAccountId: usersTable.stripeConnectAccountId,
    email: usersTable.email,
    name: usersTable.name,
  }).from(usersTable).where(eq(usersTable.id, user.id));

  if (!me) { res.status(404).json({ error: "User not found" }); return; }

  let accountId = me.stripeConnectAccountId;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: me.email,
      business_profile: { name: me.name },
      capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
    });
    accountId = account.id;
    await db.update(usersTable)
      .set({ stripeConnectAccountId: accountId, stripeConnectOnboardingComplete: false })
      .where(eq(usersTable.id, user.id));
  }

  const returnUrl = `${BASE_URL}/organizer/connect/return`;
  const refreshUrl = `${BASE_URL}/organizer/connect/refresh`;

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  res.json({ url: accountLink.url });
});

router.post("/organizer/connect/refresh", requireRole("organizer", "admin"), async (req, res): Promise<void> => {
  const user = (req as any).user;
  const stripe = await getUncachableStripeClient();

  const [me] = await db.select({ stripeConnectAccountId: usersTable.stripeConnectAccountId })
    .from(usersTable).where(eq(usersTable.id, user.id));

  if (!me?.stripeConnectAccountId) {
    res.status(400).json({ error: "No Stripe account to refresh" });
    return;
  }

  const returnUrl = `${BASE_URL}/organizer/connect/return`;
  const refreshUrl = `${BASE_URL}/organizer/connect/refresh`;

  const accountLink = await stripe.accountLinks.create({
    account: me.stripeConnectAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  res.json({ url: accountLink.url });
});

export default router;
