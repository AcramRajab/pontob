import { useAuth } from "@/lib/auth";
import { useListAlerts, useResolveAlert, getListAlertsQueryKey, type ListAlertsParams } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const severityColor: Record<string, string> = {
  critical: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
  low: "bg-blue-50 text-blue-700 border-blue-200",
};

const severityIcon: Record<string, typeof AlertTriangle> = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: AlertCircle,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function Alerts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState("open");

  const alertParams = { franchiseId: user?.franchiseId ?? undefined, status: filter !== "all" ? filter : undefined };
  const { data: alerts = [], isLoading } = useListAlerts(
    alertParams,
    { query: { enabled: !!user, queryKey: getListAlertsQueryKey(alertParams) } }
  );

  const resolve = useResolveAlert();

  const handleResolve = async (id: number) => {
    try {
      await resolve.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListAlertsQueryKey({}) });
      toast({ title: "Alerta resolvido" });
    } catch {
      toast({ title: "Erro ao resolver alerta", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Alertas</h1>
        <p className="text-muted-foreground mt-1">O que não é registrado não pode ser resolvido.</p>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="open">Abertos</TabsTrigger>
          <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
      </Tabs>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500/60 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum alerta {filter === "open" ? "em aberto" : "encontrado"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert: any) => {
            const Icon = severityIcon[alert.severity] || AlertTriangle;
            return (
              <Card key={alert.id} data-testid={`card-alert-${alert.id}`}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${alert.severity === "critical" || alert.severity === "high" ? "text-destructive" : "text-yellow-600"}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-xs ${severityColor[alert.severity] || ""}`}>
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{alert.type}</span>
                          {alert.franchiseName && (
                            <span className="text-xs text-muted-foreground">{alert.franchiseName}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium mt-1 leading-snug">{alert.message}</p>
                        {alert.goalTitle && (
                          <p className="text-xs text-muted-foreground mt-0.5">Meta: {alert.goalTitle}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatDate(alert.createdAt)}</p>
                      </div>
                    </div>
                    {alert.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(alert.id)}
                        disabled={resolve.isPending}
                        data-testid={`button-resolve-${alert.id}`}
                        className="shrink-0"
                      >
                        Resolver
                      </Button>
                    )}
                    {alert.status === "resolved" && (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 shrink-0">Resolvido</Badge>
                    )}
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
