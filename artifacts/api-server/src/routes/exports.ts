import { Router } from "express";
import { db, goalsTable, kpisTable, goalInitiativesTable, dailyCheckinsTable, weeklyCheckinsTable, monthlyCheckinsTable, alertsTable, helpRequestsTable, franchisesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function toCSV(headers: string[], rows: any[][]): string {
  const escape = (val: any) => {
    const s = val == null ? "" : String(val);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
}

function canAccessFranchise(req: any, franchiseId?: number | null) {
  const role = req.session.userRole;
  if (role === "master_admin" || role === "staff_regional") return true;
  if (!franchiseId) return false;
  if (role === "socio") {
    const linked: number[] = req.session.linkedFranchiseIds ?? [];
    return linked.includes(franchiseId);
  }
  return req.session.franchiseId === franchiseId;
}

router.get("/exports/goals", requireAuth, async (req, res) => {
  try {
    const fid = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    if (!canAccessFranchise(req, fid)) { res.status(403).json({ error: "Forbidden" }); return; }

    const goals = fid
      ? await db.select().from(goalsTable).where(eq(goalsTable.franchiseId, fid))
      : await db.select().from(goalsTable);

    const csv = toCSV(
      ["id", "title", "status", "progress%", "score", "riskStatus", "currentValue", "targetValue", "unit", "startDate", "endDate", "frequency"],
      goals.map(g => [g.id, g.title, g.status, g.progressPercentage, g.score, g.riskStatus, g.currentValue, g.targetValue, g.unit, g.startDate, g.endDate, g.frequency])
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="goals.csv"');
    res.send(csv);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/exports/checkins", requireAuth, async (req, res) => {
  try {
    const fid = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    const type = req.query.type as string || "daily";
    if (!canAccessFranchise(req, fid)) { res.status(403).json({ error: "Forbidden" }); return; }

    let csv = "";
    if (type === "daily") {
      const rows = fid
        ? await db.select().from(dailyCheckinsTable).where(eq(dailyCheckinsTable.franchiseId, fid))
        : await db.select().from(dailyCheckinsTable);
      csv = toCSV(
        ["id", "goalId", "date", "executedToday", "progressToday", "blocker", "nextStep", "needsHelp"],
        rows.map(r => [r.id, r.goalId, r.date, r.executedToday, r.progressToday, r.blocker, r.nextStep, r.needsHelp])
      );
    } else if (type === "weekly") {
      const rows = fid
        ? await db.select().from(weeklyCheckinsTable).where(eq(weeklyCheckinsTable.franchiseId, fid))
        : await db.select().from(weeklyCheckinsTable);
      csv = toCSV(
        ["id", "goalId", "weekStartDate", "weekEndDate", "executionPercentage", "planned", "executed", "blockers", "nextWeekPriority"],
        rows.map(r => [r.id, r.goalId, r.weekStartDate, r.weekEndDate, r.executionPercentage, r.planned, r.executed, r.blockers, r.nextWeekPriority])
      );
    } else {
      const rows = fid
        ? await db.select().from(monthlyCheckinsTable).where(eq(monthlyCheckinsTable.franchiseId, fid))
        : await db.select().from(monthlyCheckinsTable);
      csv = toCSV(
        ["id", "goalId", "month", "year", "kriProgress", "continueDoing", "stopDoing", "startDoing", "nextMonthFocus"],
        rows.map(r => [r.id, r.goalId, r.month, r.year, r.kriProgress, r.continueDoing, r.stopDoing, r.startDoing, r.nextMonthFocus])
      );
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${type}-checkins.csv"`);
    res.send(csv);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
