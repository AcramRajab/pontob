import { useParams, Link } from "wouter";
import { useGetGoal, getGetGoalQueryKey } from "@workspace/api-client-react";
import { Loader2, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export default function GoalDetail() {
  const params = useParams();
  const id = Number(params.id);

  const { data: goal, isLoading } = useGetGoal(
    id,
    { query: { enabled: !!id, queryKey: getGetGoalQueryKey(id) } }
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!goal) return <div>Meta não encontrada.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/goals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{goal.title}</h1>
          <p className="text-muted-foreground mt-1">{goal.dimensionName} • {goal.keyProcessName}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Progresso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="flex justify-between items-center">
               <span className="font-medium text-lg">Execução</span>
               <span className="font-bold text-lg">{goal.progressPercentage}%</span>
             </div>
             <Progress value={goal.progressPercentage} className="h-3" />
             <div className="pt-4 text-sm text-muted-foreground">
               {goal.kriDescription}
             </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
             <div className="text-6xl font-bold text-primary">{goal.score}</div>
             <div className="mt-2 font-medium">{goal.riskStatus}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}