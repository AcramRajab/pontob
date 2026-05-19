import { ExternalLink, Bot, Users, FileText, PhoneCall, TrendingUp, Lightbulb, Star, Mail, Globe, Megaphone, Zap, BarChart2, MessageCircle, ArrowUpRight } from "lucide-react";
import { useAiAssistant } from "@/components/ai-assistant-context";

const AGENTS = [
  {
    id: "interno",
    name: "Assistente IA Ponto B",
    description: "Tire dúvidas sobre metas, check-ins, indicadores e estratégias diretamente dentro do sistema.",
    tags: ["Metas", "Check-in", "KPIs"],
    icon: Bot,
    accent: "#3B82F6",
    badge: "Integrado",
    internal: true,
  },
  {
    id: "brokers",
    name: "Agente Brokers & SDR",
    description: "Prospecção ativa, captação de corretores e estratégias SDR para o mercado imobiliário RE/MAX.",
    tags: ["SDR", "Captação", "Corretores"],
    icon: Users,
    accent: "#6366F1",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-683078cf7e6c8191ba55a2ea40c0e45e-agente-brokers-sdr-re-max-aptitude-r",
  },
  {
    id: "curriculos",
    name: "Analisador de Currículos",
    description: "Triagem inteligente de candidatos, avaliação de competências e pontuação de perfis para RE/MAX.",
    tags: ["RH", "Triagem", "Recrutamento"],
    icon: FileText,
    accent: "#10B981",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-6831b14ff4f08191a9f40b57c44befc4-analisador-de-curriculos-aptitude-r",
  },
  {
    id: "bant",
    name: "Construtor BANT & Script",
    description: "Scripts de pré-vendas baseados na metodologia BANT para qualificação eficiente de leads.",
    tags: ["BANT", "Script", "Pré-vendas"],
    icon: PhoneCall,
    accent: "#F59E0B",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-68307072b6fc8191bbdd83d1c338f7fa-construtor-bant-script-de-pre-vendas-aptitude-r",
  },
  {
    id: "spin",
    name: "Construtor SPIN Selling",
    description: "Abordagens de vendas consultivas com metodologia SPIN para aumentar conversões.",
    tags: ["SPIN", "Vendas", "Conversão"],
    icon: TrendingUp,
    accent: "#8B5CF6",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-6830c25fdf3081918c35b78a6a5a87db-construtor-spin-selling-vendas-aptitude-r",
  },
  {
    id: "templum",
    name: "Conselho Templum Evolutto",
    description: "Conselheiro estratégico para governança, planejamento e evolução de franquias.",
    tags: ["Estratégia", "Governança", "Franquia"],
    icon: Lightbulb,
    accent: "#F97316",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-68b4aaa283cc8191a267bd86646246ac-conselho-templum-evolutto",
  },
  {
    id: "vip",
    name: "Conselho VIP Franqueados",
    description: "Orientação exclusiva para franqueados RE/MAX em decisões estratégicas, gestão e crescimento.",
    tags: ["VIP", "Gestão", "Crescimento"],
    icon: Star,
    accent: "#EC4899",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-68bb3895e7f481918813f5a663bebf2f-conselho-vip-franqueados-re-max",
  },
  {
    id: "nutricao",
    name: "Nutrição de Leads por E-mail",
    description: "Sequências de e-mail estratégicas para nutrir leads ao longo do funil e aumentar conversões.",
    tags: ["E-mail", "Funil", "Nutrição"],
    icon: Mail,
    accent: "#14B8A6",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-67c5970a28588191b56f153a9f761d52-nutricao-de-leads-por-e-mail",
  },
  {
    id: "browser",
    name: "Web Browser",
    description: "Pesquisa na internet em tempo real para buscar dados de mercado, concorrentes e referências.",
    tags: ["Pesquisa", "Mercado", "Internet"],
    icon: Globe,
    accent: "#64748B",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-3w1rEXGE0-web-browser",
  },
  {
    id: "posicionamento",
    name: "Posicionamento & Conteúdo",
    description: "Estratégias de posicionamento de marca e conteúdo de atração para conquistar mais clientes.",
    tags: ["Conteúdo", "Marca", "Atração"],
    icon: Megaphone,
    accent: "#DB2777",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-6829e22b89308191919f30a81b283ffd-do-posicionamento-ao-conteudo-de-atracao-alpha",
  },
  {
    id: "especialista",
    name: "Especialista Alpha",
    description: "Alta performance em excelência comercial, gestão de equipes e resultados acima da média.",
    tags: ["Performance", "Comercial", "Resultados"],
    icon: Zap,
    accent: "#4F46E5",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-68274691b2b88191930ace957a50b146-especialista-alpha",
  },
  {
    id: "vendas",
    name: "Analizador de Vendas 2.0",
    description: "Análise de métricas de vendas, identificação de gargalos e ações para melhorar o desempenho.",
    tags: ["KPIs", "Funil", "Desempenho"],
    icon: BarChart2,
    accent: "#0EA5E9",
    badge: "ChatGPT",
    url: "https://chatgpt.com/g/g-682276bc44f48191a79a8fec9a96eabb-analizador-de-vendas-2-0",
  },
];

export default function Agents() {
  const { openAssistant } = useAiAssistant();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground mb-2">Central de IA</p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Agentes IA</h1>
          <p className="text-muted-foreground mt-2 text-sm max-w-xl">
            Assistentes especializados para cada etapa do seu negócio. O agente interno responde na plataforma; os externos abrem no ChatGPT.
          </p>
        </div>

        {/* Agent grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENTS.map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.id}
                className="group relative flex flex-col bg-card border border-border rounded-2xl p-5 hover:border-border/80 hover:shadow-md transition-all duration-200"
                style={{ borderLeft: `3px solid ${agent.accent}` }}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: agent.accent + "15" }}
                  >
                    <Icon className="h-5 w-5" style={{ color: agent.accent }} />
                  </div>
                  <span className="text-[10px] font-semibold tracking-wide uppercase text-muted-foreground border border-border rounded-full px-2.5 py-0.5 shrink-0">
                    {agent.badge}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground text-sm leading-tight mb-1.5">{agent.name}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{agent.description}</p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {agent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <div className="mt-4 pt-4 border-t border-border">
                  {agent.internal ? (
                    <button
                      onClick={openAssistant}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: agent.accent }}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Abrir assistente
                    </button>
                  ) : (
                    <a
                      href={agent.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-opacity hover:opacity-80"
                      style={{
                        backgroundColor: agent.accent + "12",
                        color: agent.accent,
                      }}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Abrir no ChatGPT
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
