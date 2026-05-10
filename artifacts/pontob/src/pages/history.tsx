import { useListProgressHistory, getListProgressHistoryQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp, TrendingDown } from "lucide-react";
import { useFranchiseContext, FranchisePicker, AdminEmptyState } from "@/hooks/use-franchise-context";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function HistoryPage() {
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();

  const histParams = { franchiseId: franchiseId ?? undefined };
  const { data: history = [], isLoading } = useListProgressHistory(
    histParams,
    { query: { enabled: !!franchiseId, queryKey: getListProgressHistoryQueryKey(histParams) } }
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Histórico de Progresso</h1>
        <p className="text-muted-foreground mt-1">Registro completo de atualizações e mudanças de status</p>
      </div>

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar o histórico." />
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : history.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Nenhum histórico encontrado</p>
            <p className="text-xs text-muted-foreground/70 mt-1">As atualizações de progresso aparecerão aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-4 pl-10">
            {history.map((item: any) => {
              const increased = (item.newProgress ?? 0) > (item.previousProgress ?? 0);
              return (
                <div key={item.id} data-testid={`history-item-${item.id}`} className="relative">
                  <div className="absolute -left-6 top-3 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                  <Card>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.entityType}</span>
                            {item.userName && (
                              <span className="text-xs text-muted-foreground">por {item.userName}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {item.previousProgress != null && (
                              <>
                                <span className="text-sm text-muted-foreground">{item.previousProgress}%</span>
                                {increased
                                  ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                                  : <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                                }
                                <span className="text-sm font-semibold">{item.newProgress}%</span>
                              </>
                            )}
                          </div>
                          {(item.previousStatus || item.newStatus) && (
                            <div className="flex items-center gap-2 mt-1">
                              {item.previousStatus && (
                                <Badge variant="outline" className="text-xs">{item.previousStatus}</Badge>
                              )}
                              {item.newStatus && item.newStatus !== item.previousStatus && (
                                <>
                                  <span className="text-muted-foreground text-xs">→</span>
                                  <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/30">{item.newStatus}</Badge>
                                </>
                              )}
                            </div>
                          )}
                          {item.note && <p className="text-xs text-muted-foreground mt-1.5 italic">{item.note}</p>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDate(item.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
