import { Router } from "express";
import {
  db, goalsTable, kpisTable, goalInitiativesTable, dimensionsTable,
  franchiseVisaoTable, franchiseVisaoMilestonesTable, franchiseKrisTable,
  dailyCheckinsTable, franchisesTable,
} from "@workspace/db";
import { eq, and, gte, inArray, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

const POINT_LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function calcRisk(goal: { startDate?: string | null; endDate?: string | null; progressPercentage: number }) {
  if (!goal.startDate || !goal.endDate) return "no_prazo";
  const start = new Date(goal.startDate).getTime();
  const end = new Date(goal.endDate).getTime();
  const now = Date.now();
  const totalTime = end - start;
  if (totalTime <= 0) return "no_prazo";
  const timeElapsed = ((now - start) / totalTime) * 100;
  const diff = (goal.progressPercentage ?? 0) - timeElapsed;
  if (diff < -15) return "atrasado";
  if (diff > 15) return "adiantado";
  return "no_prazo";
}

function effectiveProgress(
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

// GET /journey?franchiseId=&year=
router.get("/journey", requireAuth, async (req, res) => {
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

    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;

    // Fetch franchise name
    const [franchise] = await db.select({ name: franchisesTable.name })
      .from(franchisesTable).where(eq(franchisesTable.id, franchiseId)).limit(1);

    // Fetch goals for this year
    const goals = await db.select({
      id: goalsTable.id,
      title: goalsTable.title,
      dimensionId: goalsTable.dimensionId,
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

    const yearGoals = goals.filter(g => {
      const start = g.startDate ?? null;
      const end = g.endDate ?? null;
      if (start && start > yearEnd) return false;
      if (end && end < yearStart) return false;
      return true;
    });

    const goalIds = yearGoals.map(g => g.id);
    const [allKpis, allInits] = await Promise.all([
      goalIds.length > 0
        ? db.select({
            goalId: kpisTable.goalId,
            id: kpisTable.id,
            name: kpisTable.name,
            currentValue: kpisTable.currentValue,
            targetValue: kpisTable.targetValue,
            unit: kpisTable.unit,
          }).from(kpisTable).where(inArray(kpisTable.goalId, goalIds))
        : Promise.resolve([] as any[]),
      goalIds.length > 0
        ? db.select({ goalId: goalInitiativesTable.goalId, progressPercentage: goalInitiativesTable.progressPercentage })
            .from(goalInitiativesTable).where(inArray(goalInitiativesTable.goalId, goalIds))
        : Promise.resolve([] as any[]),
    ]);

    // Fetch visão + milestones
    const visaoRows = await db.select()
      .from(franchiseVisaoTable)
      .where(and(eq(franchiseVisaoTable.franchiseId, franchiseId), eq(franchiseVisaoTable.year, year)))
      .limit(1);
    const visao = visaoRows[0] ?? null;

    const milestones = visao
      ? await db.select().from(franchiseVisaoMilestonesTable)
          .where(eq(franchiseVisaoMilestonesTable.visaoId, visao.id))
          .orderBy(franchiseVisaoMilestonesTable.quarterDate)
      : [];

    // Fetch KRI actuals for this year
    const actualKris = await db.select()
      .from(franchiseKrisTable)
      .where(and(eq(franchiseKrisTable.franchiseId, franchiseId), eq(franchiseKrisTable.year, year)))
      .orderBy(franchiseKrisTable.month);

    // Fetch check-in consistency (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const recentCheckins = await db.select({ date: dailyCheckinsTable.date, executedToday: dailyCheckinsTable.executedToday })
      .from(dailyCheckinsTable)
      .where(and(
        eq(dailyCheckinsTable.franchiseId, franchiseId),
        gte(dailyCheckinsTable.date, thirtyDaysAgoStr),
      ))
      .orderBy(desc(dailyCheckinsTable.date));

    const checkinDays = new Set(recentCheckins.map(c => c.date)).size;
    const executedDays = recentCheckins.filter(c => c.executedToday === "sim").length;
    const checkinConsistency = Math.round((checkinDays / 30) * 100);

    // Build quarterly KRI map
    const QUARTERS = [
      { label: "1ºTRI", months: [1, 2, 3], quarterDate: `${year}-03-31` },
      { label: "2ºTRI", months: [4, 5, 6], quarterDate: `${year}-06-30` },
      { label: "3ºTRI", months: [7, 8, 9], quarterDate: `${year}-09-30` },
      { label: "4ºTRI", months: [10, 11, 12], quarterDate: `${year}-12-31` },
    ];

    const quarterlyKris = QUARTERS.map(q => {
      const milestone = milestones.find(m => m.quarterDate === q.quarterDate) ?? null;
      const monthsData = actualKris.filter(k => q.months.includes(k.month));
      const latestKri = monthsData[monthsData.length - 1] ?? null;

      const now = new Date();
      const quarterEndDate = new Date(q.quarterDate);
      const quarterStartDate = new Date(q.months[0] === 1 ? `${year}-01-01` : `${year}-0${q.months[0]}-01`);
      const isPast = quarterEndDate < now;
      const isCurrent = quarterStartDate <= now && quarterEndDate >= now;
      const isFuture = quarterStartDate > now;

      let progressPct = 0;
      if (milestone && latestKri) {
        const creciPct = milestone.targetCreci && milestone.targetCreci > 0
          ? Math.min(((latestKri.creci ?? 0) / milestone.targetCreci) * 100, 100) : null;
        const cresPct = milestone.targetCres && milestone.targetCres > 0
          ? Math.min(((latestKri.cres ?? 0) / milestone.targetCres) * 100, 100) : null;
        const vghPct = milestone.targetVgh && milestone.targetVgh > 0
          ? Math.min(((latestKri.vgh ?? 0) / milestone.targetVgh) * 100, 100) : null;
        const valid = [creciPct, cresPct, vghPct].filter(v => v !== null) as number[];
        progressPct = valid.length > 0 ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : 0;
      }

      return {
        label: q.label,
        quarterDate: q.quarterDate,
        isPast,
        isCurrent,
        isFuture,
        hasTarget: !!milestone,
        hasActual: !!latestKri,
        progressPct,
        targets: {
          creci: milestone?.targetCreci ?? null,
          cres: milestone?.targetCres ?? null,
          vgh: milestone?.targetVgh ?? null,
        },
        actuals: {
          creci: latestKri?.creci ?? null,
          cres: latestKri?.cres ?? null,
          vgh: latestKri?.vgh ?? null,
        },
      };
    });

    // Sort goals: completed first (by end date desc), then in-progress (by start date asc), then not started
    const sortedGoals = [...yearGoals].sort((a, b) => {
      const order = { "concluida": 0, "em_andamento": 1, "atrasada": 2, "nao_iniciada": 3 };
      const aOrder = order[a.status as keyof typeof order] ?? 4;
      const bOrder = order[b.status as keyof typeof order] ?? 4;
      if (aOrder !== bOrder) return aOrder - bOrder;
      const aDate = a.startDate ?? "";
      const bDate = b.startDate ?? "";
      return aDate.localeCompare(bDate);
    });

    // Build journey points from goals
    const journeyPoints = sortedGoals.map((g, idx) => {
      const prog = effectiveProgress(g, allKpis, allInits);
      const risk = g.status === "em_andamento" ? calcRisk({ startDate: g.startDate, endDate: g.endDate, progressPercentage: prog }) : "no_prazo";
      const goalKpis = allKpis.filter(k => k.goalId === g.id).map(k => ({
        id: k.id,
        name: k.name,
        currentValue: k.currentValue,
        targetValue: k.targetValue,
        unit: k.unit,
        progressPct: k.targetValue && k.targetValue > 0
          ? Math.min(Math.round(((k.currentValue ?? 0) / k.targetValue) * 100), 100)
          : null,
      }));

      const isCurrentPosition = g.status === "em_andamento" &&
        sortedGoals.filter(x => x.status === "em_andamento").indexOf(g) === 0;

      return {
        index: idx,
        label: POINT_LABELS[idx] ?? String(idx + 1),
        goalId: g.id,
        title: g.title,
        dimension: g.dimensionName ?? null,
        status: g.status,
        progressPercentage: prog,
        riskStatus: risk,
        startDate: g.startDate ?? null,
        endDate: g.endDate ?? null,
        currentValue: g.currentValue,
        targetValue: g.targetValue,
        unit: g.unit,
        kriDescription: g.kriDescription ?? null,
        kpis: goalKpis,
        isCurrentPosition,
        score: g.score,
      };
    });

    // Find current position index
    const currentPositionIndex = journeyPoints.findIndex(p => p.isCurrentPosition);

    // Overall progress
    const overallProgress = journeyPoints.length > 0
      ? Math.round(journeyPoints.reduce((s, p) => s + p.progressPercentage, 0) / journeyPoints.length)
      : 0;

    const completedCount = journeyPoints.filter(p => p.status === "concluida").length;
    const atRiskCount = journeyPoints.filter(p => p.riskStatus === "atrasado" || p.status === "atrasada").length;

    res.json({
      franchiseName: franchise?.name ?? null,
      year,
      statement: visao?.statement ?? null,
      overallProgress,
      completedCount,
      atRiskCount,
      checkinConsistency,
      executedDays,
      totalCheckinDays: checkinDays,
      journeyPoints,
      quarterlyKris,
      hasQuarterlyData: milestones.length > 0,
      currentPositionIndex,
    });
  } catch (err) {
    req.log.error(err, "journey error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
