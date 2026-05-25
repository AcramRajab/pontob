import { useState } from "react";
import {
  Bot, Users, FileText, PhoneCall, TrendingUp, Lightbulb, Star,
  Mail, Globe, Megaphone, Zap, BarChart2, MessageCircle, ArrowUpRight,
  BrainCircuit, ChevronDown, ChevronUp, Briefcase, CalendarCheck,
  PenLine, Search, UserCheck, Target, Sparkles,
} from "lucide-react";
import { useAiAssistant } from "@/components/ai-assistant-context";
import { cn } from "@/lib/utils";

/* ───────────────────────────── data ──────────────────────────────────── */

interface Agent {
  id: string;
  name: string;
  description: string;
  badge: string;
  accent: string;
  icon: React.ElementType;
  url?: string;
  internal?: boolean;
  href?: string;
}

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  tagline: string;
  description: string;
  whenToUse: string[];
  dailyScenarios: { title: string; steps: string[] }[];
  agents: Agent[];
}

const CATEGORIES: Category[] = [
  {
    id: "estrategia",
    label: "Estratégia & Coaching",
    icon: BrainCircuit,
    color: "#6366F1",
    bgColor: "#6366F115",
    tagline: "Seu conselheiro estratégico disponível 24h",
    description:
      "Agentes especializados em planejamento, governança e alta performance de franquias RE/MAX. Use para tomar decisões difíceis, desbloquear execução e evoluir sua gestão.",
    whenToUse: [
      "Quando travar em uma decisão estratégica importante",
      "Na revisão mensal ou trimestral do seu plano",
      "Antes de conversas difíceis com a equipe",
      "Quando os resultados não correspondem ao esperado",
    ],
    dailyScenarios: [
      {
        title: "Check-in mensal travado",
        steps: [
          "Acesse o Coaching IA (integrado à plataforma)",
          "Cole seus indicadores do mês e pergunte: 'Por que meus check-ins ficaram abaixo do esperado?'",
          "Peça um plano de ação para os 30 dias seguintes",
        ],
      },
      {
        title: "Decisão estratégica importante",
        steps: [
          "Abra o Conselho VIP Franqueados no ChatGPT",
          "Descreva o contexto: mercado, equipe, recursos disponíveis",
          "Peça análise de riscos e recomendação priorizada",
        ],
      },
    ],
    agents: [
      {
        id: "interno",
        name: "Coaching IA Ponto B",
        description:
          "Análise dos seus dados reais — metas, check-ins, KPIs — e orientação estratégica personalizada para sua franquia.",
        badge: "Integrado",
        accent: "#6366F1",
        icon: BrainCircuit,
        internal: true,
        href: "/coaching",
      },
      {
        id: "templum",
        name: "Conselho Templum Evolutto",
        description:
          "Conselheiro estratégico para governança, planejamento e evolução de franquias.",
        badge: "ChatGPT",
        accent: "#F97316",
        icon: Lightbulb,
        url: "https://chatgpt.com/g/g-68b4aaa283cc8191a267bd86646246ac-conselho-templum-evolutto",
      },
      {
        id: "vip",
        name: "Conselho VIP Franqueados",
        description:
          "Orientação exclusiva para franqueados RE/MAX em decisões estratégicas, gestão e crescimento.",
        badge: "ChatGPT",
        accent: "#EC4899",
        icon: Star,
        url: "https://chatgpt.com/g/g-68bb3895e7f481918813f5a663bebf2f-conselho-vip-franqueados-re-max",
      },
      {
        id: "especialista",
        name: "Especialista Alpha",
        description:
          "Alta performance em excelência comercial, gestão de equipes e resultados acima da média.",
        badge: "ChatGPT",
        accent: "#4F46E5",
        icon: Zap,
        url: "https://chatgpt.com/g/g-68274691b2b88191930ace957a50b146-especialista-alpha",
      },
    ],
  },
  {
    id: "recrutamento",
    label: "Recrutamento & Pessoas",
    icon: UserCheck,
    color: "#10B981",
    bgColor: "#10B98115",
    tagline: "Encontre e selecione os melhores corretores mais rápido",
    description:
      "Ferramentas de IA para atração, triagem e seleção de candidatos. Reduza o tempo de contratação, melhore a qualidade dos perfis selecionados e automatize a comunicação com candidatos.",
    whenToUse: [
      "Quando tiver currículos acumulados para analisar",
      "Para criar anúncios de vaga mais atrativos",
      "Na preparação de entrevistas com candidatos",
      "Para padronizar o processo de seleção da equipe",
    ],
    dailyScenarios: [
      {
        title: "Triagem de currículos em massa",
        steps: [
          "Acesse o Analisador de Currículos no ChatGPT",
          "Cole o texto do currículo e o perfil ideal que você busca",
          "Receba uma pontuação (0–100) com pontos fortes, fracos e recomendação",
          "Repita para cada candidato — o agente mantém o contexto",
        ],
      },
      {
        title: "Secretária IA para agendamentos",
        steps: [
          "Vá em Recrutamento → Secretária IA na plataforma",
          "Descreva o candidato e o horário disponível",
          "Peça um e-mail de convite para entrevista já formatado",
          "Copie e envie diretamente pelo seu e-mail",
        ],
      },
    ],
    agents: [
      {
        id: "curriculos",
        name: "Analisador de Currículos",
        description:
          "Triagem inteligente de candidatos, avaliação de competências e pontuação de perfis para RE/MAX.",
        badge: "ChatGPT",
        accent: "#10B981",
        icon: FileText,
        url: "https://chatgpt.com/g/g-6831b14ff4f08191a9f40b57c44befc4-analisador-de-curriculos-aptitude-r",
      },
      {
        id: "secretaria",
        name: "Secretária IA",
        description:
          "Rascunha e-mails de recrutamento, agendamentos e comunicações com candidatos automaticamente.",
        badge: "Integrado",
        accent: "#14B8A6",
        icon: CalendarCheck,
        internal: false,
        href: "/recrutamento/secretaria",
      },
    ],
  },
  {
    id: "prospeccao",
    label: "Prospecção & Vendas",
    icon: Target,
    color: "#F59E0B",
    bgColor: "#F59E0B15",
    tagline: "Da captação ao fechamento com metodologia e IA",
    description:
      "Agentes SDR treinados para o mercado imobiliário RE/MAX: captação de corretores, qualificação de leads com BANT e técnicas de vendas consultivas com SPIN Selling.",
    whenToUse: [
      "Para montar scripts de abordagem com novos corretores",
      "Na qualificação de prospects antes de reuniões",
      "Para treinar argumentos de vendas com a equipe",
      "Quando precisar de sequências de follow-up personalizadas",
    ],
    dailyScenarios: [
      {
        title: "Script SDR para captação de corretor",
        steps: [
          "Abra o Agente Brokers & SDR no ChatGPT",
          "Informe: perfil do corretor-alvo, região e seu diferencial",
          "Peça um roteiro de abordagem para WhatsApp/ligação",
          "Adapte com o nome do candidato e use direto",
        ],
      },
      {
        title: "Qualificação BANT antes de uma reunião",
        steps: [
          "Abra o Construtor BANT & Script",
          "Descreva o lead: cargo, empresa, contexto atual",
          "Receba perguntas de qualificação para Budget, Authority, Need e Timeline",
          "Use na reunião para decidir se vale avançar o processo",
        ],
      },
    ],
    agents: [
      {
        id: "brokers",
        name: "Agente Brokers & SDR",
        description:
          "Prospecção ativa, captação de corretores e estratégias SDR para o mercado imobiliário RE/MAX.",
        badge: "ChatGPT",
        accent: "#6366F1",
        icon: Users,
        url: "https://chatgpt.com/g/g-683078cf7e6c8191ba55a2ea40c0e45e-agente-brokers-sdr-re-max-aptitude-r",
      },
      {
        id: "bant",
        name: "Construtor BANT & Script",
        description:
          "Scripts de pré-vendas baseados na metodologia BANT para qualificação eficiente de leads.",
        badge: "ChatGPT",
        accent: "#F59E0B",
        icon: PhoneCall,
        url: "https://chatgpt.com/g/g-68307072b6fc8191bbdd83d1c338f7fa-construtor-bant-script-de-pre-vendas-aptitude-r",
      },
      {
        id: "spin",
        name: "Construtor SPIN Selling",
        description:
          "Abordagens de vendas consultivas com metodologia SPIN para aumentar conversões.",
        badge: "ChatGPT",
        accent: "#8B5CF6",
        icon: TrendingUp,
        url: "https://chatgpt.com/g/g-6830c25fdf3081918c35b78a6a5a87db-construtor-spin-selling-vendas-aptitude-r",
      },
      {
        id: "nutricao",
        name: "Nutrição de Leads por E-mail",
        description:
          "Sequências de e-mail estratégicas para nutrir leads ao longo do funil e aumentar conversões.",
        badge: "ChatGPT",
        accent: "#14B8A6",
        icon: Mail,
        url: "https://chatgpt.com/g/g-67c5970a28588191b56f153a9f761d52-nutricao-de-leads-por-e-mail",
      },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & Conteúdo",
    icon: Megaphone,
    color: "#DB2777",
    bgColor: "#DB277715",
    tagline: "Posicionamento, atração e conteúdo que gera leads",
    description:
      "Crie estratégias de posicionamento de marca, conteúdo de atração e campanhas digitais. Ideal para franqueados que querem crescer organicamente e se destacar no mercado local.",
    whenToUse: [
      "Para criar conteúdo semanal para redes sociais",
      "Na elaboração de campanhas de captação de clientes",
      "Quando precisar diferenciar sua franquia no mercado local",
      "Para planejar um lançamento ou ação de marketing",
    ],
    dailyScenarios: [
      {
        title: "Pauta de conteúdo mensal",
        steps: [
          "Abra Posicionamento & Conteúdo no ChatGPT",
          "Informe: público-alvo, diferenciais da sua franquia e objetivos do mês",
          "Peça uma pauta com 12 posts (3/semana) com título, formato e legenda",
          "Copie para sua ferramenta de agendamento (ex: mLabs, Buffer)",
        ],
      },
      {
        title: "Post de captação de corretores",
        steps: [
          "Abra o agente de Posicionamento & Conteúdo",
          "Peça um post de LinkedIn para atrair corretores autônomos",
          "Forneça: diferenciais da sua franquia, bairros de atuação, cultura",
          "Receba texto pronto para publicar com CTA forte",
        ],
      },
    ],
    agents: [
      {
        id: "posicionamento",
        name: "Posicionamento & Conteúdo",
        description:
          "Estratégias de posicionamento de marca e conteúdo de atração para conquistar mais clientes.",
        badge: "ChatGPT",
        accent: "#DB2777",
        icon: Megaphone,
        url: "https://chatgpt.com/g/g-6829e22b89308191919f30a81b283ffd-do-posicionamento-ao-conteudo-de-atracao-alpha",
      },
      {
        id: "browser",
        name: "Web Browser",
        description:
          "Pesquisa na internet em tempo real para buscar dados de mercado, concorrentes e referências.",
        badge: "ChatGPT",
        accent: "#64748B",
        icon: Globe,
        url: "https://chatgpt.com/g/g-3w1rEXGE0-web-browser",
      },
    ],
  },
  {
    id: "analise",
    label: "Análise & Desempenho",
    icon: BarChart2,
    color: "#0EA5E9",
    bgColor: "#0EA5E915",
    tagline: "Entenda seus números e aja antes que seja tarde",
    description:
      "Analise métricas de vendas, identifique gargalos no funil e receba recomendações de ação. Use em conjunto com os dados do seu dashboard Ponto B para diagnósticos precisos.",
    whenToUse: [
      "Quando os KPIs estiverem abaixo da meta sem causa clara",
      "Na preparação da reunião de resultados da equipe",
      "Para identificar qual etapa do funil está travando",
      "Na análise de desempenho individual de corretores",
    ],
    dailyScenarios: [
      {
        title: "Diagnóstico rápido dos KPIs",
        steps: [
          "Exporte seus indicadores do dashboard Ponto B",
          "Cole no Analizador de Vendas 2.0 no ChatGPT",
          "Pergunte: 'Quais são os 3 maiores gargalos e o que devo priorizar?'",
          "Receba análise priorizada com ações práticas",
        ],
      },
    ],
    agents: [
      {
        id: "vendas",
        name: "Analizador de Vendas 2.0",
        description:
          "Análise de métricas de vendas, identificação de gargalos e ações para melhorar o desempenho.",
        badge: "ChatGPT",
        accent: "#0EA5E9",
        icon: BarChart2,
        url: "https://chatgpt.com/g/g-682276bc44f48191a79a8fec9a96eabb-analizador-de-vendas-2-0",
      },
    ],
  },
];

/* ───────────────────────────── components ────────────────────────────── */

function AgentCard({ agent, openAssistant }: { agent: Agent; openAssistant: () => void }) {
  const Icon = agent.icon;
  const isSecretaria = agent.href === "/recrutamento/secretaria";

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background hover:shadow-sm transition-all"
      style={{ borderLeft: `3px solid ${agent.accent}` }}
    >
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: agent.accent + "18" }}
      >
        <Icon className="h-4 w-4" style={{ color: agent.accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-foreground leading-tight">{agent.name}</p>
          <span className="text-[9px] font-semibold tracking-wide uppercase border border-border rounded-full px-2 py-0.5 text-muted-foreground shrink-0">
            {agent.badge}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>
      </div>
      <div className="shrink-0">
        {agent.internal ? (
          <button
            onClick={openAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-85"
            style={{ backgroundColor: agent.accent }}
          >
            <MessageCircle className="h-3 w-3" />
            Abrir
          </button>
        ) : isSecretaria ? (
          <a
            href={agent.href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-85"
            style={{ backgroundColor: agent.accent + "15", color: agent.accent }}
          >
            <ArrowUpRight className="h-3 w-3" />
            Abrir
          </a>
        ) : (
          <a
            href={agent.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-85"
            style={{ backgroundColor: agent.accent + "15", color: agent.accent }}
          >
            <ArrowUpRight className="h-3 w-3" />
            Abrir
          </a>
        )}
      </div>
    </div>
  );
}

function CategoryCard({ cat, openAssistant }: { cat: Category; openAssistant: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = cat.icon;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start gap-4">
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: cat.bgColor }}
          >
            <Icon className="h-5 w-5" style={{ color: cat.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground">{cat.label}</h2>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: cat.bgColor, color: cat.color }}
              >
                {cat.agents.length} {cat.agents.length === 1 ? "agente" : "agentes"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{cat.tagline}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{cat.description}</p>

        {/* Quando usar */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Quando usar</p>
          <ul className="space-y-1">
            {cat.whenToUse.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tutorial toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 border-t border-border text-xs font-semibold transition-colors hover:bg-muted/40"
        style={{ color: cat.color }}
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5" />
          Como usar no dia a dia — passo a passo
        </span>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Cenários */}
      {expanded && (
        <div className="px-5 pb-4 border-t border-border" style={{ backgroundColor: cat.bgColor }}>
          <div className="pt-4 grid gap-4 sm:grid-cols-2">
            {cat.dailyScenarios.map((scenario, si) => (
              <div key={si} className="bg-card border border-border rounded-xl p-4">
                <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span
                    className="h-5 w-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: cat.color }}
                  >
                    {si + 1}
                  </span>
                  {scenario.title}
                </p>
                <ol className="space-y-2">
                  {scenario.steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                      <span
                        className="shrink-0 h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center mt-0.5"
                        style={{ backgroundColor: cat.color + "20", color: cat.color }}
                      >
                        {idx + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agents */}
      <div className="px-5 pb-5 pt-4 border-t border-border space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Agentes disponíveis
        </p>
        {cat.agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} openAssistant={openAssistant} />
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────────── page ─────────────────────────────────── */

export default function Agents() {
  const { openAssistant } = useAiAssistant();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">
            Inteligência IA
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Central de Agentes IA</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-2xl leading-relaxed">
            Assistentes especializados para cada área do seu negócio. Clique em{" "}
            <span className="font-semibold text-foreground">Como usar no dia a dia</span> em cada categoria
            para ver exemplos práticos de como cada agente pode acelerar sua rotina.
          </p>
        </div>

        {/* Quick stat strip */}
        <div className="flex flex-wrap gap-3 mb-8">
          {[
            { icon: Bot, label: "Agentes disponíveis", value: "14" },
            { icon: Sparkles, label: "Com tutorial passo a passo", value: "5 categorias" },
            { icon: Search, label: "Pesquisa em tempo real", value: "Web Browser" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-4 py-2.5">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground leading-none">{stat.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-0.5">{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tip banner */}
        <div className="mb-8 flex items-start gap-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3.5">
          <PenLine className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
            <span className="font-semibold">Dica de uso:</span> Os agentes marcados como{" "}
            <span className="font-semibold">Integrado</span> rodam dentro da plataforma e têm acesso
            aos seus dados reais (metas, KPIs, check-ins). Os marcados como{" "}
            <span className="font-semibold">ChatGPT</span> abrem em nova aba — basta colar o contexto
            que você quer analisar.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-6">
          {CATEGORIES.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} openAssistant={openAssistant} />
          ))}
        </div>
      </div>
    </div>
  );
}
