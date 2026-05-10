import { useAuth } from "@/lib/auth";
import { useGetTodayOverview, getGetTodayOverviewQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { useFranchiseContext, FranchisePicker, AdminEmptyState } from "@/hooks/use-franchise-context";
import { Link } from "wouter";

export default function Today() {
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();

  const params = { franchiseId: franchiseId ?? undefined };
  const { data: overview, isLoading } = useGetTodayOverview(
    params,
    { query: { enabled: !!franchiseId, queryKey: getGetTodayOverviewQueryKey(params) } }
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hoje</h1>
        <p className="text-muted-foreground mt-2">Dois minutos para não perder a semana.</p>
      </div>

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar o painel de hoje." />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
                <TargetIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.activeGoals || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas Pendentes</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.pendingAlerts?.length || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pontuação da Semana</CardTitle>
                <TrophyIcon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overview?.weekScore || 0}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Iniciativas de Hoje</CardTitle>
                <CardDescription>O que precisa ser executado agora.</CardDescription>
              </CardHeader>
              <CardContent>
                {overview?.initiativesForToday?.length ? (
                  <div className="space-y-4">
                    {overview.initiativesForToday.map(init => (
                      <div key={init.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium">{(init as any).initiativeName || "Iniciativa"}</div>
                          <div className="text-sm text-muted-foreground">{(init as any).dimensionName}</div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <Link href="/checkin/daily">Check-in</Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    <CheckCircle2 className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p>Nenhuma iniciativa agendada para hoje.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="col-span-1">
              <CardHeader>
                <CardTitle>Alertas Recentes</CardTitle>
                <CardDescription>O que não é registrado não pode ser resolvido.</CardDescription>
              </CardHeader>
              <CardContent>
                {overview?.pendingAlerts?.length ? (
                   <div className="space-y-4">
                     {overview.pendingAlerts.map(alert => (
                       <div key={alert.id} className="flex items-start space-x-3 p-4 border rounded-lg border-destructive/20 bg-destructive/5">
                         <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                         <div>
                           <div className="font-medium text-destructive">{alert.type}</div>
                           <div className="text-sm text-muted-foreground mt-1">{alert.message}</div>
                         </div>
                       </div>
                     ))}
                   </div>
                ) : (
                   <div className="text-center p-8 text-muted-foreground">
                     <CheckCircle2 className="mx-auto h-8 w-8 mb-2 opacity-50 text-green-500" />
                     <p>Nenhum alerta pendente.</p>
                   </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function TargetIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function TrophyIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
