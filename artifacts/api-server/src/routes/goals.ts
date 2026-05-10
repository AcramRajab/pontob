import { Router } from "express";
import { db, goalsTable, kpisTable, goalInitiativesTable, franchisesTable, usersTable, dimensionsTable, keyProcessesTable, strategicInitiativesTable, progressHistoryTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "../middlewares/auth";

const router = Router();

function canAccessFranchise(req: any, franchiseId: number) {
  const role = req.session.userRole;
  if (role === "master_admin" || role === "staff_regional") return true;
  return req.session.franchiseId === franchiseId;
}

function calcScore(goal: any) {
  const progress = goal.progressPercentage || 0;
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
  const progress = goal.progressPercentage || 0;
  const diff = progress - timeElapsed;
  if (diff < -15) return "atrasado";
  if (diff > 15) return "adiantado";
  return "no_prazo";
}

async function enrichGoal(g: any) {
  const activeInitiatives = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(goalInitiativesTable)
    .where(and(eq(goalInitiativesTable.goalId, g.id), eq(goalInitiativesTable.status, "ativa")));

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
    progressPercentage: g.progressPercentage,
    riskStatus: g.riskStatus || calcRisk(g),
    score: g.score,
    activeInitiativesCount: activeInitiatives[0]?.count ?? 0,
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

    const conditions = [];
    if (effectiveFranchiseId) conditions.push(eq(goalsTable.franchiseId, effectiveFranchiseId));
    if (dimensionId) conditions.push(eq(goalsTable.dimensionId, parseInt(dimensionId as string)));
    if (status) conditions.push(eq(goalsTable.status, status as string));

    const rows = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(goalsTable.createdAt)
      : await baseQuery.orderBy(goalsTable.createdAt);

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
    const [g] = await db.insert(goalsTable).values({
      franchiseId, dimensionId, keyProcessId, title,
      kriDescription, currentValue, targetValue, unit,
      startDate, endDate, ownerUserId, frequency,
      status: "em_andamento",
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
    const id = parseInt(req.params.id);
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

    const kpis = await db.select().from(kpisTable).where(eq(kpisTable.goalId, id)).orderBy(kpisTable.createdAt);
    const initiatives = await db
      .select({
        id: goalInitiativesTable.id,
        goalId: goalInitiativesTable.goalId,
        strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
        initiativeName: strategicInitiativesTable.name,
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        desiredResult: goalInitiativesTable.desiredResult,
        actualResult: goalInitiativesTable.actualResult,
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
      .where(eq(goalInitiativesTable.goalId, id))
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
    const id = parseInt(req.params.id);
    const existing = await db.select({ franchiseId: goalsTable.franchiseId }).from(goalsTable).where(eq(goalsTable.id, id)).limit(1);
    if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing[0].franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const fields = ["title", "kriDescription", "currentValue", "targetValue", "unit", "startDate", "endDate", "ownerUserId", "frequency", "status"];
    const update: Record<string, unknown> = {};
    fields.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const [g] = await db.update(goalsTable).set(update).where(eq(goalsTable.id, id)).returning();
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
    const goalId = parseInt(req.params.id);
    const rows = await db.select().from(kpisTable).where(eq(kpisTable.goalId, goalId)).orderBy(kpisTable.createdAt);
    res.json(rows.map(k => ({ ...k, createdAt: k.createdAt.toISOString() })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/goals/:id/kpis", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const goalId = parseInt(req.params.id);
    const existing = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(kpisTable).where(eq(kpisTable.goalId, goalId));
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
    const id = parseInt(req.params.id);
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

router.delete("/kpis/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(kpisTable).where(eq(kpisTable.id, id));
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
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        desiredResult: goalInitiativesTable.desiredResult,
        actualResult: goalInitiativesTable.actualResult,
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
      .innerJoin(goalsTable, eq(goalInitiativesTable.goalId, goalsTable.id))
      .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
      .leftJoin(dimensionsTable, eq(strategicInitiativesTable.dimensionId, dimensionsTable.id))
      .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id))
      .leftJoin(usersTable, eq(goalInitiativesTable.ownerUserId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
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
    const goalId = parseInt(req.params.id);
    const rows = await db
      .select({
        id: goalInitiativesTable.id,
        goalId: goalInitiativesTable.goalId,
        strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
        customName: goalInitiativesTable.customName,
        initiativeName: strategicInitiativesTable.name,
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        desiredResult: goalInitiativesTable.desiredResult,
        actualResult: goalInitiativesTable.actualResult,
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
    const goalId = parseInt(req.params.id);
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

    const [initiative] = await db.insert(goalInitiativesTable).values({
      goalId, strategicInitiativeId: strategicInitiativeId || null, customName: customName || null,
      desiredResult, mainKpiId, ownerUserId,
      startDate, endDate, frequency, executionDay, executionTime, estimatedTime,
      whatWillBeDone, whyItMatters, whoIsResponsible, whereItWillBeDone,
      howItWillBeDone, investmentOrEffort, notes, status: "ativa",
    }).returning();

    res.status(201).json({ ...initiative, createdAt: initiative.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/goal-initiatives/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db
      .select({
        id: goalInitiativesTable.id,
        goalId: goalInitiativesTable.goalId,
        strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
        customName: goalInitiativesTable.customName,
        initiativeName: strategicInitiativesTable.name,
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        desiredResult: goalInitiativesTable.desiredResult,
        actualResult: goalInitiativesTable.actualResult,
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
    const id = parseInt(req.params.id);
    const fields = ["customName", "desiredResult", "actualResult", "ownerUserId", "startDate", "endDate", "frequency", "executionDay", "executionTime", "estimatedTime", "whatWillBeDone", "whyItMatters", "whoIsResponsible", "whereItWillBeDone", "howItWillBeDone", "investmentOrEffort", "progressPercentage", "status", "notes"];
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

export default router;
