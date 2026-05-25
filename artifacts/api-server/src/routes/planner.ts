import { Router } from "express";
import { db, weeklyPlannerEntriesTable, weeklyPlannerWeeksTable, franchisesTable, usersTable, PLANNER_INDICATORS, franchiseVisaoMilestonesTable, plannerEventLogTable } from "@workspace/db";
import { eq, and, inArray, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "../middlewares/auth";
import { sendPlannerWeekSummary, sendPlannerWeekReopened } from "../services/email";

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

function formatWeekLabel(weekStartDate: string): string {
  const [y, m, d] = weekStartDate.split("-");
  const start = new Date(Number(y), Number(m) - 1, Number(d));
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (dt: Date) => `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
  return `${fmt(start)}–${fmt(end)}/${y}`;
}

// GET /planner/ytd?franchiseId=&year= — year-to-date accumulated totals for key KRI indicators
router.get("/planner/ytd", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;

    const effectiveFranchiseId = (role === "master_admin" || role === "staff_regional" || role === "socio")
      ? paramFranchiseId
      : req.session.franchiseId ?? undefined;

    if (!effectiveFranchiseId) { res.status(400).json({ error: "franchiseId required" }); return; }

    // ── Current-quarter calculation ────────────────────────────────────────
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12

    type QInfo = { label: string; date: string; endMonth: number; endDay: number };
    const QUARTERS: QInfo[] = [
      { label: "Q1", date: `${year}-03-31`, endMonth: 3,  endDay: 31 },
      { label: "Q2", date: `${year}-06-30`, endMonth: 6,  endDay: 30 },
      { label: "Q3", date: `${year}-09-30`, endMonth: 9,  endDay: 30 },
      { label: "Q4", date: `${year}-12-31`, endMonth: 12, endDay: 31 },
    ];
    const currentQ = month <= 3 ? QUARTERS[0] : month <= 6 ? QUARTERS[1] : month <= 9 ? QUARTERS[2] : QUARTERS[3];

    // Days from Jan 1 to end of current quarter
    const qEndDate = new Date(year, currentQ.endMonth - 1, currentQ.endDay);
    const jan1 = new Date(year, 0, 1);
    const daysToQEnd = Math.round((qEndDate.getTime() - jan1.getTime()) / 86_400_000) + 1;
    // Days from Jan 1 to today (capped at daysToQEnd)
    const daysSinceJan1 = Math.min(
      Math.round((now.getTime() - jan1.getTime()) / 86_400_000) + 1,
      daysToQEnd,
    );
    // Days left until quarter end
    const daysLeft = Math.max(0, Math.round((qEndDate.getTime() - now.getTime()) / 86_400_000));
    // What fraction of the quarter period has elapsed (0–1)
    const elapsedFraction = daysToQEnd > 0 ? daysSinceJan1 / daysToQEnd : 1;

    const KEY_INDICATORS = ["corretores_entraram", "novos_contratos_representacao", "venda_assinada"];

    const [rows, milestoneRows] = await Promise.all([
      db
        .select({
          indicatorKey: weeklyPlannerEntriesTable.indicatorKey,
          total: sql<number>`COALESCE(SUM(${weeklyPlannerEntriesTable.value}), 0)`.as("total"),
        })
        .from(weeklyPlannerEntriesTable)
        .where(and(
          eq(weeklyPlannerEntriesTable.franchiseId, effectiveFranchiseId),
          inArray(weeklyPlannerEntriesTable.indicatorKey, KEY_INDICATORS),
          gte(weeklyPlannerEntriesTable.weekStartDate, `${year}-01-01`),
          lte(weeklyPlannerEntriesTable.weekStartDate, `${year}-12-31`),
        ))
        .groupBy(weeklyPlannerEntriesTable.indicatorKey),
      db
        .select()
        .from(franchiseVisaoMilestonesTable)
        .where(and(
          eq(franchiseVisaoMilestonesTable.franchiseId, effectiveFranchiseId),
          eq(franchiseVisaoMilestonesTable.year, year),
          eq(franchiseVisaoMilestonesTable.quarterDate, currentQ.date),
        ))
        .limit(1),
    ]);

    const totals: Record<string, number> = {};
    for (const row of rows) totals[row.indicatorKey] = Number(row.total);

    const milestone = milestoneRows[0] ?? null;

    const ytd = {
      corretores: totals["corretores_entraram"] ?? 0,
      contratos: totals["novos_contratos_representacao"] ?? 0,
      vendas: totals["venda_assinada"] ?? 0,
    };
    const targets = {
      corretores: milestone?.targetCreci ?? null,
      contratos: milestone?.targetCres ?? null,
      vendas: milestone?.targetVgh ?? null,
    };

    // ── On-track status per indicator ─────────────────────────────────────
    // Expected at today = target * elapsedFraction
    // onTrackRatio = ytd / expected (1.0 = exactly on track)
    function onTrackRatio(actual: number, target: number | null): number | null {
      if (target == null || target === 0) return null;
      const expected = target * elapsedFraction;
      if (expected === 0) return null;
      return actual / expected;
    }

    const ratios = {
      corretores: onTrackRatio(ytd.corretores, targets.corretores),
      contratos:  onTrackRatio(ytd.contratos,  targets.contratos),
      vendas:     onTrackRatio(ytd.vendas,      targets.vendas),
    };

    // Overall on-track: average of available ratios; ≥ 0.85 = on track
    const validRatios = Object.values(ratios).filter((r): r is number => r !== null);
    const avgRatio = validRatios.length > 0 ? validRatios.reduce((a, b) => a + b, 0) / validRatios.length : null;
    const onTrack = avgRatio !== null ? avgRatio >= 0.85 : null;

    res.json({
      year,
      franchiseId: effectiveFranchiseId,
      quarterLabel: currentQ.label,
      quarterDate: currentQ.date,
      daysLeft,
      elapsedPct: Math.round(elapsedFraction * 100),
      onTrack,
      onTrackRatios: ratios,
      ytd,
      targets,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /planner?franchiseId=&weekStartDate=
router.get("/planner", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const { weekStartDate } = req.query;
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;

    const effectiveFranchiseId = (role === "master_admin" || role === "staff_regional" || role === "socio")
      ? paramFranchiseId
      : req.session.franchiseId ?? undefined;

    if (!effectiveFranchiseId) { res.status(400).json({ error: "franchiseId required" }); return; }
    if (!weekStartDate) { res.status(400).json({ error: "weekStartDate required" }); return; }

    const [rows, weekRows] = await Promise.all([
      db.select().from(weeklyPlannerEntriesTable).where(and(
        eq(weeklyPlannerEntriesTable.franchiseId, effectiveFranchiseId),
        eq(weeklyPlannerEntriesTable.weekStartDate, weekStartDate as string),
      )),
      db.select().from(weeklyPlannerWeeksTable).where(and(
        eq(weeklyPlannerWeeksTable.franchiseId, effectiveFranchiseId),
        eq(weeklyPlannerWeeksTable.weekStartDate, weekStartDate as string),
      )).limit(1),
    ]);

    const week = weekRows[0] ?? null;

    res.json({
      franchiseId: effectiveFranchiseId,
      weekStartDate,
      indicators: PLANNER_INDICATORS,
      entries: rows.map(r => ({
        ...r,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
      })),
      week: week ? {
        gapsText: week.gapsText,
        actionsText: week.actionsText,
        submittedAt: week.submittedAt instanceof Date ? week.submittedAt.toISOString() : week.submittedAt,
      } : null,
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
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const validKeys = PLANNER_INDICATORS.map(i => i.key);
    if (!validKeys.includes(indicatorKey)) { res.status(400).json({ error: "Invalid indicatorKey" }); return; }

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
        .values({ franchiseId, userId: req.session.userId!, weekStartDate, indicatorKey, dayOfWeek, value: value ?? null, meta: meta ?? null, notes: notes ?? null })
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

// PATCH /planner/week — save gaps/actions text (auto-save)
router.patch("/planner/week", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, weekStartDate, gapsText, actionsText } = req.body;
    if (!franchiseId || !weekStartDate) {
      res.status(400).json({ error: "franchiseId and weekStartDate required" });
      return;
    }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const existing = await db.select().from(weeklyPlannerWeeksTable)
      .where(and(eq(weeklyPlannerWeeksTable.franchiseId, franchiseId), eq(weeklyPlannerWeeksTable.weekStartDate, weekStartDate)))
      .limit(1);

    let row;
    if (existing[0]) {
      [row] = await db.update(weeklyPlannerWeeksTable)
        .set({ gapsText: gapsText ?? existing[0].gapsText, actionsText: actionsText ?? existing[0].actionsText })
        .where(eq(weeklyPlannerWeeksTable.id, existing[0].id))
        .returning();
    } else {
      [row] = await db.insert(weeklyPlannerWeeksTable)
        .values({ franchiseId, weekStartDate, gapsText: gapsText ?? null, actionsText: actionsText ?? null })
        .returning();
    }

    res.json({ ok: true, gapsText: row.gapsText, actionsText: row.actionsText });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /planner/submit — finalize the week and send summary email
router.post("/planner/submit", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, weekStartDate, gapsText, actionsText } = req.body;
    if (!franchiseId || !weekStartDate) {
      res.status(400).json({ error: "franchiseId and weekStartDate required" });
      return;
    }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    // Upsert week record with submittedAt
    const existing = await db.select().from(weeklyPlannerWeeksTable)
      .where(and(eq(weeklyPlannerWeeksTable.franchiseId, franchiseId), eq(weeklyPlannerWeeksTable.weekStartDate, weekStartDate)))
      .limit(1);

    let row;
    if (existing[0]) {
      [row] = await db.update(weeklyPlannerWeeksTable)
        .set({
          gapsText: gapsText ?? existing[0].gapsText,
          actionsText: actionsText ?? existing[0].actionsText,
          submittedAt: new Date(),
          submittedByUserId: req.session.userId!,
        })
        .where(eq(weeklyPlannerWeeksTable.id, existing[0].id))
        .returning();
    } else {
      [row] = await db.insert(weeklyPlannerWeeksTable)
        .values({ franchiseId, weekStartDate, gapsText: gapsText ?? null, actionsText: actionsText ?? null, submittedAt: new Date(), submittedByUserId: req.session.userId! })
        .returning();
    }

    // Gather summary data for email
    const [franchise, entries, submitter] = await Promise.all([
      db.select().from(franchisesTable).where(eq(franchisesTable.id, franchiseId)).limit(1),
      db.select().from(weeklyPlannerEntriesTable).where(and(
        eq(weeklyPlannerEntriesTable.franchiseId, franchiseId),
        eq(weeklyPlannerEntriesTable.weekStartDate, weekStartDate),
      )),
      db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1),
    ]);

    const totals = PLANNER_INDICATORS.map(ind => {
      const dayEntries = entries.filter(e => e.indicatorKey === ind.key);
      const total = dayEntries.reduce((s, e) => s + Number(e.value ?? 0), 0);
      const metas = dayEntries.filter(e => e.meta != null).map(e => Number(e.meta!));
      const meta = metas.length ? metas[metas.length - 1] : null;
      return { label: ind.label, total, meta };
    });

    const weekLabel = formatWeekLabel(weekStartDate);
    const submitterUser = submitter[0];
    const franchiseRecord = franchise[0];

    // Send summary to the person who submitted
    if (submitterUser?.email) {
      sendPlannerWeekSummary({
        toEmail: submitterUser.email,
        toName: submitterUser.name,
        franchiseName: franchiseRecord?.name ?? "Franquia",
        weekLabel,
        totals,
        gapsText: row.gapsText ?? null,
        actionsText: row.actionsText ?? null,
      }).catch(() => {});
    }

    // Also notify regional team (staff with no franchiseId)
    const regionalStaff = await db.select().from(usersTable)
      .where(inArray(usersTable.role, ["master_admin", "staff_regional"]));
    for (const staff of regionalStaff) {
      if (staff.email && staff.active && staff.email !== submitterUser?.email) {
        sendPlannerWeekSummary({
          toEmail: staff.email,
          toName: staff.name,
          franchiseName: franchiseRecord?.name ?? "Franquia",
          weekLabel,
          totals,
          gapsText: row.gapsText ?? null,
          actionsText: row.actionsText ?? null,
        }).catch(() => {});
      }
    }

    res.json({
      ok: true,
      submittedAt: row.submittedAt instanceof Date ? row.submittedAt.toISOString() : row.submittedAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /planner/reopen — reopen a submitted week for editing
router.post("/planner/reopen", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, weekStartDate } = req.body;
    if (!franchiseId || !weekStartDate) {
      res.status(400).json({ error: "franchiseId and weekStartDate required" }); return;
    }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const existing = await db.select().from(weeklyPlannerWeeksTable)
      .where(and(eq(weeklyPlannerWeeksTable.franchiseId, franchiseId), eq(weeklyPlannerWeeksTable.weekStartDate, weekStartDate)))
      .limit(1);

    if (!existing[0]?.submittedAt) {
      res.status(400).json({ error: "Week is not submitted" }); return;
    }

    const [row] = await db.update(weeklyPlannerWeeksTable)
      .set({ submittedAt: null, submittedByUserId: null })
      .where(eq(weeklyPlannerWeeksTable.id, existing[0].id))
      .returning();

    // Notify regional team
    const [franchise, reopener, regionalStaff] = await Promise.all([
      db.select().from(franchisesTable).where(eq(franchisesTable.id, franchiseId)).limit(1),
      db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1),
      db.select().from(usersTable).where(inArray(usersTable.role, ["master_admin", "staff_regional"])),
    ]);

    const weekLabel = formatWeekLabel(weekStartDate);
    const franchiseName = franchise[0]?.name ?? "Franquia";
    const reopenerName = reopener[0]?.name ?? "Usuário";

    for (const staff of regionalStaff) {
      if (staff.email && staff.active) {
        sendPlannerWeekReopened({
          toEmail: staff.email,
          toName: staff.name,
          franchiseName,
          weekLabel,
          reopenedByName: reopenerName,
        }).catch(() => {});
      }
    }

    res.json({ ok: true, submittedAt: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Event log ──────────────────────────────────────────────────────────────────

function getMondayStr(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay(); // 0=Sun, 1=Mon…
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  const jsDay = d.getDay(); // 0=Sun, 1=Mon…
  return jsDay === 0 ? 6 : jsDay - 1; // 0=Mon…6=Sun
}

// POST /planner/events — log a real-time event and update the day's aggregate
router.post("/planner/events", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, indicatorKey, delta, note, eventDate } = req.body;
    if (!franchiseId || !indicatorKey || delta == null || !eventDate) {
      res.status(400).json({ error: "franchiseId, indicatorKey, delta, eventDate required" }); return;
    }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const weekStartDate = getMondayStr(eventDate);
    const dayOfWeek = getDayOfWeek(eventDate);
    const userId = req.session.userId!;

    // Insert event log entry
    const [event] = await db.insert(plannerEventLogTable).values({
      franchiseId, userId, weekStartDate, eventDate, dayOfWeek,
      indicatorKey, delta, note: note || null,
    }).returning();

    // Upsert the daily aggregate (add delta to existing value)
    const existing = await db.select().from(weeklyPlannerEntriesTable)
      .where(and(
        eq(weeklyPlannerEntriesTable.franchiseId, franchiseId),
        eq(weeklyPlannerEntriesTable.weekStartDate, weekStartDate),
        eq(weeklyPlannerEntriesTable.indicatorKey, indicatorKey),
        eq(weeklyPlannerEntriesTable.dayOfWeek, dayOfWeek),
      )).limit(1);

    if (existing[0]) {
      const newVal = Number(existing[0].value ?? 0) + delta;
      await db.update(weeklyPlannerEntriesTable)
        .set({ value: String(newVal) })
        .where(eq(weeklyPlannerEntriesTable.id, existing[0].id));
    } else {
      await db.insert(weeklyPlannerEntriesTable).values({
        franchiseId, userId, weekStartDate, indicatorKey, dayOfWeek,
        value: String(delta), meta: null,
      });
    }

    res.json({ ok: true, event });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /planner/events/:id — undo a specific event (subtracts delta from aggregate)
router.delete("/planner/events/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id as string);
    const [event] = await db.select().from(plannerEventLogTable)
      .where(eq(plannerEventLogTable.id, eventId)).limit(1);
    if (!event) { res.status(404).json({ error: "Event not found" }); return; }
    if (!canAccessFranchise(req, event.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    await db.delete(plannerEventLogTable).where(eq(plannerEventLogTable.id, eventId));

    // Reverse the delta from the daily aggregate
    const existing = await db.select().from(weeklyPlannerEntriesTable)
      .where(and(
        eq(weeklyPlannerEntriesTable.franchiseId, event.franchiseId),
        eq(weeklyPlannerEntriesTable.weekStartDate, event.weekStartDate),
        eq(weeklyPlannerEntriesTable.indicatorKey, event.indicatorKey),
        eq(weeklyPlannerEntriesTable.dayOfWeek, event.dayOfWeek),
      )).limit(1);

    if (existing[0]) {
      const newVal = Number(existing[0].value ?? 0) - Number(event.delta);
      await db.update(weeklyPlannerEntriesTable)
        .set({ value: String(newVal) })
        .where(eq(weeklyPlannerEntriesTable.id, existing[0].id));
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /planner/events?franchiseId=&weekStartDate= — event log for a week
router.get("/planner/events", requireAuth, async (req, res) => {
  try {
    const franchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    const weekStartDate = req.query.weekStartDate as string | undefined;
    if (!franchiseId || !weekStartDate) {
      res.status(400).json({ error: "franchiseId and weekStartDate required" }); return;
    }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const events = await db
      .select({
        id: plannerEventLogTable.id,
        userId: plannerEventLogTable.userId,
        userName: usersTable.name,
        weekStartDate: plannerEventLogTable.weekStartDate,
        eventDate: plannerEventLogTable.eventDate,
        dayOfWeek: plannerEventLogTable.dayOfWeek,
        indicatorKey: plannerEventLogTable.indicatorKey,
        delta: plannerEventLogTable.delta,
        note: plannerEventLogTable.note,
        createdAt: plannerEventLogTable.createdAt,
      })
      .from(plannerEventLogTable)
      .innerJoin(usersTable, eq(plannerEventLogTable.userId, usersTable.id))
      .where(and(
        eq(plannerEventLogTable.franchiseId, franchiseId),
        eq(plannerEventLogTable.weekStartDate, weekStartDate),
      ))
      .orderBy(sql`${plannerEventLogTable.createdAt} DESC`);

    res.json({ events });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /planner/indicators — static list of all indicators
router.get("/planner/indicators", requireAuth, async (_req, res) => {
  res.json(PLANNER_INDICATORS);
});

// GET /planner/history?franchiseId=&year= — weekly totals per indicator for the full year
router.get("/planner/history", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    const effectiveFranchiseId = (role === "master_admin" || role === "staff_regional" || role === "socio")
      ? paramFranchiseId
      : req.session.franchiseId ?? undefined;

    if (!effectiveFranchiseId) { res.status(400).json({ error: "franchiseId required" }); return; }
    if (!canAccessFranchise(req, effectiveFranchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const [sumRows, metaRows] = await Promise.all([
      db
        .select({
          weekStartDate: weeklyPlannerEntriesTable.weekStartDate,
          indicatorKey: weeklyPlannerEntriesTable.indicatorKey,
          total: sql<number>`COALESCE(SUM(${weeklyPlannerEntriesTable.value}), 0)`.as("total"),
        })
        .from(weeklyPlannerEntriesTable)
        .where(and(
          eq(weeklyPlannerEntriesTable.franchiseId, effectiveFranchiseId),
          gte(weeklyPlannerEntriesTable.weekStartDate, `${year}-01-01`),
          lte(weeklyPlannerEntriesTable.weekStartDate, `${year}-12-31`),
        ))
        .groupBy(weeklyPlannerEntriesTable.weekStartDate, weeklyPlannerEntriesTable.indicatorKey)
        .orderBy(weeklyPlannerEntriesTable.weekStartDate),
      db
        .select({
          indicatorKey: weeklyPlannerEntriesTable.indicatorKey,
          meta: weeklyPlannerEntriesTable.meta,
        })
        .from(weeklyPlannerEntriesTable)
        .where(and(
          eq(weeklyPlannerEntriesTable.franchiseId, effectiveFranchiseId),
          gte(weeklyPlannerEntriesTable.weekStartDate, `${year}-01-01`),
          lte(weeklyPlannerEntriesTable.weekStartDate, `${year}-12-31`),
        ))
        .orderBy(weeklyPlannerEntriesTable.weekStartDate),
    ]);

    // Build week -> indicator -> total map
    const byWeek: Record<string, Record<string, number>> = {};
    for (const row of sumRows) {
      if (!byWeek[row.weekStartDate]) byWeek[row.weekStartDate] = {};
      byWeek[row.weekStartDate][row.indicatorKey] = Number(row.total);
    }

    // Latest meta per indicator (last non-null value seen)
    const metas: Record<string, number | null> = {};
    for (const row of metaRows) {
      if (row.meta != null) metas[row.indicatorKey] = Number(row.meta);
    }

    const weeks = Object.keys(byWeek).sort();

    res.json({
      year,
      franchiseId: effectiveFranchiseId,
      weeks: weeks.map(w => ({ weekStartDate: w, totals: byWeek[w] })),
      metas,
      indicators: PLANNER_INDICATORS,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /planner/monthly-summary?franchiseId=&year=&month=
router.get("/planner/monthly-summary", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const now = new Date();
    const year = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();
    const month = req.query.month ? parseInt(req.query.month as string) : now.getMonth() + 1;
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;

    const effectiveFranchiseId = (role === "master_admin" || role === "staff_regional" || role === "socio")
      ? paramFranchiseId
      : req.session.franchiseId ?? undefined;

    if (!effectiveFranchiseId) { res.status(400).json({ error: "franchiseId required" }); return; }
    if (!canAccessFranchise(req, effectiveFranchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayDate = new Date(year, month, 0);
    const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayDate.getDate()).padStart(2, "0")}`;

    const [sumRows, metaRows] = await Promise.all([
      db
        .select({
          indicatorKey: weeklyPlannerEntriesTable.indicatorKey,
          total: sql<number>`COALESCE(SUM(${weeklyPlannerEntriesTable.value}), 0)`.as("total"),
        })
        .from(weeklyPlannerEntriesTable)
        .where(and(
          eq(weeklyPlannerEntriesTable.franchiseId, effectiveFranchiseId),
          gte(weeklyPlannerEntriesTable.weekStartDate, firstDay),
          lte(weeklyPlannerEntriesTable.weekStartDate, lastDay),
        ))
        .groupBy(weeklyPlannerEntriesTable.indicatorKey),
      db
        .select({
          indicatorKey: weeklyPlannerEntriesTable.indicatorKey,
          meta: weeklyPlannerEntriesTable.meta,
        })
        .from(weeklyPlannerEntriesTable)
        .where(and(
          eq(weeklyPlannerEntriesTable.franchiseId, effectiveFranchiseId),
          gte(weeklyPlannerEntriesTable.weekStartDate, firstDay),
          lte(weeklyPlannerEntriesTable.weekStartDate, lastDay),
        ))
        .orderBy(weeklyPlannerEntriesTable.weekStartDate),
    ]);

    const realizado: Record<string, number> = {};
    for (const row of sumRows) {
      realizado[row.indicatorKey] = Number(row.total);
    }

    const planejado: Record<string, number | null> = {};
    for (const row of metaRows) {
      if (row.meta != null) planejado[row.indicatorKey] = Number(row.meta);
    }

    res.json({ year, month, franchiseId: effectiveFranchiseId, realizado, planejado });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
