import { Router } from "express";
import bcrypt from "bcryptjs";
import {
  db, usersTable, franchisesTable,
  dailyCheckinsTable, weeklyCheckinsTable, monthlyCheckinsTable,
  goalsTable, goalInitiativesTable,
  helpRequestsTable, weeklyPlannerEntriesTable, weeklyPlannerWeeksTable,
  plannerEventLogTable, progressHistoryTable, inviteTokensTable,
  commentsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, requireWriteAccess } from "../middlewares/auth";
import { logAudit, shouldAudit } from "../services/audit";
import { sendUserInvitation } from "../services/email";

const router = Router();

function formatUser(u: typeof usersTable.$inferSelect, franchiseName?: string | null) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    franchiseId: u.franchiseId, franchiseName: franchiseName ?? null,
    active: u.active,
    invitedAt: u.invitedAt?.toISOString() ?? null,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const franchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;

    // franqueado can only list users of their own franchise
    if (role === "franqueado") {
      const myFranchiseId = req.session.franchiseId;
      if (!myFranchiseId) { res.json([]); return; }
      const rows = await db
        .select({
          id: usersTable.id, name: usersTable.name, email: usersTable.email,
          role: usersTable.role, franchiseId: usersTable.franchiseId,
          active: usersTable.active, createdAt: usersTable.createdAt,
          invitedAt: usersTable.invitedAt, lastLoginAt: usersTable.lastLoginAt,
          franchiseName: franchisesTable.name,
        })
        .from(usersTable)
        .leftJoin(franchisesTable, eq(usersTable.franchiseId, franchisesTable.id))
        .where(eq(usersTable.franchiseId, myFranchiseId));
      res.json(rows.map(u => ({
        id: u.id, name: u.name, email: u.email, role: u.role,
        franchiseId: u.franchiseId, franchiseName: u.franchiseName ?? null,
        active: u.active,
        invitedAt: u.invitedAt?.toISOString() ?? null,
        lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      })));
      return;
    }

    // master_admin and staff_regional see all (or filtered by franchiseId)
    if (role !== "master_admin" && role !== "staff_regional") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const selectFields = {
      id: usersTable.id, name: usersTable.name, email: usersTable.email,
      role: usersTable.role, franchiseId: usersTable.franchiseId,
      active: usersTable.active, createdAt: usersTable.createdAt,
      invitedAt: usersTable.invitedAt, lastLoginAt: usersTable.lastLoginAt,
      franchiseName: franchisesTable.name,
    };
    const rows = franchiseId
      ? await db.select(selectFields).from(usersTable)
          .leftJoin(franchisesTable, eq(usersTable.franchiseId, franchisesTable.id))
          .where(eq(usersTable.franchiseId, franchiseId))
      : await db.select(selectFields).from(usersTable)
          .leftJoin(franchisesTable, eq(usersTable.franchiseId, franchisesTable.id));

    res.json(rows.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      franchiseId: u.franchiseId, franchiseName: u.franchiseName ?? null,
      active: u.active,
      invitedAt: u.invitedAt?.toISOString() ?? null,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const { name, email, password, role: userRole, franchiseId } = req.body;
    if (!name || !email || !password || !userRole) {
      res.status(400).json({ error: "name, email, password, role required" });
      return;
    }

    // franqueado can only create responsavel_interno in their own franchise
    if (role === "franqueado") {
      const myFranchiseId = req.session.franchiseId;
      if (userRole !== "responsavel_interno") {
        res.status(403).json({ error: "Você só pode criar usuários do perfil Responsável Interno." });
        return;
      }
      if (!franchiseId || franchiseId !== myFranchiseId) {
        res.status(403).json({ error: "Você só pode criar usuários para sua própria franquia." });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inviteableRoles = ["franqueado", "responsavel_interno", "staff_regional"];
    const invitedAt = inviteableRoles.includes(userRole) ? new Date() : null;
    const [u] = await db
      .insert(usersTable)
      .values({ name, email: email.toLowerCase(), passwordHash, role: userRole, franchiseId: franchiseId ?? null, invitedAt })
      .returning();

    let franchiseName: string | null = null;
    if (u.franchiseId) {
      const fRows = await db.select({ name: franchisesTable.name }).from(franchisesTable).where(eq(franchisesTable.id, u.franchiseId)).limit(1);
      franchiseName = fRows[0]?.name ?? null;
    }

    if (shouldAudit(req.session.userRole!)) {
      await logAudit({
        userId: req.session.userId!, userName: req.session.userName!, userEmail: req.session.userEmail!,
        action: "create", entityType: "user", entityId: u.id, entityName: u.name,
        newData: { name: u.name, email: u.email, role: u.role, franchiseId: u.franchiseId, franchiseName },
      });
    }

    if (invitedAt) {
      sendUserInvitation({ toEmail: u.email, toName: u.name, password, role: u.role, franchiseName })
        .catch(err => req.log.error({ err }, "Failed to send invitation email"));
    }

    res.status(201).json(formatUser(u, franchiseName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const role = req.session.userRole!;
    if (role !== "master_admin" && role !== "staff_regional" && req.session.userId !== id) {
      // franqueado can view users in their franchise
      if (role !== "franqueado") {
        res.status(403).json({ error: "Forbidden" }); return;
      }
    }
    const rows = await db
      .select({
        id: usersTable.id, name: usersTable.name, email: usersTable.email,
        role: usersTable.role, franchiseId: usersTable.franchiseId,
        active: usersTable.active, createdAt: usersTable.createdAt,
        franchiseName: franchisesTable.name,
      })
      .from(usersTable)
      .leftJoin(franchisesTable, eq(usersTable.franchiseId, franchisesTable.id))
      .where(eq(usersTable.id, id))
      .limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    // franqueado can only view users from their own franchise
    if (role === "franqueado" && rows[0].franchiseId !== req.session.franchiseId && req.session.userId !== id) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    const u = rows[0];
    res.json({
      id: u.id, name: u.name, email: u.email, role: u.role,
      franchiseId: u.franchiseId, franchiseName: u.franchiseName ?? null,
      active: u.active, createdAt: u.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const role = req.session.userRole!;

    // franqueado can only edit responsavel_interno users in their own franchise
    if (role === "franqueado") {
      const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
      if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }
      if (existing[0].franchiseId !== req.session.franchiseId) {
        res.status(403).json({ error: "Você só pode editar usuários da sua franquia." }); return;
      }
      if (existing[0].role !== "responsavel_interno") {
        res.status(403).json({ error: "Você só pode editar usuários do perfil Responsável Interno." }); return;
      }
    } else if (role !== "master_admin" && role !== "staff_regional") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    // Fetch existing record before update for audit log
    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!existingUser && role !== "franqueado") { res.status(404).json({ error: "Not found" }); return; }

    const { name, email, role: userRole, franchiseId, active } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email.toLowerCase();
    if (userRole !== undefined && (role === "master_admin" || role === "staff_regional")) update.role = userRole;
    if (franchiseId !== undefined && (role === "master_admin" || role === "staff_regional")) update.franchiseId = franchiseId;
    if (active !== undefined) update.active = active;

    const [u] = await db.update(usersTable).set(update).where(eq(usersTable.id, id)).returning();
    if (!u) { res.status(404).json({ error: "Not found" }); return; }
    let franchiseName: string | null = null;
    if (u.franchiseId) {
      const fRows = await db.select({ name: franchisesTable.name }).from(franchisesTable).where(eq(franchisesTable.id, u.franchiseId)).limit(1);
      franchiseName = fRows[0]?.name ?? null;
    }

    if (shouldAudit(req.session.userRole!) && existingUser) {
      await logAudit({
        userId: req.session.userId!, userName: req.session.userName!, userEmail: req.session.userEmail!,
        action: "update", entityType: "user", entityId: id, entityName: existingUser.name,
        oldData: { name: existingUser.name, email: existingUser.email, role: existingUser.role, franchiseId: existingUser.franchiseId, active: existingUser.active },
        newData: { name: u.name, email: u.email, role: u.role, franchiseId: u.franchiseId, active: u.active },
      });
    }
    res.json(formatUser(u, franchiseName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", requireAuth, requireRole("master_admin", "staff_regional"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (id === req.session.userId) {
      res.status(400).json({ error: "Você não pode excluir sua própria conta." });
      return;
    }
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Usuário não encontrado." }); return; }

    await db.transaction(async (tx) => {
      // Records where user_id is NOT NULL → delete them
      await tx.delete(dailyCheckinsTable).where(eq(dailyCheckinsTable.userId, id));
      await tx.delete(weeklyCheckinsTable).where(eq(weeklyCheckinsTable.userId, id));
      await tx.delete(monthlyCheckinsTable).where(eq(monthlyCheckinsTable.userId, id));
      await tx.delete(weeklyPlannerEntriesTable).where(eq(weeklyPlannerEntriesTable.userId, id));
      await tx.delete(plannerEventLogTable).where(eq(plannerEventLogTable.userId, id));
      await tx.delete(progressHistoryTable).where(eq(progressHistoryTable.userId, id));
      await tx.delete(helpRequestsTable).where(eq(helpRequestsTable.userId, id));
      await tx.delete(commentsTable).where(eq(commentsTable.userId, id));

      // Nullable FK columns → set to null (preserve the records)
      await tx.update(goalsTable).set({ ownerUserId: null }).where(eq(goalsTable.ownerUserId, id));
      await tx.update(goalInitiativesTable).set({ ownerUserId: null }).where(eq(goalInitiativesTable.ownerUserId, id));
      await tx.update(helpRequestsTable).set({ assignedTo: null }).where(eq(helpRequestsTable.assignedTo, id));
      await tx.update(weeklyPlannerWeeksTable).set({ submittedByUserId: null }).where(eq(weeklyPlannerWeeksTable.submittedByUserId, id));
      await tx.update(inviteTokensTable).set({ usedByUserId: null }).where(eq(inviteTokensTable.usedByUserId, id));
      // audit_logs.user_id has onDelete: "set null" on the constraint — handled by DB

      await tx.delete(usersTable).where(eq(usersTable.id, id));
    });

    if (shouldAudit(req.session.userRole!)) {
      await logAudit({
        userId: req.session.userId!, userName: req.session.userName!, userEmail: req.session.userEmail!,
        action: "delete", entityType: "user", entityId: id, entityName: existing.name,
        oldData: { name: existing.name, email: existing.email, role: existing.role, franchiseId: existing.franchiseId, active: existing.active },
      });
    }
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users/:id/resend-invite", requireAuth, requireRole("master_admin", "staff_regional"), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [user] = await db
      .select({
        id: usersTable.id, name: usersTable.name, email: usersTable.email,
        role: usersTable.role, franchiseId: usersTable.franchiseId,
        active: usersTable.active, lastLoginAt: usersTable.lastLoginAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id))
      .limit(1);

    if (!user) { res.status(404).json({ error: "Usuário não encontrado." }); return; }

    const inviteableRoles = ["franqueado", "responsavel_interno", "staff_regional"];
    if (!inviteableRoles.includes(user.role)) {
      res.status(400).json({ error: "Convites só podem ser reenviados para franqueados e responsáveis." }); return;
    }

    let franchiseName: string | null = null;
    if (user.franchiseId) {
      const fRows = await db.select({ name: franchisesTable.name }).from(franchisesTable).where(eq(franchisesTable.id, user.franchiseId)).limit(1);
      franchiseName = fRows[0]?.name ?? null;
    }

    const newPassword = Math.random().toString(36).slice(-8) + "X1";
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const now = new Date();
    await db.update(usersTable).set({ passwordHash, invitedAt: now }).where(eq(usersTable.id, id));

    await sendUserInvitation({ toEmail: user.email, toName: user.name, password: newPassword, role: user.role, franchiseName });

    res.json({ ok: true, message: "Convite reenviado com nova senha temporária." });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
