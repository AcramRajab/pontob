import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db, usersTable, franchisesTable, userFranchisesTable, passwordResetTokensTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { sendPasswordResetEmail } from "../services/email";

const router = Router();

async function getSocioFranchises(userId: number) {
  const rows = await db
    .select({ id: franchisesTable.id, name: franchisesTable.name })
    .from(userFranchisesTable)
    .innerJoin(franchisesTable, eq(userFranchisesTable.franchiseId, franchisesTable.id))
    .where(eq(userFranchisesTable.userId, userId));
  return rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

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
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (!user.active) {
      res.status(403).json({ error: "pending_approval", message: "Seu cadastro está aguardando aprovação pelo administrador. Você receberá um e-mail assim que seu acesso for liberado." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.franchiseId = user.franchiseId;

    db.update(usersTable)
      .set({ lastLoginAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .catch(err => req.log.error({ err }, "Failed to update lastLoginAt"));

    let franchiseName: string | null = null;
    let linkedFranchises: Array<{ id: number; name: string }> | undefined;

    if (user.role === "socio") {
      linkedFranchises = await getSocioFranchises(user.id);
      req.session.linkedFranchiseIds = linkedFranchises.map(f => f.id);
    } else if (user.franchiseId) {
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
      linkedFranchises,
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

router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "E-mail obrigatório" });
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, active: usersTable.active })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user || !user.active) {
      res.json({ ok: true });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokensTable).values({ userId: user.id, token, expiresAt });

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost";
    const resetLink = `https://${domain}/reset-password?token=${token}`;

    await sendPasswordResetEmail({ toEmail: user.email, toName: user.name, resetLink });

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      res.status(400).json({ error: "Token e nova senha são obrigatórios" });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "A senha deve ter pelo menos 8 caracteres" });
      return;
    }

    const [row] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token, token),
          eq(passwordResetTokensTable.used, false),
          gt(passwordResetTokensTable.expiresAt, new Date()),
        )
      )
      .limit(1);

    if (!row) {
      res.status(400).json({ error: "Link inválido ou expirado. Solicite um novo link de redefinição." });
      return;
    }

    const newHash = await bcrypt.hash(password, 12);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, row.userId));
    await db.update(passwordResetTokensTable).set({ used: true }).where(eq(passwordResetTokensTable.id, row.id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Erro interno" });
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
    let linkedFranchises: Array<{ id: number; name: string }> | undefined;

    if (user.role === "socio") {
      linkedFranchises = await getSocioFranchises(user.id);
      req.session.linkedFranchiseIds = linkedFranchises.map(f => f.id);
    } else if (user.franchiseId) {
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
      linkedFranchises,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
