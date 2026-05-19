import { Router, type Request, type Response } from "express";
import {
  db, goalsTable, goalInitiativesTable, dailyCheckinsTable,
  franchisesTable, dimensionsTable, strategicInitiativesTable, keyProcessesTable,
} from "@workspace/db";
import { eq, and, gte, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

/* ─────────────────────────────────────────────────────────────────────
   System prompt: evidence-based coaching.
   Rules:
   1. Never invent citations — only use the pre-approved list below.
   2. Always cite the source inline using [Fonte: …]
   3. Every insight must explain WHY it applies to the user's situation.
   4. Format every response as Q&A blocks.
───────────────────────────────────────────────────────────────────── */
const COACHING_SYSTEM = `Você é um coach de performance baseado em evidências científicas para franqueados RE/MAX SC.

REGRAS ABSOLUTAS:
1. NUNCA invente citações ou fontes — use APENAS as fontes da lista autorizada abaixo.
2. Sempre cite a fonte inline no formato: [Fonte: Autor — Obra (Ano)]
3. Se não tiver uma fonte verificada para uma afirmação, escreva "pesquisas na área sugerem" sem citar obra específica.
4. Cada insight deve explicar POR QUE se aplica à situação real do usuário, usando os dados fornecidos.
5. Formato: blocos de Q&A — pergunta reflexiva → resposta embasada com citação → ação concreta.
6. Seja objetivo, direto e encorajador — sem julgamentos, sem alarmismo.
7. Priorize FOCO e SIMPLICIDADE: menos metas bem executadas > muitas mal executadas.

FONTES AUTORIZADAS (use apenas estas):
- [Fonte: Locke & Latham — Goal Setting Theory (2002, Applied Psychology)]
- [Fonte: Gary Keller & Jay Papasan — The ONE Thing (2013)]
- [Fonte: James Clear — Atomic Habits (2018)]
- [Fonte: Cal Newport — Deep Work (2016)]
- [Fonte: Jim Collins — Good to Great (2001)]
- [Fonte: Daniel Kahneman — Thinking, Fast and Slow (2011)]
- [Fonte: Gollwitzer, P.M. — Implementation Intentions (1999, American Psychologist)]
- [Fonte: Baumeister & Tierney — Willpower: Rediscovering the Greatest Human Strength (2011)]
- [Fonte: Dweck, C.S. — Mindset: The New Psychology of Success (2006)]
- [Fonte: Harvard Business Review — Performance Management Research]

Responda sempre em português brasileiro.`;

/* ── POST /ai/coaching ───────────────────────────────────────────── */

router.post("/ai/coaching", requireAuth, async (req: Request, res: Response) => {
  try {
    const role = req.session.userRole!;
    const paramFranchiseId = req.body.franchiseId ? parseInt(req.body.franchiseId) : undefined;
    const franchiseId = (role === "master_admin" || role === "staff_regional")
      ? (paramFranchiseId ?? req.session.franchiseId)
      : req.session.franchiseId;

    if (!franchiseId) { res.status(400).json({ error: "franchiseId required" }); return; }

    /* ── gather context data ── */

    // Active goals
    const goals = await db.select({
      id: goalsTable.id, title: goalsTable.title, status: goalsTable.status,
      progressPercentage: goalsTable.progressPercentage,
      startDate: goalsTable.startDate, endDate: goalsTable.endDate,
      dimensionName: dimensionsTable.name,
    })
      .from(goalsTable)
      .leftJoin(dimensionsTable, eq(goalsTable.dimensionId, dimensionsTable.id))
      .where(eq(goalsTable.franchiseId, franchiseId));

    // Active initiatives
    const goalIds = goals.map(g => g.id);
    const initiatives = goalIds.length
      ? await db.select({
          id: goalInitiativesTable.id, status: goalInitiativesTable.status,
          progressPercentage: goalInitiativesTable.progressPercentage,
          name: strategicInitiativesTable.name,
          keyProcessName: keyProcessesTable.name,
          goalId: goalInitiativesTable.goalId,
        })
          .from(goalInitiativesTable)
          .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
          .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id))
          .where(inArray(goalInitiativesTable.goalId, goalIds))
      : [];

    // Last 30 days check-ins
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);
    const checkins = await db.select({
      date: dailyCheckinsTable.date,
      executedToday: dailyCheckinsTable.executedToday,
      blocker: dailyCheckinsTable.blocker,
      notes: dailyCheckinsTable.notes,
    })
      .from(dailyCheckinsTable)
      .where(and(
        eq(dailyCheckinsTable.franchiseId, franchiseId),
        gte(dailyCheckinsTable.date, d30.toISOString().split("T")[0]),
      ))
      .orderBy(desc(dailyCheckinsTable.date));

    // Last 7 check-ins for pattern
    const last7 = checkins.slice(0, 7);
    const executedCount = checkins.filter(c => c.executedToday === "sim").length;
    const partialCount  = checkins.filter(c => c.executedToday === "parcial").length;
    const skippedCount  = checkins.filter(c => c.executedToday === "nao").length;
    const checkinDays   = new Set(checkins.map(c => c.date)).size;
    const consistency   = Math.round((checkinDays / 30) * 100);

    // Blockers frequency
    const blockerFreq: Record<string, number> = {};
    for (const c of checkins) {
      if (c.blocker) blockerFreq[c.blocker] = (blockerFreq[c.blocker] ?? 0) + 1;
    }
    const topBlockers = Object.entries(blockerFreq).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Recent notes for context
    const recentNotes = checkins.filter(c => c.notes).slice(0, 5).map(c => c.notes as string);

    const activeGoals       = goals.filter(g => g.status === "em_andamento").length;
    const activeInitiatives = initiatives.filter(i => i.status === "ativa").length;
    const atRiskGoals       = goals.filter(g => g.status === "atrasada").length;

    /* ── build context for AI ── */
    const context = `
DADOS DA FRANQUIA (últimos 30 dias):

Metas ativas: ${activeGoals}
Metas concluídas: ${goals.filter(g => g.status === "concluida").length}
Metas atrasadas: ${atRiskGoals}
Iniciativas ativas: ${activeInitiatives}

Check-ins (30 dias):
- Registros: ${checkinDays} dias de ${30}
- Consistência: ${consistency}%
- Executados: ${executedCount} | Parciais: ${partialCount} | Não executados: ${skippedCount}

Principais bloqueadores mencionados:
${topBlockers.length ? topBlockers.map(([b, n]) => `  - "${b}" (${n}x)`).join("\n") : "  Nenhum registrado"}

Notas recentes dos check-ins:
${recentNotes.length ? recentNotes.map(n => `  - "${n}"`).join("\n") : "  Nenhuma"}

Metas em andamento:
${goals.filter(g => g.status === "em_andamento").map(g => `  - ${g.title} (${g.dimensionName ?? "-"}) — ${g.progressPercentage}%`).join("\n") || "  (nenhuma)"}

Iniciativas ativas:
${initiatives.filter(i => i.status === "ativa").map(i => `  - ${i.name ?? "sem nome"} (${i.keyProcessName ?? "-"}) — ${i.progressPercentage}%`).join("\n") || "  (nenhuma)"}
`;

    const userMessage = req.body.question
      ? `Pergunta do usuário: ${req.body.question}\n\nContexto:\n${context}`
      : `Com base nos dados abaixo, faça uma análise de brainstorming em formato Q&A com 4 a 6 perguntas reflexivas sobre: (1) padrões de execução, (2) bloqueadores recorrentes, (3) foco e priorização, (4) oportunidades de melhoria. Para cada pergunta, dê uma resposta embasada com citação e uma ação concreta.\n\nContexto:\n${context}`;

    /* ── streaming SSE response ── */
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 2000,
      messages: [
        { role: "system", content: COACHING_SYSTEM },
        { role: "user", content: userMessage },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error(err, "ai-coaching error");
    if (!res.headersSent) res.status(500).json({ error: "Erro ao gerar análise." });
    else { res.write(`data: ${JSON.stringify({ error: "Erro." })}\n\n`); res.end(); }
  }
});

export default router;
