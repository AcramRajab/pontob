import { Router } from "express";
import { db, franchiseVisaoTable, franchiseVisaoMilestonesTable, franchiseKrisTable } from "@workspace/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
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

// GET /visao?franchiseId=&year=
router.get("/visao", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;

    const effectiveFranchiseId = (role === "master_admin" || role === "staff_regional" || role === "socio")
      ? paramFranchiseId
      : (paramFranchiseId ?? req.session.franchiseId ?? undefined);

    if (!effectiveFranchiseId) {
      res.status(400).json({ error: "franchiseId required" });
      return;
    }

    // Get visao record
    const visaoRows = await db
      .select()
      .from(franchiseVisaoTable)
      .where(and(
        eq(franchiseVisaoTable.franchiseId, effectiveFranchiseId),
        eq(franchiseVisaoTable.year, year),
      ))
      .limit(1);

    const visao = visaoRows[0] ?? null;

    // Get milestones
    const milestones = visao
      ? await db
          .select()
          .from(franchiseVisaoMilestonesTable)
          .where(eq(franchiseVisaoMilestonesTable.visaoId, visao.id))
          .orderBy(franchiseVisaoMilestonesTable.quarterDate)
      : [];

    // Get actual KRI data for the year (aggregate by quarter)
    const actualKris = await db
      .select()
      .from(franchiseKrisTable)
      .where(and(
        eq(franchiseKrisTable.franchiseId, effectiveFranchiseId),
        eq(franchiseKrisTable.year, year),
      ))
      .orderBy(franchiseKrisTable.month);

    // Build quarterly actuals: Q1=Mar, Q2=Jun, Q3=Sep, Q4=Dec
    const quarters = [
      { label: "1ºTRI", months: [1, 2, 3], date: `${year}-03-31` },
      { label: "2ºTRI", months: [4, 5, 6], date: `${year}-06-30` },
      { label: "3ºTRI", months: [7, 8, 9], date: `${year}-09-30` },
      { label: "4ºTRI", months: [10, 11, 12], date: `${year}-12-31` },
    ];

    const quarterActuals = quarters.map(q => {
      // Use end-of-quarter month data (most recent month in quarter with data)
      const monthsData = actualKris.filter(k => q.months.includes(k.month));
      const lastMonthData = monthsData[monthsData.length - 1] ?? null;
      return {
        quarterDate: q.date,
        quarterLabel: q.label,
        actualCreci: lastMonthData?.creci ?? null,
        actualCres: lastMonthData?.cres ?? null,
        actualVgh: lastMonthData?.vgh ?? null,
      };
    });

    res.json({
      franchiseId: effectiveFranchiseId,
      year,
      visao: visao ? {
        ...visao,
        createdAt: visao.createdAt instanceof Date ? visao.createdAt.toISOString() : visao.createdAt,
        updatedAt: visao.updatedAt instanceof Date ? visao.updatedAt.toISOString() : visao.updatedAt,
      } : null,
      milestones: milestones.map(m => ({
        ...m,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
        updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
      })),
      quarterActuals,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /visao — upsert vision statement
router.post("/visao", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, year, statement } = req.body;
    if (!franchiseId || !year) {
      res.status(400).json({ error: "franchiseId and year required" });
      return;
    }
    if (!canAccessFranchise(req, franchiseId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const existing = await db
      .select()
      .from(franchiseVisaoTable)
      .where(and(
        eq(franchiseVisaoTable.franchiseId, franchiseId),
        eq(franchiseVisaoTable.year, year),
      ))
      .limit(1);

    let row;
    if (existing[0]) {
      [row] = await db
        .update(franchiseVisaoTable)
        .set({ statement })
        .where(eq(franchiseVisaoTable.id, existing[0].id))
        .returning();
    } else {
      [row] = await db
        .insert(franchiseVisaoTable)
        .values({ franchiseId, year, statement })
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

// POST /visao/milestones — upsert a quarterly milestone
router.post("/visao/milestones", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, year, quarterDate, quarterLabel, targetCreci, targetCres, targetVgh } = req.body;
    if (!franchiseId || !year || !quarterDate || !quarterLabel) {
      res.status(400).json({ error: "franchiseId, year, quarterDate, quarterLabel required" });
      return;
    }
    if (!canAccessFranchise(req, franchiseId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Ensure visao parent record exists — atomic upsert to avoid race condition
    const [visaoRow] = await db
      .insert(franchiseVisaoTable)
      .values({ franchiseId, year, statement: null })
      .onConflictDoUpdate({
        target: [franchiseVisaoTable.franchiseId, franchiseVisaoTable.year],
        set: { updatedAt: sql`now()` },
      })
      .returning();

    const visaoId = visaoRow.id;

    // Atomic upsert — avoids race condition when two fields are saved in rapid succession
    const [row] = await db
      .insert(franchiseVisaoMilestonesTable)
      .values({
        visaoId,
        franchiseId,
        year,
        quarterDate,
        quarterLabel,
        targetCreci: targetCreci ?? null,
        targetCres: targetCres ?? null,
        targetVgh: targetVgh ?? null,
      })
      .onConflictDoUpdate({
        target: [franchiseVisaoMilestonesTable.visaoId, franchiseVisaoMilestonesTable.quarterDate],
        set: {
          targetCreci: targetCreci ?? null,
          targetCres: targetCres ?? null,
          targetVgh: targetVgh ?? null,
          quarterLabel,
          updatedAt: sql`now()`,
        },
      })
      .returning();

    res.status(200).json({
      ...row,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
