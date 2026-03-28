import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireSuperAdmin, signToken } from "../lib/auth";

const router: IRouter = Router();

router.get("/superadmin/users", requireSuperAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }))
  );
});

router.post("/superadmin/impersonate/:userId", requireSuperAdmin, async (req, res): Promise<void> => {
  const superAdmin = (req as any).user;
  const targetId = parseInt(req.params.userId, 10);

  if (isNaN(targetId)) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  if (targetId === superAdmin.id) {
    res.status(400).json({ error: "Cannot impersonate yourself" });
    return;
  }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, targetId));
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (target.role === "superadmin") {
    res.status(403).json({ error: "Cannot impersonate another SuperAdmin" });
    return;
  }

  if (!target.isActive) {
    res.status(403).json({ error: "Cannot impersonate a deactivated user" });
    return;
  }

  const [superAdminUser] = await db.select().from(usersTable).where(eq(usersTable.id, superAdmin.id));

  const impersonationToken = signToken({
    id: target.id,
    role: target.role,
    impersonatedBy: superAdmin.id,
  });

  req.log.info({
    action: "impersonation_start",
    superAdminId: superAdmin.id,
    superAdminEmail: superAdminUser?.email,
    targetUserId: target.id,
    targetUserEmail: target.email,
    timestamp: new Date().toISOString(),
  }, "SuperAdmin impersonation started");

  res.json({
    token: impersonationToken,
    targetUser: {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
    },
    superAdmin: {
      id: superAdmin.id,
      name: superAdminUser?.name,
    },
  });
});

router.post("/superadmin/seed", async (_req, res): Promise<void> => {
  const email = "jracuff@gmail.com";
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.json({ message: "SuperAdmin already exists", id: existing[0].id });
    return;
  }

  const passwordHash = await bcrypt.hash("RoamBites_SuperAdmin_2024!", 10);
  const [user] = await db.insert(usersTable).values({
    name: "Jason Racuff",
    email,
    passwordHash,
    role: "superadmin",
    isActive: true,
  }).returning();

  res.status(201).json({
    message: "SuperAdmin created",
    id: user.id,
    email: user.email,
    role: user.role,
    defaultPassword: "RoamBites_SuperAdmin_2024!",
  });
});

export default router;
