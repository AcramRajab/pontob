import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

const SYSTEM_PROMPT = `Você é o Assistente do Método Ponto B, especialista em execução estratégica para franquias RE/MAX SC.

SOBRE A PLATAFORMA:
O Método Ponto B é um sistema de execução estratégica onde franqueados e responsáveis internos definem Metas ligadas a dimensões estratégicas (Pessoas e Real Estate), acompanham KPIs e Iniciativas, e registram Check-ins diários, semanais e mensais para gerar pontuação de consistência.

FLUXO DIÁRIO RECOMENDADO:
1. Começar pela tela "Hoje" para ver o resumo do dia
2. Fazer o Check-in Diário registrando o que foi executado
3. Registrar eventos no Registro de Eventos
4. Revisar o Planner Semanal para planejar a semana
5. Acompanhar as Metas e Iniciativas atribuídas
6. Consultar o Dashboard para ver a performance geral

FUNCIONALIDADES PRINCIPAIS:
- Hoje: visão geral do dia com iniciativas pendentes e alertas
- Metas: criação e acompanhamento de metas por dimensão estratégica
- Iniciativas: ações táticas vinculadas às metas (máx. 3 ativas por meta)
- KPIs: indicadores chave de resultado (máx. 3 por meta)
- Check-in Diário: registro de execução diária (Sim/Não/Parcial)
- Check-in Semanal: avaliação semanal de progresso
- Check-in Mensal: revisão mensal completa
- Planner Semanal: planejamento e priorização da semana
- Registro de Eventos: log de atividades relevantes
- Dashboard: visão gráfica de performance com pontuação
- Visão Anual: evolução ao longo do ano
- Histórico: registros de check-ins anteriores
- Catálogo: biblioteca de iniciativas estratégicas pré-definidas
- Ranking: comparativo entre franquias da regional

FÓRMULA DE PONTUAÇÃO:
40% KRI (Indicador Chave de Resultado) + 30% execução de iniciativas + 20% consistência de check-ins + 10% atualização de KPIs

PERFIS DE ACESSO:
- Responsável Interno: acesso à execução diária, check-ins e iniciativas
- Franqueado: acesso completo à franquia incluindo metas, dashboard e equipe
- Staff Regional: visão de todas as franquias da regional
- Master Admin: acesso total ao sistema

DICAS DE USO:
- Priorize fazer o check-in diário todo dia — ele vale 20% da pontuação
- Vincule cada iniciativa a uma meta estratégica para manter o foco
- Use o Catálogo para descobrir iniciativas prontas das dimensões Pessoas e Real Estate
- O Planner Semanal ajuda a organizar o que será executado na semana

Responda sempre em português brasileiro, de forma clara, objetiva e encorajadora. Foque em ajudar o usuário a usar a plataforma com eficiência.`;

router.post("/ai/assistant", requireAuth, async (req, res) => {
  try {
    const { messages } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages required" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-10),
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
  } catch (err) {
    req.log.error(err, "ai-assistant error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Erro ao processar sua pergunta." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Erro ao processar." })}\n\n`);
      res.end();
    }
  }
});

export default router;
