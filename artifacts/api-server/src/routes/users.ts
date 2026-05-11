import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, franchisesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, requireWriteAccess } from "../middlewares/auth";

const router = Router();

function formatUser(u: typeof usersTable.$inferSelect, franchiseName?: string | null) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    franchiseId: u.franchiseId, franchiseName: franchiseName ?? null,
    active: u.active, createdAt: u.createdAt.toISOString(),
  };
}

router.get("/users", requireAuth, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const franchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;

    // franqueado can only list users of their own franchise
    if (role === "franqueado") {
      const myFranchiseId = req.session.franchiseId;
      if (!myFranchiseId) { res.json([]); return; }
      const rows = await db
        .select({
          id: usersTable.id, name: usersTable.name, email: usersTable.email,
          role: usersTable.role, franchiseId: usersTable.franchiseId,
          active: usersTable.active, createdAt: usersTable.createdAt,
          franchiseName: franchisesTable.name,
        })
        .from(usersTable)
        .leftJoin(franchisesTable, eq(usersTable.franchiseId, franchisesTable.id))
        .where(eq(usersTable.franchiseId, myFranchiseId));
      res.json(rows.map(u => ({
        id: u.id, name: u.name, email: u.email, role: u.role,
        franchiseId: u.franchiseId, franchiseName: u.franchiseName ?? null,
        active: u.active, createdAt: u.createdAt.toISOString(),
      })));
      return;
    }

    // master_admin and staff_regional see all (or filtered by franchiseId)
    if (role !== "master_admin" && role !== "staff_regional") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

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
      : await db
          .select({
            id: usersTable.id, name: usersTable.name, email: usersTable.email,
            role: usersTable.role, franchiseId: usersTable.franchiseId,
            active: usersTable.active, createdAt: usersTable.createdAt,
            franchiseName: franchisesTable.name,
          })
          .from(usersTable)
          .leftJoin(franchisesTable, eq(usersTable.franchiseId, franchisesTable.id));

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

router.post("/users", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const role = req.session.userRole!;
    const { name, email, password, role: userRole, franchiseId } = req.body;
    if (!name || !email || !password || !userRole) {
      res.status(400).json({ error: "name, email, password, role required" });
      return;
    }

    // franqueado can only create responsavel_interno in their own franchise
    if (role === "franqueado") {
      const myFranchiseId = req.session.franchiseId;
      if (userRole !== "responsavel_interno") {
        res.status(403).json({ error: "Você só pode criar usuários do perfil Responsável Interno." });
        return;
      }
      if (!franchiseId || franchiseId !== myFranchiseId) {
        res.status(403).json({ error: "Você só pode criar usuários para sua própria franquia." });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [u] = await db
      .insert(usersTable)
      .values({ name, email: email.toLowerCase(), passwordHash, role: userRole, franchiseId: franchiseId ?? null })
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
      // franqueado can view users in their franchise
      if (role !== "franqueado") {
        res.status(403).json({ error: "Forbidden" }); return;
      }
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
    // franqueado can only view users from their own franchise
    if (role === "franqueado" && rows[0].franchiseId !== req.session.franchiseId && req.session.userId !== id) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
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

router.patch("/users/:id", requireAuth, requireWriteAccess, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const role = req.session.userRole!;

    // franqueado can only edit responsavel_interno users in their own franchise
    if (role === "franqueado") {
      const existing = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
      if (!existing[0]) { res.status(404).json({ error: "Not found" }); return; }
      if (existing[0].franchiseId !== req.session.franchiseId) {
        res.status(403).json({ error: "Você só pode editar usuários da sua franquia." }); return;
      }
      if (existing[0].role !== "responsavel_interno") {
        res.status(403).json({ error: "Você só pode editar usuários do perfil Responsável Interno." }); return;
      }
    } else if (role !== "master_admin") {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    const { name, email, role: userRole, franchiseId, active } = req.body;
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (email !== undefined) update.email = email.toLowerCase();
    if (userRole !== undefined && role === "master_admin") update.role = userRole;
    if (franchiseId !== undefined && role === "master_admin") update.franchiseId = franchiseId;
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

router.delete("/users/:id", requireAuth, requireRole("master_admin"), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.session.userId) {
      res.status(400).json({ error: "Você não pode excluir sua própria conta." });
      return;
    }
    const [deleted] = await db.delete(usersTable).where(eq(usersTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Usuário não encontrado." }); return; }
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
