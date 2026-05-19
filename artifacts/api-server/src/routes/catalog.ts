import { Router } from "express";
import { db, dimensionsTable, keyProcessesTable, strategicInitiativesTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/dimensions", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(dimensionsTable)
      .where(eq(dimensionsTable.active, true))
      .orderBy(dimensionsTable.id);
    res.json(rows.map(d => ({
      id: d.id, name: d.name, description: d.description, active: d.active,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/key-processes", requireAuth, async (req, res) => {
  try {
    const dimensionId = req.query.dimensionId ? parseInt(req.query.dimensionId as string) : undefined;
    const rows = dimensionId
      ? await db.select({
          id: keyProcessesTable.id,
          dimensionId: keyProcessesTable.dimensionId,
          dimensionName: dimensionsTable.name,
          name: keyProcessesTable.name,
          description: keyProcessesTable.description,
          orderIndex: keyProcessesTable.orderIndex,
        })
        .from(keyProcessesTable)
        .leftJoin(dimensionsTable, eq(keyProcessesTable.dimensionId, dimensionsTable.id))
        .where(and(
          eq(keyProcessesTable.active, true),
          eq(keyProcessesTable.dimensionId, dimensionId),
        ))
        .orderBy(keyProcessesTable.orderIndex)
      : await db.select({
          id: keyProcessesTable.id,
          dimensionId: keyProcessesTable.dimensionId,
          dimensionName: dimensionsTable.name,
          name: keyProcessesTable.name,
          description: keyProcessesTable.description,
          orderIndex: keyProcessesTable.orderIndex,
        })
        .from(keyProcessesTable)
        .leftJoin(dimensionsTable, eq(keyProcessesTable.dimensionId, dimensionsTable.id))
        .where(eq(keyProcessesTable.active, true))
        .orderBy(keyProcessesTable.orderIndex);
    res.json(rows.map(kp => ({
      id: kp.id, dimensionId: kp.dimensionId, dimensionName: kp.dimensionName,
      name: kp.name, description: kp.description, orderIndex: kp.orderIndex,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/strategic-initiatives", requireAuth, async (req, res) => {
  try {
    const dimensionId = req.query.dimensionId ? parseInt(req.query.dimensionId as string) : undefined;
    const keyProcessId = req.query.keyProcessId ? parseInt(req.query.keyProcessId as string) : undefined;

    let q = db
      .select({
        id: strategicInitiativesTable.id,
        dimensionId: strategicInitiativesTable.dimensionId,
        keyProcessId: strategicInitiativesTable.keyProcessId,
        dimensionName: dimensionsTable.name,
        keyProcessName: keyProcessesTable.name,
        name: strategicInitiativesTable.name,
        kri: strategicInitiativesTable.kri,
        kpi: strategicInitiativesTable.kpi,
        description: strategicInitiativesTable.description,
      })
      .from(strategicInitiativesTable)
      .leftJoin(dimensionsTable, eq(strategicInitiativesTable.dimensionId, dimensionsTable.id))
      .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id));

    const activeFilter = and(
      eq(strategicInitiativesTable.active, true),
      eq(keyProcessesTable.active, true),
      eq(dimensionsTable.active, true),
    );
    const rows = await (dimensionId && keyProcessId
      ? q.where(and(activeFilter, eq(strategicInitiativesTable.keyProcessId, keyProcessId)))
      : dimensionId
      ? q.where(and(activeFilter, eq(strategicInitiativesTable.dimensionId, dimensionId)))
      : keyProcessId
      ? q.where(and(activeFilter, eq(strategicInitiativesTable.keyProcessId, keyProcessId)))
      : q.where(activeFilter));

    res.json(rows.map(si => ({
      id: si.id, dimensionId: si.dimensionId, keyProcessId: si.keyProcessId,
      dimensionName: si.dimensionName, keyProcessName: si.keyProcessName,
      name: si.name, kri: si.kri, kpi: si.kpi, description: si.description,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: toggle active status ──────────────────────────────────────────────

router.patch(
  "/dimensions/:id/toggle-active",
  requireRole("master_admin", "staff_regional"),
  async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    try {
      const [row] = await db.select().from(dimensionsTable).where(eq(dimensionsTable.id, id));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      const [updated] = await db
        .update(dimensionsTable)
        .set({ active: !row.active })
        .where(eq(dimensionsTable.id, id))
        .returning();
      res.json({ id: updated.id, name: updated.name, active: updated.active });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.patch(
  "/key-processes/:id/toggle-active",
  requireRole("master_admin", "staff_regional"),
  async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    try {
      const [row] = await db.select().from(keyProcessesTable).where(eq(keyProcessesTable.id, id));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      const [updated] = await db
        .update(keyProcessesTable)
        .set({ active: !row.active })
        .where(eq(keyProcessesTable.id, id))
        .returning();
      res.json({ id: updated.id, name: updated.name, active: updated.active });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.patch(
  "/strategic-initiatives/:id/toggle-active",
  requireRole("master_admin", "staff_regional"),
  async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    try {
      const [row] = await db.select().from(strategicInitiativesTable).where(eq(strategicInitiativesTable.id, id));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      const [updated] = await db
        .update(strategicInitiativesTable)
        .set({ active: !row.active })
        .where(eq(strategicInitiativesTable.id, id))
        .returning();
      res.json({ id: updated.id, name: updated.name, active: updated.active });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
