import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, plansTable, vendorSubscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { SignupBody, LoginBody } from "@workspace/api-zod";
import { signToken, requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, email, password, role } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash, role }).returning();

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

  const token = signToken({ id: user.id, role: user.role });
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
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
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!user.isActive) {
    res.status(401).json({ error: "Account is deactivated" });
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
    isPrivate: user.isPrivate,
    createdAt: user.createdAt,
    twitterHandle: user.twitterHandle,
    instagramHandle: user.instagramHandle,
    facebookUrl: user.facebookUrl,
  });
});

export default router;
