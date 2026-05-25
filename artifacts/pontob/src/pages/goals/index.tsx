import { useAuth } from "@/lib/auth";
import { useListGoals, getListGoalsQueryKey, useDeleteGoal } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Target, Trash2, BarChart2, Zap, Building2, TrendingUp, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { progressColorClass, progressBarClass } from "@/lib/progress-color";
import { ProgressLegend } from "@/components/progress-legend";

function formatGoalValue(v: number | null | undefined, unit?: string | null): string {
  if (v == null) return "—";
  const u = unit?.toLowerCase() ?? "";
  if (u === "r$" || u.includes("financeiro") || u.includes("honorário")) {
    return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (u === "%") return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
  const suffix = unit ? ` ${unit}` : "";
  return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${suffix}`;
}

function calcProjected(
  target: number | null | undefined,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): number | null {
  if (target == null || !startDate || !endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (end <= start) return null;
  const ratio = Math.max(0, Math.min((now - start) / (end - start), 1));
  return Math.round(target * ratio);
}

export default function Goals() {
  const { user } = useAuth();
  const { franchiseId, isAdmin, isSocio, franchises, adminFranchiseId, setAdminFranchiseId, socioFranchiseId, setSocioFranchiseId } = useFranchiseContext();
  const { toast } = useToast();
  const qc = useQueryClient();
  const deleteGoal = useDeleteGoal();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState("");

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: goals, isLoading } = useListGoals(
    goalParams,
    { query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );

  const canWrite = user?.role !== "responsavel_interno";

  // Determine current quarter end date
  const { currentYear, currentQDate, currentQLabel } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth(); // 0-based
    const qIdx = Math.floor(m / 3);
    const qDates = [`${y}-03-31`, `${y}-06-30`, `${y}-09-30`, `${y}-12-31`];
    const qLabels = ["Q1", "Q2", "Q3", "Q4"];
    return { currentYear: y, currentQDate: qDates[qIdx], currentQLabel: qLabels[qIdx] };
  }, []);

  // Use the franchise that actually owns the goals (may differ from picker for sócios)
  const goalsFranchiseId = useMemo(
    () => (goals && goals.length > 0 ? (goals[0] as any).franchiseId : null) ?? franchiseId,
    [goals, franchiseId]
  );

  // Fetch visão milestones + quarterly actuals
  const { data: visaoData } = useQuery<{
    milestones: Array<{
      quarterDate: string;
      targetCreci: number | null;
      targetCres: number | null;
      targetVgh: number | null;
    }>;
    quarterActuals: Array<{
      quarterDate: string;
      actualCreci: number | null;
      actualCres: number | null;
      actualVgh: number | null;
    }>;
  }>({
    queryKey: ["visao-milestones", goalsFranchiseId, currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/visao?franchiseId=${goalsFranchiseId}&year=${currentYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!goalsFranchiseId,
  });

  // Extract the current quarter's milestone targets
  const currentQMilestone = useMemo(
    () => visaoData?.milestones?.find(m => m.quarterDate === currentQDate) ?? null,
    [visaoData, currentQDate]
  );

  // Map a goal to its current-Q milestone target by keyword matching on title/unit
  function getQTarget(goal: { title?: string | null; unit?: string | null }): number | null {
    if (!currentQMilestone) return null;
    const t = (goal.title ?? "").toLowerCase();
    const u = (goal.unit ?? "").toLowerCase();
    if (t.includes("creci") || t.includes("corretor") || u.includes("corretor"))
      return currentQMilestone.targetCreci;
    if (t.includes("cres") || t.includes("representaç") || u.includes("contrat") || u.includes("representaç"))
      return currentQMilestone.targetCres;
    if (t.includes("vgh") || t.includes("honorário") || u === "r$" || u.includes("honorário"))
      return currentQMilestone.targetVgh;
    return null;
  }

  // YTD actual: carry-forward across quarters — most recent non-null actual for the KRI type
  function getYtdActual(goal: { title?: string | null; unit?: string | null }): number | null {
    if (!visaoData?.quarterActuals?.length) return null;
    const t = (goal.title ?? "").toLowerCase();
    const u = (goal.unit ?? "").toLowerCase();
    let key: "actualCreci" | "actualCres" | "actualVgh" | null = null;
    if (t.includes("creci") || t.includes("corretor") || u.includes("corretor")) key = "actualCreci";
    else if (t.includes("cres") || t.includes("representaç") || u.includes("contrat") || u.includes("representaç")) key = "actualCres";
    else if (t.includes("vgh") || t.includes("honorário") || u === "r$" || u.includes("honorário")) key = "actualVgh";
    if (!key) return null;
    let ytd: number | null = null;
    for (const qa of visaoData.quarterActuals) {
      if (qa[key] != null) ytd = qa[key];
    }
    return ytd;
  }

  const { data: socioOverview } = useQuery<Array<{
    franchiseId: number; franchiseName: string;
    goalCount: number; avgScore: number; avgProgress: number; activeInitiatives: number;
  }>>({
    queryKey: ["socio-overview"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/socio-overview", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: isSocio,
  });

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteGoal.mutateAsync({ id: confirmDeleteId });
      qc.invalidateQueries({ queryKey: getListGoalsQueryKey(goalParams) });
      toast({ title: "Meta excluída" });
    } catch {
      toast({ title: "Erro ao excluir meta", variant: "destructive" });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground mt-2">Defina o "o quê" — cada meta ligada a um KRI e processo-chave da sua estratégia.</p>
          <ProgressLegend className="mt-3" />
        </div>
        {canWrite && franchiseId && (
          <Button asChild>
            <Link href="/goals/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova Meta
            </Link>
          </Button>
        )}
      </div>

      {isSocio && socioOverview && socioOverview.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Visão Geral — Todas as Franquias
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 cursor-help text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[260px] space-y-1.5 text-xs leading-relaxed">
                <p><strong>Progresso médio:</strong> média de quanto foi realizado em relação ao alvo em cada meta (realizado ÷ meta × 100).</p>
                <p><strong>Pts score:</strong> pontuação de execução baseada em check-ins, KPIs atualizados e iniciativas concluídas. Máx. 100 pts por meta.</p>
                <p><strong>Iniciativas:</strong> número de iniciativas estratégicas ativas nesta franquia.</p>
              </TooltipContent>
            </Tooltip>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {socioOverview.map(f => {
              const isSelected = socioFranchiseId === f.franchiseId;
              const progress = f.avgProgress ?? 0;
              const score = f.avgScore ?? 0;
              return (
                <button
                  key={f.franchiseId}
                  onClick={() => setSocioFranchiseId(f.franchiseId)}
                  className={cn(
                    "text-left rounded-xl border p-4 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary",
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn(
                        "flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold truncate leading-tight">{f.franchiseName}</span>
                    </div>
                    {isSelected && (
                      <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded px-1.5 py-0.5">
                        Ativa
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-muted-foreground flex items-center gap-1 cursor-help">
                              <TrendingUp className="h-3 w-3" />
                              Progresso médio
                              <HelpCircle className="h-2.5 w-2.5 opacity-40" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="max-w-[220px] text-xs leading-relaxed">
                            Média do <strong>realizado ÷ meta</strong> em todas as metas desta franquia. Verde ≥70%, amarelo ≥40%, vermelho &lt;40%.
                          </TooltipContent>
                        </Tooltip>
                        <span className={cn(
                          "font-bold",
                          progress >= 70 ? "text-green-600" : progress >= 40 ? "text-yellow-600" : "text-red-500"
                        )}>
                          {progress}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-1.5" />
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{f.goalCount}</span> {f.goalCount === 1 ? "meta" : "metas"}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-muted-foreground flex items-center gap-1 cursor-help">
                            <span className={cn(
                              "font-semibold",
                              score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-500"
                            )}>{score}</span>
                            {" "}pts score
                            <HelpCircle className="h-2.5 w-2.5 opacity-40" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-[220px] text-xs leading-relaxed">
                          <strong>Score de execução</strong> (máx. 100 pts por meta): considera check-ins realizados, KPIs atualizados e iniciativas concluídas. Reflete a <em>consistência</em> de execução, não só o resultado.
                        </TooltipContent>
                      </Tooltip>
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{f.activeInitiatives}</span> iniciativas
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isSocio && franchiseId && (
        <div className="flex items-center gap-2 py-1 border-b border-border">
          <Target className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">
            {(franchises as any[]).find((f) => f.id === franchiseId)?.name ?? ""}
          </span>
          <span className="text-xs text-muted-foreground">— metas desta franquia</span>
        </div>
      )}

      {(isAdmin || isSocio) && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar as metas." />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {goals?.length ? (
            goals.map(goal => {
              const projected = calcProjected(goal.targetValue, goal.startDate, goal.endDate);

              // YTD actual from franchiseKrisTable (carry-forward), falls back to manually-set currentValue
              const ytdActual = getYtdActual(goal);
              const effectiveCurrentValue = ytdActual ?? goal.currentValue;

              const hasValues = goal.targetValue != null || effectiveCurrentValue != null;

              // Q-milestone target (overrides annual target when set)
              const qTarget = getQTarget(goal);
              const effectiveTarget = qTarget ?? goal.targetValue;
              const pct = effectiveTarget != null && effectiveTarget > 0 && effectiveCurrentValue != null
                ? Math.min(100, Math.round((Number(effectiveCurrentValue) / Number(effectiveTarget)) * 100))
                : (goal.progressPercentage ?? 0);

              return (
                <Card key={goal.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4">

                      {/* Top row: title + meta + badge + actions */}
                      <div className="flex items-start gap-3 justify-between">
                        <div className="flex items-center gap-2.5 flex-wrap flex-1 min-w-0">
                          <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <Link href={`/goals/${goal.id}`} className="font-semibold text-base hover:underline leading-snug">
                            {goal.title}
                          </Link>
                          <Badge
                            variant={goal.riskStatus === "atrasado" ? "destructive" : "default"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {goal.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex flex-col items-end cursor-help">
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/60 flex items-center gap-0.5">
                                  Score <HelpCircle className="h-2.5 w-2.5" />
                                </span>
                                <span className="text-xl font-bold leading-none tabular-nums">{goal.score}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="max-w-[240px] text-xs leading-relaxed space-y-1">
                              <p><strong>Score de execução</strong> desta meta (0–100 pts).</p>
                              <p>Calculado a partir de:</p>
                              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                <li>40% — resultado do KRI</li>
                                <li>30% — execução das iniciativas</li>
                                <li>20% — consistência de check-ins</li>
                                <li>10% — atualização dos KPIs</li>
                              </ul>
                            </TooltipContent>
                          </Tooltip>
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={e => {
                                e.preventDefault();
                                setConfirmDeleteTitle(goal.title);
                                setConfirmDeleteId(goal.id);
                              }}
                              data-testid={`button-delete-goal-${goal.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Subtitle: dimension • key process */}
                      <p className="text-xs text-muted-foreground -mt-2">
                        {goal.dimensionName} • {goal.keyProcessName}
                        {isAdmin && goal.franchiseName && (
                          <span className="ml-2 text-primary/70">— {goal.franchiseName}</span>
                        )}
                      </p>

                      {/* Progress section */}
                      <div className="space-y-2">
                        {/* Numbers row: Realizado | Projetado | Meta */}
                        {hasValues && (
                          <div className="flex items-end gap-6">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50 mb-0.5">Realizado</span>
                              <span className={cn(
                                "text-base font-bold tabular-nums leading-none",
                                effectiveCurrentValue != null ? progressColorClass(pct) : "text-muted-foreground/30",
                              )}>
                                {formatGoalValue(effectiveCurrentValue, goal.unit)}
                              </span>
                            </div>
                            {projected != null && (
                              <div className="flex flex-col">
                                <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50 mb-0.5">Projetado</span>
                                <span className="text-base font-semibold tabular-nums leading-none text-muted-foreground">
                                  {formatGoalValue(projected, goal.unit)}
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col ml-auto items-end">
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50 mb-0.5">
                                Meta {qTarget != null ? currentQLabel : "Anual"}
                              </span>
                              <span className="text-base font-semibold tabular-nums leading-none text-primary">
                                {formatGoalValue(effectiveTarget, goal.unit)}
                              </span>
                              {qTarget != null && goal.targetValue != null && (
                                <span className="text-[9px] text-muted-foreground/50 tabular-nums">
                                  Anual: {formatGoalValue(goal.targetValue, goal.unit)}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Bar + percentage */}
                        <div className="flex items-center gap-3">
                          <Progress value={pct} className={cn("h-1.5 flex-1", progressBarClass(pct))} />
                          <span className={cn("text-xs font-semibold tabular-nums w-9 text-right shrink-0", progressColorClass(pct))}>
                            {pct}%
                          </span>
                        </div>
                      </div>

                      {/* KPIs & Initiatives panel */}
                      {(() => {
                        const kpis = (goal as any).kpis ?? [];
                        const initiatives = (goal as any).initiatives ?? [];
                        if (kpis.length === 0 && initiatives.length === 0) return null;
                        return (
                          <div className="border-t pt-3 space-y-2.5">
                            {kpis.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <BarChart2 className="h-3 w-3 text-muted-foreground/60" />
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">KPIs salvos</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {kpis.map((k: any) => (
                                    <span
                                      key={k.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/5 border border-primary/15 text-[11px] text-foreground"
                                    >
                                      <span className="font-medium">{k.name}</span>
                                      {k.targetValue != null && (
                                        <span className="text-muted-foreground">
                                          · {k.currentValue ?? 0}/{k.targetValue}{k.unit ? ` ${k.unit}` : ""}
                                        </span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {initiatives.length > 0 && (
                              <div>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  <Zap className="h-3 w-3 text-muted-foreground/60" />
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Iniciativas salvas</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {initiatives.map((i: any) => {
                                    const statusCls: Record<string, string> = {
                                      ativa: "bg-primary/5 border-primary/15 text-primary",
                                      em_andamento: "bg-blue-50 border-blue-200 text-blue-700",
                                      concluida: "bg-green-50 border-green-200 text-green-700",
                                      pausada: "bg-yellow-50 border-yellow-200 text-yellow-700",
                                      cancelada: "bg-red-50 border-red-200 text-red-600",
                                    };
                                    const statusLbl: Record<string, string> = {
                                      ativa: "Ativa", em_andamento: "Em andamento",
                                      concluida: "Concluída", pausada: "Pausada", cancelada: "Cancelada",
                                    };
                                    return (
                                      <span
                                        key={i.id}
                                        className={cn(
                                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px]",
                                          statusCls[i.status] ?? "bg-muted border-border text-muted-foreground"
                                        )}
                                      >
                                        <span className="font-medium truncate max-w-[200px]">{i.initiativeName ?? "Iniciativa"}</span>
                                        <span className="opacity-60">· {statusLbl[i.status] ?? i.status}</span>
                                        {i.progressPercentage != null && (
                                          <span className="opacity-60">· {i.progressPercentage}%</span>
                                        )}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                <Target className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium">Nenhuma meta cadastrada</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  {isSocio && franchiseId
                    ? `Esta franquia ainda não tem metas cadastradas.`
                    : "Você ainda não tem metas cadastradas. Clique em Nova Meta para começar."}
                </p>
                {canWrite && (
                  <Button asChild className="mt-6" variant="outline">
                    <Link href="/goals/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Nova Meta
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá excluir permanentemente <strong>"{confirmDeleteTitle}"</strong> junto com todos os seus KPIs e iniciativas vinculadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {deleteGoal.isPending ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </TooltipProvider>
  );
}
