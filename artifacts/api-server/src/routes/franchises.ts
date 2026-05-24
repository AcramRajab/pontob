import { Router } from "express";
import { db, franchisesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, requireAdminOrStaff } from "../middlewares/auth";
import { logAudit, shouldAudit } from "../services/audit";

const router = Router();

router.get("/franchises/public", async (req, res) => {
  try {
    const rows = await db
      .select({ id: franchisesTable.id, name: franchisesTable.name })
      .from(franchisesTable)
      .where(eq(franchisesTable.active, true))
      .orderBy(franchisesTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/franchises", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    if (role === "master_admin" || role === "staff_regional") {
      const rows = await db.select().from(franchisesTable).orderBy(franchisesTable.name);
      res.json(rows.map(f => ({
        id: f.id, name: f.name, city: f.city, state: f.state,
        brokerOwnerName: f.brokerOwnerName, contactEmail: f.contactEmail,
        phone: f.phone, cnpj: f.cnpj, active: f.active,
        createdAt: f.createdAt.toISOString(),
      })));
    } else {
      const fid = req.session.franchiseId;
      if (!fid) { res.json([]); return; }
      const rows = await db.select().from(franchisesTable).where(eq(franchisesTable.id, fid));
      res.json(rows.map(f => ({
        id: f.id, name: f.name, city: f.city, state: f.state,
        brokerOwnerName: f.brokerOwnerName, contactEmail: f.contactEmail,
        phone: f.phone, cnpj: f.cnpj, active: f.active,
        createdAt: f.createdAt.toISOString(),
      })));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/franchises", requireAdminOrStaff, async (req, res) => {
  try {
    const { name, city, state, brokerOwnerName, contactEmail, phone, cnpj } = req.body;
    if (!name || !city || !state) {
      res.status(400).json({ error: "name, city, state required" });
      return;
    }
    const [f] = await db.insert(franchisesTable).values({ name, city, state, brokerOwnerName, contactEmail, phone, cnpj }).returning();
    if (shouldAudit(req.session.userRole!)) {
      await logAudit({
        userId: req.session.userId!, userName: req.session.userName!, userEmail: req.session.userEmail!,
        action: "create", entityType: "franchise", entityId: f.id, entityName: f.name,
        newData: { name: f.name, city: f.city, state: f.state, brokerOwnerName: f.brokerOwnerName, contactEmail: f.contactEmail, phone: f.phone, cnpj: f.cnpj },
      });
    }
    res.status(201).json({
      id: f.id, name: f.name, city: f.city, state: f.state,
      brokerOwnerName: f.brokerOwnerName, contactEmail: f.contactEmail,
      phone: f.phone, cnpj: f.cnpj, active: f.active,
      createdAt: f.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/franchises/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const role = req.session.userRole!;
    if (role !== "master_admin" && role !== "staff_regional" && req.session.franchiseId !== id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await db.select().from(franchisesTable).where(eq(franchisesTable.id, id));
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    const f = rows[0];
    res.json({
      id: f.id, name: f.name, city: f.city, state: f.state,
      brokerOwnerName: f.brokerOwnerName, contactEmail: f.contactEmail,
      phone: f.phone, cnpj: f.cnpj, active: f.active,
      createdAt: f.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/franchises/:id", requireAdminOrStaff, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const { name, city, state, brokerOwnerName, contactEmail, phone, cnpj, active } = req.body;

    const [existing] = await db.select().from(franchisesTable).where(eq(franchisesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (city !== undefined) update.city = city;
    if (state !== undefined) update.state = state;
    if (brokerOwnerName !== undefined) update.brokerOwnerName = brokerOwnerName;
    if (contactEmail !== undefined) update.contactEmail = contactEmail;
    if (phone !== undefined) update.phone = phone;
    if (cnpj !== undefined) update.cnpj = cnpj;
    if (active !== undefined) update.active = active;

    const [f] = await db.update(franchisesTable).set(update).where(eq(franchisesTable.id, id)).returning();
    if (!f) { res.status(404).json({ error: "Not found" }); return; }

    if (shouldAudit(req.session.userRole!)) {
      await logAudit({
        userId: req.session.userId!, userName: req.session.userName!, userEmail: req.session.userEmail!,
        action: "update", entityType: "franchise", entityId: id, entityName: existing.name,
        oldData: { name: existing.name, city: existing.city, state: existing.state, brokerOwnerName: existing.brokerOwnerName, contactEmail: existing.contactEmail, phone: existing.phone, cnpj: existing.cnpj, active: existing.active },
        newData: { name: f.name, city: f.city, state: f.state, brokerOwnerName: f.brokerOwnerName, contactEmail: f.contactEmail, phone: f.phone, cnpj: f.cnpj, active: f.active },
      });
    }

    res.json({
      id: f.id, name: f.name, city: f.city, state: f.state,
      brokerOwnerName: f.brokerOwnerName, contactEmail: f.contactEmail,
      phone: f.phone, cnpj: f.cnpj, active: f.active,
      createdAt: f.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/franchises/:id", requireAdminOrStaff, async (req, res) => {
  try {
    const id = parseInt(req.params["id"] as string);
    const [existing] = await db.select().from(franchisesTable).where(eq(franchisesTable.id, id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const linked = await db.select().from(usersTable).where(eq(usersTable.franchiseId, id)).limit(1);
    if (linked.length > 0) {
      res.status(409).json({ error: "Franquia possui usuários vinculados. Remova os usuários primeiro." });
      return;
    }
    const [f] = await db.delete(franchisesTable).where(eq(franchisesTable.id, id)).returning();
    if (!f) { res.status(404).json({ error: "Not found" }); return; }

    if (shouldAudit(req.session.userRole!)) {
      await logAudit({
        userId: req.session.userId!, userName: req.session.userName!, userEmail: req.session.userEmail!,
        action: "delete", entityType: "franchise", entityId: id, entityName: existing.name,
        oldData: { name: existing.name, city: existing.city, state: existing.state, brokerOwnerName: existing.brokerOwnerName, contactEmail: existing.contactEmail, phone: existing.phone, cnpj: existing.cnpj, active: existing.active },
      });
    }

    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
