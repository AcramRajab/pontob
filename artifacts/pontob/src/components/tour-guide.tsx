import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CheckSquare, CalendarCheck, Target, ArrowRightCircle, LayoutDashboard, Bot, X, ChevronRight, ChevronLeft, SkipForward, Clock } from "lucide-react";

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  highlight?: string;
}

const STEPS: TourStep[] = [
  {
    icon: <img src="/remax-sc-logo.jpg" alt="Ponto B" className="h-16 mx-auto object-contain" />,
    title: "Bem-vindo ao Método Ponto B!",
    description: "Sua plataforma de execução estratégica RE/MAX SC. Em poucos passos, vou te mostrar como tirar o máximo desta ferramenta no seu dia a dia.",
  },
  {
    icon: <CheckSquare className="h-12 w-12 text-primary mx-auto" />,
    title: "Comece sempre por aqui: Hoje",
    description: "A tela 'Hoje' é o seu ponto de partida diário. Ela mostra suas iniciativas do dia, alertas pendentes e sua pontuação da semana — tudo em dois minutos.",
    highlight: "Hoje",
  },
  {
    icon: <CalendarCheck className="h-12 w-12 text-emerald-500 mx-auto" />,
    title: "Registre sua execução diária",
    description: "O Check-in Diário é onde você marca o que executou. Ele vale 20% da sua pontuação — faça todo dia! Também há check-ins semanais e mensais para revisões mais amplas.",
    highlight: "Check-in Diário",
  },
  {
    icon: <Target className="h-12 w-12 text-blue-500 mx-auto" />,
    title: "Metas e Iniciativas: o coração da estratégia",
    description: "Em Metas você define seus objetivos por dimensão (Pessoas e Real Estate). Para cada meta, adicione até 3 Iniciativas — as ações concretas que vão te levar lá.",
    highlight: "Metas",
  },
  {
    icon: <LayoutDashboard className="h-12 w-12 text-violet-500 mx-auto" />,
    title: "Acompanhe sua performance",
    description: "O Dashboard mostra sua pontuação geral: 40% KRI + 30% iniciativas + 20% check-ins + 10% KPIs. A Visão Anual e o Histórico complementam a análise ao longo do tempo.",
    highlight: "Dashboard",
  },
  {
    icon: <ArrowRightCircle className="h-12 w-12 text-amber-500 mx-auto" />,
    title: "Planner Semanal: organize sua semana",
    description: "Use o Planner Semanal toda segunda-feira para priorizar o que vai executar na semana. O Registro de Eventos guarda tudo que acontece de relevante.",
    highlight: "Planner Semanal",
  },
  {
    icon: <Bot className="h-12 w-12 text-rose-500 mx-auto" />,
    title: "Assistente IA: sua ajuda sempre disponível",
    description: "O botão 'Assistente IA' no rodapé do menu está sempre disponível para tirar dúvidas, explicar funcionalidades e te ajudar a usar a plataforma com mais eficiência.",
    highlight: "Assistente IA",
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
  return `pontob_tour_${userId}`;
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

          <div className="flex justify-center mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full mx-0.5 transition-all duration-300 ${
                  i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/40" : "w-3 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="text-center space-y-4 min-h-[200px] flex flex-col justify-center">
            <div className="flex justify-center">{current.icon}</div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{current.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{current.description}</p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 gap-2">
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
                <Button size="sm" onClick={completeTour} className="gap-1">
                  Começar!
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
