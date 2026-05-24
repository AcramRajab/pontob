import { db } from "./index.js";
import { sql, notInArray, inArray } from "drizzle-orm";
import {
  franchisesTable,
  usersTable,
  dimensionsTable,
  keyProcessesTable,
  strategicInitiativesTable,
} from "./schema/index.js";
import bcrypt from "bcryptjs";
import { validateSeedData } from "./seed-validation.js";
import { USER_SEED_CONFIG, PERMANENTLY_DEACTIVATED_EMAILS } from "./seed-config.js";

const RESET = process.argv.includes("--reset");

const SEED_FRANCHISE_NAMES = ["RE/MAX Franquia Teste", "RE/MAX Capital", "RE/MAX Excellence"];
const SEED_USER_EMAILS = USER_SEED_CONFIG.map(u => u.email);

async function seed() {
  console.log(`Seeding database${RESET ? " (reset mode — tables will be cleared first)" : ""}...`);

  if (RESET) {
    console.log("Clearing catalog tables with cascade...");
    await db.execute(
      sql`TRUNCATE TABLE strategic_initiatives, key_processes, dimensions RESTART IDENTITY CASCADE`
    );
    await db.delete(usersTable).where(
      sql`email = ANY(${SEED_USER_EMAILS})`
    );
    await db.delete(franchisesTable).where(
      sql`name = ANY(${SEED_FRANCHISE_NAMES})`
    );
    console.log("Tables cleared.");
  }

  // ── Franchises ─────────────────────────────────────────────────────────────
  const franchiseData = [
    { name: "RE/MAX Franquia Teste", city: "Florianópolis", state: "SC", brokerOwnerName: "Carlos Mendes", active: true },
    { name: "RE/MAX Capital",        city: "Joinville",    state: "SC", brokerOwnerName: "Ana Souza",    active: true },
    { name: "RE/MAX Excellence",     city: "Blumenau",     state: "SC", brokerOwnerName: "Roberto Lima", active: true },
  ];

  for (const f of franchiseData) {
    await db
      .insert(franchisesTable)
      .values(f)
      .onConflictDoUpdate({
        target: franchisesTable.name,
        set: {
          city:            f.city,
          state:           f.state,
          brokerOwnerName: f.brokerOwnerName,
          active:          f.active,
        },
      });
  }

  const franchises = await db.select().from(franchisesTable).orderBy(franchisesTable.id);
  console.log("Franchises seeded:", franchises.length);

  // ── Users ───────────────────────────────────────────────────────────────────
  // Hash unique passwords only once.
  const uniquePasswords = [...new Set(USER_SEED_CONFIG.map(u => u.password))];
  const hashMap = new Map<string, string>();
  for (const pw of uniquePasswords) {
    hashMap.set(pw, await bcrypt.hash(pw, 10));
  }

  // Build the exact rows that will be written to the users table.
  const userData = USER_SEED_CONFIG.map(u => ({
    name:         u.name,
    email:        u.email,
    passwordHash: hashMap.get(u.password)!,
    role:         u.role,
    franchiseId:  u.franchiseName
      ? franchises.find(f => f.name === u.franchiseName)!.id
      : null,
    active:       u.active,
  }));

  // Validate against the actual insert rows — not a separate copy — so there
  // is no way for the validated data to diverge from what reaches the DB.
  validateSeedData(userData, PERMANENTLY_DEACTIVATED_EMAILS);

  for (const u of userData) {
    await db
      .insert(usersTable)
      .values(u)
      .onConflictDoUpdate({
        target: usersTable.email,
        set: {
          name:         u.name,
          passwordHash: u.passwordHash,
          role:         u.role,
          franchiseId:  u.franchiseId,
          active:       u.active,
        },
      });
  }
  console.log("Users seeded");

  // Guard: ensure permanently-deactivated placeholder accounts can never be
  // re-activated by a future seed run, regardless of what userData contains.
  await db
    .update(usersTable)
    .set({ active: false })
    .where(inArray(usersTable.email, PERMANENTLY_DEACTIVATED_EMAILS));
  console.log("Placeholder accounts enforced as inactive");

  // ── Dimensions ──────────────────────────────────────────────────────────────
  const dimensionData = [
    { name: "Pessoas",      description: "Desenvolvimento e gestão de equipes para maximizar o potencial humano da franquia", active: true },
    { name: "Real Estate",  description: "Processos de captação, venda, locação e pós-venda de imóveis",                    active: true },
  ];

  for (const d of dimensionData) {
    await db
      .insert(dimensionsTable)
      .values(d)
      .onConflictDoUpdate({
        target: dimensionsTable.name,
        set: {
          description: d.description,
          active:      d.active,
        },
      });
  }

  const dims = await db.select().from(dimensionsTable).orderBy(dimensionsTable.id);
  const dimPessoas = dims.find(d => d.name === "Pessoas")!;
  const dimRE      = dims.find(d => d.name === "Real Estate")!;

  // Deactivate any dimension no longer present in the seed data
  const seedDimNames = new Set(dimensionData.map(d => d.name));
  const activeDimIds = dims.filter(d => seedDimNames.has(d.name)).map(d => d.id);
  if (activeDimIds.length > 0) {
    await db.update(dimensionsTable).set({ active: false }).where(notInArray(dimensionsTable.id, activeDimIds));
  } else {
    await db.update(dimensionsTable).set({ active: false });
  }
  console.log("Dimensions seeded");

  // ── Key Processes ───────────────────────────────────────────────────────────
  type KPRow = { dimensionId: number; name: string; description: string; orderIndex: number };

  async function upsertKeyProcess(row: KPRow) {
    await db
      .insert(keyProcessesTable)
      .values(row)
      .onConflictDoUpdate({
        target: [keyProcessesTable.dimensionId, keyProcessesTable.name],
        set: {
          description: row.description,
          orderIndex:  row.orderIndex,
          active:      true,
        },
      });
  }

  const pessoasKPs: KPRow[] = [
    { dimensionId: dimPessoas.id, name: "Recrutamento e Seleção",       description: "Atração e seleção de talentos para a equipe",                   orderIndex: 1 },
    { dimensionId: dimPessoas.id, name: "Onboarding e Integração",      description: "Integração e capacitação inicial de novos membros",              orderIndex: 2 },
    { dimensionId: dimPessoas.id, name: "Desenvolvimento e Capacitação",description: "Formação contínua e desenvolvimento profissional",               orderIndex: 3 },
    { dimensionId: dimPessoas.id, name: "Engajamento e Retenção",       description: "Manutenção do comprometimento e satisfação da equipe",           orderIndex: 4 },
    { dimensionId: dimPessoas.id, name: "Performance e Avaliação",      description: "Acompanhamento e avaliação de desempenho",                       orderIndex: 5 },
    { dimensionId: dimPessoas.id, name: "Cultura e Liderança",          description: "Desenvolvimento da cultura organizacional e liderança",           orderIndex: 6 },
  ];

  const reKPs: KPRow[] = [
    { dimensionId: dimRE.id, name: "Captação de Imóveis",          description: "Estratégias e processos de captação de imóveis",              orderIndex: 1 },
    { dimensionId: dimRE.id, name: "Qualificação de Clientes",     description: "Identificação e qualificação de compradores e locatários",   orderIndex: 2 },
    { dimensionId: dimRE.id, name: "Apresentação e Visitas",       description: "Gestão de apresentações e visitas de imóveis",               orderIndex: 3 },
    { dimensionId: dimRE.id, name: "Negociação e Fechamento",      description: "Processos de negociação e fechamento de negócios",           orderIndex: 4 },
    { dimensionId: dimRE.id, name: "Pós-venda e Relacionamento",   description: "Acompanhamento pós-transação e fidelização",                 orderIndex: 5 },
    { dimensionId: dimRE.id, name: "Marketing e Divulgação",       description: "Estratégias de marketing e presença digital",                orderIndex: 6 },
    { dimensionId: dimRE.id, name: "Gestão de Carteira",           description: "Gestão do portfólio de imóveis e clientes",                  orderIndex: 7 },
    { dimensionId: dimRE.id, name: "Locação",                      description: "Processos de locação e gestão de aluguéis",                  orderIndex: 8 },
  ];

  for (const row of [...pessoasKPs, ...reKPs]) {
    await upsertKeyProcess(row);
  }

  const allKPs = await db
    .select()
    .from(keyProcessesTable)
    .orderBy(keyProcessesTable.dimensionId, keyProcessesTable.orderIndex);

  // Build a name-keyed map so initiative lookups are always stable regardless
  // of what stale rows may exist in the DB alongside the seeded ones.
  const kpByDimAndName = new Map<string, typeof allKPs[0]>();
  for (const kp of allKPs) {
    kpByDimAndName.set(`${kp.dimensionId}:${kp.name}`, kp);
  }

  // Resolve seeded key processes by name — never by position in the DB result set
  const pKPs = pessoasKPs.map(r => kpByDimAndName.get(`${dimPessoas.id}:${r.name}`)!);
  const rKPs = reKPs.map(r => kpByDimAndName.get(`${dimRE.id}:${r.name}`)!);

  // Deactivate any key process no longer present in the seed data
  const seedKPSet = new Set([...pessoasKPs, ...reKPs].map(kp => `${kp.dimensionId}:${kp.name}`));
  const activeKPIds = allKPs.filter(kp => seedKPSet.has(`${kp.dimensionId}:${kp.name}`)).map(kp => kp.id);
  if (activeKPIds.length > 0) {
    await db.update(keyProcessesTable).set({ active: false }).where(notInArray(keyProcessesTable.id, activeKPIds));
  } else {
    await db.update(keyProcessesTable).set({ active: false });
  }
  console.log("Key processes seeded:", allKPs.length);

  // ── Strategic Initiatives ───────────────────────────────────────────────────
  type InitRow = { dimensionId: number; keyProcessId: number; name: string; kri: string; kpi: string; description: string; active: boolean };

  async function upsertInitiative(row: InitRow) {
    await db
      .insert(strategicInitiativesTable)
      .values(row)
      .onConflictDoUpdate({
        target: [strategicInitiativesTable.keyProcessId, strategicInitiativesTable.name],
        set: {
          dimensionId:  row.dimensionId,
          kri:          row.kri,
          kpi:          row.kpi,
          description:  row.description,
          active:       true,
        },
      });
  }

  // Pessoas initiatives: [kpIndex, name, kri, kpi]
  const pessoasInits: [number, string, string, string][] = [
    // Recrutamento e Seleção (0)
    [0, "Campanha de Atração de Corretores",             "Número de candidatos qualificados por mês",                      "Taxa de conversão candidato → corretor ativo"],
    [0, "Parceria com Universidades e Cursos de Imóveis","Novos corretores recrutados via parceria",                        "Custo por recrutamento"],
    [0, "Programa de Indicação Interna",                 "% de contratações via indicação de corretores ativos",            "Taxa de permanência após 6 meses (indicados)"],
    [0, "Processo Seletivo Estruturado",                 "Tempo médio de ciclo de seleção (dias)",                          "Satisfação dos candidatos com o processo"],
    [0, "Banco de Talentos Ativo",                       "Banco com ao menos 30 candidatos pré-qualificados",               "Tempo de resposta a vagas urgentes"],
    // Onboarding e Integração (1)
    [1, "Trilha de Onboarding Estruturada",              "% de novos corretores completando onboarding em 30 dias",         "Nota de satisfação do corretor no onboarding (NPS)"],
    [1, "Mentoria de 90 Dias para Novos Corretores",     "Primeiro negócio fechado em até 60 dias",                         "Retenção após 90 dias"],
    [1, "Imersão na Cultura RE/MAX",                     "% de corretores que participaram da imersão",                     "Score de alinhamento cultural (pesquisa interna)"],
    [1, "Checklist de Integração Documentada",           "100% dos novos corretores com checklist completo",                "Tempo até primeira captação independente"],
    // Desenvolvimento e Capacitação (2)
    [2, "Calendário Mensal de Treinamentos Técnicos",    "% de corretores com ao menos 1 treinamento/mês",                 "Nota média nas avaliações pós-treinamento"],
    [2, "Certificação Interna de Corretores",            "% de corretores certificados no nível básico RE/MAX",             "Número de corretores avançando para nível seguinte"],
    [2, "Biblioteca de Conteúdo de Aprendizado",         "Plataforma com ao menos 20 módulos disponíveis",                  "Taxa de conclusão de módulos por corretor"],
    [2, "Coaching Individual Mensal",                    "100% dos corretores com coaching registrado/mês",                 "Evolução de metas individuais entre sessões"],
    // Engajamento e Retenção (3)
    [3, "Pesquisa de Satisfação Trimestral",             "NPS interno acima de 50",                                         "Taxa de resposta à pesquisa"],
    [3, "Programa de Reconhecimento e Premiação",        "100% dos top performers reconhecidos mensalmente",                "Taxa de rotatividade de corretores"],
    [3, "Reunião Semanal de Equipe",                     "% de corretores participando das reuniões semanais",              "Agenda de comprometimentos cumpridos semana a semana"],
    [3, "Plano de Carreira Individual Documentado",      "% de corretores com plano de carreira definido",                  "% de metas individuais atingidas no semestre"],
    // Performance e Avaliação (4)
    [4, "Dashboard Individual de Performance",           "100% dos corretores com acesso ao próprio dashboard",             "Frequência de atualização de indicadores pelo corretor"],
    [4, "Avaliação de Performance Mensal",               "100% dos corretores avaliados mensalmente",                       "Melhoria média de desempenho mês a mês"],
    [4, "Ranking Interno Público Semanal",               "Ranking atualizado e divulgado toda segunda-feira",               "% de corretores no quartil superior nos últimos 3 meses"],
    // Cultura e Liderança (5)
    [5, "Programa de Desenvolvimento de Liderança",      "% de gestores com pelo menos 1 liderado formado internamente",   "Avaliação 360 de líderes"],
    [5, "Ritual Semanal de Cultura (Stand-up)",          "% de participação no stand-up semanal de cultura",               "Percepção de alinhamento de valores na equipe"],
    [5, "Documentação dos Valores e Rituais RE/MAX",     "Manual de cultura atualizado e distribuído",                      "Reconhecimento de valores em reuniões (frequência)"],
  ];

  for (const [kpIdx, name, kri, kpi] of pessoasInits) {
    const kp = pKPs[kpIdx];
    if (!kp) continue;
    await upsertInitiative({
      dimensionId:  dimPessoas.id,
      keyProcessId: kp.id,
      name, kri, kpi,
      description: `Iniciativa estratégica: ${name}`,
      active: true,
    });
  }

  // Real Estate initiatives: [kpIndex, name, kri, kpi]
  const reInits: [number, string, string, string][] = [
    // Captação de Imóveis (0)
    [0, "Meta de Captação Semanal por Corretor",     "Número de captações novas por semana por corretor",                "% de captações exclusivas em relação ao total"],
    [0, "Rota de Captação por Bairro",               "Cobertura de 100% dos bairros prioritários por mês",              "Taxa de conversão de prospecção → captação"],
    [0, "Carteira de Proprietários Ativa",           "Número de proprietários em relacionamento ativo",                  "Tempo médio do ciclo proprietário → contrato assinado"],
    [0, "Captação por Indicação de Clientes",        "% do total de captações originadas por indicação",                 "Custo por captação via indicação vs. prospecção ativa"],
    [0, "Avaliação Online e Precificação Rápida",    "Tempo médio entre solicitação e entrega de avaliação (horas)",     "% de avaliações convertidas em contrato de captação"],
    // Qualificação de Clientes (1)
    [1, "Funil de Qualificação de Leads Documentado","% de leads qualificados antes de visita",                          "Taxa de conversão lead qualificado → proposta"],
    [1, "Script de Qualificação por WhatsApp e Telefone","% de corretores usando o script documentado",                  "Tempo médio de qualificação por lead (minutos)"],
    [1, "CRM Atualizado e Segmentado",               "% de leads no CRM com perfil completo",                            "Taxa de reativação de leads antigos"],
    [1, "Reunião de Alinhamento com Comprador",      "100% dos compradores com reunião de alinhamento antes de visitas", "Número de visitas até proposta (médio)"],
    // Apresentação e Visitas (2)
    [2, "Roteiro de Apresentação de Imóvel",         "% de visitas com roteiro documentado utilizado",                   "Taxa de conversão visita → proposta"],
    [2, "Tour Virtual para Pré-qualificação",        "% de imóveis da carteira com tour virtual ativo",                  "Redução de visitas físicas improdutivas"],
    [2, "Feedback Sistemático após Cada Visita",     "100% das visitas com feedback registrado em até 24h",              "NPS dos compradores após visita"],
    [2, "Agenda de Visitas Otimizada",               "% de visitas agendadas com menos de 48h de antecedência",          "Número de visitas por corretor por semana"],
    // Negociação e Fechamento (3)
    [3, "Playbook de Negociação Documentado",        "% de negociações seguindo o playbook",                             "Taxa de fechamento (propostas → contratos assinados)"],
    [3, "Acompanhamento de Proposta em Aberto",      "Nenhuma proposta sem seguimento por mais de 48h",                  "Tempo médio ciclo proposta → contrato"],
    [3, "Treinamento Mensal de Técnicas de Fechamento","% de corretores participando do treinamento mensal",             "Melhoria na taxa de fechamento individual mês a mês"],
    [3, "Reunião de Suporte ao Fechamento",          "100% de propostas acima de valor definido revisadas com gestor",   "% de negociações travadas resolvidas na reunião de suporte"],
    // Pós-venda e Relacionamento (4)
    [4, "Protocolo de Pós-venda Estruturado",        "100% dos clientes com contato de pós-venda em até 7 dias",         "NPS pós-transação"],
    [4, "Programa de Indicação de Clientes Satisfeitos","% do total de captações/vendas originadas por indicação de ex-clientes","Custo de aquisição de cliente via indicação"],
    [4, "Newsletter e Conteúdo para Base de Clientes","Envio mensal para 100% da base de ex-clientes",                  "Taxa de abertura e engajamento da newsletter"],
    // Marketing e Divulgação (5)
    [5, "Calendário Editorial de Redes Sociais",     "Publicação de ao menos 3 posts por semana",                        "Crescimento de seguidores e engajamento mensal"],
    [5, "Portais Imobiliários Atualizados",          "100% dos imóveis ativos nos principais portais",                   "Leads gerados por portal por mês"],
    [5, "Google Meu Negócio Otimizado",              "Avaliação acima de 4.5 no Google com ao menos 50 avaliações",      "Número de ações mensais no GMN"],
    [5, "Anúncios Patrocinados (Google/Meta Ads)",   "Custo por lead inferior a R$ 50",                                  "ROI da campanha (negócios fechados / investimento)"],
    // Gestão de Carteira (6)
    [6, "Revisão Mensal da Carteira Ativa",          "100% dos imóveis da carteira revisados mensalmente",               "% de imóveis com mais de 90 dias sem proposta"],
    [6, "Estratégia de Reativação de Imóveis Parados","% de imóveis parados reativados após intervenção",               "Tempo médio de imóvel em carteira até venda/locação"],
    [6, "Segmentação por Perfil de Comprador",       "% de imóveis com perfil de comprador ideal documentado",           "Taxa de match imóvel-comprador em visitas"],
    // Locação (7)
    [7, "Carteira de Locação Ativa e Atualizada",    "Número de imóveis para locação com anúncio ativo",                 "Taxa de vacância da carteira de locação"],
    [7, "Processo de Vistoria Documentado",          "100% das vistorias com laudo fotográfico registrado",              "Reclamações de proprietário por vistoria incompleta"],
    [7, "Gestão de Inadimplência de Locatários",     "Taxa de inadimplência abaixo de 3%",                               "Tempo médio de resolução de inadimplência"],
    [7, "Renovação Proativa de Contratos",           "100% dos contratos com 90 dias ou menos com renovação iniciada",   "Taxa de renovação de contratos de locação"],
  ];

  for (const [kpIdx, name, kri, kpi] of reInits) {
    const kp = rKPs[kpIdx];
    if (!kp) continue;
    await upsertInitiative({
      dimensionId:  dimRE.id,
      keyProcessId: kp.id,
      name, kri, kpi,
      description: `Iniciativa estratégica: ${name}`,
      active: true,
    });
  }

  const allInits = await db.select().from(strategicInitiativesTable);

  // Deactivate any initiative no longer present in the seed data
  const seedInitSet = new Set([
    ...pessoasInits.map(([kpIdx, name]) => `${pKPs[kpIdx]?.id}:${name}`),
    ...reInits.map(([kpIdx, name]) => `${rKPs[kpIdx]?.id}:${name}`),
  ]);
  const activeInitIds = allInits.filter(i => seedInitSet.has(`${i.keyProcessId}:${i.name}`)).map(i => i.id);
  if (activeInitIds.length > 0) {
    await db.update(strategicInitiativesTable).set({ active: false }).where(notInArray(strategicInitiativesTable.id, activeInitIds));
  } else {
    await db.update(strategicInitiativesTable).set({ active: false });
  }
  console.log("Strategic initiatives seeded:", allInits.length);
  console.log("\nSeed completed successfully!");
  console.log("\nTest credentials:");
  console.log("  acramrajab@remax.com.br         / admin123       (master_admin)");
  console.log("  claudiaroncolatto@remax.com.br  / remax2026      (staff_regional)");
  console.log("  marinasandri@remax.com.br       / remax2026      (staff_regional)");
  console.log("  franqueado@remaxsc.com.br       / franqueado123  (franqueado)");
  console.log("  responsavel@remaxsc.com.br      / responsavel123 (responsavel_interno)");
  console.log("  regional@remaxsc.com.br         (staff_regional, DEACTIVATED — legacy account)");
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Seed error:", err);
    process.exit(1);
  });
