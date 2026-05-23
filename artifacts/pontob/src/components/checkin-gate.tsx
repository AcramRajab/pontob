import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { CalendarCheck, AlertTriangle, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface GateStatus {
  overdue: boolean;
  type?: "weekly" | "monthly";
  periodLabel?: string;
  weekStartDate?: string;
  month?: number;
  year?: number;
}

async function fetchGateStatus(): Promise<GateStatus> {
  const res = await fetch("/api/checkins/pending-gate", { credentials: "include" });
  if (!res.ok) return { overdue: false };
  return res.json();
}

export function CheckinGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [, setLocation] = useLocation();

  const shouldCheck = !!user && (user.role === "franqueado" || user.role === "responsavel_interno");

  const { data: gate } = useQuery<GateStatus>({
    queryKey: ["checkin-gate", user?.id],
    queryFn: fetchGateStatus,
    enabled: shouldCheck,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  const blocking = shouldCheck && !dismissed && gate?.overdue === true;

  if (!blocking) return <>{children}</>;

  const isMonthly = gate?.type === "monthly";

  function goToCheckin() {
    setDismissed(true);
    setLocation("/checkins");
  }

  return (
    <>
      {children}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 z-10 border border-border">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isMonthly ? "bg-red-100" : "bg-amber-100"}`}>
                <AlertTriangle className={`h-8 w-8 ${isMonthly ? "text-red-600" : "text-amber-500"}`} />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">
                {isMonthly ? "Check-in Mensal Pendente" : "Check-in Semanal Pendente"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Você ainda não registrou o check-in da{" "}
                <strong className="text-foreground">{gate?.periodLabel}</strong>.
              </p>
            </div>

            <div className={`rounded-lg p-3 text-sm text-left ${isMonthly ? "bg-red-50 border border-red-200 text-red-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
              {isMonthly ? (
                <>
                  <strong>Por que é obrigatório?</strong> O check-in mensal documenta os resultados das iniciativas concluídas, registra o progresso dos seus KRIs e define o foco do próximo mês. Sem ele, a análise de desempenho da rede fica incompleta.
                </>
              ) : (
                <>
                  <strong>Por que é obrigatório?</strong> O check-in semanal registra o que foi executado, identifica bloqueios e alinha o planejamento da próxima semana. A consistência é o que diferencia franquias de alta performance.
                </>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={goToCheckin} className="w-full gap-2">
                <CalendarCheck className="h-4 w-4" />
                Fazer check-in agora
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground text-xs"
                onClick={() => setDismissed(true)}
              >
                Fazer depois (lembrado em 30 min)
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
