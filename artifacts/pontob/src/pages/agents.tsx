import { ExternalLink, Bot, Users, FileText, PhoneCall, TrendingUp, Lightbulb, Star, Mail, Globe, Megaphone, Zap, BarChart2, MessageCircle, Home } from "lucide-react";
import { useAiAssistant } from "@/components/ai-assistant-context";

const AGENTS = [
  {
    id: "interno",
    name: "Assistente IA Ponto B",
    description: "Assistente interno integrado à plataforma. Tire dúvidas sobre metas, check-ins, indicadores e estratégias diretamente dentro do sistema.",
    tags: ["Metas", "Check-in", "KPIs", "Estratégia"],
    icon: Bot,
    gradient: "from-blue-500 to-blue-600",
    badgeColor: "bg-blue-100 text-blue-700",
    internal: true,
  },
  {
    id: "brokers",
    name: "Agente Brokers & SDR",
    description: "Especialista em prospecção ativa, captação de corretores e desenvolvimento de estratégias SDR para o mercado imobiliário RE/MAX.",
    tags: ["Prospecção", "Captação", "SDR", "Corretores"],
    icon: Users,
    gradient: "from-blue-700 to-blue-800",
    badgeColor: "bg-blue-100 text-blue-700",
    url: "https://chatgpt.com/g/g-683078cf7e6c8191ba55a2ea40c0e45e-agente-brokers-sdr-re-max-aptitude-r",
  },
  {
    id: "curriculos",
    name: "Analisador de Currículos",
    description: "Realiza triagem inteligente de candidatos, avalia competências e pontua currículos de acordo com o perfil ideal para franquias RE/MAX.",
    tags: ["RH", "Triagem", "Recrutamento", "Avaliação"],
    icon: FileText,
    gradient: "from-green-600 to-green-700",
    badgeColor: "bg-green-100 text-green-700",
    url: "https://chatgpt.com/g/g-6831b14ff4f08191a9f40b57c44befc4-analisador-de-curriculos-aptitude-r",
  },
  {
    id: "bant",
    name: "Construtor BANT & Script",
    description: "Cria scripts de pré-vendas baseados na metodologia BANT (Budget, Authority, Need, Timeline) para qualificação eficiente de leads.",
    tags: ["BANT", "Script", "Pré-vendas", "Qualificação"],
    icon: PhoneCall,
    gradient: "from-orange-500 to-orange-600",
    badgeColor: "bg-orange-100 text-orange-700",
    url: "https://chatgpt.com/g/g-68307072b6fc8191bbdd83d1c338f7fa-construtor-bant-script-de-pre-vendas-aptitude-r",
  },
  {
    id: "spin",
    name: "Construtor SPIN Selling",
    description: "Desenvolve abordagens de vendas consultivas com a metodologia SPIN (Situação, Problema, Implicação, Necessidade) para aumentar conversões.",
    tags: ["SPIN", "Vendas Consultivas", "Conversão", "Fechamento"],
    icon: TrendingUp,
    gradient: "from-violet-600 to-violet-700",
    badgeColor: "bg-violet-100 text-violet-700",
    url: "https://chatgpt.com/g/g-6830c25fdf3081918c35b78a6a5a87db-construtor-spin-selling-vendas-aptitude-r",
  },
  {
    id: "templum",
    name: "Conselho Templum Evolutto",
    description: "Conselheiro estratégico empresarial focado em governança, planejamento e evolução de franquias. Orientação de alto nível para decisões complexas.",
    tags: ["Estratégia", "Governança", "Planejamento", "Evolução"],
    icon: Lightbulb,
    gradient: "from-amber-500 to-amber-600",
    badgeColor: "bg-amber-100 text-amber-700",
    url: "https://chatgpt.com/g/g-68b4aaa283cc8191a267bd86646246ac-conselho-templum-evolutto",
  },
  {
    id: "vip",
    name: "Conselho VIP Franqueados",
    description: "Orientação exclusiva e personalizada para franqueados RE/MAX. Apoio em decisões estratégicas, gestão e crescimento da franquia.",
    tags: ["Franqueados", "VIP", "Gestão", "Crescimento"],
    icon: Star,
    gradient: "from-rose-600 to-rose-700",
    badgeColor: "bg-rose-100 text-rose-700",
    url: "https://chatgpt.com/g/g-68bb3895e7f481918813f5a663bebf2f-conselho-vip-franqueados-re-max",
  },
  {
    id: "nutricao",
    name: "Nutrição de Leads por E-mail",
    description: "Cria sequências de e-mail estratégicas para nutrir leads ao longo do funil de vendas, aumentando o engajamento e as taxas de conversão.",
    tags: ["E-mail", "Funil", "Nutrição", "Engajamento"],
    icon: Mail,
    gradient: "from-teal-600 to-teal-700",
    badgeColor: "bg-teal-100 text-teal-700",
    url: "https://chatgpt.com/g/g-67c5970a28588191b56f153a9f761d52-nutricao-de-leads-por-e-mail",
  },
  {
    id: "browser",
    name: "Web Browser",
    description: "Navega e pesquisa na internet em tempo real. Útil para buscar informações de mercado, concorrentes, referências e dados atualizados.",
    tags: ["Pesquisa", "Internet", "Mercado", "Referências"],
    icon: Globe,
    gradient: "from-slate-600 to-slate-700",
    badgeColor: "bg-slate-100 text-slate-600",
    url: "https://chatgpt.com/g/g-3w1rEXGE0-web-browser",
  },
  {
    id: "posicionamento",
    name: "Posicionamento & Conteúdo",
    description: "Desenvolve estratégias de posicionamento de marca e criação de conteúdo de atração para franquias RE/MAX conquistarem mais clientes.",
    tags: ["Conteúdo", "Posicionamento", "Marca", "Atração"],
    icon: Megaphone,
    gradient: "from-pink-600 to-pink-700",
    badgeColor: "bg-pink-100 text-pink-700",
    url: "https://chatgpt.com/g/g-6829e22b89308191919f30a81b283ffd-do-posicionamento-ao-conteudo-de-atracao-alpha",
  },
  {
    id: "especialista",
    name: "Especialista Alpha",
    description: "Agente de alta performance com foco em excelência comercial, gestão de equipes e resultados acima da média para franquias líderes.",
    tags: ["Alta Performance", "Comercial", "Equipes", "Resultados"],
    icon: Zap,
    gradient: "from-indigo-600 to-indigo-700",
    badgeColor: "bg-indigo-100 text-indigo-700",
    url: "https://chatgpt.com/g/g-68274691b2b88191930ace957a50b146-especialista-alpha",
  },
  {
    id: "vendas",
    name: "Analizador de Vendas 2.0",
    description: "Analisa métricas e KPIs de vendas, identifica gargalos no funil e sugere ações para melhorar o desempenho comercial da franquia.",
    tags: ["KPIs", "Análise", "Funil de Vendas", "Desempenho"],
    icon: BarChart2,
    gradient: "from-cyan-600 to-cyan-700",
    badgeColor: "bg-cyan-100 text-cyan-700",
    url: "https://chatgpt.com/g/g-682276bc44f48191a79a8fec9a96eabb-analizador-de-vendas-2-0",
  },
];

export default function Agents() {
  const { openAssistant } = useAiAssistant();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Agentes IA</h1>
        <p className="text-muted-foreground mt-1">
          Escolha o agente certo para cada necessidade do seu dia a dia. Todos os agentes externos abrem no ChatGPT.
        </p>
      </div>

      {/* Ferramentas externas */}
      <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-5 rounded-2xl border border-border bg-card flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Ranking RE/MAX SC</h2>
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">Dashboard oficial de performance das franquias.</p>
          </div>
          <a
            href="https://datastudio.google.com/u/0/reporting/b1c7fc2d-78f7-4957-a30d-f5320f991593/page/p_65ekbv19ad"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C8102E] text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir
          </a>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">Hub Minha RE/MAX</h2>
            <p className="text-sm text-muted-foreground mt-0.5 leading-snug">Portal interno da rede RE/MAX com recursos e ferramentas.</p>
          </div>
          <a
            href="https://hub.minharemax.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#003DA5] text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
          >
            <Home className="h-4 w-4" />
            Abrir
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          return (
            <div
              key={agent.id}
              className="group flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-all"
            >
              {/* Header thumbnail */}
              <div className={`bg-gradient-to-br ${agent.gradient} p-5 flex items-center gap-3`}>
                <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white leading-tight">{agent.name}</p>
                  {agent.internal && (
                    <span className="text-xs text-white/70">Integrado à plataforma</span>
                  )}
                  {agent.url && (
                    <span className="text-xs text-white/70">ChatGPT</span>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-col flex-1 p-4 gap-3">
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  {agent.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {agent.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${agent.badgeColor}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                {agent.internal ? (
                  <button
                    onClick={openAssistant}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${agent.gradient} hover:opacity-90 transition-opacity`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Abrir chat
                  </button>
                ) : (
                  <a
                    href={agent.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${agent.gradient} hover:opacity-90 transition-opacity`}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir no ChatGPT
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
