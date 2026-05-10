import { useAuth } from "@/lib/auth";
import { useListGoals, getListGoalsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function Goals() {
  const { user } = useAuth();
  const franchiseId = user?.franchiseId;

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: goals, isLoading } = useListGoals(
    goalParams,
    { query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metas</h1>
          <p className="text-muted-foreground mt-2">Menos planejamento bonito. Mais execução visível.</p>
        </div>
        {user?.role !== "responsavel_interno" && (
          <Button asChild>
            <Link href="/goals/new">
              <Plus className="mr-2 h-4 w-4" />
              Nova Meta
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-4">
        {goals?.length ? (
          goals.map(goal => (
            <Card key={goal.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-primary" />
                      <Link href={`/goals/${goal.id}`} className="font-semibold text-lg hover:underline">
                        {goal.title}
                      </Link>
                      <Badge variant={goal.riskStatus === 'atrasado' ? 'destructive' : 'default'}>
                        {goal.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {goal.dimensionName} • {goal.keyProcessName}
                    </div>
                  </div>
                  <div className="w-full md:w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span className="font-medium">{goal.progressPercentage}%</span>
                    </div>
                    <Progress value={goal.progressPercentage} className="h-2" />
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm text-muted-foreground">Score</span>
                    <span className="text-2xl font-bold">{goal.score}</span>
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
              <Button asChild className="mt-6" variant="outline">
                <Link href="/goals/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Meta
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}