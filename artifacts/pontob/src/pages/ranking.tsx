import { useGetFranchiseRanking, getGetFranchiseRankingQueryKey, GetFranchiseRankingBy } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Trophy, TrendingUp, TrendingDown, Minus } from "lucide-react";

function scoreColor(score: number) {
  if (score >= 90) return "text-primary";
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-yellow-600";
  return "text-destructive";
}

function scoreLabel(score: number) {
  if (score >= 90) return { label: "Excelente", color: "bg-primary/10 text-primary border-primary/30" };
  if (score >= 70) return { label: "Saudável", color: "bg-green-50 text-green-700 border-green-200" };
  if (score >= 40) return { label: "Atenção", color: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  return { label: "Crítico", color: "bg-red-50 text-red-600 border-red-200" };
}

export default function Ranking() {
  type RankingBy = typeof GetFranchiseRankingBy[keyof typeof GetFranchiseRankingBy];
  const [by, setBy] = useState<RankingBy>("score");
  const rankParams = { by };
  const { data: ranking = [], isLoading } = useGetFranchiseRanking(
    rankParams,
    { query: { enabled: true, queryKey: getGetFranchiseRankingQueryKey(rankParams) } }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-40" />
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ranking de Franquias</h1>
          <p className="text-muted-foreground mt-1">Posicionamento por performance de execução</p>
        </div>
        <Select value={by} onValueChange={(v) => setBy(v as RankingBy)}>
          <SelectTrigger className="w-44" data-testid="select-ranking-by">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Pontuação</SelectItem>
            <SelectItem value="execution">Execução Semanal</SelectItem>
            <SelectItem value="consistency">Consistência</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {ranking.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum dado disponível</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ranking.map((f: any) => {
            const sl = scoreLabel(f.score);
            return (
              <Card key={f.franchiseId} data-testid={`card-ranking-${f.franchiseId}`} className={`${f.rank <= 3 ? "border-primary/20 bg-primary/[0.02]" : ""}`}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-4">
                    <div className={`w-8 text-center font-bold text-lg ${f.rank === 1 ? "text-yellow-500" : f.rank === 2 ? "text-slate-400" : f.rank === 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {f.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm">{f.franchiseName}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">Execução: {f.weekExecution}%</span>
                        <span className="text-xs text-muted-foreground">Consistência: {f.checkinConsistency}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={`text-xs ${sl.color}`}>{sl.label}</Badge>
                      <span className={`text-xl font-bold font-mono ${scoreColor(f.score)}`}>{f.score}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
