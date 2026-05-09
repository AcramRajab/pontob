import { useAuth } from "@/lib/auth";
import { useGetFranchiseDashboard, getGetFranchiseDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, LayoutDashboard, Target, CheckCircle2, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const { user } = useAuth();
  const franchiseId = user?.franchiseId;

  const dashParams = { franchiseId: franchiseId! };
  const { data, isLoading } = useGetFranchiseDashboard(
    dashParams,
    { query: { enabled: !!franchiseId, queryKey: getGetFranchiseDashboardQueryKey(dashParams) } }
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Bata o olho e saiba onde avançar.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontuação</CardTitle>
            <LayoutDashboard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.score || 0}</div>
            <p className="text-xs text-muted-foreground">{data?.scoreLabel || 'Sem dados'}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.activeGoals || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Execução da Semana</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.weekExecution || 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Metas Atrasadas</CardTitle>
            <Clock className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data?.delayedGoals || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progresso por Dimensão</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {data?.progressByDimension?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.progressByDimension} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="dimensionName" type="category" axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="progressPercentage" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados de dimensão</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Bloqueios</CardTitle>
            <CardDescription>O que não é registrado não pode ser resolvido.</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.topBlockers?.length ? (
              <ul className="space-y-2">
                {data.topBlockers.map((blocker, i) => (
                  <li key={i} className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                    <span className="text-sm">{blocker}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8 text-muted-foreground">Nenhum bloqueio registrado.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}