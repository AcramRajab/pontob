import { useGetRegionalDashboard, getGetRegionalDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, TrendingUp, CheckCircle2, AlertTriangle, LifeBuoy } from "lucide-react";

export default function Regional() {
  const { data: dash, isLoading } = useGetRegionalDashboard(
    { query: { enabled: true, queryKey: getGetRegionalDashboardQueryKey() } }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const stats = [
    { label: "Franquias Ativas", value: dash?.activeFranchises ?? 0, icon: Building2, color: "text-primary" },
    { label: "Score Médio", value: dash?.avgScore ?? 0, icon: TrendingUp, color: "text-green-600" },
    { label: "Check-in Hoje", value: dash?.franchisesWithCheckinToday ?? 0, icon: CheckCircle2, color: "text-green-600" },
    { label: "Em Risco", value: dash?.franchisesAtRisk ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Regional</h1>
        <p className="text-muted-foreground mt-1">Bata o olho e saiba onde avançar.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} data-testid={`stat-${stat.label}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progresso por Dimensão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(dash?.progressByDimension ?? []).map((dim: any) => (
              <div key={dim.dimensionId}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{dim.dimensionName}</span>
                  <span className="text-sm font-mono">{dim.progressPercentage}%</span>
                </div>
                <Progress value={dim.progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{dim.goalsCount} metas</p>
              </div>
            ))}
            {(!dash?.progressByDimension || dash.progressByDimension.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados disponíveis</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sem Check-in nos Últimos 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">{dash?.franchisesWithoutCheckin7Days ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">franquias sem registro de execução</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Pedidos de Ajuda em Aberto</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{dash?.openHelpRequests ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">aguardando atendimento regional</p>
            </CardContent>
          </Card>

          {dash?.topBlockers && dash.topBlockers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bloqueios Mais Citados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {dash.topBlockers.map((b: string, i: number) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-medium">{i + 1}.</span> {b}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
