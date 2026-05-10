import { db } from "./index.js";
import {
  franchisesTable,
  usersTable,
  dimensionsTable,
  keyProcessesTable,
  strategicInitiativesTable,
  goalsTable,
  kpisTable,
  goalInitiativesTable,
  dailyCheckinsTable,
  weeklyCheckinsTable,
  monthlyCheckinsTable,
} from "./schema/index.js";
import bcrypt from "bcryptjs";
import { eq, count } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Franchises
  await db.insert(franchisesTable).values([
    { name: "RE/MAX Franquia Teste", city: "Florianópolis", state: "SC", brokerOwnerName: "Carlos Mendes", active: true },
    { name: "RE/MAX Capital", city: "Joinville", state: "SC", brokerOwnerName: "Ana Souza", active: true },
    { name: "RE/MAX Excellence", city: "Blumenau", state: "SC", brokerOwnerName: "Roberto Lima", active: true },
  ]).onConflictDoNothing();

  const franchises = await db.select().from(franchisesTable).orderBy(franchisesTable.id);
  const f1 = franchises[0];
  console.log("Franchises seeded:", franchises.length);

  // Users
  const passwords = {
    admin: await bcrypt.hash("admin123", 10),
    regional: await bcrypt.hash("regional123", 10),
    franqueado: await bcrypt.hash("franqueado123", 10),
    responsavel: await bcrypt.hash("responsavel123", 10),
  };

  await db.insert(usersTable).values([
    { name: "Admin Master", email: "admin@remaxsc.com.br", passwordHash: passwords.admin, role: "master_admin", franchiseId: null },
    { name: "Equipe Regional", email: "regional@remaxsc.com.br", passwordHash: passwords.regional, role: "staff_regional", franchiseId: null },
    { name: "Carlos Mendes", email: "franqueado@remaxsc.com.br", passwordHash: passwords.franqueado, role: "franqueado", franchiseId: f1.id },
    { name: "Maria Costa", email: "responsavel@remaxsc.com.br", passwordHash: passwords.responsavel, role: "responsavel_interno", franchiseId: f1.id },
  ]).onConflictDoNothing();

  const users = await db.select().from(usersTable).orderBy(usersTable.id);
  const franqueadoUser = users.find(u => u.email === "franqueado@remaxsc.com.br")!;
  const responsavelUser = users.find(u => u.email === "responsavel@remaxsc.com.br")!;
  console.log("Users seeded");

  // Dimensions
  await db.insert(dimensionsTable).values([
    { name: "Pessoas", description: "Desenvolvimento e gestão de equipes para maximizar o potencial humano da franquia", active: true },
    { name: "Real Estate", description: "Processos de captação, venda, locação e pós-venda de imóveis", active: true },
  ]).onConflictDoNothing();

  const dims = await db.select().from(dimensionsTable).orderBy(dimensionsTable.id);
  const dimPessoas = dims.find(d => d.name === "Pessoas")!;
  const dimRE = dims.find(d => d.name === "Real Estate")!;
  console.log("Dimensions seeded");

  // Key Processes — Pessoas (6)
  await db.insert(keyProcessesTable).values([
    { dimensionId: dimPessoas.id, name: "Recrutamento e Seleção", description: "Atração e seleção de talentos para a equipe", orderIndex: 1 },
    { dimensionId: dimPessoas.id, name: "Onboarding e Integração", description: "Integração e capacitação inicial de novos membros", orderIndex: 2 },
    { dimensionId: dimPessoas.id, name: "Desenvolvimento e Capacitação", description: "Formação contínua e desenvolvimento profissional", orderIndex: 3 },
    { dimensionId: dimPessoas.id, name: "Engajamento e Retenção", description: "Manutenção do comprometimento e satisfação da equipe", orderIndex: 4 },
    { dimensionId: dimPessoas.id, name: "Performance e Avaliação", description: "Acompanhamento e avaliação de desempenho", orderIndex: 5 },
    { dimensionId: dimPessoas.id, name: "Cultura e Liderança", description: "Desenvolvimento da cultura organizacional e liderança", orderIndex: 6 },
  ]).onConflictDoNothing();

  // Key Processes — Real Estate (8)
  await db.insert(keyProcessesTable).values([
    { dimensionId: dimRE.id, name: "Captação de Imóveis", description: "Estratégias e processos de captação de imóveis", orderIndex: 1 },
    { dimensionId: dimRE.id, name: "Qualificação de Clientes", description: "Identificação e qualificação de compradores e locatários", orderIndex: 2 },
    { dimensionId: dimRE.id, name: "Apresentação e Visitas", description: "Gestão de apresentações e visitas de imóveis", orderIndex: 3 },
    { dimensionId: dimRE.id, name: "Negociação e Fechamento", description: "Processos de negociação e fechamento de negócios", orderIndex: 4 },
    { dimensionId: dimRE.id, name: "Pós-venda e Relacionamento", description: "Acompanhamento pós-transação e fidelização", orderIndex: 5 },
    { dimensionId: dimRE.id, name: "Marketing e Divulgação", description: "Estratégias de marketing e presença digital", orderIndex: 6 },
    { dimensionId: dimRE.id, name: "Gestão de Carteira", description: "Gestão do portfólio de imóveis e clientes", orderIndex: 7 },
    { dimensionId: dimRE.id, name: "Locação", description: "Processos de locação e gestão de aluguéis", orderIndex: 8 },
  ]).onConflictDoNothing();

  const allKPs = await db.select().from(keyProcessesTable).orderBy(keyProcessesTable.dimensionId, keyProcessesTable.orderIndex);
  const pKPs = allKPs.filter(k => k.dimensionId === dimPessoas.id);
  const rKPs = allKPs.filter(k => k.dimensionId === dimRE.id);
  console.log("Key processes seeded:", allKPs.length);

  // Strategic Initiatives — Pessoas
  const pessoasInits = [
    // Recrutamento e Seleção (0)
    [0, "Campanha de Atração de Corretores", "Número de candidatos qualificados por mês", "Taxa de conversão candidato → corretor ativo"],
    [0, "Parceria com Universidades e Cursos de Imóveis", "Novos corretores recrutados via parceria", "Custo por recrutamento"],
    [0, "Programa de Indicação Interna", "% de contratações via indicação de corretores ativos", "Taxa de permanência após 6 meses (indicados)"],
    [0, "Processo Seletivo Estruturado", "Tempo médio de ciclo de seleção (dias)", "Satisfação dos candidatos com o processo"],
    [0, "Banco de Talentos Ativo", "Banco com ao menos 30 candidatos pré-qualificados", "Tempo de resposta a vagas urgentes"],
    // Onboarding e Integração (1)
    [1, "Trilha de Onboarding Estruturada", "% de novos corretores completando onboarding em 30 dias", "Nota de satisfação do corretor no onboarding (NPS)"],
    [1, "Mentoria de 90 Dias para Novos Corretores", "Primeiro negócio fechado em até 60 dias", "Retenção após 90 dias"],
    [1, "Imersão na Cultura RE/MAX", "% de corretores que participaram da imersão", "Score de alinhamento cultural (pesquisa interna)"],
    [1, "Checklist de Integração Documentada", "100% dos novos corretores com checklist completo", "Tempo até primeira captação independente"],
    // Desenvolvimento e Capacitação (2)
    [2, "Calendário Mensal de Treinamentos Técnicos", "% de corretores com ao menos 1 treinamento/mês", "Nota média nas avaliações pós-treinamento"],
    [2, "Certificação Interna de Corretores", "% de corretores certificados no nível básico RE/MAX", "Número de corretores avançando para nível seguinte"],
    [2, "Biblioteca de Conteúdo de Aprendizado", "Plataforma com ao menos 20 módulos disponíveis", "Taxa de conclusão de módulos por corretor"],
    [2, "Coaching Individual Mensal", "100% dos corretores com coaching registrado/mês", "Evolução de metas individuais entre sessões"],
    // Engajamento e Retenção (3)
    [3, "Pesquisa de Satisfação Trimestral", "NPS interno acima de 50", "Taxa de resposta à pesquisa"],
    [3, "Programa de Reconhecimento e Premiação", "100% dos top performers reconhecidos mensalmente", "Taxa de rotatividade de corretores"],
    [3, "Reunião Semanal de Equipe", "% de corretores participando das reuniões semanais", "Agenda de comprometimentos cumpridos semana a semana"],
    [3, "Plano de Carreira Individual Documentado", "% de corretores com plano de carreira definido", "% de metas individuais atingidas no semestre"],
    // Performance e Avaliação (4)
    [4, "Dashboard Individual de Performance", "100% dos corretores com acesso ao próprio dashboard", "Frequência de atualização de indicadores pelo corretor"],
    [4, "Avaliação de Performance Mensal", "100% dos corretores avaliados mensalmente", "Melhoria média de desempenho mês a mês"],
    [4, "Ranking Interno Público Semanal", "Ranking atualizado e divulgado toda segunda-feira", "% de corretores no quartil superior nos últimos 3 meses"],
    // Cultura e Liderança (5)
    [5, "Programa de Desenvolvimento de Liderança", "% de gestores com pelo menos 1 liderado formado internamente", "Avaliação 360 de líderes"],
    [5, "Ritual Semanal de Cultura (Stand-up)", "% de participação no stand-up semanal de cultura", "Percepção de alinhamento de valores na equipe"],
    [5, "Documentação dos Valores e Rituais RE/MAX", "Manual de cultura atualizado e distribuído", "Reconhecimento de valores em reuniões (frequência)"],
  ];

  for (const [kpIdx, name, kri, kpi] of pessoasInits) {
    const kp = pKPs[kpIdx as number];
    if (!kp) continue;
    await db.insert(strategicInitiativesTable).values({
      dimensionId: dimPessoas.id,
      keyProcessId: kp.id,
      name: name as string,
      kri: kri as string,
      kpi: kpi as string,
      description: `Iniciativa estratégica: ${name}`,
      active: true,
    }).onConflictDoNothing();
  }

  // Strategic Initiatives — Real Estate
  const reInits = [
    // Captação de Imóveis (0)
    [0, "Meta de Captação Semanal por Corretor", "Número de captações novas por semana por corretor", "% de captações exclusivas em relação ao total"],
    [0, "Rota de Captação por Bairro", "Cobertura de 100% dos bairros prioritários por mês", "Taxa de conversão de prospecção → captação"],
    [0, "Carteira de Proprietários Ativa", "Número de proprietários em relacionamento ativo", "Tempo médio do ciclo proprietário → contrato assinado"],
    [0, "Captação por Indicação de Clientes", "% do total de captações originadas por indicação", "Custo por captação via indicação vs. prospecção ativa"],
    [0, "Avaliação Online e Precificação Rápida", "Tempo médio entre solicitação e entrega de avaliação (horas)", "% de avaliações convertidas em contrato de captação"],
    // Qualificação de Clientes (1)
    [1, "Funil de Qualificação de Leads Documentado", "% de leads qualificados antes de visita", "Taxa de conversão lead qualificado → proposta"],
    [1, "Script de Qualificação por WhatsApp e Telefone", "% de corretores usando o script documentado", "Tempo médio de qualificação por lead (minutos)"],
    [1, "CRM Atualizado e Segmentado", "% de leads no CRM com perfil completo", "Taxa de reativação de leads antigos"],
    [1, "Reunião de Alinhamento com Comprador", "100% dos compradores com reunião de alinhamento antes de visitas", "Número de visitas até proposta (médio)"],
    // Apresentação e Visitas (2)
    [2, "Roteiro de Apresentação de Imóvel", "% de visitas com roteiro documentado utilizado", "Taxa de conversão visita → proposta"],
    [2, "Tour Virtual para Pré-qualificação", "% de imóveis da carteira com tour virtual ativo", "Redução de visitas físicas improdutivas"],
    [2, "Feedback Sistemático após Cada Visita", "100% das visitas com feedback registrado em até 24h", "NPS dos compradores após visita"],
    [2, "Agenda de Visitas Otimizada", "% de visitas agendadas com menos de 48h de antecedência", "Número de visitas por corretor por semana"],
    // Negociação e Fechamento (3)
    [3, "Playbook de Negociação Documentado", "% de negociações seguindo o playbook", "Taxa de fechamento (propostas → contratos assinados)"],
    [3, "Acompanhamento de Proposta em Aberto", "Nenhuma proposta sem seguimento por mais de 48h", "Tempo médio ciclo proposta → contrato"],
    [3, "Treinamento Mensal de Técnicas de Fechamento", "% de corretores participando do treinamento mensal", "Melhoria na taxa de fechamento individual mês a mês"],
    [3, "Reunião de Suporte ao Fechamento", "100% de propostas acima de valor definido revisadas com gestor", "% de negociações travadas resolvidas na reunião de suporte"],
    // Pós-venda e Relacionamento (4)
    [4, "Protocolo de Pós-venda Estruturado", "100% dos clientes com contato de pós-venda em até 7 dias", "NPS pós-transação"],
    [4, "Programa de Indicação de Clientes Satisfeitos", "% do total de captações/vendas originadas por indicação de ex-clientes", "Custo de aquisição de cliente via indicação"],
    [4, "Newsletter e Conteúdo para Base de Clientes", "Envio mensal para 100% da base de ex-clientes", "Taxa de abertura e engajamento da newsletter"],
    // Marketing e Divulgação (5)
    [5, "Calendário Editorial de Redes Sociais", "Publicação de ao menos 3 posts por semana", "Crescimento de seguidores e engajamento mensal"],
    [5, "Portais Imobiliários Atualizados", "100% dos imóveis ativos nos principais portais", "Leads gerados por portal por mês"],
    [5, "Google Meu Negócio Otimizado", "Avaliação acima de 4.5 no Google com ao menos 50 avaliações", "Número de ações mensais no GMN"],
    [5, "Anúncios Patrocinados (Google/Meta Ads)", "Custo por lead inferior a R$ 50", "ROI da campanha (negócios fechados / investimento)"],
    // Gestão de Carteira (6)
    [6, "Revisão Mensal da Carteira Ativa", "100% dos imóveis da carteira revisados mensalmente", "% de imóveis com mais de 90 dias sem proposta"],
    [6, "Estratégia de Reativação de Imóveis Parados", "% de imóveis parados reativados após intervenção", "Tempo médio de imóvel em carteira até venda/locação"],
    [6, "Segmentação por Perfil de Comprador", "% de imóveis com perfil de comprador ideal documentado", "Taxa de match imóvel-comprador em visitas"],
    // Locação (7)
    [7, "Carteira de Locação Ativa e Atualizada", "Número de imóveis para locação com anúncio ativo", "Taxa de vacância da carteira de locação"],
    [7, "Processo de Vistoria Documentado", "100% das vistorias com laudo fotográfico registrado", "Reclamações de proprietário por vistoria incompleta"],
    [7, "Gestão de Inadimplência de Locatários", "Taxa de inadimplência abaixo de 3%", "Tempo médio de resolução de inadimplência"],
    [7, "Renovação Proativa de Contratos", "100% dos contratos com 90 dias ou menos com renovação iniciada", "Taxa de renovação de contratos de locação"],
  ];

  for (const [kpIdx, name, kri, kpi] of reInits) {
    const kp = rKPs[kpIdx as number];
    if (!kp) continue;
    await db.insert(strategicInitiativesTable).values({
      dimensionId: dimRE.id,
      keyProcessId: kp.id,
      name: name as string,
      kri: kri as string,
      kpi: kpi as string,
      description: `Iniciativa estratégica: ${name}`,
      active: true,
    }).onConflictDoNothing();
  }

  const allInits = await db.select().from(strategicInitiativesTable);
  console.log("Strategic initiatives seeded:", allInits.length);

  // ─── Demo data for Franchise 1 (RE/MAX Franquia Teste) ────────────────────
  const existingGoals = await db.select({ c: count() }).from(goalsTable).where(eq(goalsTable.franchiseId, f1.id));
  if (existingGoals[0].c > 0) {
    console.log("Demo goals already exist — skipping demo data.");
  } else {
    console.log("Creating demo goals, KPIs, initiatives, and check-ins...");

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1); // 1st of last month
    const endDate = new Date(today.getFullYear(), today.getMonth() + 5, 30); // ~6 months from start

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // ── Goal 1: Recrutamento — grow team to 20 active brokers ──
    const [goal1] = await db.insert(goalsTable).values({
      franchiseId: f1.id,
      dimensionId: dimPessoas.id,
      keyProcessId: pKPs[0].id,
      title: "Crescer equipe para 20 corretores ativos",
      kriDescription: "Número de corretores ativos na franquia",
      currentValue: 14,
      targetValue: 20,
      unit: "corretores",
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      ownerUserId: franqueadoUser.id,
      frequency: "mensal",
      status: "em_andamento",
      progressPercentage: 65,
      riskStatus: "no_prazo",
      score: 62,
    }).returning();

    await db.insert(kpisTable).values([
      { goalId: goal1.id, name: "Candidatos qualificados por mês", initialValue: 5, currentValue: 12, targetValue: 20, unit: "candidatos", frequency: "mensal", indicatorType: "numero_absoluto", desiredDirection: "aumentar" },
      { goalId: goal1.id, name: "Taxa de conversão candidato → corretor", initialValue: 20, currentValue: 35, targetValue: 50, unit: "%", frequency: "mensal", indicatorType: "percentual", desiredDirection: "aumentar" },
      { goalId: goal1.id, name: "Tempo médio de seleção", initialValue: 21, currentValue: 15, targetValue: 10, unit: "dias", frequency: "mensal", indicatorType: "numero_absoluto", desiredDirection: "diminuir" },
    ]);

    const init1 = allInits.find(i => i.name === "Campanha de Atração de Corretores");
    const init2 = allInits.find(i => i.name === "Programa de Indicação Interna");
    if (init1) {
      await db.insert(goalInitiativesTable).values({
        goalId: goal1.id,
        strategicInitiativeId: init1.id,
        desiredResult: "Atrair ao menos 8 novos candidatos qualificados por mês via campanha digital",
        actualResult: "Campanha no Instagram e LinkedIn gerou 12 candidatos em março",
        ownerUserId: franqueadoUser.id,
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        frequency: "semanal",
        executionDay: "segunda-feira",
        executionTime: "09:00",
        estimatedTime: "2 horas",
        whatWillBeDone: "Publicar anúncios semanais no Instagram e LinkedIn sobre oportunidades na franquia",
        whyItMatters: "Crescer a equipe é o principal motor de aumento de produção",
        whoIsResponsible: "Carlos Mendes",
        howItWillBeDone: "Criação de conteúdo + impulsionamento pago de R$500/mês",
        progressPercentage: 70,
        status: "ativa",
      });
    }
    if (init2) {
      await db.insert(goalInitiativesTable).values({
        goalId: goal1.id,
        strategicInitiativeId: init2.id,
        desiredResult: "30% das contratações via indicação de corretores ativos",
        actualResult: "2 corretores contratados por indicação em abril",
        ownerUserId: responsavelUser.id,
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        frequency: "mensal",
        progressPercentage: 50,
        status: "ativa",
      });
    }

    // ── Goal 2: Captação — 30 exclusive listings/month ──
    const [goal2] = await db.insert(goalsTable).values({
      franchiseId: f1.id,
      dimensionId: dimRE.id,
      keyProcessId: rKPs[0].id,
      title: "Atingir 30 captações exclusivas por mês",
      kriDescription: "Captações exclusivas assinadas no mês",
      currentValue: 18,
      targetValue: 30,
      unit: "captações",
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      ownerUserId: franqueadoUser.id,
      frequency: "mensal",
      status: "em_andamento",
      progressPercentage: 55,
      riskStatus: "no_prazo",
      score: 54,
    }).returning();

    await db.insert(kpisTable).values([
      { goalId: goal2.id, name: "Captações novas por semana por corretor", initialValue: 1, currentValue: 2, targetValue: 3, unit: "captações", frequency: "semanal", indicatorType: "numero_absoluto", desiredDirection: "aumentar" },
      { goalId: goal2.id, name: "% de captações exclusivas no total", initialValue: 40, currentValue: 55, targetValue: 80, unit: "%", frequency: "mensal", indicatorType: "percentual", desiredDirection: "aumentar" },
    ]);

    const init3 = allInits.find(i => i.name === "Meta de Captação Semanal por Corretor");
    const init4 = allInits.find(i => i.name === "Rota de Captação por Bairro");
    if (init3) {
      await db.insert(goalInitiativesTable).values({
        goalId: goal2.id,
        strategicInitiativeId: init3.id,
        desiredResult: "Cada corretor fechar ao menos 2 captações exclusivas por semana",
        actualResult: "Média atual de 1.8 captações/corretor/semana",
        ownerUserId: franqueadoUser.id,
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        frequency: "semanal",
        executionDay: "sexta-feira",
        executionTime: "17:00",
        estimatedTime: "1 hora",
        whatWillBeDone: "Reunião de revisão semanal de metas de captação por corretor",
        progressPercentage: 60,
        status: "ativa",
      });
    }
    if (init4) {
      await db.insert(goalInitiativesTable).values({
        goalId: goal2.id,
        strategicInitiativeId: init4.id,
        desiredResult: "100% dos bairros prioritários cobertos mensalmente",
        ownerUserId: responsavelUser.id,
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        frequency: "semanal",
        progressPercentage: 40,
        status: "ativa",
      });
    }

    // ── Goal 3: Desenvolvimento — certify 80% of team ──
    const [goal3] = await db.insert(goalsTable).values({
      franchiseId: f1.id,
      dimensionId: dimPessoas.id,
      keyProcessId: pKPs[2].id,
      title: "Certificar 80% da equipe no nível básico RE/MAX",
      kriDescription: "% de corretores certificados no nível básico",
      currentValue: 40,
      targetValue: 80,
      unit: "%",
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      ownerUserId: responsavelUser.id,
      frequency: "mensal",
      status: "em_andamento",
      progressPercentage: 45,
      riskStatus: "atrasado",
      score: 38,
    }).returning();

    await db.insert(kpisTable).values([
      { goalId: goal3.id, name: "Corretores com ao menos 1 treinamento/mês", initialValue: 30, currentValue: 60, targetValue: 100, unit: "%", frequency: "mensal", indicatorType: "percentual", desiredDirection: "aumentar" },
      { goalId: goal3.id, name: "Nota média nas avaliações pós-treinamento", initialValue: 6, currentValue: 7.2, targetValue: 8.5, unit: "nota", frequency: "mensal", indicatorType: "numero_absoluto", desiredDirection: "aumentar" },
    ]);

    const init5 = allInits.find(i => i.name === "Calendário Mensal de Treinamentos Técnicos");
    const init6 = allInits.find(i => i.name === "Certificação Interna de Corretores");
    if (init5) {
      await db.insert(goalInitiativesTable).values({
        goalId: goal3.id,
        strategicInitiativeId: init5.id,
        desiredResult: "100% dos corretores participando de ao menos 1 treinamento por mês",
        actualResult: "60% de participação em abril — abaixo da meta",
        ownerUserId: responsavelUser.id,
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        frequency: "mensal",
        progressPercentage: 35,
        status: "ativa",
        notes: "Baixa adesão nos turnos da tarde — avaliar horários alternativos",
      });
    }
    if (init6) {
      await db.insert(goalInitiativesTable).values({
        goalId: goal3.id,
        strategicInitiativeId: init6.id,
        desiredResult: "80% dos corretores certificados até dezembro",
        ownerUserId: responsavelUser.id,
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        frequency: "mensal",
        progressPercentage: 25,
        status: "ativa",
      });
    }

    console.log("Goals and initiatives created.");

    // ── Check-ins: last 14 days of daily check-ins for goals 1 and 2 ──
    const goalInitiatives = await db.select().from(goalInitiativesTable);
    const gi1 = goalInitiatives.find(gi => gi.goalId === goal1.id);
    const gi2 = goalInitiatives.find(gi => gi.goalId === goal2.id);

    const dailyData = [
      { daysAgo: 13, g: goal1, gi: gi1, executed: "sim", progress: 5, blocker: null, next: "Publicar novo anúncio no LinkedIn" },
      { daysAgo: 12, g: goal1, gi: gi1, executed: "sim", progress: 3, blocker: null, next: "Ligar para 3 candidatos da semana" },
      { daysAgo: 11, g: goal1, gi: gi1, executed: "nao", progress: 0, blocker: "Reunião de gestão tomou o dia todo", next: "Retomar campanha amanhã" },
      { daysAgo: 10, g: goal1, gi: gi1, executed: "sim", progress: 8, blocker: null, next: "Entrevistar candidato às 14h" },
      { daysAgo: 9,  g: goal1, gi: gi1, executed: "sim", progress: 5, blocker: null, next: "Enviar proposta para candidatos aprovados" },
      { daysAgo: 6,  g: goal1, gi: gi1, executed: "sim", progress: 6, blocker: null, next: "Check-in com candidatos finalistas" },
      { daysAgo: 5,  g: goal1, gi: gi1, executed: "parcial", progress: 3, blocker: "Candidato desmarcou entrevista", next: "Reagendar para quinta" },
      { daysAgo: 4,  g: goal1, gi: gi1, executed: "sim", progress: 7, blocker: null, next: "Contratar 2 novos corretores" },
      { daysAgo: 3,  g: goal1, gi: gi1, executed: "sim", progress: 5, blocker: null, next: "Onboarding dos novos corretores" },
      { daysAgo: 2,  g: goal1, gi: gi1, executed: "sim", progress: 4, blocker: null, next: "Revisar campanha para próxima semana" },
      { daysAgo: 1,  g: goal1, gi: gi1, executed: "sim", progress: 6, blocker: null, next: "Meta: 15 candidatos no mês" },
      { daysAgo: 12, g: goal2, gi: gi2, executed: "sim", progress: 10, blocker: null, next: "Visitar 5 proprietários amanhã" },
      { daysAgo: 11, g: goal2, gi: gi2, executed: "sim", progress: 8, blocker: null, next: "Fechar 2 contratos de captação" },
      { daysAgo: 10, g: goal2, gi: gi2, executed: "nao", progress: 0, blocker: "Proprietários cancelaram reuniões", next: "Remarcar para sexta" },
      { daysAgo: 9,  g: goal2, gi: gi2, executed: "sim", progress: 12, blocker: null, next: "Cadastrar novos imóveis no CRM" },
      { daysAgo: 6,  g: goal2, gi: gi2, executed: "sim", progress: 9, blocker: null, next: "Revisão de rota por bairro" },
      { daysAgo: 5,  g: goal2, gi: gi2, executed: "sim", progress: 11, blocker: null, next: "Acompanhar corretores na rota" },
      { daysAgo: 4,  g: goal2, gi: gi2, executed: "parcial", progress: 5, blocker: "Chuva forte dificultou visitas externas", next: "Recuperar visitas na próxima semana" },
      { daysAgo: 3,  g: goal2, gi: gi2, executed: "sim", progress: 8, blocker: null, next: "Meta semanal atingida" },
      { daysAgo: 2,  g: goal2, gi: gi2, executed: "sim", progress: 10, blocker: null, next: "Iniciar rota do bairro Trindade" },
      { daysAgo: 1,  g: goal2, gi: gi2, executed: "sim", progress: 7, blocker: null, next: "Fechar meta de 30 captações no mês" },
    ];

    for (const d of dailyData) {
      const date = new Date(today);
      date.setDate(date.getDate() - d.daysAgo);
      await db.insert(dailyCheckinsTable).values({
        goalId: d.g.id,
        goalInitiativeId: d.gi?.id ?? null,
        franchiseId: f1.id,
        userId: franqueadoUser.id,
        date: fmt(date),
        executedToday: d.executed,
        progressToday: d.progress,
        timeSpent: "1-2 horas",
        blocker: d.blocker,
        nextStep: d.next,
        needsHelp: false,
        notes: null,
      });
    }
    console.log("Daily check-ins created.");

    // ── Weekly check-in (last week) for both goals ──
    const lastMonday = new Date(today);
    lastMonday.setDate(today.getDate() - today.getDay() - 6);
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastMonday.getDate() + 6);

    await db.insert(weeklyCheckinsTable).values({
      goalId: goal1.id,
      franchiseId: f1.id,
      userId: franqueadoUser.id,
      weekStartDate: fmt(lastMonday),
      weekEndDate: fmt(lastSunday),
      planned: "Realizar 3 entrevistas e publicar campanha semanal de recrutamento",
      executed: "Realizei 4 entrevistas — 2 candidatos avançaram para etapa final",
      progressSummary: "Progresso acima do esperado. Equipe cresceu de 14 para 15 corretores.",
      blockers: "Um candidato desistiu na última etapa",
      adjustments: "Ajustei o script de entrevista para identificar motivação mais cedo",
      nextWeekPriority: "Iniciar onboarding dos 2 novos corretores e publicar nova campanha",
      needsRegionalSupport: false,
      executionPercentage: 85,
      checkinDaysCount: 5,
    });

    await db.insert(weeklyCheckinsTable).values({
      goalId: goal2.id,
      franchiseId: f1.id,
      userId: franqueadoUser.id,
      weekStartDate: fmt(lastMonday),
      weekEndDate: fmt(lastSunday),
      planned: "Cobrir 3 bairros prioritários e fechar 8 captações exclusivas",
      executed: "Fechamos 7 captações — cobrimos 2 dos 3 bairros planejados",
      progressSummary: "Semana consistente. Chuva na quinta prejudicou o bairro Lagoa.",
      blockers: "Condições climáticas e proprietário indeciso no bairro Lagoa",
      adjustments: "Priorizamos prospecção por telefone nos dias de chuva",
      nextWeekPriority: "Retomar bairro Lagoa e focar em imóveis de alto padrão para exclusividade",
      needsRegionalSupport: false,
      executionPercentage: 75,
      checkinDaysCount: 5,
    });
    console.log("Weekly check-ins created.");

    // ── Monthly check-in (last month) for goal 1 ──
    const lastMonth = today.getMonth() === 0 ? 12 : today.getMonth();
    const lastMonthYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    await db.insert(monthlyCheckinsTable).values({
      goalId: goal1.id,
      franchiseId: f1.id,
      userId: franqueadoUser.id,
      month: lastMonth,
      year: lastMonthYear,
      kriProgress: "Crescemos de 12 para 14 corretores. Ainda distante da meta de 20, mas com pipeline sólido.",
      improvedKpis: "Candidatos qualificados por mês: de 5 para 12. Taxa de conversão: de 20% para 35%.",
      worsenedKpis: "Nenhum KPI piorou — mas ritmo precisa acelerar nos próximos meses.",
      initiativesThatWorked: "Campanha no Instagram teve ótima resposta. Programa de indicação trouxe 2 contrações.",
      initiativesThatDidNotWork: "Parceria com universidades ainda não gerou candidatos qualificados.",
      continueDoing: "Manter campanha paga no Instagram e reuniões semanais de pipeline.",
      stopDoing: "Parar de investir em feiras de emprego sem triagem prévia.",
      startDoing: "Iniciar processo de triagem automatizada com formulário online.",
      nextMonthFocus: "Fechar ao menos 3 contratações e iniciar onboarding estruturado para todos.",
    });
    console.log("Monthly check-in created.");

    console.log("Demo data created successfully!");
  }

  console.log("\nSeed completed successfully!");
  console.log("\nTest credentials:");
  console.log("  admin@remaxsc.com.br / admin123 (master_admin)");
  console.log("  regional@remaxsc.com.br / regional123 (staff_regional)");
  console.log("  franqueado@remaxsc.com.br / franqueado123 (franqueado)");
  console.log("  responsavel@remaxsc.com.br / responsavel123 (responsavel_interno)");
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Seed error:", err);
    process.exit(1);
  });
