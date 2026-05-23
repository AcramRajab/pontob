import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  CheckSquare, CalendarCheck, Target, ArrowRightCircle, LayoutDashboard,
  Bot, X, ChevronRight, ChevronLeft, SkipForward, Clock, ListChecks,
  Trophy, TrendingUp, AlertCircle, Lightbulb,
} from "lucide-react";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  tip?: string;
  badge?: string;
}

const STEPS: TourStep[] = [
  {
    icon: <img src="/remax-sc-logo.jpg" alt="Ponto B" className="h-16 mx-auto object-contain" />,
    title: "Bem-vindo ao Método Ponto B!",
    description: "Plataforma de execução estratégica da RE/MAX SC. Ela transforma metas em hábitos — você registra o que executa, e a plataforma mostra o quanto isso está movendo seus resultados.",
    tip: "O tutorial leva menos de 3 minutos. Pode pular e voltar quando quiser.",
  },
  {
    icon: <CheckSquare className="h-12 w-12 text-primary mx-auto" />,
    title: "Rotina diária: comece pela tela Hoje",
    badge: "Todo dia",
    description: "Cada manhã, abra a tela Hoje. Ela mostra suas iniciativas programadas para o dia, alertas pendentes e sua pontuação da semana. Em dois minutos você já sabe exatamente o que precisa fazer.",
    tip: "Tela Hoje → veja o que está no seu radar → execute durante o dia.",
  },
  {
    icon: <Target className="h-12 w-12 text-blue-500 mx-auto" />,
    title: "Metas: seus grandes objetivos do ciclo",
    badge: "1x por ciclo",
    description: "Em Metas você cria os objetivos estratégicos da franquia, ligados a uma dimensão (Pessoas ou Real Estate) e a um KRI — Corretores, CREs ou VGH. Cada meta tem um valor-alvo e um prazo.",
    tip: "Crie metas realistas com metas numéricas claras. Exemplo: 'Chegar a 25 corretores ativos até dezembro'.",
  },
  {
    icon: <ListChecks className="h-12 w-12 text-violet-500 mx-auto" />,
    title: "Iniciativas: as ações que levam às metas",
    badge: "Máximo 3 ativas",
    description: "Para cada meta, escolha até 3 iniciativas do Cardápio — atividades comprovadas que movem seus KRIs. Com foco em 3 por vez você executa com mais profundidade. Ao concluir uma, documente o resultado e libere um novo slot.",
    tip: "Menos iniciativas, mais execução. Qualidade > quantidade.",
  },
  {
    icon: <CalendarCheck className="h-12 w-12 text-emerald-500 mx-auto" />,
    title: "Check-in Diário: 2 minutos no fim do dia",
    badge: "Todo dia",
    description: "Antes de fechar o dia, registre seu check-in diário. Marque quais iniciativas você executou, coloque uma nota sobre o dia e responda às perguntas de reflexão. Vale 20% da sua pontuação — cada dia conta.",
    tip: "Crie o hábito: todo dia, antes de sair, 2 minutos de check-in.",
  },
  {
    icon: <ArrowRightCircle className="h-12 w-12 text-amber-500 mx-auto" />,
    title: "Planner Semanal: planeje toda segunda-feira",
    badge: "Toda semana",
    description: "Toda segunda, use o Planner Semanal para decidir quais iniciativas você vai priorizar nos próximos 5 dias. Distribua tarefas pelos dias da semana e tenha clareza antes de começar a agir.",
    tip: "Planner na segunda + check-in diário = semana com direção e registro.",
  },
  {
    icon: <CalendarCheck className="h-12 w-12 text-blue-400 mx-auto" />,
    title: "Check-in Semanal: revise sexta-feira",
    badge: "Toda semana",
    description: "Na sexta (ou fim de semana), faça o check-in semanal. Reflita sobre o que avançou, o que travou e ajuste o plano para a semana seguinte. É o momento de conectar execução com estratégia.",
    tip: "Responda honestamente — são seus dados, eles contam a história real da semana.",
  },
  {
    icon: <Clock className="h-12 w-12 text-rose-500 mx-auto" />,
    title: "Check-in Mensal: obrigatório antes do próximo mês",
    badge: "Todo mês",
    description: "No fechamento do mês, registre o check-in mensal antes de avançar para o próximo período. Registre os resultados das iniciativas concluídas, analise os KRIs (Corretores, CREs, VGH) e defina os focos do mês seguinte.",
    tip: "Ao concluir uma iniciativa no check-in mensal, documente o resultado numérico — isso gera o ranking de melhores iniciativas da rede.",
  },
  {
    icon: <TrendingUp className="h-12 w-12 text-emerald-600 mx-auto" />,
    title: "Sua pontuação: como é calculada",
    badge: "Entenda o score",
    description: "Sua nota final combina 4 fatores: progresso nos KRIs (40%), execução de iniciativas (30%), regularidade nos check-ins (20%) e atualização de KPIs (10%). Quem executa consistentemente mês após mês atinge as maiores pontuações.",
    tip: "Consistência bate intensidade. Check-ins todos os dias valem mais do que uma semana intensa seguida de silêncio.",
  },
  {
    icon: <Trophy className="h-12 w-12 text-amber-400 mx-auto" />,
    title: "Dashboard e Ranking: acompanhe sua evolução",
    badge: "Visão geral",
    description: "O Dashboard mostra sua pontuação geral, histórico mensal e comparativo com as metas. O Ranking mostra como sua franquia se posiciona na rede RE/MAX SC — use como motivação, não como pressão.",
    tip: "Acesse o Histórico para ver sua evolução ao longo dos meses. Tendência importa mais do que a nota de hoje.",
  },
  {
    icon: <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />,
    title: "Alertas: nada escapa",
    badge: "Fique ligado",
    description: "O sino de alertas avisa sobre check-ins em atraso, iniciativas próximas do vencimento e metas com baixo progresso. Resolva os alertas rapidamente — eles são sinais de atenção, não punições.",
    tip: "Alertas em laranja = atenção. Em vermelho = urgente. Resolva antes de avançar.",
  },
  {
    icon: <Lightbulb className="h-12 w-12 text-yellow-500 mx-auto" />,
    title: "Cardápio: iniciativas comprovadas pela rede",
    badge: "Escolha com estratégia",
    description: "O Cardápio reúne todas as iniciativas disponíveis, organizadas por dimensão e processo-chave. Cada iniciativa tem uma descrição, o KRI que impacta e o esforço estimado. Escolha as que mais se encaixam no momento da sua franquia.",
    tip: "Priorize iniciativas com alto impacto no KRI que está mais abaixo da meta.",
  },
  {
    icon: <Bot className="h-12 w-12 text-rose-500 mx-auto" />,
    title: "Assistente IA: dúvida? Pergunte!",
    badge: "Sempre disponível",
    description: "O Assistente IA (botão no rodapé do menu) está disponível a qualquer hora. Pergunte sobre funcionalidades, peça sugestões de iniciativas, entenda sua pontuação ou tire qualquer dúvida sobre a plataforma.",
    tip: "Dica: pergunte 'Qual iniciativa devo priorizar para aumentar meu VGH este mês?'",
  },
];

interface TourContextType {
  startTour: () => void;
}

const TourContext = createContext<TourContextType>({ startTour: () => {} });

export function useTour() {
  return useContext(TourContext);
}

function getTourKey(userId: number) {
  return `pontob_tour_v2_${userId}`;
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [sessionSkipped, setSessionSkipped] = useState(false);

  useEffect(() => {
    if (!user) return;
    const key = getTourKey(user.id);
    const state = localStorage.getItem(key);
    if (state !== "completed" && !sessionSkipped) {
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [user, sessionSkipped]);

  const startTour = useCallback(() => {
    setStep(0);
    setActive(true);
  }, []);

  function completeTour() {
    if (!user) return;
    localStorage.setItem(getTourKey(user.id), "completed");
    setActive(false);
  }

  function remindLater() {
    setSessionSkipped(true);
    setActive(false);
  }

  if (!active) {
    return (
      <TourContext.Provider value={{ startTour }}>
        {children}
      </TourContext.Provider>
    );
  }

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <TourContext.Provider value={{ startTour }}>
      {children}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={remindLater} />
        <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 border border-border">
          <button
            onClick={remindLater}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Passo {step + 1} de {STEPS.length}
              </span>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="text-center space-y-3 min-h-[220px] flex flex-col justify-center">
            <div className="flex justify-center">{current.icon}</div>
            <div className="space-y-1">
              {current.badge && (
                <span className="inline-block text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {current.badge}
                </span>
              )}
              <h2 className="text-lg font-bold text-foreground leading-snug">{current.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">{current.description}</p>
            </div>
            {current.tip && (
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-left">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed">{current.tip}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-5 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={completeTour}
              className="text-muted-foreground text-xs gap-1"
            >
              <SkipForward className="h-3 w-3" />
              Pular tutorial
            </Button>

            <div className="flex gap-2">
              {!isFirst && (
                <Button variant="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              {!isLast ? (
                <Button size="sm" onClick={() => setStep(s => s + 1)} className="gap-1">
                  Próximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" onClick={completeTour} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
                  Começar agora!
                  <CheckSquare className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {!isLast && (
            <div className="mt-3 text-center">
              <button
                onClick={remindLater}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                <Clock className="h-3 w-3" />
                Lembrar no próximo acesso
              </button>
            </div>
          )}
        </div>
      </div>
    </TourContext.Provider>
  );
}
