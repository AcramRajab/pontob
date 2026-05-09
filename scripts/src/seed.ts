import { db } from "@workspace/db";
import {
  franchisesTable,
  usersTable,
  dimensionsTable,
  keyProcessesTable,
  strategicInitiativesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  // Franchises
  const [f1] = await db.insert(franchisesTable).values({
    name: "RE/MAX Franquia Teste",
    city: "Florianópolis",
    state: "SC",
    brokerOwnerName: "Carlos Mendes",
    active: true,
  }).onConflictDoNothing().returning();

  const [f2] = await db.insert(franchisesTable).values({
    name: "RE/MAX Capital",
    city: "Joinville",
    state: "SC",
    brokerOwnerName: "Ana Souza",
    active: true,
  }).onConflictDoNothing().returning();

  const [f3] = await db.insert(franchisesTable).values({
    name: "RE/MAX Excellence",
    city: "Blumenau",
    state: "SC",
    brokerOwnerName: "Roberto Lima",
    active: true,
  }).onConflictDoNothing().returning();

  console.log("Franchises seeded");

  // Users
  const pass = await bcrypt.hash("admin123", 10);
  const pass2 = await bcrypt.hash("regional123", 10);
  const pass3 = await bcrypt.hash("franqueado123", 10);
  const pass4 = await bcrypt.hash("responsavel123", 10);

  await db.insert(usersTable).values([
    { name: "Admin Master", email: "admin@remaxsc.com.br", passwordHash: pass, role: "master_admin", franchiseId: null },
    { name: "Equipe Regional", email: "regional@remaxsc.com.br", passwordHash: pass2, role: "staff_regional", franchiseId: null },
    { name: "Carlos Mendes", email: "franqueado@remaxsc.com.br", passwordHash: pass3, role: "franqueado", franchiseId: f1?.id ?? 1 },
    { name: "Maria Costa", email: "responsavel@remaxsc.com.br", passwordHash: pass4, role: "responsavel_interno", franchiseId: f1?.id ?? 1 },
  ]).onConflictDoNothing();

  console.log("Users seeded");

  // Dimensions
  const [pessoas] = await db.insert(dimensionsTable).values({
    name: "Pessoas",
    description: "Desenvolvimento e gestão de equipes para maximizar o potencial humano da franquia",
    active: true,
  }).onConflictDoNothing().returning();

  const [realestate] = await db.insert(dimensionsTable).values({
    name: "Real Estate",
    description: "Processos de captação, venda, locação e pós-venda de imóveis",
    active: true,
  }).onConflictDoNothing().returning();

  const dimPessoas = pessoas ?? (await db.select().from(dimensionsTable).where(eq(dimensionsTable.name, "Pessoas")).limit(1))[0];
  const dimRE = realestate ?? (await db.select().from(dimensionsTable).where(eq(dimensionsTable.name, "Real Estate")).limit(1))[0];

  if (!dimPessoas || !dimRE) {
    throw new Error("Dimensions not found after insert");
  }

  console.log("Dimensions seeded");

  // Key Processes — Pessoas (6)
  const pessoasKPs = await db.insert(keyProcessesTable).values([
    { dimensionId: dimPessoas.id, name: "Recrutamento e Seleção", description: "Atração e seleção de talentos para a equipe", orderIndex: 1 },
    { dimensionId: dimPessoas.id, name: "Onboarding e Integração", description: "Integração e capacitação inicial de novos membros", orderIndex: 2 },
    { dimensionId: dimPessoas.id, name: "Desenvolvimento e Capacitação", description: "Formação contínua e desenvolvimento profissional", orderIndex: 3 },
    { dimensionId: dimPessoas.id, name: "Engajamento e Retenção", description: "Manutenção do comprometimento e satisfação da equipe", orderIndex: 4 },
    { dimensionId: dimPessoas.id, name: "Performance e Avaliação", description: "Acompanhamento e avaliação de desempenho", orderIndex: 5 },
    { dimensionId: dimPessoas.id, name: "Cultura e Liderança", description: "Desenvolvimento da cultura organizacional e liderança", orderIndex: 6 },
  ]).onConflictDoNothing().returning();

  // Key Processes — Real Estate (8)
  const reKPs = await db.insert(keyProcessesTable).values([
    { dimensionId: dimRE.id, name: "Captação de Imóveis", description: "Estratégias e processos de captação de imóveis", orderIndex: 1 },
    { dimensionId: dimRE.id, name: "Qualificação de Clientes", description: "Identificação e qualificação de compradores e locatários", orderIndex: 2 },
    { dimensionId: dimRE.id, name: "Apresentação e Visitas", description: "Gestão de apresentações e visitas de imóveis", orderIndex: 3 },
    { dimensionId: dimRE.id, name: "Negociação e Fechamento", description: "Processos de negociação e fechamento de negócios", orderIndex: 4 },
    { dimensionId: dimRE.id, name: "Pós-venda e Relacionamento", description: "Acompanhamento pós-transação e fidelização", orderIndex: 5 },
    { dimensionId: dimRE.id, name: "Marketing e Divulgação", description: "Estratégias de marketing e presença digital", orderIndex: 6 },
    { dimensionId: dimRE.id, name: "Gestão de Carteira", description: "Gestão do portfólio de imóveis e clientes", orderIndex: 7 },
    { dimensionId: dimRE.id, name: "Locação", description: "Processos de locação e gestão de aluguéis", orderIndex: 8 },
  ]).onConflictDoNothing().returning();

  console.log("Key processes seeded");

  // Now get actual KPs from DB (since onConflictDoNothing may return empty)
  const allKPs = await db.select().from(keyProcessesTable);
  const pKPs = allKPs.filter(k => k.dimensionId === dimPessoas.id).sort((a, b) => a.orderIndex - b.orderIndex);
  const rKPs = allKPs.filter(k => k.dimensionId === dimRE.id).sort((a, b) => a.orderIndex - b.orderIndex);

  // Strategic Initiatives — Pessoas (10 per process, 6 processes)
  const pessoasInitiatives = [
    // Recrutamento e Seleção (KP index 0)
    { kpIdx: 0, name: "Campanha de Atração de Corretores", kri: "Número de candidatos qualificados por mês", kpi: "Taxa de conversão candidato → corretor ativo" },
    { kpIdx: 0, name: "Parceria com Universidades e Cursos de Imóveis", kri: "Novos corretores recrutados via parceria", kpi: "Custo por recrutamento" },
    { kpIdx: 0, name: "Programa de Indicação Interna", kri: "% de contratações via indicação de corretores ativos", kpi: "Taxa de permanência após 6 meses (corretores indicados)" },
    { kpIdx: 0, name: "Processo Seletivo Estruturado", kri: "Tempo médio de ciclo de seleção (dias)", kpi: "Satisfação dos candidatos com o processo" },
    { kpIdx: 0, name: "Banco de Talentos Ativo", kri: "Banco com ao menos 30 candidatos pré-qualificados", kpi: "Tempo de resposta a vagas urgentes" },
    // Onboarding e Integração (KP index 1)
    { kpIdx: 1, name: "Trilha de Onboarding Estruturada", kri: "% de novos corretores completando onboarding em 30 dias", kpi: "Nota de satisfação do corretor no onboarding (NPS)" },
    { kpIdx: 1, name: "Mentoria de 90 Dias para Novos Corretores", kri: "Primeiro negócio fechado em até 60 dias", kpi: "Retenção após 90 dias" },
    { kpIdx: 1, name: "Imersão na Cultura RE/MAX", kri: "% de corretores que participaram da imersão", kpi: "Score de alinhamento cultural (pesquisa interna)" },
    { kpIdx: 1, name: "Checklist de Integração Documentada", kri: "100% dos novos corretores com checklist completo", kpi: "Tempo até primeira captação independente" },
    // Desenvolvimento e Capacitação (KP index 2)
    { kpIdx: 2, name: "Calendário Mensal de Treinamentos Técnicos", kri: "% de corretores com ao menos 1 treinamento/mês", kpi: "Nota média nas avaliações pós-treinamento" },
    { kpIdx: 2, name: "Certificação Interna de Corretores", kri: "% de corretores certificados no nível básico RE/MAX", kpi: "Número de corretores avançando para nível seguinte" },
    { kpIdx: 2, name: "Biblioteca de Conteúdo de Aprendizado", kri: "Plataforma com ao menos 20 módulos disponíveis", kpi: "Taxa de conclusão de módulos por corretor" },
    { kpIdx: 2, name: "Coaching Individual Mensal", kri: "100% dos corretores com coaching registrado/mês", kpi: "Evolução de metas individuais entre sessões" },
    // Engajamento e Retenção (KP index 3)
    { kpIdx: 3, name: "Pesquisa de Satisfação Trimestral", kri: "NPS interno acima de 50", kpi: "Taxa de resposta à pesquisa" },
    { kpIdx: 3, name: "Programa de Reconhecimento e Premiação", kri: "100% dos top performers reconhecidos mensalmente", kpi: "Taxa de rotatividade de corretores" },
    { kpIdx: 3, name: "Reunião Semanal de Equipe (Alinhamento)", kri: "% de corretores participando das reuniões semanais", kpi: "Agenda de comprometimentos cumpridos semana a semana" },
    { kpIdx: 3, name: "Plano de Carreira Individual Documentado", kri: "% de corretores com plano de carreira definido", kpi: "% de metas individuais atingidas no semestre" },
    // Performance e Avaliação (KP index 4)
    { kpIdx: 4, name: "Dashboard Individual de Performance", kri: "100% dos corretores com acesso ao próprio dashboard", kpi: "Frequência de atualização de indicadores pelo corretor" },
    { kpIdx: 4, name: "Avaliação de Performance Mensal", kri: "100% dos corretores avaliados mensalmente", kpi: "Melhoria média de desempenho mês a mês" },
    { kpIdx: 4, name: "Ranking Interno Público Semanal", kri: "Ranking atualizado e divulgado toda segunda-feira", kpi: "% de corretores no quartil superior nos últimos 3 meses" },
    // Cultura e Liderança (KP index 5)
    { kpIdx: 5, name: "Programa de Desenvolvimento de Liderança", kri: "% de gestores com pelo menos 1 liderado formado internamente", kpi: "Avaliação 360 de líderes" },
    { kpIdx: 5, name: "Ritual Semanal de Cultura (Stand-up)", kri: "% de participação no stand-up semanal de cultura", kpi: "Percepção de alinhamento de valores na equipe" },
    { kpIdx: 5, name: "Documentação dos Valores e Rituais RE/MAX", kri: "Manual de cultura atualizado e distribuído", kpi: "Reconhecimento de valores em reuniões (frequência)" },
  ];

  for (const ini of pessoasInitiatives) {
    const kp = pKPs[ini.kpIdx];
    if (!kp) continue;
    await db.insert(strategicInitiativesTable).values({
      dimensionId: dimPessoas.id,
      keyProcessId: kp.id,
      name: ini.name,
      kri: ini.kri,
      kpi: ini.kpi,
      description: `Iniciativa estratégica: ${ini.name}`,
      active: true,
    }).onConflictDoNothing();
  }

  // Real Estate Strategic Initiatives
  const reInitiatives = [
    // Captação de Imóveis (KP index 0)
    { kpIdx: 0, name: "Meta de Captação Semanal por Corretor", kri: "Número de captações novas por semana por corretor", kpi: "% de captações exclusivas em relação ao total" },
    { kpIdx: 0, name: "Rota de Captação por Bairro", kri: "Cobertura de 100% dos bairros prioritários por mês", kpi: "Taxa de conversão de prospecção → captação" },
    { kpIdx: 0, name: "Carteira de Proprietários Ativa", kri: "Número de proprietários em relacionamento ativo", kpi: "Tempo médio do ciclo proprietário → contrato assinado" },
    { kpIdx: 0, name: "Captação por Indicação de Clientes", kri: "% do total de captações originadas por indicação", kpi: "Custo por captação via indicação vs. prospecção ativa" },
    { kpIdx: 0, name: "Avaliação Online e Precificação Rápida", kri: "Tempo médio entre solicitação e entrega de avaliação (horas)", kpi: "% de avaliações convertidas em contrato de captação" },
    // Qualificação de Clientes (KP index 1)
    { kpIdx: 1, name: "Funil de Qualificação de Leads Documentado", kri: "% de leads qualificados antes de visita", kpi: "Taxa de conversão lead qualificado → proposta" },
    { kpIdx: 1, name: "Script de Qualificação por Whatsapp e Telefone", kri: "% de corretores usando o script documentado", kpi: "Tempo médio de qualificação por lead (minutos)" },
    { kpIdx: 1, name: "CRM Atualizado e Segmentado", kri: "% de leads no CRM com perfil completo", kpi: "Taxa de reativação de leads antigos" },
    { kpIdx: 1, name: "Reunião de Alinhamento com Comprador", kri: "100% dos compradores com reunião de alinhamento antes de visitas", kpi: "Número de visitas até proposta (médio)" },
    // Apresentação e Visitas (KP index 2)
    { kpIdx: 2, name: "Roteiro de Apresentação de Imóvel", kri: "% de visitas com roteiro documentado utilizado", kpi: "Taxa de conversão visita → proposta" },
    { kpIdx: 2, name: "Tour Virtual para Pré-qualificação", kri: "% de imóveis da carteira com tour virtual ativo", kpi: "Redução de visitas físicas improdutivas" },
    { kpIdx: 2, name: "Feedback Sistemático após Cada Visita", kri: "100% das visitas com feedback registrado em até 24h", kpi: "NPS dos compradores após visita" },
    { kpIdx: 2, name: "Agenda de Visitas Otimizada", kri: "% de visitas agendadas com menos de 48h de antecedência", kpi: "Número de visitas por corretor por semana" },
    // Negociação e Fechamento (KP index 3)
    { kpIdx: 3, name: "Playbook de Negociação Documentado", kri: "% de negociações seguindo o playbook", kpi: "Taxa de fechamento (propostas → contratos assinados)" },
    { kpIdx: 3, name: "Acompanhamento de Proposta em Aberto", kri: "Nenhuma proposta sem seguimento por mais de 48h", kpi: "Tempo médio ciclo proposta → contrato" },
    { kpIdx: 3, name: "Treinamento Mensal de Técnicas de Fechamento", kri: "% de corretores participando do treinamento mensal", kpi: "Melhoria na taxa de fechamento individual mês a mês" },
    { kpIdx: 3, name: "Reunião de Suporte ao Fechamento", kri: "100% de propostas acima de X reais revisadas com gestor", kpi: "% de negociações travadas resolvidas na reunião de suporte" },
    // Pós-venda e Relacionamento (KP index 4)
    { kpIdx: 4, name: "Protocolo de Pós-venda Estruturado", kri: "100% dos clientes com contato de pós-venda em até 7 dias", kpi: "NPS pós-transação" },
    { kpIdx: 4, name: "Programa de Indicação de Clientes Satisfeitos", kri: "% do total de captações/vendas originadas por indicação de ex-clientes", kpi: "Custo de aquisição de cliente via indicação" },
    { kpIdx: 4, name: "Newsletter e Conteúdo para Base de Clientes", kri: "Envio mensal para 100% da base de ex-clientes", kpi: "Taxa de abertura e engajamento da newsletter" },
    // Marketing e Divulgação (KP index 5)
    { kpIdx: 5, name: "Calendário Editorial de Redes Sociais", kri: "Publicação de ao menos 3 posts por semana", kpi: "Crescimento de seguidores e engajamento mensal" },
    { kpIdx: 5, name: "Portais Imobiliários Atualizados", kri: "100% dos imóveis ativos nos principais portais", kpi: "Leads gerados por portal por mês" },
    { kpIdx: 5, name: "Google Meu Negócio Otimizado", kri: "Avaliação acima de 4.5 no Google com ao menos 50 avaliações", kpi: "Número de ações (cliques, ligações, rotas) mensais no GMN" },
    { kpIdx: 5, name: "Anúncios Patrocinados (Google/Meta Ads)", kri: "Custo por lead inferior a R$ 50", kpi: "ROI da campanha (negócios fechados / investimento)" },
    // Gestão de Carteira (KP index 6)
    { kpIdx: 6, name: "Revisão Mensal da Carteira Ativa", kri: "100% dos imóveis da carteira revisados mensalmente", kpi: "% de imóveis com mais de 90 dias sem proposta (estoque parado)" },
    { kpIdx: 6, name: "Estratégia de Reativação de Imóveis Parados", kri: "% de imóveis parados reativados após intervenção", kpi: "Tempo médio de imóvel em carteira até venda/locação" },
    { kpIdx: 6, name: "Segmentação por Perfil de Comprador", kri: "% de imóveis com perfil de comprador ideal documentado", kpi: "Taxa de match imóvel-comprador em visitas" },
    // Locação (KP index 7)
    { kpIdx: 7, name: "Carteira de Locação Ativa e Atualizada", kri: "Número de imóveis para locação com anúncio ativo", kpi: "Taxa de vacância da carteira de locação" },
    { kpIdx: 7, name: "Processo de Vistoria Documentado", kri: "100% das vistorias com laudo fotográfico registrado", kpi: "Reclamações de proprietário por vistoria incompleta" },
    { kpIdx: 7, name: "Gestão de Inadimplência de Locatários", kri: "Taxa de inadimplência abaixo de 3%", kpi: "Tempo médio de resolução de inadimplência" },
    { kpIdx: 7, name: "Renovação Proativa de Contratos", kri: "100% dos contratos com 90 dias ou menos com processo de renovação iniciado", kpi: "Taxa de renovação de contratos de locação" },
  ];

  for (const ini of reInitiatives) {
    const kp = rKPs[ini.kpIdx];
    if (!kp) continue;
    await db.insert(strategicInitiativesTable).values({
      dimensionId: dimRE.id,
      keyProcessId: kp.id,
      name: ini.name,
      kri: ini.kri,
      kpi: ini.kpi,
      description: `Iniciativa estratégica: ${ini.name}`,
      active: true,
    }).onConflictDoNothing();
  }

  console.log("Strategic initiatives seeded");
  console.log("Seed completed successfully!");
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
