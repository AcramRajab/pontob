import { Router, type Request, type Response } from "express";
import {
  db, goalsTable, kpisTable, goalInitiativesTable, dimensionsTable,
  franchiseVisaoTable, franchiseVisaoMilestonesTable, franchiseKrisTable,
  dailyCheckinsTable, franchisesTable, strategicInitiativesTable,
  keyProcessesTable,
} from "@workspace/db";
import { eq, and, gte, inArray, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

/* ── helpers ─────────────────────────────────────────────────────── */

function calcRisk(g: { startDate?: string | null; endDate?: string | null; progressPercentage: number }) {
  if (!g.startDate || !g.endDate) return "no_prazo";
  const start = new Date(g.startDate).getTime();
  const end   = new Date(g.endDate).getTime();
  const now   = Date.now();
  const total = end - start;
  if (total <= 0) return "no_prazo";
  const elapsed = ((now - start) / total) * 100;
  const diff    = (g.progressPercentage ?? 0) - elapsed;
  if (diff < -15) return "atrasado";
  if (diff > 15)  return "adiantado";
  return "no_prazo";
}

function effectiveProgress(
  goal: { id: number; progressPercentage: number },
  allKpis: { goalId: number; currentValue: number | null; targetValue: number | null }[],
  allInits: { goalId: number; progressPercentage: number | null }[],
): number {
  const kpis = allKpis.filter(k => k.goalId === goal.id && k.targetValue != null && (k.targetValue as number) > 0);
  if (kpis.length > 0) {
    const avg = kpis.reduce((s, k) => s + Math.min(((k.currentValue ?? 0) / (k.targetValue as number)) * 100, 100), 0) / kpis.length;
    return Math.round(avg);
  }
  const inits = allInits.filter(i => i.goalId === goal.id);
  if (inits.length > 0) {
    return Math.round(inits.reduce((s, i) => s + (i.progressPercentage ?? 0), 0) / inits.length);
  }
  return goal.progressPercentage ?? 0;
}

function kriScore(actuals: { creci?: number | null; cres?: number | null; vgh?: number | null }, targets: { creci?: number | null; cres?: number | null; vgh?: number | null }) {
  const pairs: [number | null | undefined, number | null | undefined][] = [
    [actuals.creci, targets.creci],
    [actuals.cres, targets.cres],
    [actuals.vgh, targets.vgh],
  ];
  const valid = pairs.filter(([a, t]) => t != null && (t as number) > 0 && a != null) as [number, number][];
  if (valid.length === 0) return null;
  return Math.round(valid.reduce((s, [a, t]) => s + Math.min((a / t) * 100, 150), 0) / valid.length);
}

/* ── GET /journey ────────────────────────────────────────────────── */

router.get("/journey", requireAuth, async (req: Request, res: Response) => {
  try {
    const role = req.session.userRole!;
    const paramFranchiseId = req.query.franchiseId ? parseInt(req.query.franchiseId as string) : undefined;
    const franchiseId = (role === "master_admin" || role === "staff_regional")
      ? (paramFranchiseId ?? req.session.franchiseId)
      : req.session.franchiseId;

    if (!franchiseId) { res.status(400).json({ error: "franchiseId required" }); return; }

    const year      = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
    const now       = new Date();
    const nowStr    = now.toISOString().split("T")[0];

    /* franchise */
    const [franchise] = await db.select({ name: franchisesTable.name })
      .from(franchisesTable).where(eq(franchisesTable.id, franchiseId)).limit(1);

    /* visão + milestones */
    const [visao] = await db.select().from(franchiseVisaoTable)
      .where(and(eq(franchiseVisaoTable.franchiseId, franchiseId), eq(franchiseVisaoTable.year, year)))
      .limit(1);

    const milestones = visao
      ? await db.select().from(franchiseVisaoMilestonesTable)
          .where(eq(franchiseVisaoMilestonesTable.visaoId, visao.id))
          .orderBy(franchiseVisaoMilestonesTable.quarterDate)
      : [];

    /* KRI actuals */
    const actualKris = await db.select().from(franchiseKrisTable)
      .where(and(eq(franchiseKrisTable.franchiseId, franchiseId), eq(franchiseKrisTable.year, year)))
      .orderBy(franchiseKrisTable.month);

    /* goals */
    const goals = await db.select({
      id: goalsTable.id, title: goalsTable.title, dimensionId: goalsTable.dimensionId,
      progressPercentage: goalsTable.progressPercentage, status: goalsTable.status,
      startDate: goalsTable.startDate, endDate: goalsTable.endDate,
      currentValue: goalsTable.currentValue, targetValue: goalsTable.targetValue,
      unit: goalsTable.unit, score: goalsTable.score, kriDescription: goalsTable.kriDescription,
      dimensionName: dimensionsTable.name,
    })
      .from(goalsTable)
      .leftJoin(dimensionsTable, eq(goalsTable.dimensionId, dimensionsTable.id))
      .where(eq(goalsTable.franchiseId, franchiseId));

    const goalIds = goals.map(g => g.id);
    const [allKpis, allInits] = await Promise.all([
      goalIds.length ? db.select({ goalId: kpisTable.goalId, id: kpisTable.id, name: kpisTable.name, currentValue: kpisTable.currentValue, targetValue: kpisTable.targetValue, unit: kpisTable.unit }).from(kpisTable).where(inArray(kpisTable.goalId, goalIds)) : Promise.resolve([] as any[]),
      goalIds.length ? db.select({ goalId: goalInitiativesTable.goalId, progressPercentage: goalInitiativesTable.progressPercentage }).from(goalInitiativesTable).where(inArray(goalInitiativesTable.goalId, goalIds)) : Promise.resolve([] as any[]),
    ]);

    /* check-in consistency (30d) */
    const d30 = new Date(); d30.setDate(d30.getDate() - 30);
    const checkins = await db.select({ date: dailyCheckinsTable.date, executedToday: dailyCheckinsTable.executedToday })
      .from(dailyCheckinsTable)
      .where(and(eq(dailyCheckinsTable.franchiseId, franchiseId), gte(dailyCheckinsTable.date, d30.toISOString().split("T")[0])));
    const checkinDays = new Set(checkins.map(c => c.date)).size;
    const checkinConsistency = Math.round((checkinDays / 30) * 100);

    /* quarterly roadmap */
    const QUARTERS = [
      { label: "1ºTRI", months: [1,2,3], quarterDate: `${year}-03-31`, quarter: 1 },
      { label: "2ºTRI", months: [4,5,6], quarterDate: `${year}-06-30`, quarter: 2 },
      { label: "3ºTRI", months: [7,8,9], quarterDate: `${year}-09-30`, quarter: 3 },
      { label: "4ºTRI", months:[10,11,12],quarterDate: `${year}-12-31`, quarter: 4 },
    ];

    const quarterNodes = QUARTERS.map(q => {
      const milestone  = milestones.find(m => m.quarterDate === q.quarterDate) ?? null;
      const monthsData = actualKris.filter(k => q.months.includes(k.month));
      const latestKri  = monthsData[monthsData.length - 1] ?? null;

      const qEnd   = new Date(q.quarterDate);
      const qStart = new Date(`${year}-${String(q.months[0]).padStart(2,"0")}-01`);
      const isPast    = qEnd < now;
      const isCurrent = qStart <= now && qEnd >= now;
      const isFuture  = qStart > now;

      const targets = { creci: milestone?.targetCreci ?? null, cres: milestone?.targetCres ?? null, vgh: milestone?.targetVgh ?? null };
      const actuals = { creci: latestKri?.creci ?? null, cres: latestKri?.cres ?? null, vgh: latestKri?.vgh ?? null };
      const score   = kriScore(actuals, targets);

      let status: "future" | "on_track" | "ahead" | "behind" | "critical" = "future";
      if (!isFuture) {
        if (score === null) status = isCurrent ? "on_track" : "future";
        else if (score >= 100) status = "ahead";
        else if (score >= 80)  status = "on_track";
        else if (score >= 50)  status = "behind";
        else                   status = "critical";
      }

      return { label: q.label, quarter: q.quarter, quarterDate: q.quarterDate, isPast, isCurrent, isFuture, hasTarget: !!milestone, hasActual: !!latestKri, score, status, targets, actuals };
    });

    /* goal journey points */
    const sortedGoals = [...goals].sort((a, b) => {
      const ord = { concluida:0, em_andamento:1, atrasada:2, nao_iniciada:3 };
      const diff = (ord[a.status as keyof typeof ord]??4) - (ord[b.status as keyof typeof ord]??4);
      if (diff !== 0) return diff;
      return (a.startDate ?? "").localeCompare(b.startDate ?? "");
    });

    const LABELS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const journeyPoints = sortedGoals.map((g, idx) => {
      const prog = effectiveProgress(g, allKpis, allInits);
      const risk = g.status === "em_andamento" ? calcRisk({ startDate: g.startDate, endDate: g.endDate, progressPercentage: prog }) : "no_prazo";
      const isCurrentPosition = g.status === "em_andamento" && sortedGoals.filter(x => x.status === "em_andamento").indexOf(g) === 0;
      return {
        index: idx,
        label: LABELS[idx] ?? String(idx+1),
        goalId: g.id,
        title: g.title,
        dimension: g.dimensionName ?? null,
        status: g.status,
        progressPercentage: prog,
        riskStatus: risk,
        startDate: g.startDate ?? null,
        endDate: g.endDate ?? null,
        unit: g.unit,
        kriDescription: g.kriDescription ?? null,
        kpis: allKpis.filter(k => k.goalId === g.id).map(k => ({
          id: k.id, name: k.name, currentValue: k.currentValue, targetValue: k.targetValue, unit: k.unit,
          progressPct: k.targetValue && (k.targetValue as number) > 0 ? Math.min(Math.round(((k.currentValue ?? 0) / (k.targetValue as number)) * 100), 100) : null,
        })),
        isCurrentPosition,
        score: g.score,
      };
    });

    /* existing suggestions */
    const suggestions = await db.execute(sql`
      SELECT * FROM journey_suggestions
      WHERE franchise_id = ${franchiseId} AND year = ${year}
      ORDER BY created_at DESC LIMIT 20
    `);

    const overallKriScore = (() => {
      const q = quarterNodes.find(q => q.isCurrent) ?? quarterNodes.filter(q => q.isPast).at(-1);
      return q?.score ?? null;
    })();

    res.json({
      franchiseName: franchise?.name ?? null,
      year,
      statement: visao?.statement ?? null,
      overallKriScore,
      checkinConsistency,
      completedGoals: journeyPoints.filter(p => p.status === "concluida").length,
      atRiskGoals: journeyPoints.filter(p => p.riskStatus === "atrasado" || p.status === "atrasada").length,
      quarterNodes,
      journeyPoints,
      suggestions: (suggestions.rows ?? []),
    });
  } catch (err) {
    req.log.error(err, "journey error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /journey/analyze ───────────────────────────────────────── */

router.post("/journey/analyze", requireAuth, async (req: Request, res: Response) => {
  try {
    const role = req.session.userRole!;
    const paramFranchiseId = req.body.franchiseId ? parseInt(req.body.franchiseId) : undefined;
    const franchiseId = (role === "master_admin" || role === "staff_regional")
      ? (paramFranchiseId ?? req.session.franchiseId)
      : req.session.franchiseId;

    if (!franchiseId) { res.status(400).json({ error: "franchiseId required" }); return; }

    const year  = req.body.year ? parseInt(req.body.year) : new Date().getFullYear();
    const quarter = req.body.quarter ? parseInt(req.body.quarter) : null;

    /* ── 1. current franchise situation ─ */
    const [franchise] = await db.select({ name: franchisesTable.name }).from(franchisesTable)
      .where(eq(franchisesTable.id, franchiseId)).limit(1);

    const [visao] = await db.select().from(franchiseVisaoTable)
      .where(and(eq(franchiseVisaoTable.franchiseId, franchiseId), eq(franchiseVisaoTable.year, year))).limit(1);

    const milestones = visao
      ? await db.select().from(franchiseVisaoMilestonesTable)
          .where(eq(franchiseVisaoMilestonesTable.visaoId, visao.id))
          .orderBy(franchiseVisaoMilestonesTable.quarterDate)
      : [];

    const myKris = await db.select().from(franchiseKrisTable)
      .where(and(eq(franchiseKrisTable.franchiseId, franchiseId), eq(franchiseKrisTable.year, year)))
      .orderBy(franchiseKrisTable.month);

    const myGoals = await db.select({ id: goalsTable.id, title: goalsTable.title, status: goalsTable.status, progressPercentage: goalsTable.progressPercentage }).from(goalsTable)
      .where(eq(goalsTable.franchiseId, franchiseId));

    const myInitiatives = await db.select({
      id: goalInitiativesTable.id, status: goalInitiativesTable.status, progressPercentage: goalInitiativesTable.progressPercentage,
      name: strategicInitiativesTable.name, keyProcessName: keyProcessesTable.name,
    })
      .from(goalInitiativesTable)
      .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
      .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id))
      .innerJoin(goalsTable, and(eq(goalInitiativesTable.goalId, goalsTable.id), eq(goalsTable.franchiseId, franchiseId)));

    /* ── 2. all franchises KRI data for cross-analysis ─ */
    const allKris = await db.select().from(franchiseKrisTable)
      .where(eq(franchiseKrisTable.year, year));

    const allMilestones = await db.select()
      .from(franchiseVisaoMilestonesTable)
      .innerJoin(franchiseVisaoTable, eq(franchiseVisaoMilestonesTable.visaoId, franchiseVisaoTable.id))
      .where(eq(franchiseVisaoTable.year, year));

    /* score each franchise per quarter */
    const QUARTERS = [
      { quarter:1, months:[1,2,3], quarterDate:`${year}-03-31` },
      { quarter:2, months:[4,5,6], quarterDate:`${year}-06-30` },
      { quarter:3, months:[7,8,9], quarterDate:`${year}-09-30` },
      { quarter:4, months:[10,11,12], quarterDate:`${year}-12-31` },
    ];

    const franchiseScores: Record<number, number[]> = {};
    for (const q of QUARTERS) {
      const qMilestones = allMilestones.filter(m => m.franchise_visao_milestones.quarterDate === q.quarterDate);
      for (const m of qMilestones) {
        const visaoRecord = m.franchise_visao;
        const fid  = visaoRecord.franchiseId;
        const kris = allKris.filter(k => k.franchiseId === fid && q.months.includes(k.month));
        const lat  = kris[kris.length - 1];
        if (!lat) continue;
        const ms   = m.franchise_visao_milestones;
        const s    = kriScore({ creci: lat.creci, cres: lat.cres, vgh: lat.vgh }, { creci: ms.targetCreci, cres: ms.targetCres, vgh: ms.targetVgh });
        if (s !== null) {
          franchiseScores[fid] = franchiseScores[fid] ?? [];
          franchiseScores[fid].push(s);
        }
      }
    }

    const avgScores = Object.entries(franchiseScores).map(([fid, scores]) => ({
      franchiseId: parseInt(fid),
      avg: Math.round(scores.reduce((s,v)=>s+v,0)/scores.length),
    })).sort((a,b)=>b.avg-a.avg);

    const myAvg = avgScores.find(s => s.franchiseId === franchiseId)?.avg ?? null;
    const topPerformers = avgScores.filter(s => s.franchiseId !== franchiseId && s.avg >= 80).slice(0, 5);

    /* get top performers' initiatives */
    const topFranchiseIds = topPerformers.map(f => f.franchiseId);
    const topInitiatives = topFranchiseIds.length
      ? await db.select({
          franchiseId: goalsTable.franchiseId,
          initiativeId: goalInitiativesTable.id,
          status: goalInitiativesTable.status,
          progress: goalInitiativesTable.progressPercentage,
          name: strategicInitiativesTable.name,
          keyProcessName: keyProcessesTable.name,
          strategicInitiativeId: goalInitiativesTable.strategicInitiativeId,
        })
          .from(goalInitiativesTable)
          .leftJoin(strategicInitiativesTable, eq(goalInitiativesTable.strategicInitiativeId, strategicInitiativesTable.id))
          .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id))
          .innerJoin(goalsTable, and(eq(goalInitiativesTable.goalId, goalsTable.id), inArray(goalsTable.franchiseId, topFranchiseIds)))
          .where(inArray(goalInitiativesTable.status, ["ativa", "concluida"]))
      : [];

    /* frequency count of top-performer initiatives */
    const freqMap: Record<string, { name: string; keyProcess: string | null; strategicId: number | null; franchiseIds: number[]; count: number }> = {};
    for (const ti of topInitiatives) {
      const key = ti.name ?? `_${ti.initiativeId}`;
      if (!freqMap[key]) freqMap[key] = { name: key, keyProcess: ti.keyProcessName, strategicId: ti.strategicInitiativeId, franchiseIds: [], count: 0 };
      if (!freqMap[key].franchiseIds.includes(ti.franchiseId as number)) {
        freqMap[key].franchiseIds.push(ti.franchiseId as number);
        freqMap[key].count++;
      }
    }
    const topInitiativesByFreq = Object.values(freqMap).sort((a,b)=>b.count-a.count).slice(0,10);

    /* my active initiative names to filter out duplicates */
    const myActiveInitiativeNames = new Set(myInitiatives.filter(i => i.status === "ativa").map(i => i.name ?? ""));

    /* catalog of available initiatives */
    const catalogInits = await db.select({
      id: strategicInitiativesTable.id,
      name: strategicInitiativesTable.name,
      keyProcessName: keyProcessesTable.name,
    })
      .from(strategicInitiativesTable)
      .leftJoin(keyProcessesTable, eq(strategicInitiativesTable.keyProcessId, keyProcessesTable.id))
      .where(eq(strategicInitiativesTable.active, true));

    /* ── 3. build AI prompt ─ */
    const currentQNode = QUARTERS.find(q => {
      const qStart = new Date(`${year}-${String(q.months[0]).padStart(2,"0")}-01`);
      const qEnd   = new Date(q.quarterDate);
      return qStart <= new Date() && qEnd >= new Date();
    }) ?? QUARTERS[3];

    const myKriSummary = myKris.length
      ? myKris.map(k => `  Mês ${k.month}: Creci=${k.creci??"-"}, Cres=${k.cres??"-"}, VGH=${k.vgh??"-"}`).join("\n")
      : "  (sem dados)";

    const targetSummary = milestones.length
      ? milestones.map(m => `  ${m.quarterDate}: Creci=${m.targetCreci??"-"}, Cres=${m.targetCres??"-"}, VGH=${m.targetVgh??"-"}`).join("\n")
      : "  (sem metas trimestrais definidas)";

    const myInitSummary = myInitiatives.length
      ? myInitiatives.map(i => `  - ${i.name ?? "sem nome"} [${i.status}] ${i.keyProcessName ? `(${i.keyProcessName})` : ""}`).join("\n")
      : "  (nenhuma)";

    const topInitSummary = topInitiativesByFreq.slice(0,8).map(i =>
      `  - "${i.name}" (${i.keyProcess??"-"}) — usada por ${i.count} franquia(s) top`
    ).join("\n");

    const myGoalSummary = myGoals.map(g => `  - ${g.title} [${g.status}] ${g.progressPercentage}%`).join("\n");

    const prompt = `Você é um consultor estratégico especializado em franquias RE/MAX SC.

FRANQUIA EM ANÁLISE: ${franchise?.name ?? franchiseId}
ANO: ${year}
TRIMESTRE ATUAL: ${currentQNode.quarter}ºTRI
SCORE KRI MÉDIO: ${myAvg !== null ? myAvg + "%" : "sem dados"}

METAS ATUAIS:
${myGoalSummary || "  (nenhuma)"}

KRIs REALIZADOS:
${myKriSummary}

METAS TRIMESTRAIS (PONTO Z por trimestre):
${targetSummary}

INICIATIVAS ATIVAS:
${myInitSummary}

INICIATIVAS MAIS USADAS POR FRANQUIAS DE ALTA PERFORMANCE:
${topInitSummary || "  (dados insuficientes)"}

Com base nesta análise:
1. Identifique os gaps mais críticos entre onde a franquia está e onde deveria estar
2. Sugira entre 3 e 6 iniciativas prioritárias — priorizando aquelas que top performers usam e que esta franquia NÃO usa
3. Para cada iniciativa: explique por que vai ajudar, qual o impacto esperado, e se deve ser adicionada/priorizada/substituída
4. Retorne JSON válido com este schema:
{
  "gapAnalysis": "resumo em 2-3 frases do diagnóstico do trimestre atual",
  "suggestions": [
    {
      "rank": 1,
      "initiativeName": "nome da iniciativa",
      "keyProcess": "processo chave",
      "action": "adicionar" | "priorizar" | "remover" | "substituir",
      "reasoning": "por que esta iniciativa vai ajudar",
      "expectedImpact": "impacto esperado nos KRIs",
      "priority": "alta" | "media" | "baixa",
      "usedByTopPerformers": true | false,
      "topPerformerCount": 2
    }
  ],
  "quarterlyOutlook": "previsão: se continuar no ritmo atual, o que acontece até o fim do trimestre"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Você é um consultor estratégico especializado em franquias RE/MAX SC. Responda sempre em português brasileiro com JSON válido." },
        { role: "user", content: prompt },
      ],
    });

    const rawJson = completion.choices[0]?.message?.content ?? "{}";
    let analysis: any = {};
    try { analysis = JSON.parse(rawJson); } catch { analysis = { error: "parse error", raw: rawJson }; }

    /* ── 4. persist suggestions ─ */
    if (Array.isArray(analysis.suggestions)) {
      await db.execute(sql`DELETE FROM journey_suggestions WHERE franchise_id = ${franchiseId} AND year = ${year} AND action = 'pending'`);
      for (const s of analysis.suggestions) {
        const matchedCatalog = catalogInits.find(c =>
          (c.name ?? "").toLowerCase().includes((s.initiativeName ?? "").toLowerCase().slice(0, 10))
        );
        await db.execute(sql`
          INSERT INTO journey_suggestions (franchise_id, year, quarter, suggestion_text, initiative_name, strategic_initiative_id, reasoning, priority, source_franchise_ids, action)
          VALUES (
            ${franchiseId}, ${year}, ${currentQNode.quarter},
            ${s.reasoning ?? ""},
            ${s.initiativeName ?? ""},
            ${matchedCatalog?.id ?? null},
            ${s.expectedImpact ?? ""},
            ${s.priority ?? "media"},
            ${JSON.stringify(topPerformers.map(f=>f.franchiseId))},
            'pending'
          )
        `);
      }
    }

    res.json({
      gapAnalysis: analysis.gapAnalysis ?? null,
      quarterlyOutlook: analysis.quarterlyOutlook ?? null,
      suggestions: analysis.suggestions ?? [],
      myKriScore: myAvg,
      topPerformersCount: topPerformers.length,
      analysedAt: new Date().toISOString(),
    });
  } catch (err) {
    req.log.error(err, "journey/analyze error");
    res.status(500).json({ error: "Erro ao analisar dados." });
  }
});

/* ── POST /journey/suggestions/:id/feedback ─────────────────────── */

router.post("/journey/suggestions/:id/feedback", requireAuth, async (req: Request, res: Response) => {
  try {
    const id     = parseInt(req.params.id);
    const action = req.body.action as string; // accepted | rejected | deferred
    if (!["accepted","rejected","deferred"].includes(action)) {
      res.status(400).json({ error: "invalid action" }); return;
    }
    await db.execute(sql`
      UPDATE journey_suggestions SET action = ${action}, acted_at = NOW() WHERE id = ${id}
    `);
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "journey/feedback error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
