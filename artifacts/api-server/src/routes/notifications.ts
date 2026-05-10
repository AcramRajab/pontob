import { Router } from "express";
import { db, usersTable, candidatosTable, vagasTable, franchisesTable } from "@workspace/db";
import { eq, inArray, isNotNull, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import {
  isEmailConfigured,
  sendInterviewReminder,
  sendWeeklyDigest,
  sendCheckinReminder,
} from "../services/email";

const router = Router();

// GET /notifications/status
router.get("/notifications/status", requireAuth, (req, res) => {
  res.json({ emailConfigured: isEmailConfigured() });
});

// POST /notifications/interview-reminders — trigger interview reminders for today
router.post("/notifications/interview-reminders", requireAuth, async (req, res) => {
  if (!isEmailConfigured()) {
    res.status(503).json({ error: "Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD." });
    return;
  }

  try {
    const role = req.session.userRole;
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

    const candidatosWithInterview = await db
      .select({
        candidato: candidatosTable,
        vagaTitle: vagasTable.title,
        franchiseId: vagasTable.franchiseId,
      })
      .from(candidatosTable)
      .innerJoin(vagasTable, eq(candidatosTable.vagaId, vagasTable.id))
      .where(and(
        isNotNull(candidatosTable.interviewAt),
      ));

    const todayInterviews = candidatosWithInterview.filter((row) => {
      if (!row.candidato.interviewAt) return false;
      const t = new Date(row.candidato.interviewAt);
      return t >= dayStart && t <= dayEnd;
    });

    if (role !== "master_admin" && role !== "staff_regional") {
      const franchiseId = req.session.franchiseId!;
      const filtered = todayInterviews.filter((r) => r.franchiseId === franchiseId);
      const users = await db
        .select({ email: usersTable.email, name: usersTable.name })
        .from(usersTable)
        .where(and(eq(usersTable.franchiseId, franchiseId), eq(usersTable.active, true)));

      const franchise = await db
        .select({ name: franchisesTable.name })
        .from(franchisesTable)
        .where(eq(franchisesTable.id, franchiseId))
        .limit(1);

      let sent = 0;
      for (const row of filtered) {
        for (const user of users) {
          await sendInterviewReminder({
            toEmail: user.email,
            toName: user.name,
            candidatoName: row.candidato.name,
            vagaTitle: row.vagaTitle,
            franchiseName: franchise[0]?.name ?? "",
            interviewAt: row.candidato.interviewAt!.toISOString(),
            phone: row.candidato.phone,
          });
          sent++;
        }
      }
      res.json({ sent, interviews: filtered.length });
      return;
    }

    let sent = 0;
    for (const row of todayInterviews) {
      const users = await db
        .select({ email: usersTable.email, name: usersTable.name })
        .from(usersTable)
        .where(and(eq(usersTable.franchiseId, row.franchiseId), eq(usersTable.active, true)));
      const franchise = await db
        .select({ name: franchisesTable.name })
        .from(franchisesTable)
        .where(eq(franchisesTable.id, row.franchiseId))
        .limit(1);

      for (const user of users) {
        await sendInterviewReminder({
          toEmail: user.email,
          toName: user.name,
          candidatoName: row.candidato.name,
          vagaTitle: row.vagaTitle,
          franchiseName: franchise[0]?.name ?? "",
          interviewAt: row.candidato.interviewAt!.toISOString(),
          phone: row.candidato.phone,
        });
        sent++;
      }
    }
    res.json({ sent, interviews: todayInterviews.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /notifications/weekly-digest — send weekly pipeline digest for a franchise
router.post("/notifications/weekly-digest", requireAuth, async (req, res) => {
  if (!isEmailConfigured()) {
    res.status(503).json({ error: "Email not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD." });
    return;
  }

  try {
    const franchiseId = req.session.franchiseId
      ?? (req.body.franchiseId ? parseInt(req.body.franchiseId) : null);
    if (!franchiseId) { res.status(400).json({ error: "franchiseId required" }); return; }

    const vagas = await db
      .select()
      .from(vagasTable)
      .where(and(eq(vagasTable.franchiseId, franchiseId), eq(vagasTable.status, "ativa")));

    if (vagas.length === 0) { res.json({ sent: 0 }); return; }

    const vagaIds = vagas.map((v) => v.id);
    const candidatos = await db
      .select()
      .from(candidatosTable)
      .where(inArray(candidatosTable.vagaId, vagaIds));

    const vagaMap = Object.fromEntries(vagas.map((v) => [v.id, v]));
    const digest = candidatos
      .filter((c) => c.stage !== "arquivado" && c.stage !== "contratado")
      .map((c) => ({
        name: c.name,
        vagaTitle: vagaMap[c.vagaId]?.title ?? "",
        stage: c.stage,
        daysSinceUpdate: Math.floor((Date.now() - new Date(c.updatedAt).getTime()) / 86_400_000),
      }));

    const franchise = await db
      .select({ name: franchisesTable.name })
      .from(franchisesTable)
      .where(eq(franchisesTable.id, franchiseId))
      .limit(1);

    const users = await db
      .select({ email: usersTable.email, name: usersTable.name })
      .from(usersTable)
      .where(and(eq(usersTable.franchiseId, franchiseId), eq(usersTable.active, true)));

    let sent = 0;
    for (const user of users) {
      await sendWeeklyDigest({
        toEmail: user.email,
        toName: user.name,
        franchiseName: franchise[0]?.name ?? "",
        candidatos: digest,
      });
      sent++;
    }
    res.json({ sent, candidatos: digest.length });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
