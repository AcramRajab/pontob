import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, inviteTokensTable, usersTable, franchisesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.post("/invites", requireAuth, requireRole("master_admin", "staff_regional"), async (req, res) => {
  try {
    const { franchiseId, role } = req.body;
    if (!franchiseId || !role) {
      res.status(400).json({ error: "franchiseId e role são obrigatórios." });
      return;
    }
    if (!["franqueado", "responsavel_interno"].includes(role)) {
      res.status(400).json({ error: "role deve ser 'franqueado' ou 'responsavel_interno'." });
      return;
    }

    const [franchise] = await db
      .select({ id: franchisesTable.id, name: franchisesTable.name })
      .from(franchisesTable)
      .where(eq(franchisesTable.id, parseInt(franchiseId)))
      .limit(1);

    if (!franchise) {
      res.status(404).json({ error: "Franquia não encontrada." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(inviteTokensTable).values({
      token,
      franchiseId: franchise.id,
      role,
      createdBy: req.session.userId!,
      expiresAt,
    });

    const host = req.headers.origin || `https://${req.headers.host}`;
    const base = process.env.BASE_PATH ?? "";
    const link = `${host}${base}/convite/${token}`;

    res.status(201).json({ token, link, franchiseName: franchise.name, role, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/invites/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const now = new Date();

    const rows = await db
      .select({
        id: inviteTokensTable.id,
        franchiseId: inviteTokensTable.franchiseId,
        role: inviteTokensTable.role,
        expiresAt: inviteTokensTable.expiresAt,
        usedAt: inviteTokensTable.usedAt,
        franchiseName: franchisesTable.name,
      })
      .from(inviteTokensTable)
      .leftJoin(franchisesTable, eq(inviteTokensTable.franchiseId, franchisesTable.id))
      .where(eq(inviteTokensTable.token, token))
      .limit(1);

    const invite = rows[0];

    if (!invite) {
      res.json({ valid: false, error: "Link de convite inválido." });
      return;
    }
    if (invite.usedAt) {
      res.json({ valid: false, error: "Este link já foi utilizado." });
      return;
    }
    if (invite.expiresAt < now) {
      res.json({ valid: false, error: "Este link expirou. Solicite um novo ao administrador." });
      return;
    }

    res.json({
      valid: true,
      franchiseName: invite.franchiseName,
      role: invite.role,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invites/:token/accept", async (req, res) => {
  try {
    const { token } = req.params;
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email e password são obrigatórios." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "A senha deve ter no mínimo 8 caracteres." });
      return;
    }

    const now = new Date();
    const rows = await db
      .select({
        id: inviteTokensTable.id,
        franchiseId: inviteTokensTable.franchiseId,
        role: inviteTokensTable.role,
        expiresAt: inviteTokensTable.expiresAt,
        usedAt: inviteTokensTable.usedAt,
        franchiseName: franchisesTable.name,
      })
      .from(inviteTokensTable)
      .leftJoin(franchisesTable, eq(inviteTokensTable.franchiseId, franchisesTable.id))
      .where(eq(inviteTokensTable.token, token))
      .limit(1);

    const invite = rows[0];

    if (!invite) {
      res.status(400).json({ error: "Link de convite inválido." });
      return;
    }
    if (invite.usedAt) {
      res.status(400).json({ error: "Este link já foi utilizado." });
      return;
    }
    if (invite.expiresAt < now) {
      res.status(400).json({ error: "Este link expirou. Solicite um novo ao administrador." });
      return;
    }

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (existing[0]) {
      res.status(409).json({ error: "Este e-mail já está cadastrado. Faça login ou use outro e-mail." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: invite.role,
        franchiseId: invite.franchiseId,
        active: true,
        invitedAt: now,
      })
      .returning();

    await db
      .update(inviteTokensTable)
      .set({ usedAt: now, usedByUserId: user.id })
      .where(eq(inviteTokensTable.id, invite.id));

    req.session.userId = user.id;
    req.session.userRole = user.role;
    req.session.userName = user.name;
    req.session.userEmail = user.email;
    req.session.franchiseId = user.franchiseId;

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      franchiseId: user.franchiseId,
      franchiseName: invite.franchiseName,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
