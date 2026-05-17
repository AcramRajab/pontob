import { useAuth } from "@/lib/auth";
import { useGetTodayOverview, getGetTodayOverviewQueryKey } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertTriangle, AlertCircle, CalendarDays, MessageCircle } from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { Link } from "wouter";

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function Today() {
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();
  const { user } = useAuth();

  const params = { franchiseId: franchiseId ?? undefined };
  const { data: overview, isLoading } = useGetTodayOverview(
    params,
    { query: { enabled: !!franchiseId, queryKey: getGetTodayOverviewQueryKey(params) } }
  );

  const { data: allCandidatos = [] } = useQuery({
    queryKey: ["candidatos-for-today", franchiseId],
    queryFn: async () => {
      const url = franchiseId
        ? `/api/recruiting/candidatos?franchiseId=${franchiseId}`
        : `/api/recruiting/candidatos`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) return [];
      return r.json() as Promise<any[]>;
    },
    enabled: !!franchiseId && !!user,
  });

  const now = Date.now();
  const in48h = now + 48 * 60 * 60 * 1000;
  const upcomingInterviews = allCandidatos
    .filter((c) => c.interviewAt)
    .filter((c) => {
      const t = new Date(c.interviewAt).getTime();
      return t >= now - 60 * 60 * 1000 && t <= in48h;
    })
    .sort((a, b) => new Date(a.interviewAt).getTime() - new Date(b.interviewAt).getTime());

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
            <Link href="/goals">
              <Card className="cursor-pointer transition-colors hover:bg-accent/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
                  <TargetIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overview?.activeGoals || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Ver todas as metas →</p>
                </CardContent>
              </Card>
            </Link>
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

          {/* Upcoming interviews */}
          {upcomingInterviews.length > 0 && (
            <Card className="border-purple-200 bg-purple-50/40">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-base text-purple-800">
                    Entrevistas próximas
                  </CardTitle>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    {upcomingInterviews.length}
                  </span>
                </div>
                <CardDescription>Candidatos com entrevista agendada nas próximas 48h.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingInterviews.map((c) => {
                  const isToday = new Date(c.interviewAt).toDateString() === new Date().toDateString();
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-lg border border-purple-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isToday ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700"}`}>
                            {isToday ? formatTime(c.interviewAt) : `${formatDate(c.interviewAt)} ${formatTime(c.interviewAt)}`}
                          </span>
                          <span className="text-sm font-medium truncate">{c.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.vagaTitle}</p>
                      </div>
                      {c.phone && (
                        <a href={whatsappUrl(c.phone)} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="h-7 px-2 gap-1 shrink-0 text-green-600 border-green-200 hover:bg-green-50">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span className="text-xs">WhatsApp</span>
                          </Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

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
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function TrophyIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}
