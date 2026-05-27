import { Router } from "express";
import { db, dimensionsTable, keyProcessesTable, strategicInitiativesTable, auditLogsTable } from "@workspace/db";
import { goalsTable, goalInitiativesTable, franchisesTable } from "@workspace/db";
import { and, eq, ne, notInArray, count, inArray, desc, isNotNull, gte, lte } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

const CATALOG_ENTITY_TYPES = ["dimension", "key_process", "strategic_initiative"] as const;
type CatalogEntityType = typeof CATALOG_ENTITY_TYPES[number];

const isAdminOrStaff = (role: string) =>
  role === "master_admin" || role === "staff_regional";

async function getLastChangedByItemType(entityType: CatalogEntityType, ids: number[]) {
  if (ids.length === 0) return new Map<number, { changedAt: Date; changedBy: string }>();
  const logs = await db
    .select()
    .from(auditLogsTable)
    .where(
      and(
        eq(auditLogsTable.entityType, entityType),
        isNotNull(auditLogsTable.entityId),
        inArray(auditLogsTable.entityId, ids),
      ),
    )
    .orderBy(desc(auditLogsTable.createdAt));
  const seen = new Map<number, { changedAt: Date; changedBy: string }>();
  for (const log of logs) {
    if (log.entityId !== null && !seen.has(log.entityId)) {
      seen.set(log.entityId, { changedAt: log.createdAt, changedBy: log.userName });
    }
  }
  return seen;
}

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

    const lastChanged = includeInactive
      ? await getLastChangedByItemType("dimension", rows.map(r => r.id))
      : new Map<number, { changedAt: Date; changedBy: string }>();

    res.json(rows.map(d => {
      const lc = lastChanged.get(d.id);
      return {
        id: d.id, name: d.name, description: d.description, active: d.active,
        ...(lc ? { lastChangedAt: lc.changedAt, lastChangedBy: lc.changedBy } : {}),
      };
    }));
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

    const lastChanged = includeInactive
      ? await getLastChangedByItemType("key_process", rows.map(r => r.id))
      : new Map<number, { changedAt: Date; changedBy: string }>();

    res.json(rows.map(kp => {
      const lc = lastChanged.get(kp.id);
      return {
        id: kp.id, dimensionId: kp.dimensionId, dimensionName: kp.dimensionName,
        name: kp.name, description: kp.description, orderIndex: kp.orderIndex, active: kp.active,
        ...(lc ? { lastChangedAt: lc.changedAt, lastChangedBy: lc.changedBy } : {}),
      };
    }));
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

    const lastChanged = includeInactive
      ? await getLastChangedByItemType("strategic_initiative", rows.map(r => r.id))
      : new Map<number, { changedAt: Date; changedBy: string }>();

    res.json(rows.map(si => {
      const lc = lastChanged.get(si.id);
      return {
        id: si.id, dimensionId: si.dimensionId, keyProcessId: si.keyProcessId,
        dimensionName: si.dimensionName, keyProcessName: si.keyProcessName,
        name: si.name, kri: si.kri, kpi: si.kpi, description: si.description, active: si.active,
        ...(lc ? { lastChangedAt: lc.changedAt, lastChangedBy: lc.changedBy } : {}),
      };
    }));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Admin: all catalog activity (unified feed) ────────────────────────────────

router.get(
  "/catalog-audit-logs/all",
  requireRole("master_admin", "staff_regional"),
  async (req, res) => {
    try {
      const entityType = req.query.entityType as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;

      if (entityType && !(CATALOG_ENTITY_TYPES as readonly string[]).includes(entityType)) {
        res.status(400).json({ error: "entityType must be one of: dimension, key_process, strategic_initiative" });
        return;
      }

      const conditions = [
        inArray(auditLogsTable.entityType, [...CATALOG_ENTITY_TYPES]),
      ];

      if (entityType) {
        conditions.push(eq(auditLogsTable.entityType, entityType));
      }
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        conditions.push(gte(auditLogsTable.createdAt, from));
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        conditions.push(lte(auditLogsTable.createdAt, to));
      }

      const logs = await db
        .select()
        .from(auditLogsTable)
        .where(and(...conditions))
        .orderBy(desc(auditLogsTable.createdAt));

      res.json(logs.map(l => ({
        id: l.id,
        entityType: l.entityType,
        entityId: l.entityId,
        entityName: l.entityName,
        action: l.action,
        userName: l.userName,
        userEmail: l.userEmail,
        changedAt: l.createdAt,
      })));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── Admin: catalog audit log CSV export ──────────────────────────────────────

router.get(
  "/catalog-audit-logs/export",
  requireRole("master_admin", "staff_regional"),
  async (req, res) => {
    try {
      const fromParam = req.query.from as string | undefined;
      const toParam = req.query.to as string | undefined;

      const fromDate = fromParam ? new Date(`${fromParam}T00:00:00-03:00`) : undefined;
      const toDate = toParam ? new Date(`${toParam}T23:59:59.999-03:00`) : undefined;

      const conditions = [inArray(auditLogsTable.entityType, [...CATALOG_ENTITY_TYPES])];
      if (fromDate) conditions.push(gte(auditLogsTable.createdAt, fromDate));
      if (toDate) conditions.push(lte(auditLogsTable.createdAt, toDate));

      const logs = await db
        .select()
        .from(auditLogsTable)
        .where(and(...conditions))
        .orderBy(desc(auditLogsTable.createdAt));

      const dimIds = [...new Set(logs.filter(l => l.entityType === "dimension" && l.entityId !== null).map(l => l.entityId as number))];
      const kpIds = [...new Set(logs.filter(l => l.entityType === "key_process" && l.entityId !== null).map(l => l.entityId as number))];
      const siIds = [...new Set(logs.filter(l => l.entityType === "strategic_initiative" && l.entityId !== null).map(l => l.entityId as number))];

      const [dims, kps, sis] = await Promise.all([
        dimIds.length > 0
          ? db.select({ id: dimensionsTable.id, name: dimensionsTable.name }).from(dimensionsTable).where(inArray(dimensionsTable.id, dimIds))
          : Promise.resolve([]),
        kpIds.length > 0
          ? db.select({ id: keyProcessesTable.id, name: keyProcessesTable.name }).from(keyProcessesTable).where(inArray(keyProcessesTable.id, kpIds))
          : Promise.resolve([]),
        siIds.length > 0
          ? db.select({ id: strategicInitiativesTable.id, name: strategicInitiativesTable.name }).from(strategicInitiativesTable).where(inArray(strategicInitiativesTable.id, siIds))
          : Promise.resolve([]),
      ]);

      const dimMap = new Map(dims.map(d => [d.id, d.name]));
      const kpMap = new Map(kps.map(k => [k.id, k.name]));
      const siMap = new Map(sis.map(s => [s.id, s.name]));

      const typeLabel: Record<string, string> = {
        dimension: "Dimensão",
        key_process: "Processo-chave",
        strategic_initiative: "Iniciativa Estratégica",
      };

      const actionLabel: Record<string, string> = {
        activated: "Ativado",
        deactivated: "Desativado",
      };

      function getItemName(entityType: string, entityId: number | null): string {
        if (entityId === null) return "—";
        if (entityType === "dimension") return dimMap.get(entityId) ?? `ID ${entityId}`;
        if (entityType === "key_process") return kpMap.get(entityId) ?? `ID ${entityId}`;
        return siMap.get(entityId) ?? `ID ${entityId}`;
      }

      function csvCell(val: string): string {
        if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }

      const headers = ["Tipo", "Nome", "Ação", "Alterado por", "Email", "Data/Hora"];
      const rows = logs.map(l => [
        typeLabel[l.entityType] ?? l.entityType,
        getItemName(l.entityType, l.entityId),
        actionLabel[l.action] ?? l.action,
        l.userName,
        l.userEmail,
        l.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      ]);

      const csv = [headers, ...rows].map(row => row.map(csvCell).join(",")).join("\r\n");

      const filenameParts = ["historico-catalogo"];
      if (fromParam) filenameParts.push(fromParam);
      if (toParam) filenameParts.push(toParam);
      const filename = filenameParts.join("_") + ".csv";

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send("\uFEFF" + csv);
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── Admin: catalog audit log history ─────────────────────────────────────────

router.get(
  "/catalog-audit-logs",
  requireRole("master_admin", "staff_regional"),
  async (req, res) => {
    const entityType = req.query.itemType as string | undefined;
    const entityId = req.query.itemId ? parseInt(req.query.itemId as string) : undefined;

    if (!entityType || !(CATALOG_ENTITY_TYPES as readonly string[]).includes(entityType)) {
      res.status(400).json({ error: "itemType must be one of: dimension, key_process, strategic_initiative" });
      return;
    }
    if (!entityId || isNaN(entityId)) {
      res.status(400).json({ error: "itemId must be a valid integer" });
      return;
    }

    try {
      const logs = await db
        .select()
        .from(auditLogsTable)
        .where(
          and(
            eq(auditLogsTable.entityType, entityType),
            eq(auditLogsTable.entityId, entityId),
          ),
        )
        .orderBy(desc(auditLogsTable.createdAt));

      res.json(logs.map(l => ({
        id: l.id,
        action: l.action,
        userName: l.userName,
        userEmail: l.userEmail,
        changedAt: l.createdAt,
      })));
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// ── Admin: undo catalog activation / deactivation ────────────────────────────

router.post(
  "/catalog-audit-logs/:id/undo",
  requireRole("master_admin"),
  async (req, res) => {
    const logId = parseInt(req.params.id as string);
    if (isNaN(logId)) { res.status(400).json({ error: "Invalid id" }); return; }

    try {
      const [logEntry] = await db
        .select()
        .from(auditLogsTable)
        .where(eq(auditLogsTable.id, logId));

      if (!logEntry) { res.status(404).json({ error: "Audit log entry not found" }); return; }
      if (!logEntry.entityId) { res.status(400).json({ error: "Log entry has no associated entity" }); return; }
      if (logEntry.action !== "activated" && logEntry.action !== "deactivated") {
        res.status(400).json({ error: "Only activated/deactivated entries can be undone" });
        return;
      }

      const entityId = logEntry.entityId;
      const entityType = logEntry.entityType as CatalogEntityType;
      // Undo means reversing what the entry recorded:
      // if the entry says "activated", we deactivate; if "deactivated", we activate.
      const targetActive = logEntry.action === "deactivated";

      if (entityType === "dimension") {
        const [row] = await db.select().from(dimensionsTable).where(eq(dimensionsTable.id, entityId));
        if (!row) { res.status(404).json({ error: "Dimension not found" }); return; }
        const [updated] = await db
          .update(dimensionsTable)
          .set({ active: targetActive })
          .where(eq(dimensionsTable.id, entityId))
          .returning();
        await db.insert(auditLogsTable).values({
          entityType: "dimension",
          entityId,
          entityName: updated.name,
          action: updated.active ? "activated" : "deactivated",
          userId: req.session.userId ?? null,
          userName: req.session.userName ?? "unknown",
          userEmail: req.session.userEmail ?? "unknown",
        });
        res.json({ id: updated.id, name: updated.name, active: updated.active });
        return;
      }

      if (entityType === "key_process") {
        const [row] = await db.select().from(keyProcessesTable).where(eq(keyProcessesTable.id, entityId));
        if (!row) { res.status(404).json({ error: "Key process not found" }); return; }
        const [updated] = await db
          .update(keyProcessesTable)
          .set({ active: targetActive })
          .where(eq(keyProcessesTable.id, entityId))
          .returning();
        await db.insert(auditLogsTable).values({
          entityType: "key_process",
          entityId,
          entityName: updated.name,
          action: updated.active ? "activated" : "deactivated",
          userId: req.session.userId ?? null,
          userName: req.session.userName ?? "unknown",
          userEmail: req.session.userEmail ?? "unknown",
        });
        res.json({ id: updated.id, name: updated.name, active: updated.active });
        return;
      }

      if (entityType === "strategic_initiative") {
        const [row] = await db.select().from(strategicInitiativesTable).where(eq(strategicInitiativesTable.id, entityId));
        if (!row) { res.status(404).json({ error: "Strategic initiative not found" }); return; }
        const [updated] = await db
          .update(strategicInitiativesTable)
          .set({ active: targetActive })
          .where(eq(strategicInitiativesTable.id, entityId))
          .returning();
        await db.insert(auditLogsTable).values({
          entityType: "strategic_initiative",
          entityId,
          entityName: updated.name,
          action: updated.active ? "activated" : "deactivated",
          userId: req.session.userId ?? null,
          userName: req.session.userName ?? "unknown",
          userEmail: req.session.userEmail ?? "unknown",
        });
        const [impactResult] = await db
          .select({ activeGoalCount: count() })
          .from(goalInitiativesTable)
          .where(
            and(
              eq(goalInitiativesTable.strategicInitiativeId, entityId),
              notInArray(goalInitiativesTable.status, ["concluida", "cancelada"]),
            ),
          );
        res.json({
          id: updated.id,
          name: updated.name,
          active: updated.active,
          activeGoalCount: impactResult?.activeGoalCount ?? 0,
        });
        return;
      }

      res.status(400).json({ error: "Unsupported entity type" });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

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
      const rows = await db
        .selectDistinct({ franchiseName: franchisesTable.name })
        .from(goalsTable)
        .innerJoin(franchisesTable, eq(goalsTable.franchiseId, franchisesTable.id))
        .where(
          and(
            eq(goalsTable.dimensionId, id),
            notInArray(goalsTable.status, ["concluida", "cancelada"]),
          ),
        );
      const affectedFranchises = rows.map(r => r.franchiseName);
      res.json({ activeGoalCount: affectedFranchises.length, affectedFranchises });
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
      const [goalRows, [{ remaining }]] = await Promise.all([
        db
          .selectDistinct({ franchiseName: franchisesTable.name })
          .from(goalsTable)
          .innerJoin(franchisesTable, eq(goalsTable.franchiseId, franchisesTable.id))
          .where(
            and(
              eq(goalsTable.keyProcessId, id),
              notInArray(goalsTable.status, ["concluida", "cancelada"]),
            ),
          ),
        db
          .select({ remaining: count() })
          .from(keyProcessesTable)
          .where(
            and(
              eq(keyProcessesTable.dimensionId, row.dimensionId),
              eq(keyProcessesTable.active, true),
              ne(keyProcessesTable.id, id),
            ),
          ),
      ]);
      const affectedFranchises = goalRows.map(r => r.franchiseName);
      const dimensionBecomesEmpty = remaining === 0;
      res.json({ activeGoalCount: affectedFranchises.length, affectedFranchises, dimensionBecomesEmpty });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.get(
  "/strategic-initiatives/:id/deactivation-impact",
  requireRole("master_admin", "staff_regional"),
  async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    try {
      const [row] = await db.select().from(strategicInitiativesTable).where(eq(strategicInitiativesTable.id, id));
      if (!row) { res.status(404).json({ error: "Not found" }); return; }
      const rows = await db
        .selectDistinct({ franchiseName: franchisesTable.name })
        .from(goalInitiativesTable)
        .innerJoin(goalsTable, eq(goalInitiativesTable.goalId, goalsTable.id))
        .innerJoin(franchisesTable, eq(goalsTable.franchiseId, franchisesTable.id))
        .where(
          and(
            eq(goalInitiativesTable.strategicInitiativeId, id),
            notInArray(goalInitiativesTable.status, ["concluida", "cancelada"]),
          ),
        );
      const affectedFranchises = rows.map(r => r.franchiseName);
      res.json({ activeGoalCount: affectedFranchises.length, affectedFranchises });
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
      await db.insert(auditLogsTable).values({
        entityType: "dimension",
        entityId: id,
        entityName: updated.name,
        action: updated.active ? "activated" : "deactivated",
        userId: req.session.userId ?? null,
        userName: req.session.userName ?? "unknown",
        userEmail: req.session.userEmail ?? "unknown",
      });
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
      await db.insert(auditLogsTable).values({
        entityType: "key_process",
        entityId: id,
        entityName: updated.name,
        action: updated.active ? "activated" : "deactivated",
        userId: req.session.userId ?? null,
        userName: req.session.userName ?? "unknown",
        userEmail: req.session.userEmail ?? "unknown",
      });
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
      await db.insert(auditLogsTable).values({
        entityType: "strategic_initiative",
        entityId: id,
        entityName: updated.name,
        action: updated.active ? "activated" : "deactivated",
        userId: req.session.userId ?? null,
        userName: req.session.userName ?? "unknown",
        userEmail: req.session.userEmail ?? "unknown",
      });
      const [impactResult] = await db
        .select({ activeGoalCount: count() })
        .from(goalInitiativesTable)
        .where(
          and(
            eq(goalInitiativesTable.strategicInitiativeId, id),
            notInArray(goalInitiativesTable.status, ["concluida", "cancelada"]),
          ),
        );
      res.json({
        id: updated.id,
        name: updated.name,
        active: updated.active,
        activeGoalCount: impactResult?.activeGoalCount ?? 0,
      });
    } catch (err) {
      req.log.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
