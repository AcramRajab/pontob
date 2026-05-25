import { Router } from "express";
import { db, goalsTable, kpisTable, goalInitiativesTable, franchisesTable, usersTable, dimensionsTable, keyProcessesTable, strategicInitiativesTable, progressHistoryTable } from "@workspace/db";
import { eq, and, sql, isNull, isNotNull } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "../middlewares/auth";
import { logAudit, shouldAudit } from "../services/audit";

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

async function getGoalFranchiseId(goalId: number): Promise<number | null> {
  const [row] = await db.select({ franchiseId: goalsTable.franchiseId }).from(goalsTable).where(eq(goalsTable.id, goalId)).limit(1);
  return row?.franchiseId ?? null;
}

async function getInitiativeFranchiseId(initiativeId: number): Promise<number | null> {
  const [row] = await db
    .select({ franchiseId: goalsTable.franchiseId })
    .from(goalInitiativesTable)
    .innerJoin(goalsTable, eq(goalInitiativesTable.goalId, goalsTable.id))
    .where(eq(goalInitiativesTable.id, initiativeId))
    .limit(1);
  return row?.franchiseId ?? null;
}

async function getKpiFranchiseId(kpiId: number): Promise<number | null> {
  const [row] = await db
    .select({ franchiseId: goalsTable.franchiseId })
    .from(kpisTable)
    .innerJoin(goalsTable, eq(kpisTable.goalId, goalsTable.id))
    .where(eq(kpisTable.id, kpiId))
    .limit(1);
  return row?.franchiseId ?? null;
}

function calcProgress(currentValue: number | null | undefined, targetValue: number | null | undefined): number {
  if (currentValue == null || targetValue == null || targetValue <= 0) return 0;
  return Math.min(100, Math.round((currentValue / targetValue) * 100));
}

function calcScore(goal: any) {
  const progress = calcProgress(goal.currentValue, goal.targetValue);
  const initiatives = goal.initiationScore || 50;
  const consistency = goal.consistencyScore || 50;
  const kpiUpdate = goal.kpiUpdateScore || 50;
  return Math.round(progress * 0.4 + initiatives * 0.3 + consistency * 0.2 + kpiUpdate * 0.1);
}

function calcRisk(goal: any) {
  if (!goal.startDate || !goal.endDate) return "no_prazo";
  const start = new Date(goal.startDate).getTime();
  const end = new Date(goal.endDate).getTime();
  const now = Date.now();
  const totalTime = end - start;
  if (totalTime <= 0) return "no_prazo";
  const timeElapsed = ((now - start) / totalTime) * 100;
  const progress = calcProgress(goal.currentValue, goal.targetValue);
  const diff = progress - timeElapsed;
  if (diff < -15) return "atrasado";
  if (diff > 15) return "adiantado";
  return "no_prazo";
}

async function enrichGoal(g: any) {
  const [activeInitiativesResult, kpisResult, initiativesResult] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(goalInitiativesTable)
      .where(and(
        eq(goalInitiativesTable.goalId, g.id),
        eq(goalInitiativesTable.status, "ativa"),
        isNull(goalInitiativesTable.deletedAt),
      )),
    db
      .select({
        id: kpisTable.id,
        name: kpisTable.name,
        currentValue: kpisTable.currentValue,
        targetValue: kpisTable.targetValue,
        unit: kpisTable.unit,
      })
      .from(kpisTable)
      .where(and(eq(kpisTable.goalId, g.id), isNull(kpisTable.deletedAt)))
      .orderBy(kpisTable.createdAt),
    db
      .select({
        id: goalInitiativesTable.id,
        initiativeName: strategicInitiativesTable.name,
        status: goalInitiativesTable.status,
        progressPercentage: goalInitiativesTable.progressPercentage,
      })
      .from(goalInitiativesTable)
      .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
      .where(and(eq(goalInitiativesTable.goalId, g.id), isNull(goalInitiativesTable.deletedAt)))
      .orderBy(goalInitiativesTable.createdAt),
  ]);

  return {
    id: g.id,
    franchiseId: g.franchiseId,
    franchiseName: g.franchiseName,
    dimensionId: g.dimensionId,
    dimensionName: g.dimensionName,
    keyProcessId: g.keyProcessId,
    keyProcessName: g.keyProcessName,
    title: g.title,
    kriDescription: g.kriDescription,
    currentValue: g.currentValue,
    targetValue: g.targetValue,
    unit: g.unit,
    startDate: g.startDate,
    endDate: g.endDate,
    ownerUserId: g.ownerUserId,
    ownerName: g.ownerName,
    frequency: g.frequency,
    status: g.status,
    progressPercentage: calcProgress(g.currentValue, g.targetValue),
    riskStatus: calcRisk(g),
    score: g.score,
    activeInitiativesCount: activeInitiativesResult[0]?.count ?? 0,
    kpis: kpisResult,
    initiatives: initiativesResult,
    createdAt: g.createdAt instanceof Date ? g.createdAt.toISOString() : g.createdAt,
  };
}

router.get("/goals", requireAuth, async (req, res) => {
  try {
    const { franchiseId: fqId, dimensionId, status } = req.query;
    const role = req.session.userRole!;

    const effectiveFranchiseId = role === "master_admin" || role === "staff_regional"
      ? fqId ? parseInt(fqId as string) : undefined
      : req.session.franchiseId ?? undefined;

    let baseQuery = db
      .select({
        id: goalsTable.id,
        franchiseId: goalsTable.franchiseId,
        franchiseName: franchisesTable.name,
        dimensionId: goalsTable.dimensionId,
        dimensionName: dimensionsTable.name,
        keyProcessId: goalsTable.keyProcessId,
        keyProcessName: keyProcessesTable.name,
        title: goalsTable.title,
        kriDescription: goalsTable.kriDescription,
        currentValue: goalsTable.currentValue,
        targetValue: goalsTable.targetValue,
        unit: goalsTable.unit,
        startDate: goalsTable.startDate,
        endDate: goalsTable.endDate,
        ownerUserId: goalsTable.ownerUserId,
        ownerName: usersTable.name,
        frequency: goalsTable.frequency,
        status: goalsTable.status,
        progressPercentage: goalsTable.progressPercentage,
        riskStatus: goalsTable.riskStatus,
        score: goalsTable.score,
        createdAt: goalsTable.createdAt,
      })
      .from(goalsTable)
      .leftJoin(franchisesTable, eq(goalsTable.franchiseId, franchisesTable.id))
      .leftJoin(dimensionsTable, eq(goalsTable.dimensionId, dimensionsTable.id))
      .leftJoin(keyProcessesTable, eq(goalsTable.keyProcessId, keyProcessesTable.id))
      .leftJoin(usersTable, eq(goalsTable.ownerUserId, usersTable.id));

    const conditions = [isNull(goalsTable.deletedAt)];
    if (effectiveFranchiseId) conditions.push(eq(goalsTable.franchiseId, effectiveFranchiseId));
    if (dimensionId) conditions.push(eq(goalsTable.dimensionId, parseInt(dimensionId as string)));
    if (status) conditions.push(eq(goalsTable.status, status as string));

    const rows = await baseQuery.where(and(...conditions)).orderBy(goalsTable.createdAt);

    const enriched = await Promise.all(rows.map(enrichGoal));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/goals", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, dimensionId, keyProcessId, title, kriDescription, currentValue, targetValue, unit, startDate, endDate, ownerUserId, frequency } = req.body;
    if (!canAccessFranchise(req, franchiseId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (startDate) {
      const [existing] = await db
        .select({ id: goalsTable.id, title: goalsTable.title })
        .from(goalsTable)
        .where(and(
          eq(goalsTable.franchiseId, franchiseId),
          eq(goalsTable.keyProcessId, keyProcessId),
          eq(goalsTable.startDate, startDate),
        ))
        .limit(1);
      if (existing) {
        res.status(409).json({
          error: "Já existe uma meta para este processo-chave neste período.",
          existingGoalId: existing.id,
        });
        return;
      }
    }

    const [g] = await db.insert(goalsTable).values({
      franchiseId, dimensionId, keyProcessId, title,
      kriDescription, currentValue, targetValue, unit,
      startDate, endDate, ownerUserId, frequency,
      status: "em_andamento",
      progressPercentage: calcProgress(currentValue, targetValue),
    }).returning();
    const enriched = await enrichGoal({ ...g, franchiseName: null, dimensionName: null, keyProcessName: null, ownerName: null });
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/goals/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const rows = await db
      .select({
        id: goalsTable.id,
        franchiseId: goalsTable.franchiseId,
        franchiseName: franchisesTable.name,
        dimensionId: goalsTable.dimensionId,
        dimensionName: dimensionsTable.name,
        keyProcessId: goalsTable.keyProcessId,
        keyProcessName: keyProcessesTable.name,
        title: goalsTable.title,
        kriDescription: goalsTable.kriDescription,
        currentValue: goalsTable.currentValue,
        targetValue: goalsTable.targetValue,
        unit: goalsTable.unit,
        startDate: goalsTable.startDate,
        endDate: goalsTable.endDate,
        ownerUserId: goalsTable.ownerUserId,
        ownerName: usersTable.name,
        frequency: goalsTable.frequency,
        status: goalsTable.status,
        progressPercentage: goalsTable.progressPercentage,
        riskStatus: goalsTable.riskStatus,
        score: goalsTable.score,
        createdAt: goalsTable.createdAt,
      })
      .from(goalsTable)
      .leftJoin(franchisesTable, eq(goalsTable.franchiseId, franchisesTable.id))
      .leftJoin(dimensionsTable, eq(goalsTable.dimensionId, dimensionsTable.id))
      .leftJoin(keyProcessesTable, eq(goalsTable.keyProcessId, keyProcessesTable.id))
      .leftJoin(usersTable, eq(goalsTable.ownerUserId, usersTable.id))
      .where(eq(goalsTable.id, id))
      .limit(1);

    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    const g = rows[0];
    if (!canAccessFranchise(req, g.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const kpis = await db.select().from(kpisTable).where(and(eq(kpisTable.goalId, id), isNull(kpisTable.deletedAt))).orderBy(kpisTable.createdAt);
    const initiatives = await db
      .select({
        id: goalInitiativesTable.id,
        goalId: goalInitiativesTable.goalId,
        strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
        initiativeName: strategicInitiativesTable.name,
        catalogActive: strategicInitiativesTable.active,
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        desiredResult: goalInitiativesTable.desiredResult,
        actualResult: goalInitiativesTable.actualResult,
        resultValue: goalInitiativesTable.resultValue,
        resultUnit: goalInitiativesTable.resultUnit,
        mainKpiId: goalInitiativesTable.mainKpiId,
        ownerUserId: goalInitiativesTable.ownerUserId,
        ownerName: usersTable.name,
        startDate: goalInitiativesTable.startDate,
        endDate: goalInitiativesTable.endDate,
        frequency: goalInitiativesTable.frequency,
        executionDay: goalInitiativesTable.executionDay,
        executionTime: goalInitiativesTable.executionTime,
        estimatedTime: goalInitiativesTable.estimatedTime,
        whatWillBeDone: goalInitiativesTable.whatWillBeDone,
        whyItMatters: goalInitiativesTable.whyItMatters,
        whoIsResponsible: goalInitiativesTable.whoIsResponsible,
        whereItWillBeDone: goalInitiativesTable.whereItWillBeDone,
        howItWillBeDone: goalInitiativesTable.howItWillBeDone,
        investmentOrEffort: goalInitiativesTable.investmentOrEffort,
        progressPercentage: goalInitiativesTable.progressPercentage,
        status: goalInitiativesTable.status,
        notes: goalInitiativesTable.notes,
        createdAt: goalInitiativesTable.createdAt,
      })
      .from(goalInitiativesTable)
      .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
      .leftJoin(dimensionsTable, eq(strategicInitiativesTable.dimensionId, dimensionsTable.id))
      .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id))
      .leftJoin(usersTable, eq(goalInitiativesTable.ownerUserId, usersTable.id))
      .where(and(eq(goalInitiativesTable.goalId, id), isNull(goalInitiativesTable.deletedAt)))
      .orderBy(goalInitiativesTable.createdAt);

    const enriched = await enrichGoal(g);
    const activeInitiatives = initiatives.filter(i => i.status === "ativa").length;

    res.json({
      ...enriched,
      kpis: kpis.map(k => ({
        ...k, createdAt: k.createdAt.toISOString(),
      })),
      initiatives: initiatives.map(i => ({
        ...i, createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/goals/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [existingGoal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id)).limit(1);
    if (!existingGoal) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existingGoal.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const fields = ["title", "kriDescription", "currentValue", "targetValue", "unit", "startDate", "endDate", "ownerUserId", "frequency", "status"];
    const update: Record<string, unknown> = {};
    fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    // Recalculate progressPercentage whenever current or target value changes
    const newCurrentValue = update.currentValue !== undefined ? update.currentValue : existingGoal.currentValue;
    const newTargetValue = update.targetValue !== undefined ? update.targetValue : existingGoal.targetValue;
    update.progressPercentage = calcProgress(newCurrentValue as number, newTargetValue as number);

    const [g] = await db.update(goalsTable).set(update).where(eq(goalsTable.id, id)).returning();

    if (shouldAudit(req.session.userRole!)) {
      const oldSnap: Record<string, unknown> = {};
      const newSnap: Record<string, unknown> = {};
      fields.forEach(f => {
        if (update[f] !== undefined) {
          oldSnap[f] = (existingGoal as any)[f];
          newSnap[f] = update[f];
        }
      });
      await logAudit({
        userId: req.session.userId!, userName: req.session.userName!, userEmail: req.session.userEmail!,
        action: "update", entityType: "goal", entityId: id, entityName: existingGoal.title,
        oldData: oldSnap, newData: newSnap,
      });
    }

    const enriched = await enrichGoal({ ...g, franchiseName: null, dimensionName: null, keyProcessName: null, ownerName: null });
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// KPIs
router.get("/goals/:id/kpis", requireAuth, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id as string);
    const franchiseId = await getGoalFranchiseId(goalId);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const rows = await db.select().from(kpisTable).where(and(eq(kpisTable.goalId, goalId), isNull(kpisTable.deletedAt))).orderBy(kpisTable.createdAt);
    res.json(rows.map(k => ({ ...k, createdAt: k.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/goals/:id/kpis", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id as string);
    const franchiseId = await getGoalFranchiseId(goalId);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const existing = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(kpisTable).where(and(eq(kpisTable.goalId, goalId), isNull(kpisTable.deletedAt)));
    if ((existing[0]?.count ?? 0) >= 3) {
      res.status(400).json({ error: "Maximum 3 KPIs per goal" });
      return;
    }
    const { name, initialValue, currentValue, targetValue, unit, frequency, indicatorType, desiredDirection, notes } = req.body;
    const [k] = await db.insert(kpisTable).values({ goalId, name, initialValue, currentValue, targetValue, unit, frequency, indicatorType, desiredDirection, notes }).returning();
    res.status(201).json({ ...k, createdAt: k.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/kpis/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const franchiseId = await getKpiFranchiseId(id);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const fields = ["name", "currentValue", "targetValue", "unit", "frequency", "indicatorType", "desiredDirection", "notes"];
    const update: Record<string, unknown> = {};
    fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });
    const [k] = await db.update(kpisTable).set(update).where(eq(kpisTable.id, id)).returning();
    if (!k) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...k, createdAt: k.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/goals/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [existingGoal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id)).limit(1);
    if (!existingGoal) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existingGoal.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const now = new Date();
    const deletedByUserId = req.session.userId!;
    const deletedByName = req.session.userName!;
    // Soft delete child KPIs and initiatives
    await db.update(kpisTable)
      .set({ deletedAt: now, deletedByUserId, deletedByName })
      .where(and(eq(kpisTable.goalId, id), isNull(kpisTable.deletedAt)));
    await db.update(goalInitiativesTable)
      .set({ deletedAt: now, deletedByUserId, deletedByName })
      .where(and(eq(goalInitiativesTable.goalId, id), isNull(goalInitiativesTable.deletedAt)));
    // Soft delete the goal itself
    await db.update(goalsTable)
      .set({ deletedAt: now, deletedByUserId, deletedByName })
      .where(eq(goalsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/kpis/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const franchiseId = await getKpiFranchiseId(id);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.update(kpisTable)
      .set({ deletedAt: new Date(), deletedByUserId: req.session.userId!, deletedByName: req.session.userName! })
      .where(eq(kpisTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// List all goal initiatives for a franchise
router.get("/goal-initiatives", requireAuth, async (req, res) => {
  try {
    const { franchiseId, status } = req.query;
    const role = req.session.userRole!;
    const effectiveFranchiseId = role === "master_admin" || role === "staff_regional"
      ? franchiseId ? parseInt(franchiseId as string) : undefined
      : req.session.franchiseId ?? undefined;

    const conditions: any[] = [];
    if (effectiveFranchiseId) conditions.push(eq(goalsTable.franchiseId, effectiveFranchiseId));
    if (status) conditions.push(eq(goalInitiativesTable.status, status as string));

    const rows = await db
      .select({
        id: goalInitiativesTable.id,
        goalId: goalInitiativesTable.goalId,
        goalTitle: goalsTable.title,
        franchiseId: goalsTable.franchiseId,
        strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
        customName: goalInitiativesTable.customName,
        initiativeName: strategicInitiativesTable.name,
        catalogActive: strategicInitiativesTable.active,
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        desiredResult: goalInitiativesTable.desiredResult,
        actualResult: goalInitiativesTable.actualResult,
        resultValue: goalInitiativesTable.resultValue,
        resultUnit: goalInitiativesTable.resultUnit,
        mainKpiId: goalInitiativesTable.mainKpiId,
        ownerUserId: goalInitiativesTable.ownerUserId,
        ownerName: usersTable.name,
        startDate: goalInitiativesTable.startDate,
        endDate: goalInitiativesTable.endDate,
        frequency: goalInitiativesTable.frequency,
        executionDay: goalInitiativesTable.executionDay,
        executionTime: goalInitiativesTable.executionTime,
        estimatedTime: goalInitiativesTable.estimatedTime,
        whatWillBeDone: goalInitiativesTable.whatWillBeDone,
        whyItMatters: goalInitiativesTable.whyItMatters,
        whoIsResponsible: goalInitiativesTable.whoIsResponsible,
        whereItWillBeDone: goalInitiativesTable.whereItWillBeDone,
        howItWillBeDone: goalInitiativesTable.howItWillBeDone,
        investmentOrEffort: goalInitiativesTable.investmentOrEffort,
        progressPercentage: goalInitiativesTable.progressPercentage,
        status: goalInitiativesTable.status,
        pinnedDate: goalInitiativesTable.pinnedDate,
        notes: goalInitiativesTable.notes,
        createdAt: goalInitiativesTable.createdAt,
      })
      .from(goalInitiativesTable)
      .innerJoin(goalsTable, eq(goalInitiativesTable.goalId, goalsTable.id))
      .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
      .leftJoin(dimensionsTable, eq(strategicInitiativesTable.dimensionId, dimensionsTable.id))
      .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id))
      .leftJoin(usersTable, eq(goalInitiativesTable.ownerUserId, usersTable.id))
      .where(and(
        conditions.length > 0 ? and(...conditions) : undefined,
        isNull(goalInitiativesTable.deletedAt),
      ))
      .orderBy(goalInitiativesTable.createdAt);

    res.json(rows.map(i => ({ ...i, createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Goal Initiatives
router.get("/goals/:id/initiatives", requireAuth, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id as string);
    const franchiseId = await getGoalFranchiseId(goalId);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const rows = await db
      .select({
        id: goalInitiativesTable.id,
        goalId: goalInitiativesTable.goalId,
        strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
        customName: goalInitiativesTable.customName,
        initiativeName: strategicInitiativesTable.name,
        catalogActive: strategicInitiativesTable.active,
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        desiredResult: goalInitiativesTable.desiredResult,
        actualResult: goalInitiativesTable.actualResult,
        resultValue: goalInitiativesTable.resultValue,
        resultUnit: goalInitiativesTable.resultUnit,
        mainKpiId: goalInitiativesTable.mainKpiId,
        ownerUserId: goalInitiativesTable.ownerUserId,
        ownerName: usersTable.name,
        startDate: goalInitiativesTable.startDate,
        endDate: goalInitiativesTable.endDate,
        frequency: goalInitiativesTable.frequency,
        executionDay: goalInitiativesTable.executionDay,
        executionTime: goalInitiativesTable.executionTime,
        estimatedTime: goalInitiativesTable.estimatedTime,
        whatWillBeDone: goalInitiativesTable.whatWillBeDone,
        whyItMatters: goalInitiativesTable.whyItMatters,
        whoIsResponsible: goalInitiativesTable.whoIsResponsible,
        whereItWillBeDone: goalInitiativesTable.whereItWillBeDone,
        howItWillBeDone: goalInitiativesTable.howItWillBeDone,
        investmentOrEffort: goalInitiativesTable.investmentOrEffort,
        progressPercentage: goalInitiativesTable.progressPercentage,
        status: goalInitiativesTable.status,
        notes: goalInitiativesTable.notes,
        createdAt: goalInitiativesTable.createdAt,
      })
      .from(goalInitiativesTable)
      .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
      .leftJoin(dimensionsTable, eq(strategicInitiativesTable.dimensionId, dimensionsTable.id))
      .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id))
      .leftJoin(usersTable, eq(goalInitiativesTable.ownerUserId, usersTable.id))
      .where(eq(goalInitiativesTable.goalId, goalId))
      .orderBy(goalInitiativesTable.createdAt);
    res.json(rows.map(i => ({ ...i, createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/goals/:id/initiatives", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id as string);
    const franchiseId = await getGoalFranchiseId(goalId);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const activeCount = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(goalInitiativesTable)
      .where(and(eq(goalInitiativesTable.goalId, goalId), eq(goalInitiativesTable.status, "ativa")));

    if ((activeCount[0]?.count ?? 0) >= 3) {
      res.status(400).json({ error: "Maximum 3 active initiatives per goal. Conclude, pause, or cancel one first." });
      return;
    }

    const { strategicInitiativeId, customName, desiredResult, mainKpiId, ownerUserId, startDate, endDate, frequency, executionDay, executionTime, estimatedTime, whatWillBeDone, whyItMatters, whoIsResponsible, whereItWillBeDone, howItWillBeDone, investmentOrEffort, notes } = req.body;

    if (!strategicInitiativeId && !customName) {
      res.status(400).json({ error: "Either strategicInitiativeId or customName is required." });
      return;
    }

    if (strategicInitiativeId) {
      const [catalogItem] = await db
        .select({ active: strategicInitiativesTable.active })
        .from(strategicInitiativesTable)
        .where(eq(strategicInitiativesTable.id, strategicInitiativeId))
        .limit(1);
      if (!catalogItem) {
        res.status(400).json({ error: "Strategic initiative not found." });
        return;
      }
      if (!catalogItem.active) {
        res.status(400).json({ error: "Cannot link a deactivated strategic initiative to a goal." });
        return;
      }

      const [existing] = await db
        .select({ id: goalInitiativesTable.id })
        .from(goalInitiativesTable)
        .where(and(eq(goalInitiativesTable.goalId, goalId), eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativeId)))
        .limit(1);
      if (existing) {
        res.status(409).json({ error: "This strategic initiative is already linked to this goal." });
        return;
      }
    }

    let insertedRows: (typeof goalInitiativesTable.$inferSelect)[];
    try {
      insertedRows = await db.insert(goalInitiativesTable).values({
        goalId, strategicInitiativeId: strategicInitiativeId || null, customName: customName || null,
        desiredResult, mainKpiId, ownerUserId,
        startDate, endDate, frequency, executionDay, executionTime, estimatedTime,
        whatWillBeDone, whyItMatters, whoIsResponsible, whereItWillBeDone,
        howItWillBeDone, investmentOrEffort, notes, status: "ativa",
      }).returning();
    } catch (insertErr: any) {
      if (insertErr?.code === "23505") {
        res.status(409).json({ error: "This strategic initiative is already linked to this goal." });
        return;
      }
      throw insertErr;
    }

    const initiative = insertedRows[0];
    res.status(201).json({ ...initiative, createdAt: initiative.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/goal-initiatives/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const franchiseId = await getInitiativeFranchiseId(id);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const rows = await db
      .select({
        id: goalInitiativesTable.id,
        goalId: goalInitiativesTable.goalId,
        strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
        customName: goalInitiativesTable.customName,
        initiativeName: strategicInitiativesTable.name,
        catalogActive: strategicInitiativesTable.active,
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        desiredResult: goalInitiativesTable.desiredResult,
        actualResult: goalInitiativesTable.actualResult,
        resultValue: goalInitiativesTable.resultValue,
        resultUnit: goalInitiativesTable.resultUnit,
        mainKpiId: goalInitiativesTable.mainKpiId,
        ownerUserId: goalInitiativesTable.ownerUserId,
        ownerName: usersTable.name,
        startDate: goalInitiativesTable.startDate,
        endDate: goalInitiativesTable.endDate,
        frequency: goalInitiativesTable.frequency,
        executionDay: goalInitiativesTable.executionDay,
        executionTime: goalInitiativesTable.executionTime,
        estimatedTime: goalInitiativesTable.estimatedTime,
        whatWillBeDone: goalInitiativesTable.whatWillBeDone,
        whyItMatters: goalInitiativesTable.whyItMatters,
        whoIsResponsible: goalInitiativesTable.whoIsResponsible,
        whereItWillBeDone: goalInitiativesTable.whereItWillBeDone,
        howItWillBeDone: goalInitiativesTable.howItWillBeDone,
        investmentOrEffort: goalInitiativesTable.investmentOrEffort,
        progressPercentage: goalInitiativesTable.progressPercentage,
        status: goalInitiativesTable.status,
        notes: goalInitiativesTable.notes,
        createdAt: goalInitiativesTable.createdAt,
      })
      .from(goalInitiativesTable)
      .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
      .leftJoin(dimensionsTable, eq(strategicInitiativesTable.dimensionId, dimensionsTable.id))
      .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id))
      .leftJoin(usersTable, eq(goalInitiativesTable.ownerUserId, usersTable.id))
      .where(eq(goalInitiativesTable.id, id))
      .limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    const i = rows[0];
    res.json({ ...i, createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/goal-initiatives/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const franchiseId = await getInitiativeFranchiseId(id);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const fields = ["customName", "desiredResult", "actualResult", "resultValue", "resultUnit", "ownerUserId", "startDate", "endDate", "frequency", "executionDay", "executionTime", "estimatedTime", "whatWillBeDone", "whyItMatters", "whoIsResponsible", "whereItWillBeDone", "howItWillBeDone", "investmentOrEffort", "progressPercentage", "status", "notes"];
    const update: Record<string, unknown> = {};
    fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const prevRows = await db.select({ status: goalInitiativesTable.status, progressPercentage: goalInitiativesTable.progressPercentage }).from(goalInitiativesTable).where(eq(goalInitiativesTable.id, id)).limit(1);
    const prev = prevRows[0];

    const [initiative] = await db.update(goalInitiativesTable).set(update).where(eq(goalInitiativesTable.id, id)).returning();
    if (!initiative) { res.status(404).json({ error: "Not found" }); return; }

    if (prev && (prev.progressPercentage !== initiative.progressPercentage || prev.status !== initiative.status)) {
      const goal = await db.select({ franchiseId: goalsTable.franchiseId }).from(goalsTable).where(eq(goalsTable.id, initiative.goalId)).limit(1);
      await db.insert(progressHistoryTable).values({
        entityType: "goal_initiative",
        entityId: id,
        franchiseId: goal[0]?.franchiseId,
        userId: req.session.userId,
        previousProgress: prev.progressPercentage,
        newProgress: initiative.progressPercentage,
        previousStatus: prev.status,
        newStatus: initiative.status,
      });
    }

    res.json({ ...initiative, createdAt: initiative.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/goal-initiatives/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const franchiseId = await getInitiativeFranchiseId(id);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.update(goalInitiativesTable)
      .set({ deletedAt: new Date(), deletedByUserId: req.session.userId!, deletedByName: req.session.userName! })
      .where(eq(goalInitiativesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Restore routes ───────────────────────────────────────────────────────────

router.post("/goals/:id/restore", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const [goal] = await db.select().from(goalsTable).where(eq(goalsTable.id, id)).limit(1);
    if (!goal) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, goal.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const [restored] = await db.update(goalsTable)
      .set({ deletedAt: null, deletedByUserId: null, deletedByName: null })
      .where(eq(goalsTable.id, id))
      .returning();
    // Restore KPIs and initiatives deleted at the same time as the goal (within 5s)
    if (goal.deletedAt) {
      const deletedAt = new Date(goal.deletedAt);
      const windowStart = new Date(deletedAt.getTime() - 5000);
      const windowEnd = new Date(deletedAt.getTime() + 5000);
      await db.update(kpisTable)
        .set({ deletedAt: null, deletedByUserId: null, deletedByName: null })
        .where(and(
          eq(kpisTable.goalId, id),
          isNotNull(kpisTable.deletedAt),
          sql`${kpisTable.deletedAt} BETWEEN ${windowStart.toISOString()} AND ${windowEnd.toISOString()}`,
        ));
      await db.update(goalInitiativesTable)
        .set({ deletedAt: null, deletedByUserId: null, deletedByName: null })
        .where(and(
          eq(goalInitiativesTable.goalId, id),
          isNotNull(goalInitiativesTable.deletedAt),
          sql`${goalInitiativesTable.deletedAt} BETWEEN ${windowStart.toISOString()} AND ${windowEnd.toISOString()}`,
        ));
    }
    const enriched = await enrichGoal({ ...restored, franchiseName: null, dimensionName: null, keyProcessName: null, ownerName: null });
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/kpis/:id/restore", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const franchiseId = await getKpiFranchiseId(id);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const [k] = await db.update(kpisTable)
      .set({ deletedAt: null, deletedByUserId: null, deletedByName: null })
      .where(eq(kpisTable.id, id))
      .returning();
    res.json({ ...k, createdAt: k.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/goal-initiatives/:id/toggle-today", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const franchiseId = await getInitiativeFranchiseId(id);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const today = new Date().toISOString().split("T")[0];
    const [current] = await db.select({ pinnedDate: goalInitiativesTable.pinnedDate })
      .from(goalInitiativesTable).where(eq(goalInitiativesTable.id, id)).limit(1);
    const newPinnedDate = current?.pinnedDate === today ? null : today;
    await db.update(goalInitiativesTable).set({ pinnedDate: newPinnedDate }).where(eq(goalInitiativesTable.id, id));
    res.json({ id, pinnedDate: newPinnedDate });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/goal-initiatives/:id/restore", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const franchiseId = await getInitiativeFranchiseId(id);
    if (franchiseId === null) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    const [ini] = await db.update(goalInitiativesTable)
      .set({ deletedAt: null, deletedByUserId: null, deletedByName: null })
      .where(eq(goalInitiativesTable.id, id))
      .returning();
    res.json({ ...ini, createdAt: ini.createdAt instanceof Date ? ini.createdAt.toISOString() : ini.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Trash (list soft-deleted items for a franchise) ─────────────────────────

router.get("/trash", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    const franchiseId = (role === "master_admin" || role === "staff_regional")
      ? (paramFranchiseId ?? req.session.franchiseId)
      : req.session.franchiseId;
    if (!franchiseId) { res.status(400).json({ error: "franchiseId required" }); return; }

    const [deletedGoals, deletedKpis, deletedInitiatives] = await Promise.all([
      db.select({
        id: goalsTable.id,
        title: goalsTable.title,
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        deletedAt: goalsTable.deletedAt,
        deletedByName: goalsTable.deletedByName,
      })
        .from(goalsTable)
        .leftJoin(dimensionsTable, eq(goalsTable.dimensionId, dimensionsTable.id))
        .leftJoin(keyProcessesTable, eq(goalsTable.keyProcessId, keyProcessesTable.id))
        .where(and(eq(goalsTable.franchiseId, franchiseId), isNotNull(goalsTable.deletedAt)))
        .orderBy(goalsTable.deletedAt),

      db.select({
        id: kpisTable.id,
        name: kpisTable.name,
        goalId: kpisTable.goalId,
        goalTitle: goalsTable.title,
        deletedAt: kpisTable.deletedAt,
        deletedByName: kpisTable.deletedByName,
      })
        .from(kpisTable)
        .innerJoin(goalsTable, eq(kpisTable.goalId, goalsTable.id))
        .where(and(eq(goalsTable.franchiseId, franchiseId), isNotNull(kpisTable.deletedAt)))
        .orderBy(kpisTable.deletedAt),

      db.select({
        id: goalInitiativesTable.id,
        customName: goalInitiativesTable.customName,
        initiativeName: strategicInitiativesTable.name,
        goalId: goalInitiativesTable.goalId,
        goalTitle: goalsTable.title,
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        deletedAt: goalInitiativesTable.deletedAt,
        deletedByName: goalInitiativesTable.deletedByName,
      })
        .from(goalInitiativesTable)
        .innerJoin(goalsTable, eq(goalInitiativesTable.goalId, goalsTable.id))
        .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
        .leftJoin(dimensionsTable, eq(goalsTable.dimensionId, dimensionsTable.id))
        .leftJoin(keyProcessesTable, eq(goalsTable.keyProcessId, keyProcessesTable.id))
        .where(and(eq(goalsTable.franchiseId, franchiseId), isNotNull(goalInitiativesTable.deletedAt)))
        .orderBy(goalInitiativesTable.deletedAt),
    ]);

    const items = [
      ...deletedGoals.map(g => ({
        entityType: "goal",
        entityId: g.id,
        entityName: g.title,
        goalId: null,
        goalTitle: null,
        dimensionName: g.dimensionName,
        keyProcessName: g.keyProcessName,
        deletedAt: g.deletedAt instanceof Date ? g.deletedAt.toISOString() : g.deletedAt,
        deletedByName: g.deletedByName,
      })),
      ...deletedKpis.map(k => ({
        entityType: "kpi",
        entityId: k.id,
        entityName: k.name,
        goalId: k.goalId,
        goalTitle: k.goalTitle,
        dimensionName: null,
        keyProcessName: null,
        deletedAt: k.deletedAt instanceof Date ? k.deletedAt.toISOString() : k.deletedAt,
        deletedByName: k.deletedByName,
      })),
      ...deletedInitiatives.map(i => ({
        entityType: "goal_initiative",
        entityId: i.id,
        entityName: i.initiativeName || i.customName || "Iniciativa",
        goalId: i.goalId,
        goalTitle: i.goalTitle,
        dimensionName: i.dimensionName,
        keyProcessName: i.keyProcessName,
        deletedAt: i.deletedAt instanceof Date ? i.deletedAt.toISOString() : i.deletedAt,
        deletedByName: i.deletedByName,
      })),
    ].sort((a, b) => new Date(b.deletedAt!).getTime() - new Date(a.deletedAt!).getTime());

    res.json(items);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /ranking/initiatives — benchmarking of catalog initiatives across all franchises
router.get("/ranking/initiatives", requireAuth, async (req, res) => {
  try {
    const { kri, keyProcessId } = req.query;

    const kriFilter = kri ? sql`AND si.kri = ${kri as string}` : sql``;
    const kpFilter = keyProcessId ? sql`AND si.key_process_id = ${parseInt(keyProcessId as string)}` : sql``;

    const rows = await db.execute(sql`
      SELECT
        gi.strategic_initiative_id,
        COALESCE(si.name, gi.custom_name)          AS initiative_name,
        si.kri,
        si.kpi,
        kp.name                                    AS key_process_name,
        d.name                                     AS dimension_name,
        COUNT(DISTINCT g.franchise_id)             AS adoption_count,
        COUNT(CASE WHEN gi.status = 'concluida' THEN 1 END) AS completion_count,
        ROUND(AVG(gi.result_value) FILTER (WHERE gi.result_value IS NOT NULL)::numeric, 2) AS avg_result_value,
        MAX(gi.result_value)                       AS top_result_value,
        si.key_process_id
      FROM goal_initiatives gi
      JOIN goals g ON gi.goal_id = g.id
      LEFT JOIN strategic_initiatives si ON gi.strategic_initiative_id = si.id
      LEFT JOIN key_processes kp ON si.key_process_id = kp.id
      LEFT JOIN dimensions d ON kp.dimension_id = d.id
      WHERE gi.deleted_at IS NULL
        AND g.deleted_at IS NULL
        AND gi.strategic_initiative_id IS NOT NULL
        ${kriFilter}
        ${kpFilter}
      GROUP BY
        gi.strategic_initiative_id, si.name, gi.custom_name,
        si.kri, si.kpi, kp.name, d.name, si.key_process_id
      ORDER BY adoption_count DESC, completion_count DESC
      LIMIT 60
    `);

    const initiativeIds = (rows.rows as any[])
      .map((r: any) => r.strategic_initiative_id)
      .filter(Boolean);

    let franchiseRows: any[] = [];
    if (initiativeIds.length > 0) {
      const fr = await db.execute(sql`
        SELECT
          gi.strategic_initiative_id,
          f.name  AS franchise_name,
          gi.result_value,
          gi.result_unit,
          gi.actual_result,
          gi.status
        FROM goal_initiatives gi
        JOIN goals g    ON gi.goal_id = g.id
        JOIN franchises f ON g.franchise_id = f.id
        WHERE gi.deleted_at IS NULL
          AND g.deleted_at IS NULL
          AND gi.strategic_initiative_id = ANY(ARRAY[${sql.join(initiativeIds.map(id => sql`${id}`), sql`, `)}]::int[])
        ORDER BY gi.result_value DESC NULLS LAST
      `);
      franchiseRows = fr.rows as any[];
    }

    const byInit = new Map<number, any[]>();
    for (const r of franchiseRows) {
      const id = r.strategic_initiative_id;
      if (!byInit.has(id)) byInit.set(id, []);
      byInit.get(id)!.push(r);
    }

    const result = (rows.rows as any[]).map((r: any) => ({
      initiativeId: r.strategic_initiative_id,
      initiativeName: r.initiative_name,
      kri: r.kri ?? null,
      kpi: r.kpi ?? null,
      keyProcessName: r.key_process_name ?? null,
      dimensionName: r.dimension_name ?? null,
      adoptionCount: parseInt(r.adoption_count) || 0,
      completionCount: parseInt(r.completion_count) || 0,
      avgResultValue: r.avg_result_value != null ? parseFloat(r.avg_result_value) : null,
      topResultValue: r.top_result_value != null ? parseFloat(r.top_result_value) : null,
      franchiseResults: (byInit.get(r.strategic_initiative_id) ?? []).map((fr: any) => ({
        franchiseName: fr.franchise_name,
        resultValue: fr.result_value != null ? parseFloat(fr.result_value) : null,
        resultUnit: fr.result_unit ?? null,
        actualResult: fr.actual_result ?? null,
        status: fr.status,
      })),
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
