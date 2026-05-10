import { Router } from "express";
import { db, vagasTable, candidatosTable, franchisesTable, goalsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "../middlewares/auth";

const router = Router();

function canAccessFranchise(req: any, franchiseId: number) {
  const role = req.session.userRole;
  if (role === "master_admin" || role === "staff_regional") return true;
  return req.session.franchiseId === franchiseId;
}

async function vagaWithCount(v: any) {
  const [row] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(candidatosTable)
    .where(eq(candidatosTable.vagaId, v.id));
  return { ...v, candidatosCount: row?.count ?? 0 };
}

// GET /vagas
router.get("/vagas", requireAuth, async (req, res) => {
  try {
    const { franchiseId: fqId, status } = req.query;
    const role = req.session.userRole!;

    const effectiveFranchiseId =
      role === "master_admin" || role === "staff_regional"
        ? fqId ? parseInt(fqId as string) : undefined
        : req.session.franchiseId ?? undefined;

    const baseQuery = db
      .select({
        id: vagasTable.id,
        franchiseId: vagasTable.franchiseId,
        franchiseName: franchisesTable.name,
        goalId: vagasTable.goalId,
        goalTitle: goalsTable.title,
        title: vagasTable.title,
        description: vagasTable.description,
        profileSummary: vagasTable.profileSummary,
        mustHaves: vagasTable.mustHaves,
        status: vagasTable.status,
        createdAt: vagasTable.createdAt,
        updatedAt: vagasTable.updatedAt,
      })
      .from(vagasTable)
      .leftJoin(franchisesTable, eq(vagasTable.franchiseId, franchisesTable.id))
      .leftJoin(goalsTable, eq(vagasTable.goalId, goalsTable.id));

    const conditions = [];
    if (effectiveFranchiseId) conditions.push(eq(vagasTable.franchiseId, effectiveFranchiseId));
    if (status) conditions.push(eq(vagasTable.status, status as string));

    const rows = conditions.length > 0
      ? await baseQuery.where(and(...conditions)).orderBy(vagasTable.createdAt)
      : await baseQuery.orderBy(vagasTable.createdAt);

    const enriched = await Promise.all(rows.map(vagaWithCount));
    res.json(enriched);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /vagas
router.post("/vagas", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, goalId, title, description, profileSummary, mustHaves } = req.body;
    if (!canAccessFranchise(req, franchiseId)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const [vaga] = await db.insert(vagasTable).values({
      franchiseId, goalId: goalId || null, title,
      description: description || null,
      profileSummary: profileSummary || null,
      mustHaves: mustHaves || null,
      status: "ativa",
    }).returning();
    res.status(201).json(await vagaWithCount(vaga));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /vagas/:id (with candidatos)
router.get("/vagas/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [vaga] = await db
      .select({
        id: vagasTable.id,
        franchiseId: vagasTable.franchiseId,
        franchiseName: franchisesTable.name,
        goalId: vagasTable.goalId,
        goalTitle: goalsTable.title,
        title: vagasTable.title,
        description: vagasTable.description,
        profileSummary: vagasTable.profileSummary,
        mustHaves: vagasTable.mustHaves,
        status: vagasTable.status,
        createdAt: vagasTable.createdAt,
        updatedAt: vagasTable.updatedAt,
      })
      .from(vagasTable)
      .leftJoin(franchisesTable, eq(vagasTable.franchiseId, franchisesTable.id))
      .leftJoin(goalsTable, eq(vagasTable.goalId, goalsTable.id))
      .where(eq(vagasTable.id, id));

    if (!vaga) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, vaga.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const candidatos = await db
      .select()
      .from(candidatosTable)
      .where(eq(candidatosTable.vagaId, id))
      .orderBy(candidatosTable.createdAt);

    res.json({ ...vaga, candidatosCount: candidatos.length, candidatos });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /vagas/:id
router.patch("/vagas/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select({ franchiseId: vagasTable.franchiseId }).from(vagasTable).where(eq(vagasTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const { goalId, title, description, profileSummary, mustHaves, status } = req.body;
    const [updated] = await db.update(vagasTable).set({
      ...(goalId !== undefined && { goalId: goalId || null }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(profileSummary !== undefined && { profileSummary }),
      ...(mustHaves !== undefined && { mustHaves }),
      ...(status !== undefined && { status }),
    }).where(eq(vagasTable.id, id)).returning();

    res.json(await vagaWithCount(updated));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /vagas/:id
router.delete("/vagas/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select({ franchiseId: vagasTable.franchiseId }).from(vagasTable).where(eq(vagasTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(candidatosTable).where(eq(candidatosTable.vagaId, id));
    await db.delete(vagasTable).where(eq(vagasTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /vagas/:id/candidatos
router.post("/vagas/:id/candidatos", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const vagaId = parseInt(req.params.id);
    const [vaga] = await db.select({ franchiseId: vagasTable.franchiseId }).from(vagasTable).where(eq(vagasTable.id, vagaId));
    if (!vaga) { res.status(404).json({ error: "Vaga not found" }); return; }
    if (!canAccessFranchise(req, vaga.franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const { name, email, phone, source, currentRole, notes, stage } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }

    const [candidato] = await db.insert(candidatosTable).values({
      vagaId,
      name,
      email: email || null,
      phone: phone || null,
      source: source || null,
      currentRole: currentRole || null,
      notes: notes || null,
      stage: stage || "interessado",
    }).returning();
    res.status(201).json(candidato);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /candidatos/:id
router.patch("/candidatos/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db
      .select({ franchiseId: vagasTable.franchiseId })
      .from(candidatosTable)
      .leftJoin(vagasTable, eq(candidatosTable.vagaId, vagasTable.id))
      .where(eq(candidatosTable.id, id));

    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing.franchiseId!)) { res.status(403).json({ error: "Forbidden" }); return; }

    const { name, email, phone, source, currentRole, notes, stage, recommendation } = req.body;
    const [updated] = await db.update(candidatosTable).set({
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(source !== undefined && { source }),
      ...(currentRole !== undefined && { currentRole }),
      ...(notes !== undefined && { notes }),
      ...(stage !== undefined && { stage }),
      ...(recommendation !== undefined && { recommendation }),
    }).where(eq(candidatosTable.id, id)).returning();

    res.json(updated);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /candidatos/:id
router.delete("/candidatos/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db
      .select({ franchiseId: vagasTable.franchiseId })
      .from(candidatosTable)
      .leftJoin(vagasTable, eq(candidatosTable.vagaId, vagasTable.id))
      .where(eq(candidatosTable.id, id));

    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (!canAccessFranchise(req, existing.franchiseId!)) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(candidatosTable).where(eq(candidatosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
