import {
  useListProgressHistory, getListProgressHistoryQueryKey,
  useListDailyCheckins, getListDailyCheckinsQueryKey,
  useListWeeklyCheckins, getListWeeklyCheckinsQueryKey,
  useListMonthlyCheckins, getListMonthlyCheckinsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History, TrendingUp, TrendingDown, CheckSquare, Calendar, BarChart2,
  CheckCircle2, MinusCircle, XCircle, AlertCircle,
} from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { useState } from "react";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const executionLabel: Record<string, string> = {
  sim: "Executou",
  parcialmente: "Parcialmente",
  nao: "Não executou",
};

const executionColor: Record<string, string> = {
  sim: "bg-green-50 text-green-700 border-green-200",
  parcialmente: "bg-yellow-50 text-yellow-700 border-yellow-200",
  nao: "bg-red-50 text-red-600 border-red-200",
};

function ExecutionIcon({ v }: { v: string }) {
  if (v === "sim") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (v === "parcialmente") return <MinusCircle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

export default function HistoryPage() {
  const [tab, setTab] = useState("all");
  const { franchiseId, isAdmin, isSocio, franchises, adminFranchiseId, setAdminFranchiseId, socioFranchiseId, setSocioFranchiseId } = useFranchiseContext();

  const fid = franchiseId ?? undefined;
  const enabled = !!franchiseId;
  const queryOpts = (key: any) => ({ query: { enabled, queryKey: key } });

  const { data: daily = [], isLoading: loadingDaily } = useListDailyCheckins(
    { franchiseId: fid }, queryOpts(getListDailyCheckinsQueryKey({ franchiseId: fid }))
  );
  const { data: weekly = [], isLoading: loadingWeekly } = useListWeeklyCheckins(
    { franchiseId: fid }, queryOpts(getListWeeklyCheckinsQueryKey({ franchiseId: fid }))
  );
  const { data: monthly = [], isLoading: loadingMonthly } = useListMonthlyCheckins(
    { franchiseId: fid }, queryOpts(getListMonthlyCheckinsQueryKey({ franchiseId: fid }))
  );
  const { data: progress = [], isLoading: loadingProgress } = useListProgressHistory(
    { franchiseId: fid }, queryOpts(getListProgressHistoryQueryKey({ franchiseId: fid }))
  );

  const isLoading = enabled && (loadingDaily || loadingWeekly || loadingMonthly || loadingProgress);

  type HistItem = { id: string; type: string; date: string; data: any };

  const allItems: HistItem[] = [
    ...(daily as any[]).map(c => ({ id: `d-${c.id}`, type: "daily", date: c.createdAt, data: c })),
    ...(weekly as any[]).map(c => ({ id: `w-${c.id}`, type: "weekly", date: c.createdAt, data: c })),
    ...(monthly as any[]).map(c => ({ id: `m-${c.id}`, type: "monthly", date: c.createdAt, data: c })),
    ...(progress as any[]).map(p => ({ id: `p-${p.id}`, type: "progress", date: p.createdAt, data: p })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = tab === "all" ? allItems : allItems.filter(i => {
    if (tab === "checkins") return ["daily", "weekly", "monthly"].includes(i.type);
    if (tab === "progress") return i.type === "progress";
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Histórico</h1>
        <p className="text-muted-foreground mt-1">Registro de check-ins e atualizações de progresso</p>
      </div>

      {(isAdmin || isSocio) && (
        <FranchisePicker franchises={franchises} value={isSocio ? socioFranchiseId : adminFranchiseId} onChange={isSocio ? setSocioFranchiseId : setAdminFranchiseId} />
      )}

      {(isAdmin || isSocio) && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar o histórico." />
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="all">Todos ({allItems.length})</TabsTrigger>
                <TabsTrigger value="checkins">
                  Check-ins ({allItems.filter(i => i.type !== "progress").length})
                </TabsTrigger>
                <TabsTrigger value="progress">
                  Progresso ({(progress as any[]).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <History className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum registro encontrado</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Os check-ins e atualizações de progresso aparecerão aqui
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-3 pl-10">
                {filtered.map(item => (
                  <div key={item.id} className="relative" data-testid={`history-item-${item.id}`}>
                    <div className="absolute -left-6 top-3.5 w-3 h-3 rounded-full border-2 border-background bg-primary" />
                    {item.type === "daily" && <DailyCard item={item.data} />}
                    {item.type === "weekly" && <WeeklyCard item={item.data} />}
                    {item.type === "monthly" && <MonthlyCard item={item.data} />}
                    {item.type === "progress" && <ProgressCard item={item.data} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DailyCard({ item }: { item: any }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <CheckSquare className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-in Diário</span>
                {item.goalTitle && <span className="text-xs text-muted-foreground truncate">{item.goalTitle}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.executedToday && (
                  <div className="flex items-center gap-1">
                    <ExecutionIcon v={item.executedToday} />
                    <Badge variant="outline" className={`text-xs ${executionColor[item.executedToday] || ""}`}>
                      {executionLabel[item.executedToday] || item.executedToday}
                    </Badge>
                  </div>
                )}
                {item.progressToday != null && (
                  <span className="text-xs text-muted-foreground">{item.progressToday}% progresso</span>
                )}
                {item.needsHelp && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                    <AlertCircle className="h-3 w-3 mr-1" />Pediu apoio
                  </Badge>
                )}
              </div>
              {item.blocker && (
                <p className="text-xs text-muted-foreground mt-1 italic">Bloqueio: {item.blocker}</p>
              )}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{formatDate(item.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyCard({ item }: { item: any }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-in Semanal</span>
                {item.goalTitle && <span className="text-xs text-muted-foreground truncate">{item.goalTitle}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.executionPercentage != null && (
                  <span className="text-xs font-medium">{item.executionPercentage}% executado</span>
                )}
                {item.checkinDaysCount != null && (
                  <span className="text-xs text-muted-foreground">{item.checkinDaysCount} dias registrados</span>
                )}
                {item.needsRegionalSupport && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                    <AlertCircle className="h-3 w-3 mr-1" />Apoio regional
                  </Badge>
                )}
              </div>
              {item.blockers && (
                <p className="text-xs text-muted-foreground mt-1 italic">Bloqueio: {item.blockers}</p>
              )}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{formatDate(item.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyCard({ item }: { item: any }) {
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <BarChart2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-in Mensal</span>
                {item.goalTitle && <span className="text-xs text-muted-foreground truncate">{item.goalTitle}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.monthlyProgress != null && (
                  <span className="text-xs font-medium">{item.monthlyProgress}% do mês</span>
                )}
                {item.kriCurrentValue != null && (
                  <span className="text-xs text-muted-foreground">KRI: {item.kriCurrentValue}</span>
                )}
              </div>
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{formatDate(item.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressCard({ item }: { item: any }) {
  const increased = (item.newProgress ?? 0) > (item.previousProgress ?? 0);
  return (
    <Card>
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            {increased
              ? <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              : <TrendingDown className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            }
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Atualização de Progresso
                </span>
                {item.entityType && (
                  <Badge variant="outline" className="text-xs">{item.entityType}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {item.previousProgress != null && (
                  <>
                    <span className="text-sm text-muted-foreground">{item.previousProgress}%</span>
                    {increased
                      ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                      : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    }
                    <span className="text-sm font-semibold">{item.newProgress}%</span>
                  </>
                )}
              </div>
              {(item.previousStatus || item.newStatus) && (
                <div className="flex items-center gap-1.5 mt-1">
                  {item.previousStatus && <Badge variant="outline" className="text-xs">{item.previousStatus}</Badge>}
                  {item.newStatus && item.newStatus !== item.previousStatus && (
                    <>
                      <span className="text-muted-foreground text-xs">→</span>
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/30">
                        {item.newStatus}
                      </Badge>
                    </>
                  )}
                </div>
              )}
              {item.note && <p className="text-xs text-muted-foreground mt-1 italic">{item.note}</p>}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{formatDate(item.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
