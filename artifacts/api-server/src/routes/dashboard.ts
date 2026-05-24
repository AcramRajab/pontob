import { Router } from "express";
import { db, goalsTable, goalInitiativesTable, dailyCheckinsTable, alertsTable, helpRequestsTable, franchisesTable, dimensionsTable, keyProcessesTable, strategicInitiativesTable, kpisTable, franchiseVisaoTable, franchiseVisaoMilestonesTable, franchiseKrisTable, weeklyPlannerEntriesTable, PLANNER_INDICATORS } from "@workspace/db";
import { eq, and, sql, desc, gte, lte, ne, inArray, notInArray, isNull, isNotNull } from "drizzle-orm";
import { requireAuth, requireAdminOrStaff } from "../middlewares/auth";

const router = Router();

// Compute effective goal progress from KPIs → initiatives → stored value (in that priority order)
function effectiveGoalProgress(
  goal: { id: number; progressPercentage: number },
  allKpis: { goalId: number; currentValue: number | null; targetValue: number | null }[],
  allInits: { goalId: number; progressPercentage: number | null }[],
): number {
  const kpis = allKpis.filter(k => k.goalId === goal.id && k.targetValue != null && k.targetValue > 0);
  if (kpis.length > 0) {
    const avg = kpis.reduce((s, k) => s + Math.min(((k.currentValue ?? 0) / k.targetValue!) * 100, 100), 0) / kpis.length;
    return Math.round(avg);
  }
  const inits = allInits.filter(i => i.goalId === goal.id);
  if (inits.length > 0) {
    const avg = inits.reduce((s, i) => s + (i.progressPercentage ?? 0), 0) / inits.length;
    return Math.round(avg);
  }
  return goal.progressPercentage ?? 0;
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

router.get("/dashboard/today", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    const franchiseId = (role === "master_admin" || role === "staff_regional")
      ? (paramFranchiseId ?? req.session.franchiseId)
      : req.session.franchiseId;

    if (!franchiseId) {
      res.json({ date: new Date().toISOString().split("T")[0], franchiseId: 0, activeGoals: 0, initiativesForToday: [], todayCheckins: [], pendingAlerts: [], pendingHelpRequests: 0, weekScore: null });
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    const activeGoals = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(goalsTable)
      .where(and(
        eq(goalsTable.franchiseId, franchiseId),
        notInArray(goalsTable.status, ["concluida", "cancelada"]),
      ));

    const initiativesForToday = await db.select({
      id: goalInitiativesTable.id,
      goalId: goalInitiativesTable.goalId,
      goalTitle: goalsTable.title,
      strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
      initiativeName: strategicInitiativesTable.name,
      customName: goalInitiativesTable.customName,
      dimensionName: dimensionsTable.name,
      keyProcessName: keyProcessesTable.name,
      progressPercentage: goalInitiativesTable.progressPercentage,
      status: goalInitiativesTable.status,
      pinnedDate: goalInitiativesTable.pinnedDate,
      notes: goalInitiativesTable.notes,
      createdAt: goalInitiativesTable.createdAt,
    }).from(goalInitiativesTable)
      .innerJoin(goalsTable, and(eq(goalInitiativesTable.goalId, goalsTable.id), eq(goalsTable.franchiseId, franchiseId)))
      .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
      .leftJoin(dimensionsTable, eq(goalsTable.dimensionId, dimensionsTable.id))
      .leftJoin(keyProcessesTable, eq(goalsTable.keyProcessId, keyProcessesTable.id))
      .where(and(
        eq(goalInitiativesTable.status, "ativa"),
        eq(goalInitiativesTable.pinnedDate, today),
        isNull(goalInitiativesTable.deletedAt),
      ))
      .limit(10);

    const todayCheckins = await db.select().from(dailyCheckinsTable)
      .where(and(eq(dailyCheckinsTable.franchiseId, franchiseId), eq(dailyCheckinsTable.date, today)))
      .orderBy(desc(dailyCheckinsTable.createdAt));

    const pendingAlerts = await db.select({
      id: alertsTable.id, type: alertsTable.type, severity: alertsTable.severity,
      message: alertsTable.message, status: alertsTable.status,
      franchiseId: alertsTable.franchiseId, franchiseName: franchisesTable.name,
      goalId: alertsTable.goalId, goalTitle: goalsTable.title,
      goalInitiativeId: alertsTable.goalInitiativeId,
      createdAt: alertsTable.createdAt, resolvedAt: alertsTable.resolvedAt,
    })
      .from(alertsTable)
      .leftJoin(franchisesTable, eq(alertsTable.franchiseId, franchisesTable.id))
      .leftJoin(goalsTable, eq(alertsTable.goalId, goalsTable.id))
      .where(and(eq(alertsTable.franchiseId, franchiseId), eq(alertsTable.status, "open")))
      .limit(5);

    const pendingHelpCount = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(helpRequestsTable)
      .where(and(eq(helpRequestsTable.franchiseId, franchiseId), ne(helpRequestsTable.status, "resolvido")));

    res.json({
      date: today,
      franchiseId,
      activeGoals: activeGoals[0]?.count ?? 0,
      initiativesForToday: initiativesForToday.map(i => ({
        ...i,
        initiativeName: i.initiativeName || i.customName || "Iniciativa",
        createdAt: i.createdAt instanceof Date ? i.createdAt.toISOString() : i.createdAt,
      })),
      todayCheckins: todayCheckins.map(c => ({ ...c, goalTitle: null, userName: null, createdAt: c.createdAt.toISOString() })),
      pendingAlerts: pendingAlerts.map(a => ({
        ...a,
        createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
        resolvedAt: a.resolvedAt instanceof Date ? a.resolvedAt.toISOString() : a.resolvedAt,
      })),
      pendingHelpRequests: pendingHelpCount[0]?.count ?? 0,
      weekScore: null,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/franchise", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    const franchiseId = (role === "master_admin" || role === "staff_regional")
      ? (paramFranchiseId ?? req.session.franchiseId)
      : req.session.franchiseId;

    if (!franchiseId) {
      res.status(400).json({ error: "franchiseId required" });
      return;
    }

    const franchise = await db.select().from(franchisesTable).where(eq(franchisesTable.id, franchiseId)).limit(1);
    const goals = await db.select().from(goalsTable).where(eq(goalsTable.franchiseId, franchiseId));

    const activeGoals = goals.filter(g => g.status === "em_andamento").length;
    const completedGoals = goals.filter(g => g.status === "concluida").length;
    const delayedGoals = goals.filter(g => g.status === "atrasada" || calcRisk(g) === "atrasado").length;
    const avgScore = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.score, 0) / goals.length) : 0;

    const today = new Date().toISOString().split("T")[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const weekCheckins = await db.select().from(dailyCheckinsTable)
      .where(and(
        eq(dailyCheckinsTable.franchiseId, franchiseId),
        gte(dailyCheckinsTable.date, weekStartStr),
        lte(dailyCheckinsTable.date, today),
      ));

    const executedCount = weekCheckins.filter(c => c.executedToday === "sim").length;
    const weekExecution = weekCheckins.length > 0 ? Math.round((executedCount / weekCheckins.length) * 100) : 0;
    const checkinDays = new Set(weekCheckins.map(c => c.date)).size;
    const checkinConsistency = Math.round((checkinDays / 7) * 100);

    const blockers = weekCheckins.filter(c => c.blocker).map(c => c.blocker as string).filter(Boolean);
    const topBlockers = [...new Set(blockers)].slice(0, 5);

    const allGoalIds = goals.map(g => g.id);
    const activeInitiatives = allGoalIds.length > 0 ? await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(goalInitiativesTable)
      .where(eq(goalInitiativesTable.status, "ativa")) : [{ count: 0 }];

    const completedInitiatives = allGoalIds.length > 0 ? await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(goalInitiativesTable)
      .where(eq(goalInitiativesTable.status, "concluida")) : [{ count: 0 }];

    const pendingAlerts = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(alertsTable)
      .where(and(eq(alertsTable.franchiseId, franchiseId), eq(alertsTable.status, "open")));

    const pendingHelp = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(helpRequestsTable)
      .where(and(eq(helpRequestsTable.franchiseId, franchiseId), ne(helpRequestsTable.status, "resolvido")));

    const recentCheckins = await db.select().from(dailyCheckinsTable)
      .where(eq(dailyCheckinsTable.franchiseId, franchiseId))
      .orderBy(desc(dailyCheckinsTable.createdAt)).limit(5);

    const dimensions = await db.select().from(dimensionsTable);
    const goalIds = goals.map(g => g.id);
    const [franchiseKpis, franchiseInits] = await Promise.all([
      goalIds.length > 0 ? db.select({ goalId: kpisTable.goalId, currentValue: kpisTable.currentValue, targetValue: kpisTable.targetValue }).from(kpisTable).where(inArray(kpisTable.goalId, goalIds)) : Promise.resolve([]),
      goalIds.length > 0 ? db.select({ goalId: goalInitiativesTable.goalId, progressPercentage: goalInitiativesTable.progressPercentage }).from(goalInitiativesTable).where(inArray(goalInitiativesTable.goalId, goalIds)) : Promise.resolve([]),
    ]);
    const progressByDimension = dimensions.map(d => {
      const dimGoals = goals.filter(g => g.dimensionId === d.id);
      const avgProg = dimGoals.length > 0
        ? Math.round(dimGoals.reduce((s, g) => s + effectiveGoalProgress(g, franchiseKpis, franchiseInits), 0) / dimGoals.length)
        : 0;
      return { dimensionId: d.id, dimensionName: d.name, progressPercentage: avgProg, goalsCount: dimGoals.length };
    });

    let scoreLabel = "Crítico";
    if (avgScore >= 90) scoreLabel = "Excelente";
    else if (avgScore >= 70) scoreLabel = "Saudável";
    else if (avgScore >= 40) scoreLabel = "Atenção";

    res.json({
      franchiseId,
      franchiseName: franchise[0]?.name ?? null,
      score: avgScore,
      scoreLabel,
      activeGoals,
      completedGoals,
      delayedGoals,
      weekExecution,
      checkinConsistency,
      progressByDimension,
      topBlockers,
      activeInitiatives: activeInitiatives[0]?.count ?? 0,
      completedInitiatives: completedInitiatives[0]?.count ?? 0,
      pendingAlerts: pendingAlerts[0]?.count ?? 0,
      pendingHelpRequests: pendingHelp[0]?.count ?? 0,
      recentCheckins: recentCheckins.map(c => ({ ...c, goalTitle: null, userName: null, createdAt: c.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/goal-progress?franchiseId=&startDate=&endDate=
router.get("/dashboard/goal-progress", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    const franchiseId = (role === "master_admin" || role === "staff_regional")
      ? (paramFranchiseId ?? req.session.franchiseId)
      : req.session.franchiseId;

    if (!franchiseId) {
      res.status(400).json({ error: "franchiseId required" });
      return;
    }

    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const goals = await db
      .select({
        id: goalsTable.id,
        title: goalsTable.title,
        dimensionId: goalsTable.dimensionId,
        keyProcessId: goalsTable.keyProcessId,
        progressPercentage: goalsTable.progressPercentage,
        currentValue: goalsTable.currentValue,
        targetValue: goalsTable.targetValue,
        unit: goalsTable.unit,
        status: goalsTable.status,
        startDate: goalsTable.startDate,
        endDate: goalsTable.endDate,
        score: goalsTable.score,
        riskStatus: goalsTable.riskStatus,
        kriDescription: goalsTable.kriDescription,
        dimensionName: dimensionsTable.name,
      })
      .from(goalsTable)
      .leftJoin(dimensionsTable, eq(goalsTable.dimensionId, dimensionsTable.id))
      .where(eq(goalsTable.franchiseId, franchiseId));

    // Filter by period overlap if dates provided
    const filtered = goals.filter(g => {
      if (!startDate && !endDate) return true;
      const gStart = g.startDate ?? null;
      const gEnd = g.endDate ?? null;
      if (startDate && gEnd && gEnd < startDate) return false;
      if (endDate && gStart && gStart > endDate) return false;
      return true;
    });

    // Fetch KPIs and initiatives for each goal
    const goalIds = filtered.map(g => g.id);
    const [kpis, inits] = await Promise.all([
      goalIds.length > 0 ? db.select({ goalId: kpisTable.goalId, currentValue: kpisTable.currentValue, targetValue: kpisTable.targetValue, id: kpisTable.id, name: kpisTable.name, unit: kpisTable.unit }).from(kpisTable).where(inArray(kpisTable.goalId, goalIds)) : Promise.resolve([] as { goalId: number; currentValue: number | null; targetValue: number | null; id: number; name: string; unit: string | null }[]),
      goalIds.length > 0 ? db.select({ goalId: goalInitiativesTable.goalId, progressPercentage: goalInitiativesTable.progressPercentage }).from(goalInitiativesTable).where(inArray(goalInitiativesTable.goalId, goalIds)) : Promise.resolve([] as { goalId: number; progressPercentage: number | null }[]),
    ]);

    const result = filtered.map(g => {
      const goalKpis = kpis.filter(k => k.goalId === g.id);
      return {
        ...g,
        progressPercentage: effectiveGoalProgress(g, goalKpis, inits),
        startDate: g.startDate ?? null,
        endDate: g.endDate ?? null,
        kpis: goalKpis.map(k => ({
          id: k.id,
          name: k.name,
          currentValue: k.currentValue,
          targetValue: k.targetValue,
          unit: k.unit,
          progressPct: k.targetValue && k.targetValue > 0
            ? Math.min(Math.round(((k.currentValue ?? 0) / k.targetValue) * 100), 100)
            : null,
        })),
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/regional-vision?year=
router.get("/dashboard/regional-vision", requireAuth, requireAdminOrStaff, async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    const franchises = await db.select().from(franchisesTable).where(eq(franchisesTable.active, true));

    // All visao records for this year
    const visaoRows = await db
      .select()
      .from(franchiseVisaoTable)
      .where(eq(franchiseVisaoTable.year, year));

    // All milestones for this year (via visao IDs)
    const visaoIds = visaoRows.map(v => v.id);
    const allMilestones = visaoIds.length > 0
      ? await db
          .select()
          .from(franchiseVisaoMilestonesTable)
          .where(sql`${franchiseVisaoMilestonesTable.visaoId} = ANY(${sql.raw(`ARRAY[${visaoIds.join(",")}]::int[]`)})`)
      : [];

    // All KRIs for this year (for actuals)
    const allKris = await db
      .select()
      .from(franchiseKrisTable)
      .where(eq(franchiseKrisTable.year, year));

    const QUARTERS = [
      { label: "1ºTRI", months: [1, 2, 3], date: `${year}-03-31` },
      { label: "2ºTRI", months: [4, 5, 6], date: `${year}-06-30` },
      { label: "3ºTRI", months: [7, 8, 9], date: `${year}-09-30` },
      { label: "4ºTRI", months: [10, 11, 12], date: `${year}-12-31` },
    ];

    // Build per-franchise data
    const franchiseData = franchises.map(f => {
      const visao = visaoRows.find(v => v.franchiseId === f.id) ?? null;
      const fKris = allKris.filter(k => k.franchiseId === f.id);

      const quarters = QUARTERS.map(q => {
        const milestone = visao
          ? allMilestones.find(m => m.visaoId === visao.id && m.quarterDate === q.date) ?? null
          : null;
        const monthsData = fKris.filter(k => q.months.includes(k.month));
        const lastKri = monthsData[monthsData.length - 1] ?? null;
        return {
          quarterDate: q.date,
          quarterLabel: q.label,
          targetCreci: milestone?.targetCreci ?? null,
          targetCres: milestone?.targetCres ?? null,
          targetVgh: milestone?.targetVgh ?? null,
          actualCreci: lastKri?.creci ?? null,
          actualCres: lastKri?.cres ?? null,
          actualVgh: lastKri?.vgh ?? null,
          franchisesWithTarget: milestone ? 1 : 0,
          franchisesWithActual: lastKri ? 1 : 0,
        };
      });

      return {
        franchiseId: f.id,
        franchiseName: f.name,
        statement: visao?.statement ?? null,
        hasVision: !!visao,
        quarters,
      };
    });

    // Aggregate regional totals per quarter
    const regionalQuarters = QUARTERS.map((q, qi) => {
      const fqs = franchiseData.map(f => f.quarters[qi]);
      const totalTargetCreci = fqs.reduce((s, fq) => fq.targetCreci != null ? s + fq.targetCreci : s, 0);
      const totalTargetCres = fqs.reduce((s, fq) => fq.targetCres != null ? s + fq.targetCres : s, 0);
      const totalTargetVgh = fqs.reduce((s, fq) => fq.targetVgh != null ? s + fq.targetVgh : s, 0);
      const totalActualCreci = fqs.reduce((s, fq) => fq.actualCreci != null ? s + fq.actualCreci : s, 0);
      const totalActualCres = fqs.reduce((s, fq) => fq.actualCres != null ? s + fq.actualCres : s, 0);
      const totalActualVgh = fqs.reduce((s, fq) => fq.actualVgh != null ? s + fq.actualVgh : s, 0);
      const franchisesWithTarget = fqs.filter(fq => fq.franchisesWithTarget > 0).length;
      const franchisesWithActual = fqs.filter(fq => fq.franchisesWithActual > 0).length;
      return {
        quarterDate: q.date,
        quarterLabel: q.label,
        targetCreci: franchisesWithTarget > 0 ? totalTargetCreci : null,
        targetCres: franchisesWithTarget > 0 ? totalTargetCres : null,
        targetVgh: franchisesWithTarget > 0 ? totalTargetVgh : null,
        actualCreci: franchisesWithActual > 0 ? totalActualCreci : null,
        actualCres: franchisesWithActual > 0 ? totalActualCres : null,
        actualVgh: franchisesWithActual > 0 ? totalActualVgh : null,
        franchisesWithTarget,
        franchisesWithActual,
      };
    });

    res.json({
      year,
      totalFranchises: franchises.length,
      franchisesWithVision: visaoRows.length,
      regionalQuarters,
      franchises: franchiseData,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/regional", requireAuth, async (req, res) => {
  try {
    const franchises = await db.select().from(franchisesTable).where(eq(franchisesTable.active, true));
    const goals = await db.select().from(goalsTable);
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

    const checkinsToday = await db.select({ franchiseId: dailyCheckinsTable.franchiseId })
      .from(dailyCheckinsTable).where(eq(dailyCheckinsTable.date, today));

    const checkinsLastWeek = await db.select({ franchiseId: dailyCheckinsTable.franchiseId })
      .from(dailyCheckinsTable).where(gte(dailyCheckinsTable.date, sevenDaysAgoStr));

    const franchisesWithCheckinToday = new Set(checkinsToday.map(c => c.franchiseId)).size;
    const franchisesWithCheckinLastWeek = new Set(checkinsLastWeek.map(c => c.franchiseId));
    const franchisesWithoutCheckin7Days = franchises.filter(f => !franchisesWithCheckinLastWeek.has(f.id)).length;

    const avgScore = goals.length > 0 ? Math.round(goals.reduce((s, g) => s + g.score, 0) / goals.length) : 0;
    const franchisesAtRisk = goals.filter(g => calcRisk(g) === "atrasado" || g.status === "atrasada").map(g => g.franchiseId);
    const uniqueAtRisk = new Set(franchisesAtRisk).size;

    const openHelp = await db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(helpRequestsTable)
      .where(ne(helpRequestsTable.status, "resolvido"));

    const weekCheckins = await db.select().from(dailyCheckinsTable)
      .where(gte(dailyCheckinsTable.date, sevenDaysAgoStr));
    const blockers = weekCheckins.filter(c => c.blocker).map(c => c.blocker as string);
    const topBlockers = [...new Set(blockers)].slice(0, 5);

    const dimensions = await db.select().from(dimensionsTable);
    const allGoalIds = goals.map(g => g.id);
    const [allKpis, allInits] = await Promise.all([
      allGoalIds.length > 0 ? db.select({ goalId: kpisTable.goalId, currentValue: kpisTable.currentValue, targetValue: kpisTable.targetValue }).from(kpisTable).where(inArray(kpisTable.goalId, allGoalIds)) : Promise.resolve([]),
      allGoalIds.length > 0 ? db.select({ goalId: goalInitiativesTable.goalId, progressPercentage: goalInitiativesTable.progressPercentage }).from(goalInitiativesTable).where(inArray(goalInitiativesTable.goalId, allGoalIds)) : Promise.resolve([]),
    ]);

    const progressByDimension = dimensions.map(d => {
      const dimGoals = goals.filter(g => g.dimensionId === d.id);
      const avgProg = dimGoals.length > 0
        ? Math.round(dimGoals.reduce((s, g) => s + effectiveGoalProgress(g, allKpis, allInits), 0) / dimGoals.length)
        : 0;
      return { dimensionId: d.id, dimensionName: d.name, progressPercentage: avgProg, goalsCount: dimGoals.length };
    });

    // Per-franchise progress breakdown for the regional admin view
    const franchiseProgress = franchises.map(f => {
      const fGoals = goals.filter(g => g.franchiseId === f.id);
      const dimProgress = dimensions.map(d => {
        const dimGoals = fGoals.filter(g => g.dimensionId === d.id);
        const avg = dimGoals.length > 0
          ? Math.round(dimGoals.reduce((s, g) => s + effectiveGoalProgress(g, allKpis, allInits), 0) / dimGoals.length)
          : null;
        return { dimensionId: d.id, dimensionName: d.name, progressPercentage: avg, goalsCount: dimGoals.length };
      });
      const avgProgress = fGoals.length > 0
        ? Math.round(fGoals.reduce((s, g) => s + effectiveGoalProgress(g, allKpis, allInits), 0) / fGoals.length)
        : null;
      return { franchiseId: f.id, franchiseName: f.name, goalsCount: fGoals.length, avgProgress, progressByDimension: dimProgress };
    });

    res.json({
      totalFranchises: franchises.length,
      activeFranchises: franchises.length,
      franchisesWithCheckinToday,
      franchisesWithoutCheckin7Days,
      avgScore,
      progressByDimension,
      franchiseProgress,
      franchisesAtRisk: uniqueAtRisk,
      openHelpRequests: openHelp[0]?.count ?? 0,
      topBlockers,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/ranking", requireAuth, async (req, res) => {
  try {
    const by = req.query.by as string || "score";
    const franchises = await db.select().from(franchisesTable).where(eq(franchisesTable.active, true));
    const goals = await db.select().from(goalsTable);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];
    const weekCheckins = await db.select().from(dailyCheckinsTable)
      .where(gte(dailyCheckinsTable.date, sevenDaysAgoStr));

    const ranking = franchises.map(f => {
      const fGoals = goals.filter(g => g.franchiseId === f.id);
      const score = fGoals.length > 0 ? Math.round(fGoals.reduce((s, g) => s + g.score, 0) / fGoals.length) : 0;
      const fCheckins = weekCheckins.filter(c => c.franchiseId === f.id);
      const executed = fCheckins.filter(c => c.executedToday === "sim").length;
      const weekExecution = fCheckins.length > 0 ? Math.round((executed / fCheckins.length) * 100) : 0;
      const checkinDays = new Set(fCheckins.map(c => c.date)).size;
      const checkinConsistency = Math.round((checkinDays / 7) * 100);
      const atRisk = fGoals.some(g => calcRisk(g) === "atrasado");
      return { franchiseId: f.id, franchiseName: f.name, score, weekExecution, checkinConsistency, riskStatus: atRisk ? "atrasado" : "no_prazo" };
    });

    ranking.sort((a, b) => {
      if (by === "execution") return b.weekExecution - a.weekExecution;
      if (by === "consistency") return b.checkinConsistency - a.checkinConsistency;
      return b.score - a.score;
    });

    res.json(ranking.map((r, i) => ({ ...r, rank: i + 1 })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/regional/franchise/:id?year= — franchise drill-down for regional admin
router.get("/dashboard/regional/franchise/:id", requireAuth, requireAdminOrStaff, async (req, res) => {
  try {
    const franchiseId = parseInt(req.params.id);
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();

    if (isNaN(franchiseId)) { res.status(400).json({ error: "Invalid franchiseId" }); return; }

    const [franchise, plannerRows, milestones, kris, checkinRows, goalRows, kpiRows, initRows, dimRows] = await Promise.all([
      db.select().from(franchisesTable).where(eq(franchisesTable.id, franchiseId)).limit(1),
      db.select({
        weekStartDate: weeklyPlannerEntriesTable.weekStartDate,
        indicatorKey: weeklyPlannerEntriesTable.indicatorKey,
        total: sql<number>`COALESCE(SUM(${weeklyPlannerEntriesTable.value}), 0)`.as("total"),
        latestMeta: sql<number | null>`MAX(${weeklyPlannerEntriesTable.meta})`.as("latestMeta"),
      })
        .from(weeklyPlannerEntriesTable)
        .where(and(
          eq(weeklyPlannerEntriesTable.franchiseId, franchiseId),
          gte(weeklyPlannerEntriesTable.weekStartDate, `${year}-01-01`),
          lte(weeklyPlannerEntriesTable.weekStartDate, `${year}-12-31`),
        ))
        .groupBy(weeklyPlannerEntriesTable.weekStartDate, weeklyPlannerEntriesTable.indicatorKey)
        .orderBy(weeklyPlannerEntriesTable.weekStartDate),
      db.select().from(franchiseVisaoMilestonesTable)
        .where(and(eq(franchiseVisaoMilestonesTable.franchiseId, franchiseId), eq(franchiseVisaoMilestonesTable.year, year)))
        .orderBy(franchiseVisaoMilestonesTable.quarterDate),
      db.select().from(franchiseKrisTable)
        .where(and(eq(franchiseKrisTable.franchiseId, franchiseId), eq(franchiseKrisTable.year, year)))
        .orderBy(franchiseKrisTable.month),
      db.select({
        month: sql<string>`TO_CHAR(${dailyCheckinsTable.date}::date, 'YYYY-MM')`.as("month"),
        count: sql<number>`COUNT(*)`.as("count"),
      })
        .from(dailyCheckinsTable)
        .where(and(
          eq(dailyCheckinsTable.franchiseId, franchiseId),
          gte(dailyCheckinsTable.date, `${year}-01-01`),
          lte(dailyCheckinsTable.date, `${year}-12-31`),
        ))
        .groupBy(sql`TO_CHAR(${dailyCheckinsTable.date}::date, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${dailyCheckinsTable.date}::date, 'YYYY-MM')`),
      db.select().from(goalsTable).where(eq(goalsTable.franchiseId, franchiseId)),
      db.select().from(kpisTable),
      db.select().from(goalInitiativesTable),
      db.select().from(dimensionsTable).where(eq(dimensionsTable.active, true)),
    ]);

    if (!franchise[0]) { res.status(404).json({ error: "Franchise not found" }); return; }

    // Aggregate planner into monthly buckets
    const monthlyMap: Record<string, Record<string, number>> = {};
    const metasMap: Record<string, number | null> = {};
    for (const row of plannerRows) {
      const month = row.weekStartDate.substring(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = {};
      monthlyMap[month][row.indicatorKey] = (monthlyMap[month][row.indicatorKey] ?? 0) + Number(row.total);
      if (row.latestMeta != null) metasMap[row.indicatorKey] = Number(row.latestMeta);
    }

    const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const plannerMonths = Object.keys(monthlyMap).sort().map(m => ({
      month: m,
      monthLabel: MONTH_LABELS[parseInt(m.split("-")[1]) - 1],
      totals: monthlyMap[m],
    }));

    // KRI quarterly data — kris has year+month integers (not a date field)
    const QUARTERS = [
      { label: "1ºTRI", date: `${year}-03-31`, description: "Jan – Mar", maxMonth: 3 },
      { label: "2ºTRI", date: `${year}-06-30`, description: "Abr – Jun", maxMonth: 6 },
      { label: "3ºTRI", date: `${year}-09-30`, description: "Jul – Set", maxMonth: 9 },
      { label: "4ºTRI", date: `${year}-12-31`, description: "Out – Dez", maxMonth: 12 },
    ];
    const kriQuarters = QUARTERS.map(q => {
      const milestone = milestones.find(ms => ms.quarterDate === q.date);
      // Latest KRI record whose month falls within or before this quarter
      const actualKri = [...kris]
        .filter(k => k.month <= q.maxMonth)
        .sort((a, b) => b.month - a.month)[0];
      return {
        quarterLabel: q.label,
        quarterDate: q.date,
        description: q.description,
        targetCreci: milestone?.targetCreci ?? null,
        targetCres: milestone?.targetCres ?? null,
        targetVgh: milestone?.targetVgh != null ? Number(milestone.targetVgh) : null,
        actualCreci: actualKri?.creci ?? null,
        actualCres: actualKri?.cres ?? null,
        actualVgh: actualKri?.vgh != null ? Number(actualKri.vgh) : null,
      };
    });

    // Check-in by month
    const checkinsByMonth = checkinRows.map(c => ({
      month: c.month,
      monthLabel: MONTH_LABELS[parseInt(c.month.split("-")[1]) - 1],
      count: Number(c.count),
    }));

    // Goal progress by dimension
    const goalProgressByDimension = dimRows.map(dim => {
      const dimGoals = goalRows.filter(g => g.dimensionId === dim.id);
      if (dimGoals.length === 0) return { dimensionId: dim.id, dimensionName: dim.name, progressPercentage: null, goalsCount: 0 };
      const avg = dimGoals.reduce((s, g) => s + effectiveGoalProgress(g, kpiRows, initRows), 0) / dimGoals.length;
      return { dimensionId: dim.id, dimensionName: dim.name, progressPercentage: Math.round(avg), goalsCount: dimGoals.length };
    });

    res.json({
      franchise: { id: franchise[0].id, name: franchise[0].name, active: franchise[0].active },
      year,
      plannerMonths,
      metas: metasMap,
      indicators: PLANNER_INDICATORS,
      kriQuarters,
      checkinsByMonth,
      goalProgressByDimension,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/initiative-ranking — top catalog initiatives ranked by average result across the network
router.get("/dashboard/initiative-ranking", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select({
        strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
        initiativeName: strategicInitiativesTable.name,
        kri: strategicInitiativesTable.kri,
        dimensionName: dimensionsTable.name,
        completions: sql<number>`count(*)`.mapWith(Number),
        avgResult: sql<number>`round(avg(${goalInitiativesTable.resultValue})::numeric, 1)`.mapWith(Number),
        totalResult: sql<number>`sum(${goalInitiativesTable.resultValue})`.mapWith(Number),
        unit: sql<string>`mode() within group (order by ${goalInitiativesTable.resultUnit})`,
      })
      .from(goalInitiativesTable)
      .innerJoin(goalsTable, eq(goalInitiativesTable.goalId, goalsTable.id))
      .innerJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
      .innerJoin(dimensionsTable, eq(strategicInitiativesTable.dimensionId, dimensionsTable.id))
      .where(and(
        eq(goalInitiativesTable.status, "concluida"),
        isNull(goalInitiativesTable.deletedAt),
        isNotNull(goalInitiativesTable.resultValue),
      ))
      .groupBy(
        goalInitiativesTable.strategicInitiativeId,
        strategicInitiativesTable.name,
        strategicInitiativesTable.kri,
        dimensionsTable.name,
      )
      .orderBy(sql`avg(${goalInitiativesTable.resultValue}) desc nulls last`)
      .limit(20);

    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/initiative-score — catalog execution rate per dimension
router.get("/dashboard/initiative-score", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    const franchiseId = (role === "master_admin" || role === "staff_regional")
      ? (paramFranchiseId ?? req.session.franchiseId)
      : req.session.franchiseId;

    if (!franchiseId) { res.status(400).json({ error: "franchiseId required" }); return; }

    // Total active catalog initiatives per dimension
    const catalogTotals = await db
      .select({
        dimensionId: dimensionsTable.id,
        dimensionName: dimensionsTable.name,
        total: sql<number>`count(*)`.mapWith(Number),
      })
      .from(strategicInitiativesTable)
      .innerJoin(dimensionsTable, eq(strategicInitiativesTable.dimensionId, dimensionsTable.id))
      .where(eq(strategicInitiativesTable.active, true))
      .groupBy(dimensionsTable.id, dimensionsTable.name);

    // Distinct catalog initiatives completed (status=concluida) by this franchise, per dimension
    const completedByDimension = await db
      .select({
        dimensionId: dimensionsTable.id,
        completedCount: sql<number>`count(distinct ${goalInitiativesTable.strategicInitiativeId})`.mapWith(Number),
      })
      .from(goalInitiativesTable)
      .innerJoin(goalsTable, and(
        eq(goalInitiativesTable.goalId, goalsTable.id),
        eq(goalsTable.franchiseId, franchiseId),
      ))
      .innerJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
      .innerJoin(dimensionsTable, eq(strategicInitiativesTable.dimensionId, dimensionsTable.id))
      .where(and(
        eq(goalInitiativesTable.status, "concluida"),
        isNull(goalInitiativesTable.deletedAt),
      ))
      .groupBy(dimensionsTable.id);

    const completedMap = new Map(completedByDimension.map(r => [r.dimensionId, r.completedCount]));
    const totalCatalog = catalogTotals.reduce((s, r) => s + r.total, 0);
    const totalCompleted = completedByDimension.reduce((s, r) => s + r.completedCount, 0);

    const dimensions = catalogTotals.map(r => ({
      dimensionId: r.dimensionId,
      dimensionName: r.dimensionName,
      total: r.total,
      completed: completedMap.get(r.dimensionId) ?? 0,
      pct: Math.round(((completedMap.get(r.dimensionId) ?? 0) / r.total) * 100),
    }));

    res.json({
      totalCatalog,
      totalCompleted,
      overallPct: totalCatalog > 0 ? Math.round((totalCompleted / totalCatalog) * 100) : 0,
      dimensions,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /dashboard/socio-overview — per-franchise summary for socio users
router.get("/dashboard/socio-overview", requireAuth, async (req, res) => {
  try {
    const linkedFranchiseIds: number[] = req.session.linkedFranchiseIds ?? [];
    if (linkedFranchiseIds.length === 0) { res.json([]); return; }

    const [allFranchises, goalRows, initiativeRows] = await Promise.all([
      db
        .select({ id: franchisesTable.id, name: franchisesTable.name })
        .from(franchisesTable)
        .where(inArray(franchisesTable.id, linkedFranchiseIds))
        .orderBy(franchisesTable.name),
      db
        .select({
          franchiseId: goalsTable.franchiseId,
          goalCount: sql<number>`count(*)`.mapWith(Number),
          avgScore: sql<number>`round(avg(${goalsTable.score})::numeric, 0)`.mapWith(Number),
          avgProgress: sql<number>`round(avg(${goalsTable.progressPercentage})::numeric, 0)`.mapWith(Number),
        })
        .from(goalsTable)
        .where(and(inArray(goalsTable.franchiseId, linkedFranchiseIds), isNull(goalsTable.deletedAt)))
        .groupBy(goalsTable.franchiseId),
      db
        .select({
          franchiseId: goalsTable.franchiseId,
          activeInitiatives: sql<number>`count(*)`.mapWith(Number),
        })
        .from(goalInitiativesTable)
        .innerJoin(goalsTable, eq(goalInitiativesTable.goalId, goalsTable.id))
        .where(and(
          inArray(goalsTable.franchiseId, linkedFranchiseIds),
          eq(goalInitiativesTable.status, "ativa"),
          isNull(goalInitiativesTable.deletedAt),
          isNull(goalsTable.deletedAt),
        ))
        .groupBy(goalsTable.franchiseId),
    ]);

    const goalMap = new Map(goalRows.map(r => [r.franchiseId, r]));
    const initMap = new Map(initiativeRows.map(r => [r.franchiseId, r.activeInitiatives]));

    res.json(allFranchises.map(f => ({
      franchiseId: f.id,
      franchiseName: f.name,
      goalCount: goalMap.get(f.id)?.goalCount ?? 0,
      avgScore: goalMap.get(f.id)?.avgScore ?? 0,
      avgProgress: goalMap.get(f.id)?.avgProgress ?? 0,
      activeInitiatives: initMap.get(f.id) ?? 0,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
