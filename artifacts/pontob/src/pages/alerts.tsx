import { useAuth } from "@/lib/auth";
import { useListAlerts, useResolveAlert, getListAlertsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, AlertCircle, CheckCircle2, RefreshCw,
  TrendingDown, CalendarX, Clock, ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// ─── Alert type metadata ──────────────────────────────────────────────────────

const ALERT_TYPES: Record<string, { label: string; description: string; icon: typeof AlertTriangle; color: string; bg: string; border: string }> = {
  meta_atrasada: {
    label: "Meta atrasada",
    description: "O progresso da meta está abaixo do esperado para a data atual.",
    icon: TrendingDown,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
  },
  checkin_ausente: {
    label: "Check-in ausente",
    description: "Nenhum check-in diário registrado nos últimos 7 dias.",
    icon: CalendarX,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  iniciativa_vencida: {
    label: "Iniciativa com prazo vencido",
    description: "Uma iniciativa ativa passou do prazo e ainda não foi concluída.",
    icon: Clock,
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-300",
  high:     "bg-orange-100 text-orange-700 border-orange-300",
  medium:   "bg-amber-100 text-amber-700 border-amber-300",
  low:      "bg-blue-100 text-blue-700 border-blue-300",
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Crítico",
  high:     "Alto",
  medium:   "Médio",
  low:      "Baixo",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Alerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();
  const [filter, setFilter] = useState("open");
  const [generating, setGenerating] = useState(false);

  const effectiveFranchiseId = franchiseId ?? user?.franchiseId ?? undefined;
  const alertParams = { franchiseId: effectiveFranchiseId, status: filter !== "all" ? filter : undefined };
  const { data: alerts = [], isLoading, refetch } = useListAlerts(
    alertParams,
    { query: { enabled: !!user, queryKey: getListAlertsQueryKey(alertParams) } }
  );

  const resolve = useResolveAlert();

  const handleResolve = async (id: number) => {
    try {
      await resolve.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListAlertsQueryKey({}) });
      toast({ title: "Alerta resolvido" });
    } catch {
      toast({ title: "Erro ao resolver alerta", variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!effectiveFranchiseId) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/alerts/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franchiseId: effectiveFranchiseId }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      qc.invalidateQueries({ queryKey: getListAlertsQueryKey({}) });
      toast({
        title: result.created > 0
          ? `${result.created} novo(s) alerta(s) gerado(s)`
          : "Nenhum alerta novo — tudo em ordem",
        description: result.resolved > 0 ? `${result.resolved} alerta(s) resolvido(s) automaticamente` : undefined,
      });
    } catch {
      toast({ title: "Erro ao gerar alertas", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  const openCount = (alerts as any[]).filter((a: any) => a.status === "open").length;

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Situações que precisam da sua atenção.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={handleGenerate}
          disabled={generating || !effectiveFranchiseId}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
          {generating ? "Verificando..." : "Verificar agora"}
        </Button>
      </div>

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !effectiveFranchiseId ? (
        <AdminEmptyState message="Selecione uma franquia para ver os alertas." />
      ) : (
        <>
          {/* Alert type legend */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {Object.entries(ALERT_TYPES).map(([key, meta]) => {
              const Icon = meta.icon;
              const count = (alerts as any[]).filter((a: any) => a.type === key && a.status === "open").length;
              return (
                <div key={key} className={cn("rounded-xl border px-3 py-2.5 flex items-center gap-2.5", meta.bg, meta.border)}>
                  <Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
                  <div className="min-w-0">
                    <p className={cn("text-xs font-semibold leading-tight", meta.color)}>{meta.label}</p>
                    <p className="text-[11px] text-muted-foreground/70 truncate">{meta.description}</p>
                  </div>
                  {count > 0 && (
                    <span className={cn("ml-auto text-xs font-black shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white", meta.color.replace("text-", "bg-"))}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="open">
                Abertos
                {openCount > 0 && (
                  <span className="ml-1.5 text-[10px] font-bold bg-destructive text-white rounded-full px-1.5 py-0.5">{openCount}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
              <TabsTrigger value="all">Todos</TabsTrigger>
            </TabsList>
          </Tabs>

          {(alerts as any[]).length === 0 ? (
            <div className="rounded-xl border border-dashed py-16 flex flex-col items-center gap-3 text-center">
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {filter === "open" ? "Nenhum alerta em aberto" : "Nenhum alerta encontrado"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {filter === "open" ? "Tudo em ordem. Continue assim!" : "Nada para exibir com esse filtro."}
                </p>
              </div>
              {filter === "open" && (
                <Button variant="outline" size="sm" className="gap-2 mt-1" onClick={handleGenerate} disabled={generating}>
                  <RefreshCw className={cn("h-3.5 w-3.5", generating && "animate-spin")} />
                  Verificar novamente
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {(alerts as any[]).map((alert: any) => {
                const meta = ALERT_TYPES[alert.type];
                const Icon = meta?.icon ?? AlertTriangle;
                const isOpen = alert.status === "open";
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "rounded-xl border overflow-hidden transition-opacity",
                      isOpen ? (meta?.border ?? "border-border") : "border-border opacity-60",
                    )}
                    data-testid={`card-alert-${alert.id}`}
                  >
                    {/* Colored left accent */}
                    <div className={cn("flex items-stretch")}>
                      <div className={cn("w-1 shrink-0", isOpen ? (meta?.bg.replace("bg-", "bg-") ?? "bg-muted") : "bg-muted")}
                        style={{ background: isOpen ? undefined : undefined }}
                      />
                      <div className={cn("flex-1 px-4 py-3.5", isOpen ? (meta?.bg ?? "bg-card") : "bg-muted/20")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", isOpen ? (meta?.bg ?? "bg-muted") : "bg-muted")}>
                              <Icon className={cn("h-4 w-4", isOpen ? (meta?.color ?? "text-muted-foreground") : "text-muted-foreground")} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("text-sm font-semibold", isOpen ? (meta?.color ?? "text-foreground") : "text-muted-foreground")}>
                                  {meta?.label ?? alert.type}
                                </span>
                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", SEVERITY_BADGE[alert.severity] ?? "")}>
                                  {SEVERITY_LABEL[alert.severity] ?? alert.severity}
                                </Badge>
                                {!isOpen && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-200">
                                    Resolvido
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground/80 mt-1 leading-snug">{alert.message}</p>
                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {alert.goalTitle && (
                                  <Link href={`/goals/${alert.goalId}`} className="text-xs text-primary/70 hover:text-primary flex items-center gap-0.5">
                                    {alert.goalTitle}
                                    <ChevronRight className="h-3 w-3" />
                                  </Link>
                                )}
                                <span className="text-[11px] text-muted-foreground/60">{formatDate(alert.createdAt)}</span>
                                {alert.resolvedAt && (
                                  <span className="text-[11px] text-green-600/70">Resolvido em {formatDate(alert.resolvedAt)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {isOpen && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(alert.id)}
                              disabled={resolve.isPending}
                              data-testid={`button-resolve-${alert.id}`}
                              className="shrink-0 text-xs"
                            >
                              Resolver
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
