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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  History, TrendingUp, TrendingDown, CheckSquare, Calendar, BarChart2,
  CheckCircle2, MinusCircle, XCircle, AlertCircle, ChevronRight, Clock, HelpingHand,
} from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { useState } from "react";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDateOnly(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function DailyDetailSheet({ item, open, onClose }: { item: any; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            Check-in Diário
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {item.goalTitle && <DetailRow label="Meta" value={<span className="font-medium">{item.goalTitle}</span>} />}
          <DetailRow label="Data" value={item.date ? formatDateOnly(item.date) : formatDate(item.createdAt)} />
          {item.executedToday && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Executou hoje?</p>
              <div className="flex items-center gap-2">
                <ExecutionIcon v={item.executedToday} />
                <Badge variant="outline" className={executionColor[item.executedToday] ?? ""}>
                  {executionLabel[item.executedToday] ?? item.executedToday}
                </Badge>
              </div>
            </div>
          )}
          {item.progressToday != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Progresso de hoje</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.progressToday}%` }} />
                </div>
                <span className="text-sm font-mono font-medium w-10 text-right">{item.progressToday}%</span>
              </div>
            </div>
          )}
          <DetailRow label="Bloqueio ou dificuldade" value={item.blocker} />
          <DetailRow label="Próximo passo" value={item.nextStep} />
          {item.timeSpent && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Tempo dedicado</p>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{item.timeSpent}</span>
              </div>
            </div>
          )}
          {item.needsHelp && (
            <div className="flex items-center gap-1.5 text-sm text-amber-700 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <HelpingHand className="h-4 w-4 shrink-0" />
              <span>Solicitou apoio da regional</span>
            </div>
          )}
          <DetailRow label="Notas" value={item.notes} />
          {item.userName && <DetailRow label="Registrado por" value={item.userName} />}
          <DetailRow label="Criado em" value={formatDate(item.createdAt)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function WeeklyDetailSheet({ item, open, onClose }: { item: any; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            Check-in Semanal
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {item.goalTitle && <DetailRow label="Meta" value={<span className="font-medium">{item.goalTitle}</span>} />}
          {item.weekStartDate && <DetailRow label="Semana de" value={formatDateOnly(item.weekStartDate)} />}
          <DetailRow label="O que foi planejado" value={item.planned} />
          <DetailRow label="O que foi executado" value={item.executed} />
          {item.executionPercentage != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Percentual executado</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.executionPercentage}%` }} />
                </div>
                <span className="text-sm font-mono font-medium w-10 text-right">{item.executionPercentage}%</span>
              </div>
            </div>
          )}
          <DetailRow label="Resumo do progresso" value={item.progressSummary} />
          <DetailRow label="Principais bloqueios" value={item.blockers} />
          <DetailRow label="Ajustes necessários" value={item.adjustments} />
          <DetailRow label="Prioridade da próxima semana" value={item.nextWeekPriority} />
          <DetailRow label="Decisão sobre iniciativas" value={item.initiativeDecision} />
          {item.needsRegionalSupport && (
            <div className="flex items-center gap-1.5 text-sm text-amber-700 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Solicitou suporte da equipe regional</span>
            </div>
          )}
          {item.userName && <DetailRow label="Registrado por" value={item.userName} />}
          <DetailRow label="Criado em" value={formatDate(item.createdAt)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MonthlyDetailSheet({ item, open, onClose }: { item: any; open: boolean; onClose: () => void }) {
  const monthLabel = item.month && item.year ? `${MONTHS[(item.month as number) - 1]} ${item.year}` : null;
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-purple-500" />
            Check-in Mensal
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {item.goalTitle && <DetailRow label="Meta" value={<span className="font-medium">{item.goalTitle}</span>} />}
          {monthLabel && <DetailRow label="Mês" value={monthLabel} />}
          <DetailRow label="Evolução do KRI" value={item.kriProgress} />
          <DetailRow label="KPIs que melhoraram" value={item.improvedKpis} />
          <DetailRow label="KPIs que pioraram ou estagnaram" value={item.worsenedKpis} />
          <DetailRow label="Iniciativas que funcionaram" value={item.initiativesThatWorked} />
          <DetailRow label="Iniciativas que não funcionaram" value={item.initiativesThatDidNotWork} />
          <DetailRow label="Continuar fazendo" value={item.continueDoing} />
          <DetailRow label="Parar de fazer" value={item.stopDoing} />
          <DetailRow label="Começar a fazer" value={item.startDoing} />
          <DetailRow label="Foco do próximo mês" value={item.nextMonthFocus} />
          {item.userName && <DetailRow label="Registrado por" value={item.userName} />}
          <DetailRow label="Criado em" value={formatDate(item.createdAt)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProgressDetailSheet({ item, open, onClose }: { item: any; open: boolean; onClose: () => void }) {
  const increased = (item.newProgress ?? 0) > (item.previousProgress ?? 0);
  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {increased
              ? <TrendingUp className="h-4 w-4 text-green-600" />
              : <TrendingDown className="h-4 w-4 text-red-500" />}
            Atualização de Progresso
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {item.entityType && <DetailRow label="Tipo" value={<Badge variant="outline">{item.entityType}</Badge>} />}
          {item.previousProgress != null && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Progresso</p>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{item.previousProgress}%</span>
                {increased
                  ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                  : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                <span className="font-semibold">{item.newProgress}%</span>
              </div>
            </div>
          )}
          {(item.previousStatus || item.newStatus) && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.previousStatus && <Badge variant="outline">{item.previousStatus}</Badge>}
                {item.newStatus && item.newStatus !== item.previousStatus && (
                  <>
                    <span className="text-muted-foreground text-xs">→</span>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/30">{item.newStatus}</Badge>
                  </>
                )}
              </div>
            </div>
          )}
          <DetailRow label="Nota" value={item.note} />
          {item.userName && <DetailRow label="Registrado por" value={item.userName} />}
          <DetailRow label="Criado em" value={formatDate(item.createdAt)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

type HistItem = { id: string; type: "daily" | "weekly" | "monthly" | "progress"; date: string; data: any };

function HistoryCard({ item, onClick }: { item: HistItem; onClick: () => void }) {
  const base = "relative cursor-pointer group";
  return (
    <div className={base} data-testid={`history-item-${item.id}`} onClick={onClick}>
      <div className="absolute -left-6 top-3.5 w-3 h-3 rounded-full border-2 border-background bg-primary group-hover:bg-primary/80 transition-colors" />
      {item.type === "daily" && <DailyCard item={item.data} />}
      {item.type === "weekly" && <WeeklyCard item={item.data} />}
      {item.type === "monthly" && <MonthlyCard item={item.data} />}
      {item.type === "progress" && <ProgressCard item={item.data} />}
    </div>
  );
}

export default function HistoryPage() {
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<HistItem | null>(null);
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

  const allItems: HistItem[] = [
    ...(daily as any[]).map(c => ({ id: `d-${c.id}`, type: "daily" as const, date: c.createdAt, data: c })),
    ...(weekly as any[]).map(c => ({ id: `w-${c.id}`, type: "weekly" as const, date: c.createdAt, data: c })),
    ...(monthly as any[]).map(c => ({ id: `m-${c.id}`, type: "monthly" as const, date: c.createdAt, data: c })),
    ...(progress as any[]).map(p => ({ id: `p-${p.id}`, type: "progress" as const, date: p.createdAt, data: p })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filtered = allItems.filter(i => {
    if (tab === "all") return true;
    return i.type === tab;
  });

  const counts = {
    all: allItems.length,
    daily: allItems.filter(i => i.type === "daily").length,
    weekly: allItems.filter(i => i.type === "weekly").length,
    monthly: allItems.filter(i => i.type === "monthly").length,
    progress: allItems.filter(i => i.type === "progress").length,
  };

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
          <div className="overflow-x-auto">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="h-auto flex-wrap gap-1">
                <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
                <TabsTrigger value="daily" className="flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" />Diário ({counts.daily})
                </TabsTrigger>
                <TabsTrigger value="weekly" className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />Semanal ({counts.weekly})
                </TabsTrigger>
                <TabsTrigger value="monthly" className="flex items-center gap-1.5">
                  <BarChart2 className="h-3.5 w-3.5" />Mensal ({counts.monthly})
                </TabsTrigger>
                <TabsTrigger value="progress" className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />Progresso ({counts.progress})
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
                  <HistoryCard key={item.id} item={item} onClick={() => setSelected(item)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selected?.type === "daily" && (
        <DailyDetailSheet item={selected.data} open={true} onClose={() => setSelected(null)} />
      )}
      {selected?.type === "weekly" && (
        <WeeklyDetailSheet item={selected.data} open={true} onClose={() => setSelected(null)} />
      )}
      {selected?.type === "monthly" && (
        <MonthlyDetailSheet item={selected.data} open={true} onClose={() => setSelected(null)} />
      )}
      {selected?.type === "progress" && (
        <ProgressDetailSheet item={selected.data} open={true} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function DailyCard({ item }: { item: any }) {
  return (
    <Card className="hover:border-primary/50 hover:shadow-sm transition-all">
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
                <p className="text-xs text-muted-foreground mt-1 italic truncate max-w-xs">Bloqueio: {item.blocker}</p>
              )}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklyCard({ item }: { item: any }) {
  return (
    <Card className="hover:border-primary/50 hover:shadow-sm transition-all">
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
                {item.needsRegionalSupport && (
                  <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">
                    <AlertCircle className="h-3 w-3 mr-1" />Apoio regional
                  </Badge>
                )}
              </div>
              {item.blockers && (
                <p className="text-xs text-muted-foreground mt-1 italic truncate max-w-xs">Bloqueio: {item.blockers}</p>
              )}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MonthlyCard({ item }: { item: any }) {
  const monthLabel = item.month && item.year ? `${MONTHS[(item.month as number) - 1]} ${item.year}` : null;
  return (
    <Card className="hover:border-primary/50 hover:shadow-sm transition-all">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <BarChart2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Check-in Mensal</span>
                {item.goalTitle && <span className="text-xs text-muted-foreground truncate">{item.goalTitle}</span>}
              </div>
              {monthLabel && <p className="text-xs text-muted-foreground mt-0.5">{monthLabel}</p>}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressCard({ item }: { item: any }) {
  const increased = (item.newProgress ?? 0) > (item.previousProgress ?? 0);
  return (
    <Card className="hover:border-primary/50 hover:shadow-sm transition-all">
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
              {item.note && <p className="text-xs text-muted-foreground mt-1 italic truncate max-w-xs">{item.note}</p>}
              {item.userName && <p className="text-xs text-muted-foreground/70 mt-0.5">por {item.userName}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
