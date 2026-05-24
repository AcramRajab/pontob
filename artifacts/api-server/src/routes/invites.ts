import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db, inviteTokensTable, usersTable, franchisesTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { sendApprovalRequest, sendApprovalGranted, sendRejectionNotice, sendAdminError } from "../services/email";

const router = Router();

function getAppUrl(req: import("express").Request): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0]}`;
  const origin = req.headers.origin;
  if (origin) return origin;
  return `https://${req.headers.host}`;
}

const approvalHtml = (ok: boolean, title: string, body: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Método Ponto B</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: sans-serif; background: #f1f5f9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: white; border-radius: 12px; padding: 40px 32px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; margin-bottom: 10px; color: #111; }
    p { color: #6b7280; line-height: 1.6; font-size: 15px; }
    .badge { display: inline-block; margin-top: 20px; padding: 8px 20px; border-radius: 9999px; font-size: 13px; font-weight: 600; background: ${ok ? "#f0fdf4" : "#fef2f2"}; color: ${ok ? "#16a34a" : "#dc2626"}; }
    .footer { margin-top: 32px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${ok ? "✅" : "❌"}</div>
    <h1>${title}</h1>
    <p>${body}</p>
    <div class="badge">${ok ? "Acesso liberado" : "Cadastro removido"}</div>
    <p class="footer">Método Ponto B — RE/MAX Santa Catarina</p>
  </div>
</body>
</html>`;

router.get("/invites", requireAuth, requireRole("master_admin", "staff_regional"), async (req, res) => {
  try {
    const now = new Date();

    const rows = await db
      .select({
        id: inviteTokensTable.id,
        franchiseId: inviteTokensTable.franchiseId,
        franchiseName: franchisesTable.name,
        role: inviteTokensTable.role,
        expiresAt: inviteTokensTable.expiresAt,
        createdAt: inviteTokensTable.createdAt,
        usedAt: inviteTokensTable.usedAt,
        usedByUserId: inviteTokensTable.usedByUserId,
        approvedAt: inviteTokensTable.approvedAt,
        rejectedAt: inviteTokensTable.rejectedAt,
        openedAt: inviteTokensTable.openedAt,
      })
      .from(inviteTokensTable)
      .leftJoin(franchisesTable, eq(inviteTokensTable.franchiseId, franchisesTable.id))
      .orderBy(desc(inviteTokensTable.createdAt));

    const userIds = rows.map(r => r.usedByUserId).filter((id): id is number => id != null);
    const userMap = new Map<number, { name: string; email: string }>();

    if (userIds.length > 0) {
      const usersData = await db
        .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
        .from(usersTable)
        .where(
          userIds.length === 1
            ? eq(usersTable.id, userIds[0])
            : inArray(usersTable.id, userIds)
        );
      for (const u of usersData) {
        userMap.set(u.id, { name: u.name, email: u.email });
      }
    }

    const result = rows.map(r => {
      let status: "pending" | "used" | "expired";
      if (r.usedAt) {
        status = "used";
      } else if (r.expiresAt < now) {
        status = "expired";
      } else {
        status = "pending";
      }
      const usedByUser = r.usedByUserId ? userMap.get(r.usedByUserId) : null;
      return {
        id: r.id,
        franchiseId: r.franchiseId,
        franchiseName: r.franchiseName ?? null,
        role: r.role,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        usedAt: r.usedAt ? r.usedAt.toISOString() : null,
        usedByUserName: usedByUser?.name ?? null,
        usedByUserEmail: usedByUser?.email ?? null,
        approvedAt: r.approvedAt ? r.approvedAt.toISOString() : null,
        rejectedAt: r.rejectedAt ? r.rejectedAt.toISOString() : null,
        openedAt: r.openedAt ? r.openedAt.toISOString() : null,
        status,
      };
    });

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/invites/:id", requireAuth, requireRole("master_admin", "staff_regional"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }

    const [invite] = await db
      .select({ id: inviteTokensTable.id, usedAt: inviteTokensTable.usedAt })
      .from(inviteTokensTable)
      .where(eq(inviteTokensTable.id, id))
      .limit(1);

    if (!invite) {
      res.status(404).json({ error: "Convite não encontrado." });
      return;
    }

    if (invite.usedAt) {
      res.status(400).json({ error: "Não é possível revogar um convite que já foi utilizado." });
      return;
    }

    await db.delete(inviteTokensTable).where(eq(inviteTokensTable.id, id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invites", requireAuth, requireRole("master_admin", "staff_regional"), async (req, res) => {
  try {
    const { franchiseId, role, expiresInDays } = req.body;
    if (!franchiseId || !role) {
      res.status(400).json({ error: "franchiseId e role são obrigatórios." });
      return;
    }
    if (!["franqueado", "responsavel_interno"].includes(role)) {
      res.status(400).json({ error: "role deve ser 'franqueado' ou 'responsavel_interno'." });
      return;
    }

    const days = expiresInDays !== undefined ? parseInt(String(expiresInDays)) : 30;
    if (isNaN(days) || days < 1 || days > 90) {
      res.status(400).json({ error: "expiresInDays deve ser um número entre 1 e 90." });
      return;
    }

    const [franchise] = await db
      .select({ id: franchisesTable.id, name: franchisesTable.name })
      .from(franchisesTable)
      .where(eq(franchisesTable.id, parseInt(franchiseId)))
      .limit(1);

    if (!franchise) {
      res.status(404).json({ error: "Franquia não encontrada." });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await db.insert(inviteTokensTable).values({
      token,
      franchiseId: franchise.id,
      role,
      createdBy: req.session.userId!,
      expiresAt,
    });

    const base = process.env.BASE_PATH ?? "";
    const appUrl = getAppUrl(req);
    const link = `${appUrl}${base}/convite/${token}`;

    res.status(201).json({ token, link, franchiseName: franchise.name, role, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    req.log.error(err);
    sendAdminError({
      subject: "Erro ao gerar link de convite",
      context: `Admin userId=${req.session.userId} tentou gerar convite`,
      details: { error: String(err), body: req.body },
    }).catch(() => {});
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/invites/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const now = new Date();

    const rows = await db
      .select({
        id: inviteTokensTable.id,
        franchiseId: inviteTokensTable.franchiseId,
        role: inviteTokensTable.role,
        expiresAt: inviteTokensTable.expiresAt,
        usedAt: inviteTokensTable.usedAt,
        openedAt: inviteTokensTable.openedAt,
        franchiseName: franchisesTable.name,
      })
      .from(inviteTokensTable)
      .leftJoin(franchisesTable, eq(inviteTokensTable.franchiseId, franchisesTable.id))
      .where(eq(inviteTokensTable.token, token))
      .limit(1);

    const invite = rows[0];

    if (!invite) {
      res.json({ valid: false, error: "Link de convite inválido." });
      return;
    }
    if (invite.usedAt) {
      res.json({ valid: false, error: "Este link já foi utilizado." });
      return;
    }
    if (invite.expiresAt < now) {
      res.json({ valid: false, error: "Este link expirou. Solicite um novo ao administrador." });
      return;
    }

    if (!invite.openedAt) {
      await db
        .update(inviteTokensTable)
        .set({ openedAt: now })
        .where(eq(inviteTokensTable.id, invite.id));
    }

    res.json({ valid: true, franchiseName: invite.franchiseName, role: invite.role });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invites/:token/accept", async (req, res) => {
  try {
    const { token } = req.params;
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "name, email e password são obrigatórios." });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "A senha deve ter no mínimo 8 caracteres." });
      return;
    }

    const now = new Date();
    const rows = await db
      .select({
        id: inviteTokensTable.id,
        franchiseId: inviteTokensTable.franchiseId,
        role: inviteTokensTable.role,
        expiresAt: inviteTokensTable.expiresAt,
        usedAt: inviteTokensTable.usedAt,
        franchiseName: franchisesTable.name,
      })
      .from(inviteTokensTable)
      .leftJoin(franchisesTable, eq(inviteTokensTable.franchiseId, franchisesTable.id))
      .where(eq(inviteTokensTable.token, token))
      .limit(1);

    const invite = rows[0];

    if (!invite) {
      res.status(400).json({ error: "Link de convite inválido." });
      return;
    }
    if (invite.usedAt) {
      res.status(400).json({ error: "Este link já foi utilizado." });
      return;
    }
    if (invite.expiresAt < now) {
      res.status(400).json({ error: "Este link expirou. Solicite um novo ao administrador." });
      return;
    }

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase()))
      .limit(1);

    if (existing[0]) {
      res.status(409).json({ error: "Este e-mail já está cadastrado. Faça login ou use outro e-mail." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const approvalToken = crypto.randomBytes(24).toString("hex");

    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        role: invite.role,
        franchiseId: invite.franchiseId,
        active: false,
        invitedAt: now,
      })
      .returning();

    await db
      .update(inviteTokensTable)
      .set({ usedAt: now, usedByUserId: user.id, approvalToken })
      .where(eq(inviteTokensTable.id, invite.id));

    const base = process.env.BASE_PATH ?? "";
    const appUrl = getAppUrl(req);
    const approveUrl = `${appUrl}${base}/api/invites/approve/${approvalToken}`;
    const rejectUrl = `${appUrl}${base}/api/invites/reject/${approvalToken}`;

    sendApprovalRequest({
      userName: user.name,
      userEmail: user.email,
      franchiseName: invite.franchiseName ?? "—",
      role: invite.role,
      approveUrl,
      rejectUrl,
    }).catch(err => req.log.error({ err }, "Failed to send approval request email"));

    res.status(201).json({ status: "pending_approval" });
  } catch (err) {
    req.log.error(err);
    const { name, email } = req.body;
    sendAdminError({
      subject: "Erro no cadastro via link de convite",
      context: `Usuário tentou se cadastrar via convite token=${req.params.token}`,
      details: { error: String(err), name, email },
    }).catch(() => {});
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invites/:id/approve", requireAuth, requireRole("master_admin", "staff_regional"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }

    const rows = await db
      .select({
        id: inviteTokensTable.id,
        usedByUserId: inviteTokensTable.usedByUserId,
        approvedAt: inviteTokensTable.approvedAt,
        rejectedAt: inviteTokensTable.rejectedAt,
        role: inviteTokensTable.role,
        franchiseName: franchisesTable.name,
        usedAt: inviteTokensTable.usedAt,
      })
      .from(inviteTokensTable)
      .leftJoin(franchisesTable, eq(inviteTokensTable.franchiseId, franchisesTable.id))
      .where(eq(inviteTokensTable.id, id))
      .limit(1);

    const invite = rows[0];

    if (!invite) {
      res.status(404).json({ error: "Convite não encontrado." });
      return;
    }

    if (!invite.usedAt || !invite.usedByUserId) {
      res.status(400).json({ error: "Este convite ainda não foi utilizado por nenhum usuário." });
      return;
    }

    if (invite.approvedAt) {
      res.status(400).json({ error: "Este cadastro já foi aprovado anteriormente." });
      return;
    }

    if (invite.rejectedAt) {
      res.status(400).json({ error: "Este cadastro já foi rejeitado e não pode ser aprovado." });
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, invite.usedByUserId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado." });
      return;
    }

    await db.update(usersTable).set({ active: true }).where(eq(usersTable.id, user.id));
    await db.update(inviteTokensTable).set({ approvedAt: new Date() }).where(eq(inviteTokensTable.id, invite.id));

    const appUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : `https://${req.headers.host}`;

    sendApprovalGranted({
      toEmail: user.email,
      toName: user.name,
      franchiseName: invite.franchiseName ?? "—",
      role: invite.role,
      appUrl,
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invites/:id/reject", requireAuth, requireRole("master_admin", "staff_regional"), async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido." });
      return;
    }

    const rows = await db
      .select({
        id: inviteTokensTable.id,
        usedByUserId: inviteTokensTable.usedByUserId,
        approvedAt: inviteTokensTable.approvedAt,
        rejectedAt: inviteTokensTable.rejectedAt,
        usedAt: inviteTokensTable.usedAt,
      })
      .from(inviteTokensTable)
      .where(eq(inviteTokensTable.id, id))
      .limit(1);

    const invite = rows[0];

    if (!invite) {
      res.status(404).json({ error: "Convite não encontrado." });
      return;
    }

    if (!invite.usedAt || !invite.usedByUserId) {
      res.status(400).json({ error: "Este convite ainda não foi utilizado por nenhum usuário." });
      return;
    }

    if (invite.approvedAt) {
      res.status(400).json({ error: "Este cadastro já foi aprovado e não pode ser rejeitado." });
      return;
    }

    if (invite.rejectedAt) {
      res.status(400).json({ error: "Este cadastro já foi rejeitado anteriormente." });
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, invite.usedByUserId))
      .limit(1);

    if (user) {
      sendRejectionNotice({ toEmail: user.email, toName: user.name }).catch(() => {});
      await db.delete(usersTable).where(eq(usersTable.id, user.id));
    }
    await db.update(inviteTokensTable).set({ rejectedAt: new Date() }).where(eq(inviteTokensTable.id, invite.id));

    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/invites/approve/:approvalToken", async (req, res) => {
  try {
    const { approvalToken } = req.params;

    const rows = await db
      .select({
        id: inviteTokensTable.id,
        usedByUserId: inviteTokensTable.usedByUserId,
        approvedAt: inviteTokensTable.approvedAt,
        rejectedAt: inviteTokensTable.rejectedAt,
        role: inviteTokensTable.role,
        franchiseName: franchisesTable.name,
      })
      .from(inviteTokensTable)
      .leftJoin(franchisesTable, eq(inviteTokensTable.franchiseId, franchisesTable.id))
      .where(eq(inviteTokensTable.approvalToken, approvalToken))
      .limit(1);

    const invite = rows[0];

    if (!invite || !invite.usedByUserId) {
      res.status(404).send(approvalHtml(false, "Link inválido", "Este link de aprovação não é válido ou já foi utilizado."));
      return;
    }

    if (invite.approvedAt) {
      res.send(approvalHtml(true, "Já aprovado", "Este cadastro já foi aprovado anteriormente."));
      return;
    }

    if (invite.rejectedAt) {
      res.send(approvalHtml(false, "Já rejeitado", "Este cadastro já foi rejeitado anteriormente."));
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, invite.usedByUserId))
      .limit(1);

    if (!user) {
      res.status(404).send(approvalHtml(false, "Usuário não encontrado", "O cadastro não foi encontrado. Pode ter sido removido."));
      return;
    }

    await db.update(usersTable).set({ active: true }).where(eq(usersTable.id, user.id));
    await db.update(inviteTokensTable).set({ approvedAt: new Date() }).where(eq(inviteTokensTable.id, invite.id));

    const appUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : `https://${req.headers.host}`;

    sendApprovalGranted({
      toEmail: user.email,
      toName: user.name,
      franchiseName: invite.franchiseName ?? "—",
      role: invite.role,
      appUrl,
    }).catch(() => {});

    res.send(approvalHtml(true, "Acesso aprovado!", `<strong>${user.name}</strong> agora tem acesso à plataforma. Um e-mail de boas-vindas foi enviado para <strong>${user.email}</strong>.`));
  } catch (err) {
    req.log.error(err);
    sendAdminError({
      subject: "Erro ao aprovar cadastro",
      context: `Clique no botão de aprovação falhou: approvalToken=${req.params.approvalToken}`,
      details: { error: String(err) },
    }).catch(() => {});
    res.status(500).send(approvalHtml(false, "Erro ao aprovar", "Ocorreu um erro ao processar a aprovação. Um alerta foi enviado para o administrador."));
  }
});

router.get("/invites/reject/:approvalToken", async (req, res) => {
  try {
    const { approvalToken } = req.params;

    const rows = await db
      .select({
        id: inviteTokensTable.id,
        usedByUserId: inviteTokensTable.usedByUserId,
        approvedAt: inviteTokensTable.approvedAt,
        rejectedAt: inviteTokensTable.rejectedAt,
        franchiseName: franchisesTable.name,
        role: inviteTokensTable.role,
      })
      .from(inviteTokensTable)
      .leftJoin(franchisesTable, eq(inviteTokensTable.franchiseId, franchisesTable.id))
      .where(eq(inviteTokensTable.approvalToken, approvalToken))
      .limit(1);

    const invite = rows[0];

    if (!invite || !invite.usedByUserId) {
      res.status(404).send(approvalHtml(false, "Link inválido", "Este link de rejeição não é válido ou já foi utilizado."));
      return;
    }

    if (invite.approvedAt) {
      res.send(approvalHtml(true, "Já aprovado", "Este cadastro já foi aprovado e não pode ser rejeitado."));
      return;
    }

    if (invite.rejectedAt) {
      res.send(approvalHtml(false, "Já rejeitado", "Este cadastro já foi rejeitado anteriormente."));
      return;
    }

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(eq(usersTable.id, invite.usedByUserId))
      .limit(1);

    const userName = user?.name ?? "Usuário";

    if (user) {
      sendRejectionNotice({ toEmail: user.email, toName: user.name }).catch(() => {});
      await db.delete(usersTable).where(eq(usersTable.id, user.id));
    }
    await db.update(inviteTokensTable).set({ rejectedAt: new Date() }).where(eq(inviteTokensTable.id, invite.id));

    res.send(approvalHtml(false, "Cadastro rejeitado", `O cadastro de <strong>${userName}</strong> foi removido permanentemente. O usuário não terá acesso à plataforma.`));
  } catch (err) {
    req.log.error(err);
    sendAdminError({
      subject: "Erro ao rejeitar cadastro",
      context: `Clique no botão de rejeição falhou: approvalToken=${req.params.approvalToken}`,
      details: { error: String(err) },
    }).catch(() => {});
    res.status(500).send(approvalHtml(false, "Erro ao rejeitar", "Ocorreu um erro ao processar a rejeição. Um alerta foi enviado para o administrador."));
  }
});

export default router;
