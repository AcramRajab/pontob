import { Router } from "express";
import { db, franchisesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

router.get("/franchises", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    if (role === "master_admin" || role === "staff_regional") {
      const rows = await db.select().from(franchisesTable).orderBy(franchisesTable.name);
      res.json(rows.map(f => ({
        id: f.id, name: f.name, city: f.city, state: f.state,
        brokerOwnerName: f.brokerOwnerName, active: f.active,
        createdAt: f.createdAt.toISOString(),
      })));
    } else {
      const fid = req.session.franchiseId;
      if (!fid) { res.json([]); return; }
      const rows = await db.select().from(franchisesTable).where(eq(franchisesTable.id, fid));
      res.json(rows.map(f => ({
        id: f.id, name: f.name, city: f.city, state: f.state,
        brokerOwnerName: f.brokerOwnerName, active: f.active,
        createdAt: f.createdAt.toISOString(),
      })));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/franchises", requireRole("master_admin"), async (req, res) => {
  try {
    const { name, city, state, brokerOwnerName } = req.body;
    if (!name || !city || !state) {
      res.status(400).json({ error: "name, city, state required" });
      return;
    }
    const [f] = await db.insert(franchisesTable).values({ name, city, state, brokerOwnerName }).returning();
    res.status(201).json({
      id: f.id, name: f.name, city: f.city, state: f.state,
      brokerOwnerName: f.brokerOwnerName, active: f.active,
      createdAt: f.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/franchises/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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
      brokerOwnerName: f.brokerOwnerName, active: f.active,
      createdAt: f.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/franchises/:id", requireRole("master_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, city, state, brokerOwnerName, active } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (city !== undefined) update.city = city;
    if (state !== undefined) update.state = state;
    if (brokerOwnerName !== undefined) update.brokerOwnerName = brokerOwnerName;
    if (active !== undefined) update.active = active;
    const [f] = await db.update(franchisesTable).set(update).where(eq(franchisesTable.id, id)).returning();
    if (!f) { res.status(404).json({ error: "Not found" }); return; }
    res.json({
      id: f.id, name: f.name, city: f.city, state: f.state,
      brokerOwnerName: f.brokerOwnerName, active: f.active,
      createdAt: f.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
