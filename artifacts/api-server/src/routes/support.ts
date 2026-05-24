import { Router } from "express";
import { db, alertsTable, helpRequestsTable, progressHistoryTable, franchisesTable, goalsTable, goalInitiativesTable, dailyCheckinsTable, usersTable, pushTokensTable } from "@workspace/db";
import { eq, and, desc, notInArray, isNull, lt, gte, inArray } from "drizzle-orm";
import { requireAuth, requireAdminOrStaff } from "../middlewares/auth";
import { sendAlertPush } from "../services/expoPush";

const router = Router();

function canAccessFranchise(req: any, franchiseId: number) {
  const role = req.session.userRole;
  if (role === "master_admin" || role === "staff_regional") return true;
  if (role === "socio") {
    const linked: number[] = req.session.linkedFranchiseIds ?? [];
    return linked.includes(franchiseId);
  }
  return req.session.franchiseId === franchiseId;
}

// ─── calcRisk helper (mirrors dashboard.ts) ───────────────────────────────────
function calcRisk(goal: { startDate?: string | null; endDate?: string | null; progressPercentage?: number | null }) {
  if (!goal.startDate || !goal.endDate) return "no_prazo";
  const start = new Date(goal.startDate).getTime();
  const end   = new Date(goal.endDate).getTime();
  const now   = Date.now();
  const totalTime = end - start;
  if (totalTime <= 0) return "no_prazo";
  const timeElapsed = ((now - start) / totalTime) * 100;
  const progress = goal.progressPercentage ?? 0;
  const diff = progress - timeElapsed;
  if (diff < -15) return "atrasado";
  if (diff > 15)  return "adiantado";
  return "no_prazo";
}

// ─── Core alert generation logic ──────────────────────────────────────────────
export async function generateAlertsForFranchise(franchiseId: number): Promise<{ created: number; resolved: number }> {
  const today = new Date().toISOString().split("T")[0];

  // Load all currently open alerts for this franchise
  const openAlerts = await db.select({
    id:                alertsTable.id,
    type:              alertsTable.type,
    goalId:            alertsTable.goalId,
    goalInitiativeId:  alertsTable.goalInitiativeId,
  }).from(alertsTable)
    .where(and(eq(alertsTable.franchiseId, franchiseId), eq(alertsTable.status, "open")));

  // Key: "type:goalId:initiativeId"
  const openMap = new Map<string, number>(); // key → alert id
  for (const a of openAlerts) {
    openMap.set(`${a.type}:${a.goalId ?? ""}:${a.goalInitiativeId ?? ""}`, a.id);
  }

  const toInsert: { franchiseId: number; goalId?: number; goalInitiativeId?: number; type: string; severity: string; message: string }[] = [];
  const toResolveIds: number[] = [];

  // ── 1. Meta atrasada ────────────────────────────────────────────────────────
  const activeGoals = await db.select({
    id:                 goalsTable.id,
    title:              goalsTable.title,
    startDate:          goalsTable.startDate,
    endDate:            goalsTable.endDate,
    progressPercentage: goalsTable.progressPercentage,
  }).from(goalsTable)
    .where(and(
      eq(goalsTable.franchiseId, franchiseId),
      notInArray(goalsTable.status, ["concluida", "cancelada"]),
      isNull(goalsTable.deletedAt),
    ));

  for (const goal of activeGoals) {
    const risk = calcRisk(goal);
    const key  = `meta_atrasada:${goal.id}:`;

    if (risk === "atrasado") {
      if (!openMap.has(key)) {
        toInsert.push({
          franchiseId,
          goalId:   goal.id,
          type:     "meta_atrasada",
          severity: "high",
          message:  `Meta "${goal.title}" está atrasada em relação ao cronograma esperado.`,
        });
      }
      openMap.delete(key); // keep it open — don't resolve
    } else {
      // Goal is no longer behind — auto-resolve if open
      const id = openMap.get(key);
      if (id) toResolveIds.push(id);
      openMap.delete(key);
    }
  }

  // ── 2. Check-in diário ausente ──────────────────────────────────────────────
  if (activeGoals.length > 0) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const recentCheckins = await db.select({ id: dailyCheckinsTable.id })
      .from(dailyCheckinsTable)
      .where(and(
        eq(dailyCheckinsTable.franchiseId, franchiseId),
        gte(dailyCheckinsTable.date, sevenDaysAgoStr),
      ))
      .limit(1);

    const checkinKey = `checkin_ausente::`;
    if (recentCheckins.length === 0) {
      if (!openMap.has(checkinKey)) {
        toInsert.push({
          franchiseId,
          type:     "checkin_ausente",
          severity: "medium",
          message:  "Nenhum check-in diário registrado nos últimos 7 dias. Mantenha o registro para garantir sua pontuação.",
        });
      }
      openMap.delete(checkinKey);
    } else {
      const id = openMap.get(checkinKey);
      if (id) toResolveIds.push(id);
      openMap.delete(checkinKey);
    }
  }

  // ── 3. Iniciativa com prazo vencido ─────────────────────────────────────────
  const overdueInits = await db.select({
    id:         goalInitiativesTable.id,
    customName: goalInitiativesTable.customName,
    endDate:    goalInitiativesTable.endDate,
    status:     goalInitiativesTable.status,
    goalId:     goalInitiativesTable.goalId,
  }).from(goalInitiativesTable)
    .where(and(
      eq(goalInitiativesTable.status, "ativa"),
      isNull(goalInitiativesTable.deletedAt),
      lt(goalInitiativesTable.endDate, today),
    ));

  // Filter to this franchise via goalId
  const activeGoalIds = new Set(activeGoals.map(g => g.id));
  const relevantOverdue = overdueInits.filter(i => activeGoalIds.has(i.goalId));

  for (const init of relevantOverdue) {
    const key = `iniciativa_vencida:${init.goalId}:${init.id}`;
    if (!openMap.has(key)) {
      const name = init.customName ?? `Iniciativa #${init.id}`;
      toInsert.push({
        franchiseId,
        goalId:           init.goalId,
        goalInitiativeId: init.id,
        type:             "iniciativa_vencida",
        severity:         "high",
        message:          `Iniciativa "${name}" está com prazo vencido desde ${init.endDate} e ainda está ativa.`,
      });
    }
    openMap.delete(key);
  }

  // Auto-resolve iniciativa_vencida alerts for initiatives no longer overdue/active
  for (const [key, id] of openMap.entries()) {
    if (key.startsWith("iniciativa_vencida:")) {
      toResolveIds.push(id);
    }
  }

  // ── Insert new alerts ────────────────────────────────────────────────────────
  if (toInsert.length > 0) {
    await db.insert(alertsTable).values(toInsert);

    // ── Send Expo push notifications to franchise users ─────────────────────
    try {
      const franchiseUsers = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.franchiseId, franchiseId), eq(usersTable.active, true)));

      if (franchiseUsers.length > 0) {
        const userIds = franchiseUsers.map((u) => u.id);
        const tokenRows = await db
          .select({ token: pushTokensTable.token })
          .from(pushTokensTable)
          .where(inArray(pushTokensTable.userId, userIds));

        const tokens = tokenRows.map((r) => r.token);
        if (tokens.length > 0) {
          const body =
            toInsert.length === 1
              ? toInsert[0].message
              : `${toInsert.length} novos alertas na sua franquia.`;
          const { invalidTokens } = await sendAlertPush(tokens, body);
          // Prune permanently-invalid tokens so they don't accumulate
          if (invalidTokens.length > 0) {
            for (const token of invalidTokens) {
              await db
                .delete(pushTokensTable)
                .where(eq(pushTokensTable.token, token));
            }
          }
        }
      }
    } catch {
      // Push is best-effort — don't fail the alert generation
    }
  }

  // ── Resolve stale alerts ─────────────────────────────────────────────────────
  for (const id of toResolveIds) {
    await db.update(alertsTable)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(alertsTable.id, id));
  }

  return { created: toInsert.length, resolved: toResolveIds.length };
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

// Generate alerts for a franchise
router.post("/alerts/generate", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const paramFranchiseId = req.body?.franchiseId ? parseInt(req.body.franchiseId) : undefined;
    const franchiseId = (role === "master_admin" || role === "staff_regional")
      ? (paramFranchiseId ?? req.session.franchiseId)
      : req.session.franchiseId;

    if (!franchiseId) {
      res.status(400).json({ error: "franchiseId required" });
      return;
    }

    const result = await generateAlertsForFranchise(franchiseId);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/alerts/:id/resolve", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
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
    const id = parseInt(req.params.id as string);
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
