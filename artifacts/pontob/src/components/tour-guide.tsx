import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  CheckSquare, CalendarCheck, Target, ArrowRightCircle,
  Bot, X, ChevronRight, ChevronLeft, SkipForward, Clock, ListChecks,
  Trophy, TrendingUp, AlertCircle, Lightbulb, Flag, BarChart3, Layers,
} from "lucide-react";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  tip?: string;
  badge?: string;
  step?: string;
}

const STEPS: TourStep[] = [
  {
    icon: <img src="/remax-sc-logo.jpg" alt="Ponto B" className="h-16 mx-auto object-contain" />,
    title: "Bem-vindo ao Método Ponto B!",
    description: "Plataforma de execução estratégica da RE/MAX SC. Aqui você transforma o planejamento anual em ações diárias mensuráveis — e seus resultados servem de benchmarking para toda a rede.",
    tip: "O tutorial leva menos de 3 minutos. Pode pular e voltar quando quiser.",
  },
  {
    icon: <Flag className="h-12 w-12 text-primary mx-auto" />,
    title: "1º PASSO: Defina sua Visão Anual",
    badge: "Faça isso primeiro",
    step: "Planejamento Anual → Visão Anual",
    description: "Antes de qualquer coisa, acesse Planejamento Anual e registre os números atuais e as metas de final de cada trimestre para os 3 KRIs da rede: Corretores ativos, CREs (contratos de representação) e VGH (volume de vendas em R$).",
    tip: "Os valores do 4º trimestre (31/Dez) são a sua visão final do ano. Todos os demais indicadores da plataforma se orientam por eles.",
  },
  {
    icon: <Target className="h-12 w-12 text-blue-500 mx-auto" />,
    title: "2º PASSO: Crie Metas ligadas à Visão",
    badge: "1x por ciclo",
    step: "Metas → Nova Meta",
    description: "Com a visão definida, crie metas estratégicas para cada dimensão (Pessoas ou Real Estate). Cada meta é vinculada a um KRI (Corretores, CREs ou VGH) e a um processo-chave. Defina o valor-alvo e o prazo — a meta é o 'o quê', as iniciativas são o 'como'.",
    tip: "Exemplo: 'Chegar a 25 corretores ativos até dezembro' → KRI: Corretores → Dimensão: Pessoas → Processo: Recrutamento.",
  },
  {
    icon: <Layers className="h-12 w-12 text-violet-500 mx-auto" />,
    title: "3º PASSO: Priorize no máximo 3 Iniciativas",
    badge: "Foco é o segredo",
    step: "Metas → [sua meta] → Adicionar iniciativa",
    description: "Para cada meta, escolha até 3 iniciativas do Cardápio — ações comprovadas pela rede que movem seus KRIs. Foco em 3 por vez gera execução mais profunda. Ao concluir uma, registre o resultado numérico e libere um novo slot.",
    tip: "Menos iniciativas, mais resultado. A ciência mostra que atenção dividida por muitas atividades reduz a capacidade de execução em até 40%.",
  },
  {
    icon: <ArrowRightCircle className="h-12 w-12 text-amber-500 mx-auto" />,
    title: "4º PASSO: Planeje a semana toda segunda",
    badge: "Toda semana",
    step: "Semana → Planner Semanal",
    description: "Toda segunda-feira, abra o Planner Semanal. Registre os indicadores diários (Corretores, CREs, VGH) por dia da semana, defina a meta semanal de cada KRI e acompanhe o gap em relação à meta mensal. Ao final da semana, finalize o planner com os gaps identificados e as ações para a próxima semana.",
    tip: "Planner na segunda + check-in diário = semana com direção e registro completo.",
  },
  {
    icon: <CalendarCheck className="h-12 w-12 text-emerald-500 mx-auto" />,
    title: "5º PASSO: Check-in diário — 2 min no fim do dia",
    badge: "Todo dia",
    step: "Rotina → Check-in Diário",
    description: "Antes de fechar o dia, registre quais iniciativas você executou, atualize os KPIs e deixe uma nota de reflexão. Vale 20% da sua pontuação — cada dia sem registro conta negativamente na consistência.",
    tip: "Crie o hábito: todo dia, antes de sair, 2 minutos de check-in. Consistência bate intensidade.",
  },
  {
    icon: <CalendarCheck className="h-12 w-12 text-blue-400 mx-auto" />,
    title: "Check-in Semanal: revise na sexta",
    badge: "Toda semana",
    step: "Semana → Check-in Semanal",
    description: "Na sexta (ou fim de semana), faça o check-in semanal. Reflita sobre o progresso das iniciativas, o que travou e ajuste o plano. É o momento de conectar execução semanal com a estratégia anual.",
    tip: "Responda honestamente — são seus dados, eles constroem o histórico real da sua franquia.",
  },
  {
    icon: <Clock className="h-12 w-12 text-rose-500 mx-auto" />,
    title: "Check-in Mensal: feche cada mês",
    badge: "Todo mês",
    step: "Metas → Check-in Mensal",
    description: "No fechamento do mês, registre os resultados das iniciativas concluídas com o valor numérico alcançado, analise os KRIs versus as metas do trimestre e defina os focos do mês seguinte.",
    tip: "Ao registrar o resultado de uma iniciativa concluída, esse dado entra no benchmarking da rede — ajudando outras franquias a escolherem as melhores iniciativas.",
  },
  {
    icon: <BarChart3 className="h-12 w-12 text-emerald-600 mx-auto" />,
    title: "Sua pontuação: como é calculada",
    badge: "Entenda o score",
    description: "Sua nota combina 4 fatores: progresso nos KRIs (40%), execução de iniciativas (30%), regularidade nos check-ins (20%) e atualização de KPIs (10%). Quem mantém a rotina mês a mês alcança as maiores pontuações.",
    tip: "Consistência bate intensidade. Check-ins todos os dias valem mais do que uma semana intensa seguida de silêncio.",
  },
  {
    icon: <Trophy className="h-12 w-12 text-amber-400 mx-auto" />,
    title: "Ranking e Benchmarking da rede",
    badge: "Visão comparativa",
    description: "O Ranking mostra como sua franquia se posiciona na rede RE/MAX SC em pontuação, execução e consistência. Os resultados que você registra nos check-ins alimentam o benchmarking de iniciativas — mostrando quais ações geraram mais resultado em cada KRI para todas as franquias.",
    tip: "Use o ranking como aprendizado: as franquias líderes mostram quais iniciativas funcionam melhor para cada KRI da rede.",
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
    description: "O Cardápio reúne todas as iniciativas disponíveis, organizadas por dimensão e processo-chave. Cada uma descreve o KRI que impacta e o esforço estimado. As iniciativas com mais resultados registrados na rede aparecem com destaque.",
    tip: "Priorize iniciativas com alto impacto no KRI que está mais abaixo da sua meta do trimestre.",
  },
  {
    icon: <Bot className="h-12 w-12 text-rose-500 mx-auto" />,
    title: "Assistente IA: dúvida? Pergunte!",
    badge: "Sempre disponível",
    description: "O Assistente IA está disponível a qualquer hora no menu lateral. Pergunte sobre funcionalidades, peça sugestões de iniciativas para o seu momento ou entenda sua pontuação.",
    tip: "Dica: pergunte 'Qual iniciativa devo priorizar para aumentar meu VGH este trimestre?'",
  },
  {
    icon: <ListChecks className="h-12 w-12 text-primary mx-auto" />,
    title: "Resumo: o fluxo completo",
    description: "① Visão Anual com metas por trimestre → ② Metas ligadas aos KRIs → ③ Máx. 3 iniciativas com foco → ④ Planner toda segunda → ⑤ Check-in todo dia → ⑥ Check-in semanal na sexta → ⑦ Check-in mensal no fechamento → ⑧ Resultado alimenta o ranking da rede.",
    tip: "Comece pela Visão Anual agora. Leva menos de 5 minutos e orienta tudo o que vem depois.",
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
  return `pontob_tour_v3_${userId}`;
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
              {current.step && (
                <p className="text-[10px] font-mono font-medium text-muted-foreground/60 bg-muted/40 rounded px-2 py-0.5 inline-block">
                  {current.step}
                </p>
              )}
              <p className="text-muted-foreground text-sm leading-relaxed mt-1">{current.description}</p>
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
