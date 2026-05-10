import { Router } from "express";
import { db } from "@workspace/db";
import { vagasTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/recruiting/vagas/:id/ai-plan", requireAuth, async (req, res) => {
  const vagaId = parseInt(req.params.id);
  if (isNaN(vagaId)) return res.status(400).json({ error: "Invalid id" });

  const [vaga] = await db.select().from(vagasTable).where(eq(vagasTable.id, vagaId));
  if (!vaga) return res.status(404).json({ error: "Vaga not found" });

  const systemPrompt = `Você é um especialista em recrutamento para o mercado imobiliário brasileiro, com foco em franquias RE/MAX.
Sua função é ajudar os gerentes de franquia a planejar a busca de candidatos com base nas especificações de cada vaga.
Responda sempre em português brasileiro.
Seja direto, prático e específico para o contexto RE/MAX SC.`;

  const vagaContext = [
    `Vaga: ${vaga.title}`,
    vaga.profileSummary ? `Perfil buscado: ${vaga.profileSummary}` : null,
    vaga.mustHaves ? `Requisitos indispensáveis: ${vaga.mustHaves}` : null,
    vaga.description ? `Descrição: ${vaga.description}` : null,
  ]
    .filter(Boolean)
    .join("\n");

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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    req.log.error({ err }, "AI plan generation failed");
    res.write(`data: ${JSON.stringify({ error: "Falha ao gerar plano. Tente novamente." })}\n\n`);
    res.end();
  }
});

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

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        ...history.slice(-10),
        { role: "user", content: message },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    req.log.error({ err }, "AI chat failed");
    res.write(`data: ${JSON.stringify({ error: "Falha na resposta. Tente novamente." })}\n\n`);
    res.end();
  }
});

export default router;
