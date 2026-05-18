import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, BarChart2, TrendingUp, Users, Building2, ArrowRightCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";

const SECTIONS = [
  {
    key: "recrutamento",
    label: "Recrutamento",
    icon: Users,
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    chartColor: "#3b82f6",
    indicators: [
      { key: "reunioes_agendadas", label: "Reuniões agendadas" },
      { key: "reunioes_realizadas", label: "Reuniões realizadas" },
      { key: "corretores_entraram", label: "Corretores entraram" },
      { key: "estagiarios_entraram", label: "Estagiários entraram" },
      { key: "corretores_sairam", label: "Corretores saíram" },
      { key: "estagiarios_sairam", label: "Estagiários saíram" },
    ],
    indicatorColors: ["#3b82f6", "#60a5fa", "#1d4ed8", "#93c5fd", "#ef4444", "#fca5a5"],
  },
  {
    key: "operacao",
    label: "Operação",
    icon: Building2,
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
    chartColor: "#8b5cf6",
    indicators: [
      { key: "novos_contratos_representacao", label: "Novos contratos de representação" },
      { key: "contratos_cancelados", label: "Contratos cancelados" },
      { key: "contratos_vendidos", label: "Contratos vendidos" },
    ],
    indicatorColors: ["#8b5cf6", "#ef4444", "#10b981"],
  },
  {
    key: "vendas",
    label: "Vendas",
    icon: TrendingUp,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    chartColor: "#10b981",
    indicators: [
      { key: "venda_assinada", label: "Venda assinada (R$)" },
      { key: "venda_realizada", label: "Venda realizada (R$)" },
    ],
    indicatorColors: ["#10b981", "#34d399"],
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

type ViewMode = "weekly" | "monthly";

function formatWeekLabel(weekStartDate: string): string {
  const [, m, d] = weekStartDate.split("-");
  return `${d}/${m}`;
}

function getMonth(weekStartDate: string): number {
  return parseInt(weekStartDate.split("-")[1]) - 1;
}

function isVgh(key: string) {
  return key.includes("venda");
}

function fmtVal(v: number, key: string) {
  if (!isVgh(key)) return String(Math.round(v));
  if (v >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$${Math.round(v / 1_000)}k`;
  return `R$${Math.round(v)}`;
}

function CustomTooltip({ active, payload, label, sectionIndicators }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card shadow-lg px-3 py-2.5 text-xs space-y-1.5">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.fill }} />
            <span className="text-muted-foreground">{sectionIndicators.find((i: any) => i.key === p.dataKey)?.label ?? p.dataKey}</span>
          </span>
          <span className="font-semibold tabular-nums">{fmtVal(p.value, p.dataKey)}</span>
        </div>
      ))}
    </div>
  );
}

export default function PlannerHistorico() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<ViewMode>("monthly");
  const franchiseId = user?.franchiseId;

  const { data, isLoading } = useQuery<HistoryData>({
    queryKey: ["planner-history", franchiseId, year],
    queryFn: async () => {
      const res = await fetch(`/api/planner/history?franchiseId=${franchiseId}&year=${year}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!franchiseId,
  });

  // Build chart data per view mode
  function buildChartData(indicatorKeys: string[]) {
    if (!data?.weeks?.length) return [];

    if (viewMode === "weekly") {
      return data.weeks.map(w => ({
        label: formatWeekLabel(w.weekStartDate),
        weekStartDate: w.weekStartDate,
        ...Object.fromEntries(indicatorKeys.map(k => [k, w.totals[k] ?? 0])),
      }));
    }

    // Monthly: aggregate weeks into months
    const monthly: Record<number, Record<string, number>> = {};
    for (const w of data.weeks) {
      const m = getMonth(w.weekStartDate);
      if (!monthly[m]) monthly[m] = {};
      for (const k of indicatorKeys) {
        monthly[m][k] = (monthly[m][k] ?? 0) + (w.totals[k] ?? 0);
      }
    }
    return Object.entries(monthly)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([m, totals]) => ({
        label: MONTH_LABELS[Number(m)],
        ...Object.fromEntries(indicatorKeys.map(k => [k, totals[k] ?? 0])),
      }));
  }

  // Cumulative YTD total per indicator
  function ytdTotal(key: string): number {
    if (!data?.weeks) return 0;
    return data.weeks.reduce((s, w) => s + (w.totals[key] ?? 0), 0);
  }

  const hasAnyData = (data?.weeks?.length ?? 0) > 0;
  const currentYear = new Date().getFullYear();

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
          <p className="text-sm text-muted-foreground mt-0.5">Evolução semanal e mensal acumulada por categoria</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
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

      {!franchiseId && (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Selecione uma franquia para visualizar o histórico.
        </div>
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
            <p className="text-sm text-muted-foreground mt-1">Use o Planner Semanal para inserir dados diários — o histórico aparecerá aqui.</p>
          </div>
        </div>
      )}

      {franchiseId && !isLoading && hasAnyData && (
        <div className="space-y-6">
          {SECTIONS.map(section => {
            const chartData = buildChartData(section.indicators.map(i => i.key));

            return (
              <div key={section.key} className={cn("rounded-2xl border-2 overflow-hidden", section.border)}>
                {/* Section header */}
                <div className={cn("px-5 py-3 flex items-center justify-between gap-3", section.bg)}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2.5 h-2.5 rounded-full", section.dot)} />
                    <span className={cn("font-bold text-sm", section.color)}>{section.label}</span>
                  </div>
                </div>

                {/* YTD summary strip */}
                <div className="px-5 py-3 border-b border-border/40 bg-muted/20">
                  <div className="flex flex-wrap gap-x-6 gap-y-1.5">
                    {section.indicators.map((ind, i) => {
                      const ytd = ytdTotal(ind.key);
                      const meta = data?.metas?.[ind.key] ?? null;
                      const pct = meta && meta > 0 ? Math.round((ytd / meta) * 100) : null;
                      return (
                        <div key={ind.key} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: section.indicatorColors[i] }} />
                          <span className="text-xs text-muted-foreground">{ind.label}:</span>
                          <span className="text-xs font-bold tabular-nums text-foreground">{fmtVal(ytd, ind.key)}</span>
                          {pct != null && (
                            <span className={cn("text-[10px] font-semibold", pct >= 100 ? "text-green-600" : pct >= 75 ? "text-amber-500" : "text-muted-foreground")}>
                              ({pct}%)
                            </span>
                          )}
                          {meta != null && (
                            <span className="text-[10px] text-muted-foreground/50">meta: {fmtVal(Number(meta), ind.key)}/mês</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Chart */}
                <div className="px-5 pt-4 pb-5">
                  {chartData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground/50 italic">
                      Nenhum dado para este período
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barCategoryGap="30%" barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={v => isVgh(section.indicators[0]?.key) && v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                          width={40}
                        />
                        <Tooltip
                          content={<CustomTooltip sectionIndicators={section.indicators} />}
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                        />
                        {section.indicators.length > 1 && (
                          <Legend
                            formatter={(value) => {
                              const ind = section.indicators.find(i => i.key === value);
                              return <span style={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}>{ind?.label ?? value}</span>;
                            }}
                            iconSize={8}
                            iconType="circle"
                            wrapperStyle={{ paddingTop: 8 }}
                          />
                        )}
                        {section.indicators.map((ind, i) => (
                          <Bar
                            key={ind.key}
                            dataKey={ind.key}
                            name={ind.label}
                            fill={section.indicatorColors[i]}
                            radius={[3, 3, 0, 0]}
                            maxBarSize={viewMode === "weekly" ? 14 : 36}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
