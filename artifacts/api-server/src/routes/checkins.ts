import { Router } from "express";
import { db, dailyCheckinsTable, weeklyCheckinsTable, monthlyCheckinsTable, goalsTable, usersTable, franchisesTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "../middlewares/auth";

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

router.patch("/daily-checkins/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { executedToday, progressToday, timeSpent, blocker, nextStep, needsHelp, notes } = req.body;

    const [existing] = await db.select().from(dailyCheckinsTable).where(eq(dailyCheckinsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const updates: Record<string, unknown> = {};
    if (executedToday !== undefined) updates.executedToday = executedToday;
    if (progressToday !== undefined) updates.progressToday = progressToday;
    if (timeSpent !== undefined) updates.timeSpent = timeSpent;
    if (blocker !== undefined) updates.blocker = blocker;
    if (nextStep !== undefined) updates.nextStep = nextStep;
    if (needsHelp !== undefined) updates.needsHelp = needsHelp;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db.update(dailyCheckinsTable).set(updates).where(eq(dailyCheckinsTable.id, id)).returning();
    res.json({ ...updated, goalTitle: null, userName: null, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/daily-checkins/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(dailyCheckinsTable).where(eq(dailyCheckinsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(dailyCheckinsTable).where(eq(dailyCheckinsTable.id, id));
    res.status(204).end();
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

router.patch("/weekly-checkins/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { planned, executed, progressSummary, blockers, adjustments, nextWeekPriority, needsRegionalSupport, initiativeDecision, executionPercentage, checkinDaysCount } = req.body;

    const [existing] = await db.select().from(weeklyCheckinsTable).where(eq(weeklyCheckinsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const updates: Record<string, unknown> = {};
    if (planned !== undefined) updates.planned = planned;
    if (executed !== undefined) updates.executed = executed;
    if (progressSummary !== undefined) updates.progressSummary = progressSummary;
    if (blockers !== undefined) updates.blockers = blockers;
    if (adjustments !== undefined) updates.adjustments = adjustments;
    if (nextWeekPriority !== undefined) updates.nextWeekPriority = nextWeekPriority;
    if (needsRegionalSupport !== undefined) updates.needsRegionalSupport = needsRegionalSupport;
    if (initiativeDecision !== undefined) updates.initiativeDecision = initiativeDecision;
    if (executionPercentage !== undefined) updates.executionPercentage = executionPercentage;
    if (checkinDaysCount !== undefined) updates.checkinDaysCount = checkinDaysCount;

    const [updated] = await db.update(weeklyCheckinsTable).set(updates).where(eq(weeklyCheckinsTable.id, id)).returning();
    res.json({ ...updated, goalTitle: null, userName: null, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/weekly-checkins/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(weeklyCheckinsTable).where(eq(weeklyCheckinsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(weeklyCheckinsTable).where(eq(weeklyCheckinsTable.id, id));
    res.status(204).end();
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

router.patch("/monthly-checkins/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { kriProgress, improvedKpis, worsenedKpis, initiativesThatWorked, initiativesThatDidNotWork, continueDoing, stopDoing, startDoing, nextMonthFocus } = req.body;

    const [existing] = await db.select().from(monthlyCheckinsTable).where(eq(monthlyCheckinsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const updates: Record<string, unknown> = {};
    if (kriProgress !== undefined) updates.kriProgress = kriProgress;
    if (improvedKpis !== undefined) updates.improvedKpis = improvedKpis;
    if (worsenedKpis !== undefined) updates.worsenedKpis = worsenedKpis;
    if (initiativesThatWorked !== undefined) updates.initiativesThatWorked = initiativesThatWorked;
    if (initiativesThatDidNotWork !== undefined) updates.initiativesThatDidNotWork = initiativesThatDidNotWork;
    if (continueDoing !== undefined) updates.continueDoing = continueDoing;
    if (stopDoing !== undefined) updates.stopDoing = stopDoing;
    if (startDoing !== undefined) updates.startDoing = startDoing;
    if (nextMonthFocus !== undefined) updates.nextMonthFocus = nextMonthFocus;

    const [updated] = await db.update(monthlyCheckinsTable).set(updates).where(eq(monthlyCheckinsTable.id, id)).returning();
    res.json({ ...updated, goalTitle: null, userName: null, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/monthly-checkins/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(monthlyCheckinsTable).where(eq(monthlyCheckinsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(monthlyCheckinsTable).where(eq(monthlyCheckinsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /checkins/comparison — cross-franchise check-in summary for admins
router.get("/checkins/comparison", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    if (role !== "master_admin" && role !== "staff_regional") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { from, to } = req.query as { from?: string; to?: string };
    const fromDate = from ? new Date(from + "T00:00:00.000Z") : null;
    const toDate = to ? new Date(to + "T23:59:59.999Z") : null;

    const allFranchises = await db
      .select({ id: franchisesTable.id, name: franchisesTable.name })
      .from(franchisesTable)
      .orderBy(franchisesTable.name);

    const dailyConditions: any[] = [];
    if (fromDate) dailyConditions.push(gte(dailyCheckinsTable.createdAt, fromDate));
    if (toDate) dailyConditions.push(lte(dailyCheckinsTable.createdAt, toDate));

    const dailyStats = await db
      .select({
        franchiseId: dailyCheckinsTable.franchiseId,
        count: sql<number>`count(*)`.mapWith(Number),
        lastDate: sql<string | null>`max(${dailyCheckinsTable.createdAt})`,
      })
      .from(dailyCheckinsTable)
      .where(dailyConditions.length > 0 ? and(...dailyConditions) : undefined)
      .groupBy(dailyCheckinsTable.franchiseId);

    const weeklyConditions: any[] = [];
    if (fromDate) weeklyConditions.push(gte(weeklyCheckinsTable.createdAt, fromDate));
    if (toDate) weeklyConditions.push(lte(weeklyCheckinsTable.createdAt, toDate));

    const weeklyStats = await db
      .select({
        franchiseId: weeklyCheckinsTable.franchiseId,
        count: sql<number>`count(*)`.mapWith(Number),
        lastDate: sql<string | null>`max(${weeklyCheckinsTable.createdAt})`,
      })
      .from(weeklyCheckinsTable)
      .where(weeklyConditions.length > 0 ? and(...weeklyConditions) : undefined)
      .groupBy(weeklyCheckinsTable.franchiseId);

    const monthlyConditions: any[] = [];
    if (fromDate) monthlyConditions.push(gte(monthlyCheckinsTable.createdAt, fromDate));
    if (toDate) monthlyConditions.push(lte(monthlyCheckinsTable.createdAt, toDate));

    const monthlyStats = await db
      .select({
        franchiseId: monthlyCheckinsTable.franchiseId,
        count: sql<number>`count(*)`.mapWith(Number),
        lastDate: sql<string | null>`max(${monthlyCheckinsTable.createdAt})`,
      })
      .from(monthlyCheckinsTable)
      .where(monthlyConditions.length > 0 ? and(...monthlyConditions) : undefined)
      .groupBy(monthlyCheckinsTable.franchiseId);

    const dailyMap = new Map(dailyStats.map(s => [s.franchiseId, s]));
    const weeklyMap = new Map(weeklyStats.map(s => [s.franchiseId, s]));
    const monthlyMap = new Map(monthlyStats.map(s => [s.franchiseId, s]));

    const result = allFranchises.map(f => {
      const d = dailyMap.get(f.id);
      const w = weeklyMap.get(f.id);
      const m = monthlyMap.get(f.id);
      return {
        franchiseId: f.id,
        franchiseName: f.name,
        dailyCount: d?.count ?? 0,
        weeklyCount: w?.count ?? 0,
        monthlyCount: m?.count ?? 0,
        lastDaily: d?.lastDate instanceof Date ? d.lastDate.toISOString() : (d?.lastDate ?? null),
        lastWeekly: w?.lastDate instanceof Date ? w.lastDate.toISOString() : (w?.lastDate ?? null),
        lastMonthly: m?.lastDate instanceof Date ? m.lastDate.toISOString() : (m?.lastDate ?? null),
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /checkins/pending-gate — tells the client whether the current user has an overdue check-in
// Only applies to franqueado / responsavel_interno roles
router.get("/checkins/pending-gate", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    if (role === "master_admin" || role === "staff_regional" || role === "socio") {
      res.json({ overdue: false });
      return;
    }

    const franchiseId = req.session.franchiseId;
    if (!franchiseId) { res.json({ overdue: false }); return; }

    // Only gate franchises that have at least one goal (skip brand-new franchises with no setup)
    const [goalCheck] = await db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(goalsTable)
      .where(eq(goalsTable.franchiseId, franchiseId));
    if ((goalCheck?.count ?? 0) === 0) { res.json({ overdue: false }); return; }

    const now = new Date();
    const todayDay = now.getDate();
    const todayDow = now.getDay(); // 0=Sun … 6=Sat

    // ── Monthly gate ──────────────────────────────────────────────────────────
    // Window: day 1 through the first business day (Mon–Fri) of the current month.
    // After the first business day the window CLOSES — the gate no longer blocks.
    // Example: May 1 is a Friday → window = May 1 only.
    //          June 1 is a Saturday → first BD = June 3 → window = June 1–3.
    {
      const firstDayDow = new Date(now.getFullYear(), now.getMonth(), 1).getDay(); // 0=Sun…6=Sat
      // days to add to the 1st to reach the first Mon–Fri
      const daysToFirstBD = firstDayDow === 0 ? 1 : firstDayDow === 6 ? 2 : 0;
      const firstBDDay = 1 + daysToFirstBD; // day-of-month (1-based)

      if (todayDay >= 1 && todayDay <= firstBDDay) {
        const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth(); // 1-based
        const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

        const [found] = await db
          .select({ id: monthlyCheckinsTable.id })
          .from(monthlyCheckinsTable)
          .where(and(
            eq(monthlyCheckinsTable.franchiseId, franchiseId),
            eq(monthlyCheckinsTable.month, prevMonth),
            eq(monthlyCheckinsTable.year, prevYear),
          ))
          .limit(1);

        if (!found) {
          const label = new Date(prevYear, prevMonth - 1, 1)
            .toLocaleString("pt-BR", { month: "long", year: "numeric" });
          res.json({ overdue: true, type: "monthly", periodLabel: label, month: prevMonth, year: prevYear });
          return;
        }
      }
    }

    // ── Weekly gate ───────────────────────────────────────────────────────────
    // Grace: submit last week's check-in up to Tuesday of the current week.
    // Wednesday (dow=3) and beyond → last week is overdue.
    if (todayDow >= 3) {
      const daysToLastMonday = todayDow === 0 ? 6 : todayDow - 1;
      const lastMonday = new Date(now);
      lastMonday.setDate(now.getDate() - daysToLastMonday);

      const prevWeekMonday = new Date(lastMonday);
      prevWeekMonday.setDate(lastMonday.getDate() - 7);
      const prevWeekSunday = new Date(prevWeekMonday);
      prevWeekSunday.setDate(prevWeekMonday.getDate() + 6);

      const prevWeekMondayStr = prevWeekMonday.toISOString().split("T")[0];

      const [found] = await db
        .select({ id: weeklyCheckinsTable.id })
        .from(weeklyCheckinsTable)
        .where(and(
          eq(weeklyCheckinsTable.franchiseId, franchiseId),
          eq(weeklyCheckinsTable.weekStartDate, prevWeekMondayStr),
        ))
        .limit(1);

      if (!found) {
        const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        res.json({
          overdue: true,
          type: "weekly",
          periodLabel: `semana de ${fmt(prevWeekMonday)} a ${fmt(prevWeekSunday)}`,
          weekStartDate: prevWeekMondayStr,
        });
        return;
      }
    }

    res.json({ overdue: false });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
