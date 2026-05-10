import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, franchisesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        passwordHash: usersTable.passwordHash,
        role: usersTable.role,
        franchiseId: usersTable.franchiseId,
        active: usersTable.active,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    const user = users[0];
    if (!user || !user.active) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.franchiseId = user.franchiseId;

    let franchiseName: string | null = null;
    if (user.franchiseId) {
      const franchise = await db
        .select({ name: franchisesTable.name })
        .from(franchisesTable)
        .where(eq(franchisesTable.id, user.franchiseId))
        .limit(1);
      franchiseName = franchise[0]?.name ?? null;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      franchiseId: user.franchiseId,
      franchiseName,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.post("/auth/change-password", requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "currentPassword and newPassword required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "newPassword must be at least 8 characters" });
      return;
    }
    const [user] = await db
      .select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId!))
      .limit(1);

    if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ error: "Senha atual incorreta" }); return; }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/auth/me", requireAuth, async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        franchiseId: usersTable.franchiseId,
        active: usersTable.active,
      })
      .from(usersTable)
      .where(eq(usersTable.id, req.session.userId!))
      .limit(1);

    const user = users[0];
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    let franchiseName: string | null = null;
    if (user.franchiseId) {
      const franchise = await db
        .select({ name: franchisesTable.name })
        .from(franchisesTable)
        .where(eq(franchisesTable.id, user.franchiseId))
        .limit(1);
      franchiseName = franchise[0]?.name ?? null;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      franchiseId: user.franchiseId,
      franchiseName,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
