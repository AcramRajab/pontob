import { Router } from "express";
import { db, franchiseKrisTable, franchisesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

// GET /franchise-kris?franchiseId=&year=&month=
router.get("/franchise-kris", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const { year, month } = req.query;
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;

    const effectiveFranchiseId = (role === "master_admin" || role === "staff_regional")
      ? paramFranchiseId
      : req.session.franchiseId ?? undefined;

    const conditions: any[] = [];
    if (effectiveFranchiseId) conditions.push(eq(franchiseKrisTable.franchiseId, effectiveFranchiseId));
    if (year) conditions.push(eq(franchiseKrisTable.year, parseInt(year as string)));
    if (month) conditions.push(eq(franchiseKrisTable.month, parseInt(month as string)));

    const rows = await db
      .select({
        id: franchiseKrisTable.id,
        franchiseId: franchiseKrisTable.franchiseId,
        franchiseName: franchisesTable.name,
        year: franchiseKrisTable.year,
        month: franchiseKrisTable.month,
        creci: franchiseKrisTable.creci,
        cres: franchiseKrisTable.cres,
        vgh: franchiseKrisTable.vgh,
        notes: franchiseKrisTable.notes,
        createdAt: franchiseKrisTable.createdAt,
        updatedAt: franchiseKrisTable.updatedAt,
      })
      .from(franchiseKrisTable)
      .leftJoin(franchisesTable, eq(franchiseKrisTable.franchiseId, franchisesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(franchiseKrisTable.year, franchiseKrisTable.month);

    res.json(rows.map(r => ({
      ...r,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : r.updatedAt,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /franchise-kris — upsert (create or update for the month)
router.post("/franchise-kris", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, year, month, creci, cres, vgh, notes } = req.body;
    if (!franchiseId || !year || !month) {
      res.status(400).json({ error: "franchiseId, year, month required" });
      return;
    }
    if (!canAccessFranchise(req, franchiseId)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const existing = await db
      .select()
      .from(franchiseKrisTable)
      .where(and(
        eq(franchiseKrisTable.franchiseId, franchiseId),
        eq(franchiseKrisTable.year, year),
        eq(franchiseKrisTable.month, month),
      ))
      .limit(1);

    let row;
    if (existing[0]) {
      [row] = await db
        .update(franchiseKrisTable)
        .set({ creci, cres, vgh, notes })
        .where(eq(franchiseKrisTable.id, existing[0].id))
        .returning();
    } else {
      [row] = await db
        .insert(franchiseKrisTable)
        .values({ franchiseId, year, month, creci, cres, vgh, notes })
        .returning();
    }

    const fRows = await db.select({ name: franchisesTable.name }).from(franchisesTable).where(eq(franchisesTable.id, franchiseId)).limit(1);

    res.status(existing[0] ? 200 : 201).json({
      ...row,
      franchiseName: fRows[0]?.name ?? null,
      createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
