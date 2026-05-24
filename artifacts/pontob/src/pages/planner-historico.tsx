import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import {
  ChevronLeft, ChevronRight, BarChart2, TrendingUp,
  Users, Building2, LineChart as LineChartIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    key: "recrutamento",
    label: "Recrutamento",
    icon: Users,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    indicators: [
      { key: "reunioes_agendadas",          label: "Reuniões agendadas",        color: "#3b82f6", isNegative: false },
      { key: "reunioes_realizadas",          label: "Reuniões realizadas",       color: "#1d4ed8", isNegative: false },
      { key: "corretores_entraram",          label: "Corretores entraram",       color: "#10b981", isNegative: false },
      { key: "estagiarios_entraram",         label: "Estagiários entraram",      color: "#06b6d4", isNegative: false },
      { key: "corretores_sairam",            label: "Corretores saíram",         color: "#ef4444", isNegative: true  },
      { key: "estagiarios_sairam",           label: "Estagiários saíram",        color: "#f97316", isNegative: true  },
    ],
  },
  {
    key: "operacao",
    label: "Operação",
    icon: Building2,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
    indicators: [
      { key: "novos_contratos_representacao", label: "Novos contratos de representação", color: "#8b5cf6", isNegative: false },
      { key: "contratos_cancelados",          label: "Contratos cancelados",             color: "#ef4444", isNegative: true  },
      { key: "contratos_vendidos",            label: "Contratos vendidos",               color: "#10b981", isNegative: false },
    ],
  },
  {
    key: "vendas",
    label: "Vendas",
    icon: TrendingUp,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    indicators: [
      { key: "venda_assinada",  label: "VGV (R$)",                       color: "#10b981", isNegative: false },
      { key: "venda_realizada", label: "VGC Recebido e reportado (R$)", color: "#34d399", isNegative: false },
    ],
  },
];

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type WeekEntry = { weekStartDate: string; totals: Record<string, number> };
type HistoryData = {
  year: number;
  franchiseId: number;
  weeks: WeekEntry[];
  metas: Record<string, number | null>;
  indicators: { key: string; label: string }[];
};
type ChartType = "line" | "bar";
type ViewMode = "weekly" | "monthly";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isVgh(key: string) { return key.includes("venda"); }

function fmtVal(v: number, key: string, compact = false) {
  if (!isVgh(key)) return compact ? String(Math.round(v)) : String(Math.round(v));
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$${Math.round(v / 1_000)}k`;
  return `R$${Math.round(v)}`;
}

function formatWeekLabel(d: string) {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}
function getMonth(d: string) { return parseInt(d.split("-")[1]) - 1; }

// ─── Custom tooltip (per-indicator chart) ─────────────────────────────────────

function MiniTooltip({ active, payload, label, indicatorKey }: any) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border bg-card shadow-md px-2.5 py-1.5 text-xs">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="tabular-nums font-bold" style={{ color: payload[0]?.stroke ?? payload[0]?.fill }}>
        {fmtVal(Number(val), indicatorKey)}
      </p>
    </div>
  );
}

// ─── Per-indicator mini chart ─────────────────────────────────────────────────

function IndicatorChart({
  data,
  indicatorKey,
  label,
  color,
  monthlyMeta,
  chartType,
  viewMode,
}: {
  data: { label: string; value: number }[];
  indicatorKey: string;
  label: string;
  color: string;
  monthlyMeta: number | null;
  chartType: ChartType;
  viewMode: ViewMode;
}) {
  const ytd = data.reduce((s, d) => s + d.value, 0);
  const pct = monthlyMeta && monthlyMeta > 0 ? Math.round((ytd / monthlyMeta) * 100) : null;
  const pctColor = pct == null ? "" : pct >= 100 ? "text-green-600" : pct >= 75 ? "text-amber-500" : "text-muted-foreground";
  const hasData = data.some(d => d.value > 0);
  const maxVal = Math.max(...data.map(d => d.value), 1);

  // Weekly reference: monthlyMeta / 4 weeks avg
  const weeklyRef = monthlyMeta && viewMode === "weekly" ? monthlyMeta / 4.33 : null;
  const monthlyRef = monthlyMeta && viewMode === "monthly" ? monthlyMeta : null;
  const refVal = weeklyRef ?? monthlyRef;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-tight truncate">{label}</p>
          {monthlyMeta != null && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">meta: {fmtVal(monthlyMeta, indicatorKey)}/mês</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-black tabular-nums leading-none" style={{ color }}>
            {fmtVal(ytd, indicatorKey)}
          </p>
          {pct != null && (
            <p className={cn("text-[10px] font-bold mt-0.5", pctColor)}>{pct}% da meta</p>
          )}
        </div>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="h-24 flex items-center justify-center text-[11px] text-muted-foreground/40 italic">
          Sem dados neste período
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={80}>
          <ComposedChart data={data} margin={{ top: 4, right: 2, left: -28, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval={data.length > 8 ? Math.floor(data.length / 6) : 0}
            />
            <YAxis hide domain={[0, Math.ceil(maxVal * 1.2) || 1]} />
            <Tooltip
              content={<MiniTooltip indicatorKey={indicatorKey} />}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
            {refVal != null && (
              <ReferenceLine
                y={refVal}
                stroke={color}
                strokeDasharray="4 2"
                strokeWidth={1}
                opacity={0.5}
              />
            )}
            {chartType === "bar" ? (
              <Bar
                dataKey="value"
                fill={color}
                opacity={0.85}
                radius={[3, 3, 0, 0]}
                maxBarSize={viewMode === "weekly" ? 12 : 32}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3, fill: color, strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlannerHistorico() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const [chartType, setChartType] = useState<ChartType>("line");
  const { franchiseId, isAdmin, isSocio, franchises, adminFranchiseId, setAdminFranchiseId, socioFranchiseId, setSocioFranchiseId } = useFranchiseContext();
  const currentYear = new Date().getFullYear();

  const { data, isLoading } = useQuery<HistoryData>({
    queryKey: ["planner-history", franchiseId, year],
    queryFn: async () => {
      const res = await fetch(`/api/planner/history?franchiseId=${franchiseId}&year=${year}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!franchiseId,
  });

  function buildChartData(indicatorKey: string): { label: string; value: number }[] {
    if (!data?.weeks?.length) return [];

    if (viewMode === "weekly") {
      return data.weeks.map(w => ({
        label: formatWeekLabel(w.weekStartDate),
        value: w.totals[indicatorKey] ?? 0,
      }));
    }

    // Monthly aggregation
    const monthly: Record<number, number> = {};
    for (const w of data.weeks) {
      const m = getMonth(w.weekStartDate);
      monthly[m] = (monthly[m] ?? 0) + (w.totals[indicatorKey] ?? 0);
    }
    return Object.entries(monthly)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([m, total]) => ({ label: MONTH_LABELS[Number(m)], value: total }));
  }

  const hasAnyData = (data?.weeks?.length ?? 0) > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Planner Semanal</p>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-primary" />
            Histórico de Indicadores
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Evolução {viewMode === "monthly" ? "mensal" : "semanal"} por indicador · {year}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Chart type toggle */}
          <div className="flex items-center rounded-lg border bg-card p-1 gap-0.5">
            <Button
              variant={chartType === "line" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs rounded-md gap-1.5"
              onClick={() => setChartType("line")}
            >
              <LineChartIcon className="h-3 w-3" />
              Linha
            </Button>
            <Button
              variant={chartType === "bar" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs rounded-md gap-1.5"
              onClick={() => setChartType("bar")}
            >
              <BarChart2 className="h-3 w-3" />
              Barras
            </Button>
          </div>

          {/* Period toggle */}
          <div className="flex items-center rounded-lg border bg-card p-1 gap-0.5">
            <Button
              variant={viewMode === "monthly" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs rounded-md"
              onClick={() => setViewMode("monthly")}
            >
              Mensal
            </Button>
            <Button
              variant={viewMode === "weekly" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs rounded-md"
              onClick={() => setViewMode("weekly")}
            >
              Semanal
            </Button>
          </div>

          {/* Year selector */}
          <div className="flex items-center gap-0.5 rounded-xl border bg-card shadow-sm p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setYear(y => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className={cn("font-bold text-base px-3 min-w-[56px] text-center tabular-nums", year === currentYear ? "text-primary" : "text-foreground")}>
              {year}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => setYear(y => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {(isAdmin || isSocio) && franchises.length > 1 && (
        <FranchisePicker
          franchises={franchises}
          value={isSocio ? socioFranchiseId : adminFranchiseId}
          onChange={isSocio ? setSocioFranchiseId : setAdminFranchiseId}
        />
      )}

      {!franchiseId && (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar o histórico." />
      )}

      {franchiseId && isLoading && (
        <div className="space-y-4">
          {[0, 1, 2].map(i => <div key={i} className="h-64 rounded-2xl bg-muted/30 animate-pulse" />)}
        </div>
      )}

      {franchiseId && !isLoading && !hasAnyData && (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <BarChart2 className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="font-semibold text-foreground">Nenhum dado registrado em {year}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use o Planner Semanal para inserir dados diários — o histórico aparecerá aqui automaticamente.
            </p>
          </div>
        </div>
      )}

      {franchiseId && !isLoading && hasAnyData && (
        <div className="space-y-8">
          {SECTIONS.map(section => {
            const SectionIcon = section.icon;
            return (
              <div key={section.key}>
                {/* Section header */}
                <div className="flex items-center gap-2 mb-4">
                  <div className={cn("w-2.5 h-2.5 rounded-full", section.dot)} />
                  <SectionIcon className={cn("h-4 w-4", section.color)} />
                  <span className={cn("font-bold text-base", section.color)}>{section.label}</span>
                  <div className="h-px flex-1 bg-border ml-1" />
                </div>

                {/* Grid of per-indicator charts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {section.indicators.map(ind => (
                    <IndicatorChart
                      key={ind.key}
                      data={buildChartData(ind.key)}
                      indicatorKey={ind.key}
                      label={ind.label}
                      color={ind.color}
                      monthlyMeta={data?.metas?.[ind.key] ?? null}
                      chartType={chartType}
                      viewMode={viewMode}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
