import { useListAllGoalInitiatives, getListAllGoalInitiativesQueryKey, useListGoals, getListGoalsQueryKey, useDeleteGoalInitiative } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { TrendingUp, Clock, CheckCircle2, PauseCircle, XCircle, Plus, Trash2 } from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const statusLabel: Record<string, string> = {
  ativa: "Ativa",
  concluida: "Concluída",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

const statusColor: Record<string, string> = {
  ativa: "bg-primary/10 text-primary border-primary/30",
  concluida: "bg-green-50 text-green-700 border-green-200",
  pausada: "bg-yellow-50 text-yellow-700 border-yellow-200",
  cancelada: "bg-red-50 text-red-600 border-red-200",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "concluida") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "pausada") return <PauseCircle className="h-4 w-4 text-yellow-600" />;
  if (status === "cancelada") return <XCircle className="h-4 w-4 text-red-500" />;
  return <TrendingUp className="h-4 w-4 text-primary" />;
};

export default function Initiatives() {
  const [filter, setFilter] = useState("all");
  const [goalPickerOpen, setGoalPickerOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = useState("");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();
  const canWrite = user?.role !== "responsavel_interno";
  const qc = useQueryClient();
  const { toast } = useToast();
  const deleteInitiative = useDeleteGoalInitiative();

  const initParams = { franchiseId: franchiseId ?? undefined };
  const { data: initiatives = [], isLoading } = useListAllGoalInitiatives(
    initParams,
    { query: { enabled: !!franchiseId, queryKey: getListAllGoalInitiativesQueryKey(initParams) } }
  );

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: goals = [] } = useListGoals(
    goalParams,
    { query: { enabled: goalPickerOpen && !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );

  const filtered = filter === "all" ? initiatives : initiatives.filter((i: any) => i.status === filter);

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await deleteInitiative.mutateAsync({ id: confirmDeleteId });
      qc.invalidateQueries({ queryKey: getListAllGoalInitiativesQueryKey(initParams) });
      toast({ title: "Iniciativa excluída" });
    } catch {
      toast({ title: "Erro ao excluir iniciativa", variant: "destructive" });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleGoalSelect = (goalId: number) => {
    setGoalPickerOpen(false);
    navigate(`/goals/${goalId}/initiatives/new`);
  };

  if (isLoading && !!franchiseId) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Iniciativas</h1>
          <p className="text-muted-foreground mt-1">Escolha poucas. Execute bem. Conclua antes de começar mais.</p>
        </div>
        {canWrite && !!franchiseId && (
          <Button onClick={() => setGoalPickerOpen(true)} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-1.5" />
            Nova Iniciativa
          </Button>
        )}
      </div>

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar as iniciativas." />
      ) : (
        <>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="ativa">Ativas</TabsTrigger>
              <TabsTrigger value="concluida">Concluídas</TabsTrigger>
              <TabsTrigger value="pausada">Pausadas</TabsTrigger>
            </TabsList>
          </Tabs>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhuma iniciativa encontrada</p>
                {canWrite ? (
                  <>
                    <p className="text-xs text-muted-foreground/70 mt-1 mb-4">Adicione iniciativas estratégicas às suas metas</p>
                    <Button variant="outline" size="sm" onClick={() => setGoalPickerOpen(true)}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Adicionar Iniciativa
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground/70 mt-1">Nenhuma iniciativa registrada ainda.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((initiative: any) => (
                <Card
                  key={initiative.id}
                  data-testid={`card-initiative-${initiative.id}`}
                  className="hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => navigate(`/goals/${initiative.goalId}`)}
                >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <StatusIcon status={initiative.status} />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm leading-tight truncate">{initiative.initiativeName || "—"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {initiative.goalTitle && <span className="mr-2 font-medium">{initiative.goalTitle}</span>}
                            {initiative.dimensionName && (
                              <span className="text-muted-foreground/70">{initiative.dimensionName}</span>
                            )}
                          </p>
                          {initiative.keyProcessName && (
                            <p className="text-xs text-muted-foreground/70 mt-0.5">{initiative.keyProcessName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={`text-xs ${statusColor[initiative.status] || ""}`}>
                            {statusLabel[initiative.status] || initiative.status}
                          </Badge>
                          {canWrite && (
                            <Button
                              variant="ghost" size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Excluir iniciativa"
                              onClick={e => {
                                e.stopPropagation();
                                setConfirmDeleteName(initiative.initiativeName || "esta iniciativa");
                                setConfirmDeleteId(initiative.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <span className="text-xs font-mono text-muted-foreground">{initiative.progressPercentage ?? 0}%</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <Progress value={initiative.progressPercentage ?? 0} className="h-1.5" />
                    </div>
                    {(initiative.startDate || initiative.endDate) && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <Clock className="h-3 w-3 text-muted-foreground/60" />
                        <span className="text-xs text-muted-foreground">
                          {initiative.startDate} — {initiative.endDate || "em aberto"}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir iniciativa?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá excluir permanentemente <strong>"{confirmDeleteName}"</strong>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleteInitiative.isPending}
            >
              {deleteInitiative.isPending ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={goalPickerOpen} onOpenChange={setGoalPickerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Escolha uma Meta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">Selecione a meta onde deseja adicionar a iniciativa.</p>
          <div className="space-y-2 mt-2 max-h-80 overflow-y-auto">
            {goals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Nenhuma meta encontrada.</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href="/goals/new">Criar uma Meta primeiro</Link>
                </Button>
              </div>
            ) : (
              goals.map((goal: any) => (
                <button
                  key={goal.id}
                  className="w-full text-left rounded-lg border px-4 py-3 hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
                  onClick={() => handleGoalSelect(goal.id)}
                >
                  <p className="font-medium text-sm">{goal.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {goal.dimensionName} — {goal.keyProcessName}
                    <span className="ml-2 text-muted-foreground/60">
                      {goal.activeInitiativesCount}/3 ativas
                    </span>
                  </p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
