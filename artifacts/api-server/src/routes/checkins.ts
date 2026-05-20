import { Router } from "express";
import { db, dailyCheckinsTable, weeklyCheckinsTable, monthlyCheckinsTable, goalsTable, usersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "../middlewares/auth";

const router = Router();

function canAccessFranchise(req: any, franchiseId: number) {
  const role = req.session.userRole;
  if (role === "master_admin" || role === "staff_regional") return true;
  return req.session.franchiseId === franchiseId;
}

// Daily check-ins
router.get("/daily-checkins", requireAuth, async (req, res) => {
  try {
    const { goalId, franchiseId, date } = req.query;
    const role = req.session.userRole!;
    const effectiveFranchiseId = role === "master_admin" || role === "staff_regional"
      ? franchiseId ? parseInt(franchiseId as string) : undefined
      : req.session.franchiseId ?? undefined;

    const conditions: any[] = [];
    if (effectiveFranchiseId) conditions.push(eq(dailyCheckinsTable.franchiseId, effectiveFranchiseId));
    if (goalId) conditions.push(eq(dailyCheckinsTable.goalId, parseInt(goalId as string)));
    if (date) conditions.push(eq(dailyCheckinsTable.date, date as string));

    const rows = await db
      .select({
        id: dailyCheckinsTable.id,
        goalId: dailyCheckinsTable.goalId,
        goalTitle: goalsTable.title,
        goalInitiativeId: dailyCheckinsTable.goalInitiativeId,
        franchiseId: dailyCheckinsTable.franchiseId,
        userId: dailyCheckinsTable.userId,
        userName: usersTable.name,
        date: dailyCheckinsTable.date,
        executedToday: dailyCheckinsTable.executedToday,
        progressToday: dailyCheckinsTable.progressToday,
        timeSpent: dailyCheckinsTable.timeSpent,
        blocker: dailyCheckinsTable.blocker,
        nextStep: dailyCheckinsTable.nextStep,
        needsHelp: dailyCheckinsTable.needsHelp,
        notes: dailyCheckinsTable.notes,
        createdAt: dailyCheckinsTable.createdAt,
      })
      .from(dailyCheckinsTable)
      .leftJoin(goalsTable, eq(dailyCheckinsTable.goalId, goalsTable.id))
      .leftJoin(usersTable, eq(dailyCheckinsTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(dailyCheckinsTable.createdAt));

    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/daily-checkins", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { goalId, goalInitiativeId, franchiseId, date, executedToday, progressToday, timeSpent, blocker, nextStep, needsHelp, notes } = req.body;
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const [existing] = await db
      .select()
      .from(dailyCheckinsTable)
      .where(and(eq(dailyCheckinsTable.franchiseId, franchiseId), eq(dailyCheckinsTable.date, date)))
      .limit(1);
    if (existing) {
      res.status(200).json({ ...existing, goalTitle: null, userName: null, createdAt: existing.createdAt.toISOString(), conflict: true });
      return;
    }

    const [c] = await db.insert(dailyCheckinsTable).values({
      goalId, goalInitiativeId, franchiseId, userId: req.session.userId!,
      date, executedToday, progressToday, timeSpent, blocker, nextStep,
      needsHelp: needsHelp ?? false, notes,
    }).returning();
    res.status(201).json({ ...c, goalTitle: null, userName: null, createdAt: c.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Weekly check-ins
router.get("/weekly-checkins", requireAuth, async (req, res) => {
  try {
    const { goalId, franchiseId } = req.query;
    const role = req.session.userRole!;
    const effectiveFranchiseId = role === "master_admin" || role === "staff_regional"
      ? franchiseId ? parseInt(franchiseId as string) : undefined
      : req.session.franchiseId ?? undefined;

    const conditions: any[] = [];
    if (effectiveFranchiseId) conditions.push(eq(weeklyCheckinsTable.franchiseId, effectiveFranchiseId));
    if (goalId) conditions.push(eq(weeklyCheckinsTable.goalId, parseInt(goalId as string)));

    const rows = await db
      .select({
        id: weeklyCheckinsTable.id,
        goalId: weeklyCheckinsTable.goalId,
        goalTitle: goalsTable.title,
        franchiseId: weeklyCheckinsTable.franchiseId,
        userId: weeklyCheckinsTable.userId,
        userName: usersTable.name,
        weekStartDate: weeklyCheckinsTable.weekStartDate,
        weekEndDate: weeklyCheckinsTable.weekEndDate,
        planned: weeklyCheckinsTable.planned,
        executed: weeklyCheckinsTable.executed,
        progressSummary: weeklyCheckinsTable.progressSummary,
        blockers: weeklyCheckinsTable.blockers,
        adjustments: weeklyCheckinsTable.adjustments,
        nextWeekPriority: weeklyCheckinsTable.nextWeekPriority,
        needsRegionalSupport: weeklyCheckinsTable.needsRegionalSupport,
        initiativeDecision: weeklyCheckinsTable.initiativeDecision,
        executionPercentage: weeklyCheckinsTable.executionPercentage,
        checkinDaysCount: weeklyCheckinsTable.checkinDaysCount,
        createdAt: weeklyCheckinsTable.createdAt,
      })
      .from(weeklyCheckinsTable)
      .leftJoin(goalsTable, eq(weeklyCheckinsTable.goalId, goalsTable.id))
      .leftJoin(usersTable, eq(weeklyCheckinsTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(weeklyCheckinsTable.createdAt));

    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/weekly-checkins", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { goalId, franchiseId, weekStartDate, weekEndDate, planned, executed, progressSummary, blockers, adjustments, nextWeekPriority, needsRegionalSupport, initiativeDecision, executionPercentage, checkinDaysCount } = req.body;
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const [existing] = await db
      .select()
      .from(weeklyCheckinsTable)
      .where(and(eq(weeklyCheckinsTable.franchiseId, franchiseId), eq(weeklyCheckinsTable.weekStartDate, weekStartDate)))
      .limit(1);
    if (existing) {
      res.status(200).json({ ...existing, goalTitle: null, userName: null, createdAt: existing.createdAt.toISOString(), conflict: true });
      return;
    }

    const [c] = await db.insert(weeklyCheckinsTable).values({
      goalId, franchiseId, userId: req.session.userId!,
      weekStartDate, weekEndDate, planned, executed, progressSummary,
      blockers, adjustments, nextWeekPriority, needsRegionalSupport: needsRegionalSupport ?? false,
      initiativeDecision, executionPercentage, checkinDaysCount,
    }).returning();
    res.status(201).json({ ...c, goalTitle: null, userName: null, createdAt: c.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Monthly check-ins
router.get("/monthly-checkins", requireAuth, async (req, res) => {
  try {
    const { goalId, franchiseId } = req.query;
    const role = req.session.userRole!;
    const effectiveFranchiseId = role === "master_admin" || role === "staff_regional"
      ? franchiseId ? parseInt(franchiseId as string) : undefined
      : req.session.franchiseId ?? undefined;

    const conditions: any[] = [];
    if (effectiveFranchiseId) conditions.push(eq(monthlyCheckinsTable.franchiseId, effectiveFranchiseId));
    if (goalId) conditions.push(eq(monthlyCheckinsTable.goalId, parseInt(goalId as string)));

    const rows = await db
      .select({
        id: monthlyCheckinsTable.id,
        goalId: monthlyCheckinsTable.goalId,
        goalTitle: goalsTable.title,
        franchiseId: monthlyCheckinsTable.franchiseId,
        userId: monthlyCheckinsTable.userId,
        userName: usersTable.name,
        month: monthlyCheckinsTable.month,
        year: monthlyCheckinsTable.year,
        kriProgress: monthlyCheckinsTable.kriProgress,
        improvedKpis: monthlyCheckinsTable.improvedKpis,
        worsenedKpis: monthlyCheckinsTable.worsenedKpis,
        initiativesThatWorked: monthlyCheckinsTable.initiativesThatWorked,
        initiativesThatDidNotWork: monthlyCheckinsTable.initiativesThatDidNotWork,
        continueDoing: monthlyCheckinsTable.continueDoing,
        stopDoing: monthlyCheckinsTable.stopDoing,
        startDoing: monthlyCheckinsTable.startDoing,
        nextMonthFocus: monthlyCheckinsTable.nextMonthFocus,
        createdAt: monthlyCheckinsTable.createdAt,
      })
      .from(monthlyCheckinsTable)
      .leftJoin(goalsTable, eq(monthlyCheckinsTable.goalId, goalsTable.id))
      .leftJoin(usersTable, eq(monthlyCheckinsTable.userId, usersTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(monthlyCheckinsTable.createdAt));

    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/monthly-checkins", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { goalId, franchiseId, month, year, kriProgress, improvedKpis, worsenedKpis, initiativesThatWorked, initiativesThatDidNotWork, continueDoing, stopDoing, startDoing, nextMonthFocus } = req.body;
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const [existing] = await db
      .select()
      .from(monthlyCheckinsTable)
      .where(and(
        eq(monthlyCheckinsTable.franchiseId, franchiseId),
        eq(monthlyCheckinsTable.month, month),
        eq(monthlyCheckinsTable.year, year),
      ))
      .limit(1);
    if (existing) {
      res.status(200).json({ ...existing, goalTitle: null, userName: null, createdAt: existing.createdAt.toISOString(), conflict: true });
      return;
    }

    const [c] = await db.insert(monthlyCheckinsTable).values({
      goalId, franchiseId, userId: req.session.userId!,
      month, year, kriProgress, improvedKpis, worsenedKpis,
      initiativesThatWorked, initiativesThatDidNotWork,
      continueDoing, stopDoing, startDoing, nextMonthFocus,
    }).returning();
    res.status(201).json({ ...c, goalTitle: null, userName: null, createdAt: c.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
