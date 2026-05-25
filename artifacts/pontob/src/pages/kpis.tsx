import { useAuth } from "@/lib/auth";
import { useListGoals, getListGoalsQueryKey } from "@workspace/api-client-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Loader2, BarChart2, Target, TrendingUp, TrendingDown, Minus,
  ArrowRight, Search, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { progressColorClass, progressBarClass } from "@/lib/progress-color";
import { ProgressLegend } from "@/components/progress-legend";
import { useMemo, useState } from "react";

const FREQ_LABEL: Record<string, string> = {
  diario: "dia",
  semanal: "semana",
  mensal: "mês",
  trimestral: "trimestre",
  semestral: "semestre",
  anual: "ano",
};

function kpiPct(kpi: any): number {
  const cur: number = kpi.currentValue ?? 0;
  const tgt: number = kpi.targetValue ?? 0;
  return tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
}

function DirectionIcon({ direction }: { direction?: string }) {
  if (direction === "diminuir") return <TrendingDown className="h-3 w-3 text-muted-foreground/60" />;
  if (direction === "manter") return <Minus className="h-3 w-3 text-muted-foreground/60" />;
  return <TrendingUp className="h-3 w-3 text-muted-foreground/60" />;
}

function IndicatorBadge({ type }: { type?: string }) {
  const label = type === "processo" ? "Processo" : type === "resultado" ? "Resultado" : (type ?? "");
  const cls =
    type === "processo"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  if (!label) return null;
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", cls)}>
      {label}
    </span>
  );
}

export default function KpisPage() {
  const { user } = useAuth();
  const {
    franchiseId,
    isAdmin,
    isSocio,
    franchises,
    adminFranchiseId,
    setAdminFranchiseId,
    socioFranchiseId,
    setSocioFranchiseId,
  } = useFranchiseContext();

  const [search, setSearch] = useState("");

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: goals, isLoading } = useListGoals(goalParams, {
    query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) },
  });

  const canWrite = user?.role !== "responsavel_interno";

  const goalsWithKpis = useMemo(() => {
    if (!goals) return [];
    return goals
      .map((g: any) => ({ goal: g, kpis: (g.kpis ?? []) as any[] }))
      .filter(({ kpis }) => kpis.length > 0);
  }, [goals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return goalsWithKpis;
    return goalsWithKpis
      .map(({ goal, kpis }) => ({
        goal,
        kpis: kpis.filter(
          (k: any) =>
            k.name?.toLowerCase().includes(q) ||
            goal.title?.toLowerCase().includes(q) ||
            goal.keyProcessName?.toLowerCase().includes(q),
        ),
      }))
      .filter(({ kpis }) => kpis.length > 0);
  }, [goalsWithKpis, search]);

  const totalKpis = useMemo(
    () => goalsWithKpis.reduce((s, { kpis }) => s + kpis.length, 0),
    [goalsWithKpis],
  );

  const pickerSection = (isAdmin || isSocio) && (
    <>
      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}
      {isSocio && (
        <FranchisePicker
          franchises={franchises}
          value={socioFranchiseId}
          onChange={setSocioFranchiseId}
        />
      )}
    </>
  );

  if ((isAdmin || isSocio) && !franchiseId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KPIs</h1>
          <p className="text-muted-foreground mt-1">Indicadores de performance de todas as metas</p>
        </div>
        {pickerSection}
        <AdminEmptyState message="Selecione uma franquia para ver os KPIs." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KPIs</h1>
          <p className="text-muted-foreground mt-1">Indicadores de performance de todas as metas</p>
        </div>
      </div>

      {/* Franchise picker for admins/sócios */}
      {pickerSection}

      {/* Loading */}
      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Summary bar */}
          {totalKpis > 0 && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart2 className="h-4 w-4" />
                <span>
                  <strong className="text-foreground">{totalKpis}</strong> KPI{totalKpis !== 1 ? "s" : ""} em{" "}
                  <strong className="text-foreground">{goalsWithKpis.length}</strong> meta{goalsWithKpis.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ProgressLegend />
            </div>
          )}

          {/* Search */}
          {totalKpis > 0 && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Buscar KPI ou meta..."
                className="pl-9 h-8 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Empty state — no goals with KPIs */}
          {totalKpis === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <BarChart2 className="mx-auto h-10 w-10 mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum KPI cadastrado ainda.</p>
                <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                  Abra uma meta e adicione KPIs para monitorar o progresso.
                </p>
                {canWrite && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/goals">
                      <Target className="h-3.5 w-3.5 mr-1.5" />
                      Ver Metas
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* No search results */}
          {totalKpis > 0 && filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">Nenhum KPI encontrado para "{search}".</p>
            </div>
          )}

          {/* KPIs grouped by goal */}
          {filtered.map(({ goal, kpis }) => (
            <div key={goal.id} className="space-y-2">
              {/* Goal header */}
              <div className="flex items-center gap-2 px-1">
                <Target className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
                  {goal.title}
                </span>
                <span className="text-[10px] text-muted-foreground/50 shrink-0 hidden sm:inline">
                  {goal.dimensionName} · {goal.keyProcessName}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-6 px-2 text-[11px] text-muted-foreground shrink-0"
                  asChild
                >
                  <Link href={`/goals/${goal.id}`}>
                    Ver meta <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </div>

              {/* KPI cards */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.map((kpi: any) => {
                  const pct = kpiPct(kpi);
                  const freqLabel = kpi.frequency ? (FREQ_LABEL[kpi.frequency] ?? kpi.frequency) : null;
                  return (
                    <Card
                      key={kpi.id}
                      className={cn(
                        "transition-colors",
                        canWrite && "hover:border-primary/40 cursor-pointer",
                      )}
                      onClick={
                        canWrite
                          ? () => { window.location.href = `/goals/${goal.id}`; }
                          : undefined
                      }
                    >
                      <CardContent className="pt-4 pb-4 space-y-2.5">
                        {/* Name + percentage */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-tight line-clamp-2 flex-1">{kpi.name}</p>
                          <span className={cn("text-base font-bold tabular-nums shrink-0", progressColorClass(pct))}>
                            {pct}%
                          </span>
                        </div>

                        {/* Progress bar */}
                        <Progress value={Math.min(100, pct)} className={cn("h-1.5", progressBarClass(pct))} />

                        {/* Values + metadata */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            <strong className="text-foreground tabular-nums">
                              {(kpi.currentValue ?? 0).toLocaleString("pt-BR")}
                            </strong>
                            {kpi.targetValue != null && (
                              <span className="text-muted-foreground/70">
                                {" "}/ {kpi.targetValue.toLocaleString("pt-BR")}{kpi.unit ? ` ${kpi.unit}` : ""}
                              </span>
                            )}
                            {freqLabel && (
                              <span className="text-muted-foreground/50"> por {freqLabel}</span>
                            )}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <DirectionIcon direction={kpi.desiredDirection} />
                            <IndicatorBadge type={kpi.indicatorType} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
