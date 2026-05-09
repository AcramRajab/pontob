import { Router } from "express";
import { db, goalsTable, goalInitiativesTable, dailyCheckinsTable, alertsTable, helpRequestsTable, franchisesTable, dimensionsTable, kpisTable } from "@workspace/db";
import { eq, and, sql, desc, gte, lte, ne } from "drizzle-orm";
import { requireAuth, requireAdminOrStaff } from "../middlewares/auth";

const router = Router();

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
      .where(and(eq(goalsTable.franchiseId, franchiseId), eq(goalsTable.status, "em_andamento")));

    const initiativesForToday = await db.select({
      id: goalInitiativesTable.id,
      goalId: goalInitiativesTable.goalId,
      strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
      progressPercentage: goalInitiativesTable.progressPercentage,
      status: goalInitiativesTable.status,
      notes: goalInitiativesTable.notes,
      createdAt: goalInitiativesTable.createdAt,
    }).from(goalInitiativesTable)
      .innerJoin(goalsTable, and(eq(goalInitiativesTable.goalId, goalsTable.id), eq(goalsTable.franchiseId, franchiseId)))
      .where(eq(goalInitiativesTable.status, "ativa"))
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
        initiativeName: null, dimensionName: null, keyProcessName: null,
        desiredResult: null, actualResult: null, mainKpiId: null, ownerUserId: null, ownerName: null,
        startDate: null, endDate: null, frequency: null, executionDay: null, executionTime: null,
        estimatedTime: null, whatWillBeDone: null, whyItMatters: null, whoIsResponsible: null,
        whereItWillBeDone: null, howItWillBeDone: null, investmentOrEffort: null,
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
    const progressByDimension = dimensions.map(d => {
      const dimGoals = goals.filter(g => g.dimensionId === d.id);
      const avgProg = dimGoals.length > 0
        ? Math.round(dimGoals.reduce((s, g) => s + g.progressPercentage, 0) / dimGoals.length)
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

router.get("/dashboard/regional", requireAdminOrStaff, async (req, res) => {
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
    const progressByDimension = dimensions.map(d => {
      const dimGoals = goals.filter(g => g.dimensionId === d.id);
      const avgProg = dimGoals.length > 0
        ? Math.round(dimGoals.reduce((s, g) => s + g.progressPercentage, 0) / dimGoals.length)
        : 0;
      return { dimensionId: d.id, dimensionName: d.name, progressPercentage: avgProg, goalsCount: dimGoals.length };
    });

    res.json({
      totalFranchises: franchises.length,
      activeFranchises: franchises.length,
      franchisesWithCheckinToday,
      franchisesWithoutCheckin7Days,
      avgScore,
      progressByDimension,
      franchisesAtRisk: uniqueAtRisk,
      openHelpRequests: openHelp[0]?.count ?? 0,
      topBlockers,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/ranking", requireAdminOrStaff, async (req, res) => {
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

export default router;
