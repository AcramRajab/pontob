import { Router } from "express";
import { db } from "@workspace/db";
import { vagasTable, candidatosTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

async function sseStream(
  res: any,
  systemPrompt: string,
  userPrompt: string,
  history: { role: "user" | "assistant"; content: string }[] = [],
  maxTokens = 4096,
  req?: any
) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const messages: any[] = [{ role: "system", content: systemPrompt }];
    if (history.length > 0) messages.push(...history.slice(-10));
    messages.push({ role: "user", content: userPrompt });

    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: maxTokens,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    if (req) req.log.error({ err }, "AI stream failed");
    res.write(`data: ${JSON.stringify({ error: "Falha ao processar. Tente novamente." })}\n\n`);
    res.end();
  }
}

// POST /recruiting/vagas/:id/ai-plan
router.post("/recruiting/vagas/:id/ai-plan", requireAuth, async (req, res) => {
  const vagaId = parseInt(req.params.id);
  if (isNaN(vagaId)) return res.status(400).json({ error: "Invalid id" });

  const [vaga] = await db.select().from(vagasTable).where(eq(vagasTable.id, vagaId));
  if (!vaga) return res.status(404).json({ error: "Vaga not found" });

  const vagaContext = [
    `Vaga: ${vaga.title}`,
    vaga.profileSummary ? `Perfil buscado: ${vaga.profileSummary}` : null,
    vaga.mustHaves ? `Requisitos indispensáveis: ${vaga.mustHaves}` : null,
    vaga.description ? `Descrição: ${vaga.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `Você é um especialista em recrutamento para o mercado imobiliário brasileiro, com foco em franquias RE/MAX.
Sua função é ajudar os gerentes de franquia a planejar a busca de candidatos com base nas especificações de cada vaga.
Responda sempre em português brasileiro.
Seja direto, prático e específico para o contexto RE/MAX SC.`;

  const userPrompt = `Analise esta vaga e crie um plano completo de busca de candidatos:

${vagaContext}

Estruture a resposta com estas seções exatas:

## 🎯 Perfil Ideal do Candidato
Defina 6-8 atributos objetivos do candidato ideal (experiência, habilidades, perfil comportamental, sinais positivos e negativos).

## 🔍 Estratégias de Busca
Liste 5-7 estratégias concretas de onde e como encontrar candidatos para esta vaga no contexto do mercado imobiliário de SC (LinkedIn, portais, networking RE/MAX, captação ativa, etc). Para cada estratégia, dê o passo a passo.

## 🔎 Queries de Busca Prontas
Forneça 5 queries prontas para LinkedIn/Google que possam ser usadas imediatamente para encontrar candidatos com o perfil ideal. Formato: coloque cada query entre aspas e explique o que ela encontra.

## ✅ Perguntas de Qualificação
Liste 6-8 perguntas objetivas para qualificar candidatos na triagem inicial — perguntas que separam quem tem o perfil de quem não tem.

## ⏱️ Sinais de Urgência
Liste 3-5 sinais que indicam que um candidato está em um momento ideal para mudar de emprego ou entrar no mercado imobiliário (gatilhos de timing).`;

  await sseStream(res, systemPrompt, userPrompt, [], 8192, req);
});

// POST /recruiting/vagas/:id/ai-chat
router.post("/recruiting/vagas/:id/ai-chat", requireAuth, async (req, res) => {
  const vagaId = parseInt(req.params.id);
  if (isNaN(vagaId)) return res.status(400).json({ error: "Invalid id" });

  const [vaga] = await db.select().from(vagasTable).where(eq(vagasTable.id, vagaId));
  if (!vaga) return res.status(404).json({ error: "Vaga not found" });

  const { message, history = [] } = req.body as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
  };
  if (!message?.trim()) return res.status(400).json({ error: "message required" });

  const vagaContext = [
    `Vaga: ${vaga.title}`,
    vaga.profileSummary ? `Perfil buscado: ${vaga.profileSummary}` : null,
    vaga.mustHaves ? `Requisitos indispensáveis: ${vaga.mustHaves}` : null,
    vaga.description ? `Descrição: ${vaga.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `Você é um especialista em recrutamento para o mercado imobiliário brasileiro, focado em franquias RE/MAX SC.
Contexto da vaga em discussão:
${vagaContext}

Ajude o gerente a planejar, buscar e qualificar candidatos para esta vaga específica.
Responda sempre em português brasileiro. Seja direto e prático.`;

  await sseStream(res, systemPrompt, message, history, 4096, req);
});

// POST /recruiting/candidatos/:id/draft-message
router.post("/recruiting/candidatos/:id/draft-message", requireAuth, async (req, res) => {
  const candidatoId = parseInt(req.params.id);
  if (isNaN(candidatoId)) return res.status(400).json({ error: "Invalid id" });

  const { type } = req.body as { type: string };
  if (!type) return res.status(400).json({ error: "type required" });

  const [row] = await db
    .select({ candidato: candidatosTable, vaga: vagasTable })
    .from(candidatosTable)
    .innerJoin(vagasTable, eq(candidatosTable.vagaId, vagasTable.id))
    .where(eq(candidatosTable.id, candidatoId));
  if (!row) return res.status(404).json({ error: "Candidato not found" });

  const { candidato, vaga } = row;

  const typeLabels: Record<string, string> = {
    convite_entrevista: "convite para entrevista",
    follow_up: "follow-up para reengajar candidato que não respondeu",
    confirmacao_entrevista: "confirmação de entrevista com data, horário e local/link",
    proposta: "apresentação de proposta de trabalho",
    rejeicao: "rejeição empática mantendo o relacionamento positivo",
  };

  const candidatoCtx = [
    `Nome: ${candidato.name}`,
    candidato.currentRole ? `Cargo atual: ${candidato.currentRole}` : null,
    candidato.source ? `Como chegou até nós: ${candidato.source}` : null,
    candidato.notes ? `Notas do recrutador: ${candidato.notes}` : null,
    `Estágio no processo: ${candidato.stage}`,
  ]
    .filter(Boolean)
    .join("\n");

  const vagaCtx = [
    `Vaga: ${vaga.title}`,
    vaga.profileSummary ? `Perfil buscado: ${vaga.profileSummary}` : null,
    vaga.mustHaves ? `Requisitos: ${vaga.mustHaves}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `Você é a secretária de recrutamento de uma franquia RE/MAX SC.
Redija mensagens profissionais e calorosas para candidatos — em português brasileiro informal mas respeitoso.
Use BLUF: comece com o ponto principal.
Para WhatsApp: máximo 5 linhas, sem formatação markdown.
Para email: assunto claro com prefixo [AÇÃO] ou [INFO] + corpo com saudação, ponto principal, contexto e próximo passo.`;

  const userPrompt = `Redija uma mensagem de "${typeLabels[type] || type}" para o candidato abaixo.

Crie DUAS versões:

### 📱 WhatsApp / SMS
(curta, informal, máximo 5 linhas, sem asteriscos ou formatação)

### 📧 Email
Assunto: [prefixo] Assunto claro

Corpo do email com saudação, ponto principal e próximo passo claro.

---
Candidato:
${candidatoCtx}

Vaga:
${vagaCtx}

Use placeholders como [DATA], [HORÁRIO], [LOCAL], [LINK] onde informações específicas precisam ser inseridas.`;

  await sseStream(res, systemPrompt, userPrompt, [], 2048, req);
});

// POST /recruiting/candidatos/:id/interview-prep
router.post("/recruiting/candidatos/:id/interview-prep", requireAuth, async (req, res) => {
  const candidatoId = parseInt(req.params.id);
  if (isNaN(candidatoId)) return res.status(400).json({ error: "Invalid id" });

  const [row] = await db
    .select({ candidato: candidatosTable, vaga: vagasTable })
    .from(candidatosTable)
    .innerJoin(vagasTable, eq(candidatosTable.vagaId, vagasTable.id))
    .where(eq(candidatosTable.id, candidatoId));
  if (!row) return res.status(404).json({ error: "Candidato not found" });

  const { candidato, vaga } = row;

  const candidatoCtx = [
    `Nome: ${candidato.name}`,
    candidato.currentRole ? `Cargo atual: ${candidato.currentRole}` : null,
    candidato.source ? `Origem: ${candidato.source}` : null,
    candidato.notes ? `Notas do recrutador: ${candidato.notes}` : null,
    candidato.recommendation ? `Recomendação atual: ${candidato.recommendation}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const vagaCtx = [
    `Vaga: ${vaga.title}`,
    vaga.profileSummary ? `Perfil buscado: ${vaga.profileSummary}` : null,
    vaga.mustHaves ? `Requisitos indispensáveis: ${vaga.mustHaves}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const systemPrompt = `Você é um especialista em entrevistas de recrutamento para o mercado imobiliário brasileiro (franquias RE/MAX SC).
Crie agendas de entrevista práticas, personalizadas e prontas para usar.
Responda em português brasileiro.`;

  const userPrompt = `Crie uma agenda de entrevista completa e personalizada para o candidato abaixo.

Candidato:
${candidatoCtx}

Vaga:
${vagaCtx}

Estruture com estas seções:

## 📋 Agenda da Entrevista — ${candidato.name}
Duração sugerida, formato recomendado (presencial/online) e tom da conversa.

## 🕐 Roteiro por Tempo
| Tempo | Fase | Objetivo |
(use uma tabela com os blocos de tempo, fase e objetivo de cada momento)

## 🎯 Perguntas de Competência
6-8 perguntas baseadas nos requisitos da vaga — cada uma com o que está sendo avaliado entre parênteses.

## 🏠 Fit com RE/MAX e Mercado Imobiliário
3-4 perguntas sobre motivação, alinhamento cultural e visão de carreira no modelo RE/MAX.

## ⚠️ Pontos de Atenção
Aspectos do perfil do candidato que merecem investigação especial (baseado nas notas e estágio).

## ✅ Critérios de Decisão
Critérios objetivos para decidir Avançar / Aguardar / Rejeitar após a entrevista.`;

  await sseStream(res, systemPrompt, userPrompt, [], 4096, req);
});

// POST /recruiting/secretary/chat
router.post("/recruiting/secretary/chat", requireAuth, async (req, res) => {
  const { message, history = [], franchiseId } = req.body as {
    message: string;
    history: { role: "user" | "assistant"; content: string }[];
    franchiseId?: number;
  };
  if (!message?.trim()) return res.status(400).json({ error: "message required" });

  let contextLines: string[] = [];

  if (franchiseId) {
    const vagas = await db.select().from(vagasTable).where(eq(vagasTable.franchiseId, franchiseId));

    if (vagas.length > 0) {
      const vagaIds = vagas.map((v) => v.id);
      const candidatos = await db
        .select()
        .from(candidatosTable)
        .where(inArray(candidatosTable.vagaId, vagaIds));

      contextLines.push(`PIPELINE DE RECRUTAMENTO (${vagas.length} vagas abertas):`);
      const now = Date.now();
      for (const v of vagas) {
        const vCandidatos = candidatos.filter((c) => c.vagaId === v.id);
        contextLines.push(`\nVaga: ${v.title} (${v.status}) — ${vCandidatos.length} candidatos`);
        for (const c of vCandidatos) {
          const days = Math.floor((now - new Date(c.updatedAt).getTime()) / 86_400_000);
          const urgency = days >= 5 ? "🔴" : days >= 2 ? "🟡" : "🟢";
          contextLines.push(
            `  ${urgency} ${c.name} — ${c.stage}${c.recommendation ? ` (rec: ${c.recommendation})` : ""} — ${days}d sem atualização`
          );
        }
      }
    }
  }

  const systemPrompt = `Você é a Secretária IA de Recrutamento de uma franquia RE/MAX SC — uma assistente executiva especializada em recrutamento imobiliário.

Suas capacidades:
- Rascunhar mensagens para candidatos (WhatsApp e email, usando o padrão BLUF)
- Montar cadências de follow-up com timing e texto de cada contato
- Preparar pautas de entrevista detalhadas
- Identificar candidatos que precisam de atenção imediata
- Resumir o status do pipeline e sugerir próximas ações
- Ajudar a priorizar tarefas de recrutamento
- Qualquer outra tarefa secretarial relacionada ao recrutamento

${contextLines.length > 0 ? `CONTEXTO ATUAL DO PIPELINE:\n${contextLines.join("\n")}` : ""}

Responda em português brasileiro. Seja direta, prática e proativa — antecipe o que o recrutador precisa fazer a seguir.`;

  await sseStream(res, systemPrompt, message, history, 4096, req);
});

export default router;
