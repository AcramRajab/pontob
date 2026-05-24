import { useAuth } from "@/lib/auth";
import { useListGoals, getListGoalsQueryKey, useDeleteGoal } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Target, Trash2, BarChart2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { progressColorClass } from "@/lib/progress-color";
import { ProgressLegend } from "@/components/progress-legend";

function formatGoalValue(v: number | null | undefined, unit?: string | null): string {
  if (v == null) return "—";
  const u = unit?.toLowerCase() ?? "";
  if (u === "r$" || u.includes("financeiro") || u.includes("honorário")) {
    if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
    if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}k`;
    return `R$ ${v.toLocaleString("pt-BR")}`;
  }
  if (u === "%") return `${v.toLocaleString("pt-BR")}%`;
  const suffix = unit ? ` ${unit}` : "";
  return `${v.toLocaleString("pt-BR")}${suffix}`;
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
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground mt-2">Menos planejamento bonito. Mais execução visível.</p>
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

      {(isAdmin || isSocio) && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
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
              const hasValues = goal.targetValue != null || goal.currentValue != null;
              const pct = goal.progressPercentage ?? 0;

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
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/60">Score</span>
                            <span className="text-xl font-bold leading-none tabular-nums">{goal.score}</span>
                          </div>
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
                                goal.currentValue != null ? progressColorClass(pct) : "text-muted-foreground/30",
                              )}>
                                {formatGoalValue(goal.currentValue, goal.unit)}
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
                              <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/50 mb-0.5">Meta</span>
                              <span className="text-base font-semibold tabular-nums leading-none text-primary">
                                {formatGoalValue(goal.targetValue, goal.unit)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Bar + percentage */}
                        <div className="flex items-center gap-3">
                          <Progress value={pct} className="h-1.5 flex-1" />
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
                <h3 className="text-lg font-medium">Nenhuma meta encontrada</h3>
                <p className="text-muted-foreground mt-2 max-w-sm">
                  Você ainda não tem metas cadastradas. Clique em Nova Meta para começar.
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
  );
}
