import { useGetFranchiseRanking, getGetFranchiseRankingQueryKey, GetFranchiseRankingBy } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Trophy, TrendingUp, Users, ChevronDown, ChevronUp, BarChart3, CheckCircle2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

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

type InitiativeResult = {
  franchiseName: string;
  resultValue: number | null;
  resultUnit: string | null;
  actualResult: string | null;
  status: string;
};

type InitiativeBenchmark = {
  initiativeId: number;
  initiativeName: string;
  kri: string | null;
  kpi: string | null;
  keyProcessName: string | null;
  dimensionName: string | null;
  adoptionCount: number;
  completionCount: number;
  avgResultValue: number | null;
  topResultValue: number | null;
  franchiseResults: InitiativeResult[];
};

function useInitiativeRanking(dimension: string, keyProcessId: string) {
  const [data, setData] = useState<InitiativeBenchmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (keyProcessId) params.set("keyProcessId", keyProcessId);
    fetch(`/api/ranking/initiatives?${params}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) {
          const filtered = dimension
            ? d.filter((i: InitiativeBenchmark) => i.dimensionName === dimension)
            : d;
          setData(filtered);
        } else {
          setError("Erro ao carregar dados");
        }
      })
      .catch(() => setError("Erro de conexão"))
      .finally(() => setIsLoading(false));
  }, [dimension, keyProcessId]);

  return { data, isLoading, error };
}

function statusLabel(s: string) {
  if (s === "concluida") return { label: "Concluída", color: "text-green-600" };
  if (s === "ativa") return { label: "Ativa", color: "text-blue-600" };
  if (s === "pausada") return { label: "Pausada", color: "text-yellow-600" };
  return { label: s, color: "text-muted-foreground" };
}

function InitiativeCard({ item, rank }: { item: InitiativeBenchmark; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const completionRate = item.adoptionCount > 0
    ? Math.round((item.completionCount / item.adoptionCount) * 100)
    : 0;

  return (
    <Card className={rank <= 3 ? "border-primary/20 bg-primary/[0.02]" : ""}>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 shrink-0 text-center font-bold text-lg mt-0.5 ${
            rank === 1 ? "text-yellow-500" : rank === 2 ? "text-slate-400" : rank === 3 ? "text-amber-600" : "text-muted-foreground"
          }`}>
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-snug">{item.initiativeName}</p>

            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {item.dimensionName && (
                <span className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                  {item.dimensionName}
                </span>
              )}
              {item.keyProcessName && (
                <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                  {item.keyProcessName}
                </span>
              )}
            </div>

            {item.kri && (
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                <span className="font-medium text-foreground/70">KRI: </span>{item.kri}
              </p>
            )}

            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{item.adoptionCount} franquia{item.adoptionCount !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span>{item.completionCount} concluída{item.completionCount !== 1 ? "s" : ""}</span>
                {completionRate > 0 && <span className="text-green-600">({completionRate}%)</span>}
              </div>
              {item.avgResultValue != null && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  <span>Média: <span className="font-mono font-medium text-foreground">{item.avgResultValue.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span></span>
                </div>
              )}
              {item.topResultValue != null && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 text-amber-400" />
                  <span>Melhor: <span className="font-mono font-medium text-foreground">{item.topResultValue.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</span></span>
                </div>
              )}
            </div>

            {item.franchiseResults.length > 0 && (
              <button
                className="flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                onClick={() => setExpanded(e => !e)}
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? "Ocultar" : "Ver"} resultados por franquia
              </button>
            )}

            {expanded && (
              <div className="mt-2 space-y-1 pl-1 border-l-2 border-muted ml-1">
                {item.franchiseResults.map((fr, i) => {
                  const sl = statusLabel(fr.status);
                  return (
                    <div key={i} className="flex items-start justify-between gap-2 py-0.5">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{fr.franchiseName}</p>
                        {fr.actualResult && (
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{fr.actualResult}</p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {fr.resultValue != null && (
                          <p className="text-xs font-mono font-bold text-primary">
                            {fr.resultValue.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
                            {fr.resultUnit && <span className="font-normal text-muted-foreground ml-0.5">{fr.resultUnit}</span>}
                          </p>
                        )}
                        <p className={`text-[10px] ${sl.color}`}>{sl.label}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InitiativeRanking() {
  const [dimension, setDimension] = useState<string>("");
  const [keyProcessId, setKeyProcessId] = useState<string>("");
  const { data, isLoading, error } = useInitiativeRanking(dimension, keyProcessId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36" />
        </div>
        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Select value={dimension || "all"} onValueChange={v => { setDimension(v === "all" ? "" : v); setKeyProcessId(""); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Todas as dimensões" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as dimensões</SelectItem>
            <SelectItem value="Pessoas">Pessoas</SelectItem>
            <SelectItem value="Real Estate">Real Estate</SelectItem>
          </SelectContent>
        </Select>

        {(dimension || keyProcessId) && (
          <Button variant="ghost" size="sm" onClick={() => { setDimension(""); setKeyProcessId(""); }}>
            Limpar filtros
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhuma iniciativa com dados ainda</p>
            <p className="text-xs text-muted-foreground mt-1">Os resultados aparecem conforme as franquias registram iniciativas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data.map((item, idx) => (
            <InitiativeCard key={item.initiativeId} item={item} rank={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Ranking() {
  type RankingBy = typeof GetFranchiseRankingBy[keyof typeof GetFranchiseRankingBy];
  const [tab, setTab] = useState<"franchises" | "initiatives">("franchises");
  const [by, setBy] = useState<RankingBy>("score");
  const rankParams = { by };
  const { data: ranking = [], isLoading } = useGetFranchiseRanking(
    rankParams,
    { query: { enabled: tab === "franchises", queryKey: getGetFranchiseRankingQueryKey(rankParams) } }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        <p className="text-muted-foreground mt-1">Performance de execução e benchmarking de iniciativas</p>
      </div>

      <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("franchises")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            tab === "franchises"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            Franquias
          </span>
        </button>
        <button
          onClick={() => setTab("initiatives")}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
            tab === "initiatives"
              ? "bg-card shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Iniciativas
          </span>
        </button>
      </div>

      {tab === "franchises" && (
        <>
          <div className="flex justify-end">
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

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : ranking.length === 0 ? (
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
        </>
      )}

      {tab === "initiatives" && <InitiativeRanking />}
    </div>
  );
}
