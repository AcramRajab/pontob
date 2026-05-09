import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, franchisesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = Router();

function formatUser(u: typeof usersTable.$inferSelect, franchiseName?: string | null) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    franchiseId: u.franchiseId, franchiseName: franchiseName ?? null,
    active: u.active, createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", requireRole("master_admin", "staff_regional"), async (req, res) => {
  try {
    const franchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    let query = db
      .select({
        id: usersTable.id, name: usersTable.name, email: usersTable.email,
        role: usersTable.role, franchiseId: usersTable.franchiseId,
        active: usersTable.active, createdAt: usersTable.createdAt,
        franchiseName: franchisesTable.name,
      })
      .from(usersTable)
      .leftJoin(franchisesTable, eq(usersTable.franchiseId, franchisesTable.id));

    const rows = franchiseId
      ? await db
          .select({
            id: usersTable.id, name: usersTable.name, email: usersTable.email,
            role: usersTable.role, franchiseId: usersTable.franchiseId,
            active: usersTable.active, createdAt: usersTable.createdAt,
            franchiseName: franchisesTable.name,
          })
          .from(usersTable)
          .leftJoin(franchisesTable, eq(usersTable.franchiseId, franchisesTable.id))
          .where(eq(usersTable.franchiseId, franchiseId))
      : await query;

    res.json(rows.map(u => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      franchiseId: u.franchiseId, franchiseName: u.franchiseName ?? null,
      active: u.active, createdAt: u.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", requireRole("master_admin"), async (req, res) => {
  try {
    const { name, email, password, role, franchiseId } = req.body;
    if (!name || !email || !password || !role) {
      res.status(400).json({ error: "name, email, password, role required" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [u] = await db
      .insert(usersTable)
      .values({ name, email: email.toLowerCase(), passwordHash, role, franchiseId: franchiseId ?? null })
      .returning();

    let franchiseName: string | null = null;
    if (u.franchiseId) {
      const fRows = await db.select({ name: franchisesTable.name }).from(franchisesTable).where(eq(franchisesTable.id, u.franchiseId)).limit(1);
      franchiseName = fRows[0]?.name ?? null;
    }
    res.status(201).json(formatUser(u, franchiseName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/users/:id", requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = req.session.userRole!;
    if (role !== "master_admin" && role !== "staff_regional" && req.session.userId !== id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const rows = await db
      .select({
        id: usersTable.id, name: usersTable.name, email: usersTable.email,
        role: usersTable.role, franchiseId: usersTable.franchiseId,
        active: usersTable.active, createdAt: usersTable.createdAt,
        franchiseName: franchisesTable.name,
      })
      .from(usersTable)
      .leftJoin(franchisesTable, eq(usersTable.franchiseId, franchisesTable.id))
      .where(eq(usersTable.id, id))
      .limit(1);
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    const u = rows[0];
    res.json({
      id: u.id, name: u.name, email: u.email, role: u.role,
      franchiseId: u.franchiseId, franchiseName: u.franchiseName ?? null,
      active: u.active, createdAt: u.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:id", requireRole("master_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, role, franchiseId, active } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email.toLowerCase();
    if (role !== undefined) update.role = role;
    if (franchiseId !== undefined) update.franchiseId = franchiseId;
    if (active !== undefined) update.active = active;
    const [u] = await db.update(usersTable).set(update).where(eq(usersTable.id, id)).returning();
    if (!u) { res.status(404).json({ error: "Not found" }); return; }
    let franchiseName: string | null = null;
    if (u.franchiseId) {
      const fRows = await db.select({ name: franchisesTable.name }).from(franchisesTable).where(eq(franchisesTable.id, u.franchiseId)).limit(1);
      franchiseName = fRows[0]?.name ?? null;
    }
    res.json(formatUser(u, franchiseName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
