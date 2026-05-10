import { useListGoals, getListGoalsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { TrendingUp, Clock, CheckCircle2, PauseCircle, XCircle } from "lucide-react";
import { useFranchiseContext, FranchisePicker, AdminEmptyState } from "@/hooks/use-franchise-context";

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
  const [filter, setFilter] = useState("ativa");
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: goals = [], isLoading: goalsLoading } = useListGoals(
    goalParams,
    { query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );

  const isLoading = goalsLoading && !!franchiseId;

  const allInitiatives: any[] = [];
  goals.forEach((g: any) => {
    if (g.initiatives) {
      g.initiatives.forEach((i: any) => {
        allInitiatives.push({ ...i, goalTitle: g.title });
      });
    }
  });

  const filtered = filter === "all" ? allInitiatives : allInitiatives.filter(i => i.status === filter);

  if (isLoading) {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Iniciativas</h1>
        <p className="text-muted-foreground mt-1">Escolha poucas. Execute bem. Conclua antes de começar mais.</p>
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
                <p className="text-xs text-muted-foreground/70 mt-1">Acesse uma meta e adicione iniciativas estratégicas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((initiative: any) => (
                <Card key={initiative.id} data-testid={`card-initiative-${initiative.id}`} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <StatusIcon status={initiative.status} />
                        <div className="min-w-0">
                          <p className="font-semibold text-sm leading-tight truncate">{initiative.initiativeName || "—"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {initiative.goalTitle && <span className="mr-2">{initiative.goalTitle}</span>}
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
                        <Badge variant="outline" className={`text-xs ${statusColor[initiative.status] || ""}`}>
                          {statusLabel[initiative.status] || initiative.status}
                        </Badge>
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
    </div>
  );
}
