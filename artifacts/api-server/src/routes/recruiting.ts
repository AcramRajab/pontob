import { Router } from "express";
import { db, vagasTable, candidatosTable, franchisesTable, goalsTable, candidatoAtividadesTable } from "@workspace/db";
import { eq, and, sql, inArray, desc } from "drizzle-orm";
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

// POST /recruiting/candidatos — create standalone candidate (no vaga required)
router.post("/recruiting/candidatos", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const { franchiseId, name, email, phone, notasEntrevistaOnline, notasEntrevistaPresencial, resultadoFinal } = req.body;
    if (!franchiseId || !name) {
      res.status(400).json({ error: "franchiseId and name are required" });
      return;
    }
    if (!canAccessFranchise(req, franchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const [candidato] = await db.insert(candidatosTable).values({
      franchiseId,
      name,
      email: email || null,
      phone: phone || null,
      notasEntrevistaOnline: notasEntrevistaOnline || null,
      notasEntrevistaPresencial: notasEntrevistaPresencial || null,
      resultadoFinal: resultadoFinal || null,
      stage: "entrevista",
    }).returning();
    res.status(201).json(candidato);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /candidatos/:id — fetch single candidato
router.get("/candidatos/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [candidato] = await db
      .select({
        franchiseId: candidatosTable.franchiseId,
        vagaFranchiseId: vagasTable.franchiseId,
        id: candidatosTable.id,
        vagaId: candidatosTable.vagaId,
        name: candidatosTable.name,
        email: candidatosTable.email,
        phone: candidatosTable.phone,
        source: candidatosTable.source,
        currentRole: candidatosTable.currentRole,
        notes: candidatosTable.notes,
        notasEntrevistaOnline: candidatosTable.notasEntrevistaOnline,
        notasEntrevistaPresencial: candidatosTable.notasEntrevistaPresencial,
        resultadoFinal: candidatosTable.resultadoFinal,
        stage: candidatosTable.stage,
        recommendation: candidatosTable.recommendation,
        interviewAt: candidatosTable.interviewAt,
        createdAt: candidatosTable.createdAt,
        updatedAt: candidatosTable.updatedAt,
      })
      .from(candidatosTable)
      .leftJoin(vagasTable, eq(candidatosTable.vagaId, vagasTable.id))
      .where(eq(candidatosTable.id, id));

    if (!candidato) { res.status(404).json({ error: "Not found" }); return; }
    const effectiveFranchiseId = candidato.franchiseId ?? candidato.vagaFranchiseId;
    if (!effectiveFranchiseId || !canAccessFranchise(req, effectiveFranchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    res.json(candidato);
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
      .select({
        franchiseId: candidatosTable.franchiseId,
        vagaFranchiseId: vagasTable.franchiseId,
      })
      .from(candidatosTable)
      .leftJoin(vagasTable, eq(candidatosTable.vagaId, vagasTable.id))
      .where(eq(candidatosTable.id, id));

    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    const effectiveFranchiseId = existing.franchiseId ?? existing.vagaFranchiseId;
    if (!effectiveFranchiseId || !canAccessFranchise(req, effectiveFranchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }

    const { name, email, phone, source, currentRole, notes, notasEntrevistaOnline, notasEntrevistaPresencial, resultadoFinal, stage, recommendation, interviewAt } = req.body;
    const [updated] = await db.update(candidatosTable).set({
      ...(name !== undefined && { name }),
      ...(email !== undefined && { email }),
      ...(phone !== undefined && { phone }),
      ...(source !== undefined && { source }),
      ...(currentRole !== undefined && { currentRole }),
      ...(notes !== undefined && { notes }),
      ...(notasEntrevistaOnline !== undefined && { notasEntrevistaOnline }),
      ...(notasEntrevistaPresencial !== undefined && { notasEntrevistaPresencial }),
      ...(resultadoFinal !== undefined && { resultadoFinal }),
      ...(stage !== undefined && { stage }),
      ...(recommendation !== undefined && { recommendation }),
      ...(interviewAt !== undefined && { interviewAt: interviewAt ? new Date(interviewAt) : null }),
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
      .select({
        franchiseId: candidatosTable.franchiseId,
        vagaFranchiseId: vagasTable.franchiseId,
      })
      .from(candidatosTable)
      .leftJoin(vagasTable, eq(candidatosTable.vagaId, vagasTable.id))
      .where(eq(candidatosTable.id, id));

    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    const effectiveFranchiseId = existing.franchiseId ?? existing.vagaFranchiseId;
    if (!effectiveFranchiseId || !canAccessFranchise(req, effectiveFranchiseId)) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(candidatosTable).where(eq(candidatosTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /recruiting/candidatos/:id/atividades
router.get("/recruiting/candidatos/:id/atividades", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const atividades = await db
      .select()
      .from(candidatoAtividadesTable)
      .where(eq(candidatoAtividadesTable.candidatoId, id))
      .orderBy(desc(candidatoAtividadesTable.createdAt));
    res.json(atividades);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /recruiting/candidatos/:id/atividades
router.post("/recruiting/candidatos/:id/atividades", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [candidato] = await db
      .select({ franchiseId: vagasTable.franchiseId })
      .from(candidatosTable)
      .leftJoin(vagasTable, eq(candidatosTable.vagaId, vagasTable.id))
      .where(eq(candidatosTable.id, id));
    if (!candidato) { res.status(404).json({ error: "Candidato not found" }); return; }
    if (!canAccessFranchise(req, candidato.franchiseId!)) { res.status(403).json({ error: "Forbidden" }); return; }

    const { type, description } = req.body;
    if (!type) { res.status(400).json({ error: "type is required" }); return; }

    const [atividade] = await db
      .insert(candidatoAtividadesTable)
      .values({ candidatoId: id, type, description: description || null })
      .returning();
    res.status(201).json(atividade);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /recruiting/candidatos — all candidatos for a franchise (standalone + vaga-linked)
router.get("/recruiting/candidatos", requireAuth, async (req, res) => {
  try {
    const { franchiseId: fqId } = req.query;
    const role = req.session.userRole!;

    const effectiveFranchiseId =
      role === "master_admin" || role === "staff_regional"
        ? fqId ? parseInt(fqId as string) : undefined
        : req.session.franchiseId;

    if (!effectiveFranchiseId) {
      res.json([]);
      return;
    }

    // 1) Standalone candidatos (franchiseId set directly, no vaga)
    const standaloneCandidatos = await db
      .select()
      .from(candidatosTable)
      .where(and(eq(candidatosTable.franchiseId, effectiveFranchiseId)));

    // 2) Vaga-linked candidatos (via active vagas)
    const vagas = await db
      .select()
      .from(vagasTable)
      .where(and(eq(vagasTable.franchiseId, effectiveFranchiseId), eq(vagasTable.status, "ativa")));

    const vagaMap = Object.fromEntries(vagas.map((v) => [v.id, v]));
    let vagaLinkedCandidatos: (typeof candidatosTable.$inferSelect)[] = [];
    if (vagas.length > 0) {
      vagaLinkedCandidatos = await db
        .select()
        .from(candidatosTable)
        .where(and(
          inArray(candidatosTable.vagaId, vagas.map(v => v.id)),
        ));
    }

    // Merge (standalone takes priority, avoid duplicates by id)
    const seen = new Set<number>(standaloneCandidatos.map(c => c.id));
    const merged = [
      ...standaloneCandidatos,
      ...vagaLinkedCandidatos.filter(c => !seen.has(c.id)),
    ];

    const result = merged.map((c) => ({
      ...c,
      vagaTitle: c.vagaId != null ? (vagaMap[c.vagaId]?.title ?? "") : "",
      daysSinceUpdate: Math.floor(
        (Date.now() - new Date(c.updatedAt).getTime()) / 86_400_000
      ),
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
