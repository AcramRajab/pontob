import { Router } from "express";
import { db, alertsTable, helpRequestsTable, progressHistoryTable, franchisesTable, goalsTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireAdminOrStaff } from "../middlewares/auth";

const router = Router();

function canAccessFranchise(req: any, franchiseId: number) {
  const role = req.session.userRole;
  if (role === "master_admin" || role === "staff_regional") return true;
  return req.session.franchiseId === franchiseId;
}

// Alerts
router.get("/alerts", requireAuth, async (req, res) => {
  try {
    const { franchiseId, status } = req.query;
    const role = req.session.userRole!;
    const effectiveFranchiseId = role === "master_admin" || role === "staff_regional"
      ? franchiseId ? parseInt(franchiseId as string) : undefined
      : req.session.franchiseId ?? undefined;

    const conditions: any[] = [];
    if (effectiveFranchiseId) conditions.push(eq(alertsTable.franchiseId, effectiveFranchiseId));
    if (status) conditions.push(eq(alertsTable.status, status as string));

    const rows = await db
      .select({
        id: alertsTable.id,
        franchiseId: alertsTable.franchiseId,
        franchiseName: franchisesTable.name,
        goalId: alertsTable.goalId,
        goalTitle: goalsTable.title,
        goalInitiativeId: alertsTable.goalInitiativeId,
        type: alertsTable.type,
        severity: alertsTable.severity,
        message: alertsTable.message,
        status: alertsTable.status,
        createdAt: alertsTable.createdAt,
        resolvedAt: alertsTable.resolvedAt,
      })
      .from(alertsTable)
      .leftJoin(franchisesTable, eq(alertsTable.franchiseId, franchisesTable.id))
      .leftJoin(goalsTable, eq(alertsTable.goalId, goalsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(alertsTable.createdAt));

    res.json(rows.map(a => ({
      ...a,
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
      resolvedAt: a.resolvedAt instanceof Date ? a.resolvedAt.toISOString() : a.resolvedAt,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/alerts/:id/resolve", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [a] = await db.update(alertsTable).set({ status: "resolved", resolvedAt: new Date() }).where(eq(alertsTable.id, id)).returning();
    if (!a) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...a, createdAt: a.createdAt.toISOString(), resolvedAt: a.resolvedAt?.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Help Requests
router.get("/help-requests", requireAuth, async (req, res) => {
  try {
    const { franchiseId, status } = req.query;
    const role = req.session.userRole!;
    const effectiveFranchiseId = role === "master_admin" || role === "staff_regional"
      ? franchiseId ? parseInt(franchiseId as string) : undefined
      : req.session.franchiseId ?? undefined;

    const conditions: any[] = [];
    if (effectiveFranchiseId) conditions.push(eq(helpRequestsTable.franchiseId, effectiveFranchiseId));
    if (status) conditions.push(eq(helpRequestsTable.status, status as string));

    const rows = await db
      .select({
        id: helpRequestsTable.id,
        franchiseId: helpRequestsTable.franchiseId,
        franchiseName: franchisesTable.name,
        goalId: helpRequestsTable.goalId,
        goalTitle: goalsTable.title,
        goalInitiativeId: helpRequestsTable.goalInitiativeId,
        userId: helpRequestsTable.userId,
        userName: usersTable.name,
        description: helpRequestsTable.description,
        status: helpRequestsTable.status,
        assignedTo: helpRequestsTable.assignedTo,
        createdAt: helpRequestsTable.createdAt,
        resolvedAt: helpRequestsTable.resolvedAt,
      })
      .from(helpRequestsTable)
      .leftJoin(franchisesTable, eq(helpRequestsTable.franchiseId, franchisesTable.id))
      .leftJoin(goalsTable, eq(helpRequestsTable.goalId, goalsTable.id))
      .leftJoin(usersTable, eq(helpRequestsTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(helpRequestsTable.createdAt));

    res.json(rows.map(h => ({
      ...h,
      assignedToName: null,
      createdAt: h.createdAt instanceof Date ? h.createdAt.toISOString() : h.createdAt,
      resolvedAt: h.resolvedAt instanceof Date ? h.resolvedAt.toISOString() : h.resolvedAt,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/help-requests", requireAuth, async (req, res) => {
  try {
    const { franchiseId, goalId, goalInitiativeId, description } = req.body;
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const [h] = await db.insert(helpRequestsTable).values({
      franchiseId, goalId, goalInitiativeId, userId: req.session.userId!, description,
    }).returning();
    res.status(201).json({ ...h, franchiseName: null, goalTitle: null, userName: null, assignedToName: null, createdAt: h.createdAt.toISOString(), resolvedAt: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/help-requests/:id", requireAdminOrStaff, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, assignedTo } = req.body;
    const update: Record<string, unknown> = {};
    if (status !== undefined) update.status = status;
    if (assignedTo !== undefined) update.assignedTo = assignedTo;
    if (status === "resolvido") update.resolvedAt = new Date();
    const [h] = await db.update(helpRequestsTable).set(update).where(eq(helpRequestsTable.id, id)).returning();
    if (!h) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...h, franchiseName: null, goalTitle: null, userName: null, assignedToName: null, createdAt: h.createdAt.toISOString(), resolvedAt: h.resolvedAt?.toISOString() ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Progress History
router.get("/progress-history", requireAuth, async (req, res) => {
  try {
    const { franchiseId, entityType, entityId } = req.query;
    const role = req.session.userRole!;
    const effectiveFranchiseId = role === "master_admin" || role === "staff_regional"
      ? franchiseId ? parseInt(franchiseId as string) : undefined
      : req.session.franchiseId ?? undefined;

    const conditions: any[] = [];
    if (effectiveFranchiseId) conditions.push(eq(progressHistoryTable.franchiseId, effectiveFranchiseId));
    if (entityType) conditions.push(eq(progressHistoryTable.entityType, entityType as string));
    if (entityId) conditions.push(eq(progressHistoryTable.entityId, parseInt(entityId as string)));

    const rows = await db
      .select({
        id: progressHistoryTable.id,
        entityType: progressHistoryTable.entityType,
        entityId: progressHistoryTable.entityId,
        franchiseId: progressHistoryTable.franchiseId,
        userId: progressHistoryTable.userId,
        userName: usersTable.name,
        previousProgress: progressHistoryTable.previousProgress,
        newProgress: progressHistoryTable.newProgress,
        previousStatus: progressHistoryTable.previousStatus,
        newStatus: progressHistoryTable.newStatus,
        note: progressHistoryTable.note,
        createdAt: progressHistoryTable.createdAt,
      })
      .from(progressHistoryTable)
      .leftJoin(usersTable, eq(progressHistoryTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(progressHistoryTable.createdAt))
      .limit(100);

    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
