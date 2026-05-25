import { Router } from "express";
import { db, auditLogsTable, franchisesTable, usersTable, goalsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import bcrypt from "bcryptjs";

const router = Router();

router.get("/admin/audit-logs", requireAuth, requireRole("master_admin", "staff_regional"), async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(200);
    res.json(rows.map(r => ({
      id: r.id,
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      entityName: r.entityName,
      oldData: r.oldData,
      newData: r.newData,
      undone: r.undone,
      undoneAt: r.undoneAt?.toISOString() ?? null,
      undoneByUserId: r.undoneByUserId,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/admin/audit-logs/:id/undo", requireAuth, requireRole("master_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [log] = await db.select().from(auditLogsTable).where(eq(auditLogsTable.id, id));
    if (!log) { res.status(404).json({ error: "Log entry not found" }); return; }
    if (log.undone) { res.status(409).json({ error: "Already undone" }); return; }

    const old = log.oldData as Record<string, unknown> | null;
    const newD = log.newData as Record<string, unknown> | null;

    if (log.action === "delete" && old) {
      if (log.entityType === "franchise") {
        await db.insert(franchisesTable).values({
          name: String(old.name ?? ""),
          city: String(old.city ?? ""),
          state: String(old.state ?? "SC"),
          brokerOwnerName: old.brokerOwnerName ? String(old.brokerOwnerName) : null,
          contactEmail: old.contactEmail ? String(old.contactEmail) : null,
          phone: old.phone ? String(old.phone) : null,
          cnpj: old.cnpj ? String(old.cnpj) : null,
          active: old.active !== false,
        });
      } else if (log.entityType === "user") {
        const tmpHash = await bcrypt.hash("remax2026", 10);
        await db.insert(usersTable).values({
          name: String(old.name ?? ""),
          email: String(old.email ?? ""),
          passwordHash: tmpHash,
          role: String(old.role ?? "franqueado"),
          franchiseId: old.franchiseId ? Number(old.franchiseId) : null,
          active: old.active !== false,
        });
      } else if (log.entityType === "goal" && log.entityId) {
        await db.update(goalsTable)
          .set({ endDate: old.endDate ? String(old.endDate) : null })
          .where(eq(goalsTable.id, log.entityId));
      }
    } else if (log.action === "update" && old && log.entityId) {
      if (log.entityType === "franchise") {
        await db.update(franchisesTable).set({
          name: old.name ? String(old.name) : undefined,
          city: old.city ? String(old.city) : undefined,
          state: old.state ? String(old.state) : undefined,
          brokerOwnerName: old.brokerOwnerName !== undefined ? (old.brokerOwnerName ? String(old.brokerOwnerName) : null) : undefined,
          contactEmail: old.contactEmail !== undefined ? (old.contactEmail ? String(old.contactEmail) : null) : undefined,
          phone: old.phone !== undefined ? (old.phone ? String(old.phone) : null) : undefined,
          cnpj: old.cnpj !== undefined ? (old.cnpj ? String(old.cnpj) : null) : undefined,
          active: old.active !== undefined ? Boolean(old.active) : undefined,
        } as any).where(eq(franchisesTable.id, log.entityId));
      } else if (log.entityType === "user") {
        await db.update(usersTable).set({
          name: old.name ? String(old.name) : undefined,
          email: old.email ? String(old.email) : undefined,
          role: old.role ? String(old.role) : undefined,
          franchiseId: old.franchiseId !== undefined ? (old.franchiseId ? Number(old.franchiseId) : null) : undefined,
          active: old.active !== undefined ? Boolean(old.active) : undefined,
        } as any).where(eq(usersTable.id, log.entityId));
      } else if (log.entityType === "goal") {
        const restoreFields: Record<string, unknown> = {};
        if (old.title !== undefined) restoreFields.title = old.title;
        if (old.targetValue !== undefined) restoreFields.targetValue = old.targetValue;
        if (old.currentValue !== undefined) restoreFields.currentValue = old.currentValue;
        if (old.endDate !== undefined) restoreFields.endDate = old.endDate;
        if (Object.keys(restoreFields).length > 0) {
          await db.update(goalsTable).set(restoreFields as any).where(eq(goalsTable.id, log.entityId));
        }
      }
    } else if (log.action === "create" && log.entityId) {
      if (log.entityType === "franchise") {
        await db.delete(franchisesTable).where(eq(franchisesTable.id, log.entityId));
      } else if (log.entityType === "user") {
        await db.delete(usersTable).where(eq(usersTable.id, log.entityId));
      } else if (log.entityType === "goal") {
        await db.delete(goalsTable).where(eq(goalsTable.id, log.entityId));
      }
    }

    await db.update(auditLogsTable).set({
      undone: true,
      undoneAt: new Date(),
      undoneByUserId: req.session.userId,
    }).where(eq(auditLogsTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
