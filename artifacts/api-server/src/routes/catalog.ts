import { Router } from "express";
import { db, dimensionsTable, keyProcessesTable, strategicInitiativesTable } from "@workspace/db";
import { goalsTable } from "@workspace/db";
import { and, eq, notInArray, count } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

const isAdminOrStaff = (role: string) =>
  role === "master_admin" || role === "staff_regional";

router.get("/dimensions", requireAuth, async (req, res) => {
  try {
    const includeInactive =
      req.query.includeInactive === "true" &&
      isAdminOrStaff(req.session.userRole ?? "");
    const rows = await db
      .select()
      .from(dimensionsTable)
      .where(includeInactive ? undefined : eq(dimensionsTable.active, true))
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
    const includeInactive =
      req.query.includeInactive === "true" &&
      isAdminOrStaff(req.session.userRole ?? "");

    const baseSelect = {
      id: keyProcessesTable.id,
      dimensionId: keyProcessesTable.dimensionId,
      dimensionName: dimensionsTable.name,
      name: keyProcessesTable.name,
      description: keyProcessesTable.description,
      orderIndex: keyProcessesTable.orderIndex,
      active: keyProcessesTable.active,
    };

    const activeCondition = includeInactive ? undefined : eq(keyProcessesTable.active, true);
    const dimCondition = dimensionId ? eq(keyProcessesTable.dimensionId, dimensionId) : undefined;
    const whereClause = activeCondition && dimCondition
      ? and(activeCondition, dimCondition)
      : activeCondition ?? dimCondition;

    const rows = await db
      .select(baseSelect)
      .from(keyProcessesTable)
      .leftJoin(dimensionsTable, eq(keyProcessesTable.dimensionId, dimensionsTable.id))
      .where(whereClause)
      .orderBy(keyProcessesTable.orderIndex);

    res.json(rows.map(kp => ({
      id: kp.id, dimensionId: kp.dimensionId, dimensionName: kp.dimensionName,
      name: kp.name, description: kp.description, orderIndex: kp.orderIndex, active: kp.active,
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
    const includeInactive =
      req.query.includeInactive === "true" &&
      isAdminOrStaff(req.session.userRole ?? "");

    const q = db
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
        active: strategicInitiativesTable.active,
      })
      .from(strategicInitiativesTable)
      .leftJoin(dimensionsTable, eq(strategicInitiativesTable.dimensionId, dimensionsTable.id))
      .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id));

    const activeFilter = includeInactive
      ? undefined
      : and(
          eq(strategicInitiativesTable.active, true),
          eq(keyProcessesTable.active, true),
          eq(dimensionsTable.active, true),
        );

    const dimFilter = dimensionId ? eq(strategicInitiativesTable.dimensionId, dimensionId) : undefined;
    const kpFilter = keyProcessId ? eq(strategicInitiativesTable.keyProcessId, keyProcessId) : undefined;

    const filters = [activeFilter, dimFilter, kpFilter].filter(Boolean);
    const whereClause = filters.length > 1 ? and(...(filters as NonNullable<typeof filters[0]>[])) : filters[0];

    const rows = await q.where(whereClause);

    res.json(rows.map(si => ({
      id: si.id, dimensionId: si.dimensionId, keyProcessId: si.keyProcessId,
      dimensionName: si.dimensionName, keyProcessName: si.keyProcessName,
      name: si.name, kri: si.kri, kpi: si.kpi, description: si.description, active: si.active,
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: deactivation impact ───────────────────────────────────────────────

router.get(
  "/dimensions/:id/deactivation-impact",
  requireRole("master_admin", "staff_regional"),
  async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    try {
      const [row] = await db.select().from(dimensionsTable).where(eq(dimensionsTable.id, id));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      const [result] = await db
        .select({ activeGoalCount: count() })
        .from(goalsTable)
        .where(
          and(
            eq(goalsTable.dimensionId, id),
            notInArray(goalsTable.status, ["concluida", "cancelada"]),
          ),
        );
      res.json({ activeGoalCount: result?.activeGoalCount ?? 0 });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get(
  "/key-processes/:id/deactivation-impact",
  requireRole("master_admin", "staff_regional"),
  async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    try {
      const [row] = await db.select().from(keyProcessesTable).where(eq(keyProcessesTable.id, id));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      const [result] = await db
        .select({ activeGoalCount: count() })
        .from(goalsTable)
        .where(
          and(
            eq(goalsTable.keyProcessId, id),
            notInArray(goalsTable.status, ["concluida", "cancelada"]),
          ),
        );
      res.json({ activeGoalCount: result?.activeGoalCount ?? 0 });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

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
