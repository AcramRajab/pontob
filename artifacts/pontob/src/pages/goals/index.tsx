import { useAuth } from "@/lib/auth";
import { useListGoals, getListGoalsQueryKey, useDeleteGoal } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Target, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Goals() {
  const { user } = useAuth();
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground mt-2">Menos planejamento bonito. Mais execução visível.</p>
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

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar as metas." />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {goals?.length ? (
            goals.map(goal => (
              <Card key={goal.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Target className="h-5 w-5 text-primary shrink-0" />
                        <Link href={`/goals/${goal.id}`} className="font-semibold text-lg hover:underline">
                          {goal.title}
                        </Link>
                        <Badge variant={goal.riskStatus === 'atrasado' ? 'destructive' : 'default'}>
                          {goal.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {goal.dimensionName} • {goal.keyProcessName}
                        {isAdmin && goal.franchiseName && (
                          <span className="ml-2 text-primary/70">— {goal.franchiseName}</span>
                        )}
                      </div>
                    </div>
                    <div className="w-full md:w-64 space-y-2 shrink-0">
                      <div className="flex justify-between text-sm">
                        <span>Progresso</span>
                        <span className={`font-medium ${
                          goal.progressPercentage >= 80
                            ? "text-blue-600"
                            : goal.progressPercentage >= 51
                            ? "text-foreground"
                            : "text-red-600"
                        }`}>
                          {goal.progressPercentage}%
                        </span>
                      </div>
                      <Progress value={goal.progressPercentage} className="h-2" />
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-muted-foreground">Score</span>
                        <span className="text-2xl font-bold">{goal.score}</span>
                      </div>
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={e => {
                            e.preventDefault();
                            setConfirmDeleteTitle(goal.title);
                            setConfirmDeleteId(goal.id);
                          }}
                          data-testid={`button-delete-goal-${goal.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
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
