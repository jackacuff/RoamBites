import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, plansTable, vendorSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import { signToken, requireAuth } from "../lib/auth";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/mailer";

const router: IRouter = Router();

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, role } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = generateToken();

  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash,
    role,
    emailVerified: false,
    emailVerificationToken: verificationToken,
  }).returning();

  if (role === "vendor") {
    const [activePlan] = await db.select().from(plansTable).where(eq(plansTable.isActive, true));
    if (activePlan) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + activePlan.trialDays);
      await db.insert(vendorSubscriptionsTable).values({
        vendorUserId: user.id,
        planId: activePlan.id,
        status: "trialing",
        trialEndsAt,
      });
    }
  }

  const origin = (req.headers.origin as string | undefined) ?? undefined;
  try {
    await sendVerificationEmail(email, verificationToken, origin);
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }

  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  if (!user.isActive) {
    res.status(401).json({ error: "This account has been deactivated. Please contact support." });
    return;
  }

  const token = signToken({ id: user.id, role: user.role });
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).user.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    isPrivate: user.isPrivate,
    createdAt: user.createdAt,
    twitterHandle: user.twitterHandle,
    instagramHandle: user.instagramHandle,
    facebookUrl: user.facebookUrl,
  });
});

router.put("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).user.id;
  const { name, twitterHandle, instagramHandle, facebookUrl, isPrivate } = req.body;

  const updateData: any = {};
  if (name && typeof name === "string" && name.trim()) updateData.name = name.trim();
  if (twitterHandle !== undefined) updateData.twitterHandle = twitterHandle?.replace(/^@/, "") || null;
  if (instagramHandle !== undefined) updateData.instagramHandle = instagramHandle?.replace(/^@/, "") || null;
  if (facebookUrl !== undefined) updateData.facebookUrl = facebookUrl || null;
  if (typeof isPrivate === "boolean") updateData.isPrivate = isPrivate;

  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId)).returning();
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    isPrivate: user.isPrivate,
    createdAt: user.createdAt,
    twitterHandle: user.twitterHandle,
    instagramHandle: user.instagramHandle,
    facebookUrl: user.facebookUrl,
  });
});

router.post("/auth/change-password", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).user.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current password and new password are required." });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found." }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect." });
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, userId));
  res.json({ message: "Password changed successfully." });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.trim().toLowerCase()));

  if (user) {
    const token = generateToken();
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await db.update(usersTable)
      .set({ passwordResetToken: token, passwordResetExpires: expires })
      .where(eq(usersTable.id, user.id));
    const baseUrl = (typeof req.body.appUrl === "string" && req.body.appUrl.startsWith("http"))
      ? req.body.appUrl
      : (req.headers.origin as string | undefined) ?? undefined;
    try {
      await sendPasswordResetEmail(user.email, token, baseUrl);
    } catch (err) {
      console.error("Failed to send password reset email:", err);
    }
  }

  res.json({ message: "If an account exists for this email, a reset link has been sent." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body;
  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required." });
    return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.passwordResetToken, token));
  if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
    res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(usersTable)
    .set({ passwordHash, passwordResetToken: null, passwordResetExpires: null })
    .where(eq(usersTable.id, user.id));

  res.json({ message: "Password reset successfully. You can now log in with your new password." });
});

router.get("/auth/verify-email", async (req, res): Promise<void> => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Verification token is required." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.emailVerificationToken, token));
  if (!user) {
    res.status(400).json({ error: "This verification link is invalid or has already been used." });
    return;
  }

  await db.update(usersTable)
    .set({ emailVerified: true, emailVerificationToken: null })
    .where(eq(usersTable.id, user.id));

  res.json({ message: "Email verified successfully!" });
});

router.post("/auth/resend-verification", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).user.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found." }); return; }

  if (user.emailVerified) {
    res.status(400).json({ error: "Your email is already verified." });
    return;
  }

  const token = generateToken();
  await db.update(usersTable).set({ emailVerificationToken: token }).where(eq(usersTable.id, userId));

  try {
    await sendVerificationEmail(user.email, token);
  } catch (err) {
    console.error("Failed to send verification email:", err);
    res.status(500).json({ error: "Failed to send verification email. Please try again." });
    return;
  }

  res.json({ message: "Verification email sent. Please check your inbox." });
});

router.post("/auth/upgrade-to-organizer", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as any).user.id;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.role !== "customer") { res.status(400).json({ error: "Only customer accounts can upgrade to organizer." }); return; }

  const [updated] = await db.update(usersTable).set({ role: "organizer" }).where(eq(usersTable.id, userId)).returning();
  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    isActive: updated.isActive,
  });
});

export default router;
