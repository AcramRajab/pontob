import { Router } from "express";
import { db, weeklyPlannerEntriesTable, franchisesTable, PLANNER_INDICATORS } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "../middlewares/auth";

const router = Router();

function canAccessFranchise(req: any, franchiseId: number) {
  const role = req.session.userRole;
  if (role === "master_admin" || role === "staff_regional") return true;
  return req.session.franchiseId === franchiseId;
}

// GET /planner?franchiseId=&weekStartDate=
router.get("/planner", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const { weekStartDate } = req.query;
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;

    const effectiveFranchiseId = (role === "master_admin" || role === "staff_regional")
      ? paramFranchiseId
      : req.session.franchiseId ?? undefined;

    if (!effectiveFranchiseId) {
      res.status(400).json({ error: "franchiseId required" });
      return;
    }
    if (!weekStartDate) {
      res.status(400).json({ error: "weekStartDate required" });
      return;
    }

    const conditions = [
      eq(weeklyPlannerEntriesTable.franchiseId, effectiveFranchiseId),
      eq(weeklyPlannerEntriesTable.weekStartDate, weekStartDate as string),
    ];

    const rows = await db
      .select()
      .from(weeklyPlannerEntriesTable)
      .where(and(...conditions));

    res.json({
      franchiseId: effectiveFranchiseId,
      weekStartDate,
      indicators: PLANNER_INDICATORS,
      entries: rows.map(r => ({
        ...r,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /planner — upsert a single cell (indicator + dayOfWeek)
router.post("/planner", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, weekStartDate, indicatorKey, dayOfWeek, value, meta, notes } = req.body;

    if (!franchiseId || !weekStartDate || !indicatorKey || dayOfWeek === undefined) {
      res.status(400).json({ error: "franchiseId, weekStartDate, indicatorKey, dayOfWeek required" });
      return;
    }
    if (!canAccessFranchise(req, franchiseId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const validKeys = PLANNER_INDICATORS.map(i => i.key);
    if (!validKeys.includes(indicatorKey)) {
      res.status(400).json({ error: "Invalid indicatorKey" });
      return;
    }

    const existing = await db
      .select()
      .from(weeklyPlannerEntriesTable)
      .where(and(
        eq(weeklyPlannerEntriesTable.franchiseId, franchiseId),
        eq(weeklyPlannerEntriesTable.weekStartDate, weekStartDate),
        eq(weeklyPlannerEntriesTable.indicatorKey, indicatorKey),
        eq(weeklyPlannerEntriesTable.dayOfWeek, dayOfWeek),
      ))
      .limit(1);

    let row;
    if (existing[0]) {
      [row] = await db
        .update(weeklyPlannerEntriesTable)
        .set({ value: value ?? null, meta: meta ?? null, notes: notes ?? null, userId: req.session.userId! })
        .where(eq(weeklyPlannerEntriesTable.id, existing[0].id))
        .returning();
    } else {
      [row] = await db
        .insert(weeklyPlannerEntriesTable)
        .values({
          franchiseId,
          userId: req.session.userId!,
          weekStartDate,
          indicatorKey,
          dayOfWeek,
          value: value ?? null,
          meta: meta ?? null,
          notes: notes ?? null,
        })
        .returning();
    }

    res.status(existing[0] ? 200 : 201).json({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /planner/indicators — static list of all indicators
router.get("/planner/indicators", requireAuth, async (_req, res) => {
  res.json(PLANNER_INDICATORS);
});

export default router;
