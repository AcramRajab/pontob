import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, ArrowLeft,
  Users, FileSignature, DollarSign,
  BarChart2, TrendingUp, CalendarDays,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";
import { progressColorHex } from "@/lib/progress-color";

// ── Types ────────────────────────────────────────────────────────────────────

interface Indicator { key: string; label: string; category: string }
interface PlannerMonth { month: string; monthLabel: string; totals: Record<string, number> }
interface KriQuarter {
  quarterLabel: string; quarterDate: string; description: string;
  targetCreci: number | null; actualCreci: number | null;
  targetCres: number | null; actualCres: number | null;
  targetVgh: number | null; actualVgh: number | null;
}
interface CheckinMonth { month: string; monthLabel: string; count: number }
interface DimProgress { dimensionId: number; dimensionName: string; progressPercentage: number | null; goalsCount: number }
interface FranchiseHistoryData {
  franchise: { id: number; name: string; active: boolean };
  year: number;
  plannerMonths: PlannerMonth[];
  metas: Record<string, number | null>;
  indicators: Indicator[];
  kriQuarters: KriQuarter[];
  checkinsByMonth: CheckinMonth[];
  goalProgressByDimension: DimProgress[];
}

// ── Data fetcher ─────────────────────────────────────────────────────────────

function useFranchiseHistory(franchiseId: number, year: number) {
  return useQuery<FranchiseHistoryData>({
    queryKey: ["franchise-history", franchiseId, year],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/regional/franchise/${franchiseId}?year=${year}`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar dados");
      return res.json();
    },
    staleTime: 1000 * 60,
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtVgh(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function PctBadge({ val }: { val: number | null }) {
  if (val == null) return <span className="text-xs text-muted-foreground">—</span>;
  const cls = val >= 80 ? "bg-green-50 text-green-700 border-green-200"
    : val >= 50 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-600 border-red-200";
  return <Badge variant="outline" className={`text-xs ${cls}`}>{val}%</Badge>;
}

// ── KRI Chart ────────────────────────────────────────────────────────────────

const CRECI_COLOR = "#3b82f6";
const CRES_COLOR  = "#8b5cf6";
const VGH_COLOR   = "#f59e0b";

function KriChart({ quarters }: { quarters: KriQuarter[] }) {
  const hasAny = quarters.some(q => q.targetCreci != null || q.targetCres != null || q.targetVgh != null);
  if (!hasAny) return (
    <div className="text-center py-10 text-muted-foreground text-sm">
      Nenhuma meta de KRI registrada para este período.
    </div>
  );

  // Creci / Cres
  const countData = quarters.map(q => ({
    name: q.quarterLabel,
    "Meta CRECI": q.targetCreci,
    "Real CRECI": q.actualCreci,
    "Meta CREs": q.targetCres,
    "Real CREs": q.actualCres,
  }));

  // VGH (separate scale)
  const vghData = quarters.map(q => ({
    name: q.quarterLabel,
    "Meta VGH": q.targetVgh,
    "Real VGH": q.actualVgh,
  }));

  return (
    <div className="space-y-6">
      {/* CRECI + CREs */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
          <Users className="h-3 w-3" /> CRECI &amp; <FileSignature className="h-3 w-3 ml-1" /> CREs — Meta vs Realizado
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={countData} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(v: any) => v ?? "—"} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Meta CRECI" fill={CRECI_COLOR} opacity={0.35} radius={[3,3,0,0]} />
            <Bar dataKey="Real CRECI" fill={CRECI_COLOR} radius={[3,3,0,0]} />
            <Bar dataKey="Meta CREs" fill={CRES_COLOR} opacity={0.35} radius={[3,3,0,0]} />
            <Bar dataKey="Real CREs" fill={CRES_COLOR} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* VGH */}
      {quarters.some(q => q.targetVgh != null) && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> VGH (Honorários) — Meta vs Realizado
          </p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={vghData} barGap={4} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => v ? `${(v/1000).toFixed(0)}k` : "0"} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: any) => fmtVgh(v)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Meta VGH" fill={VGH_COLOR} opacity={0.35} radius={[3,3,0,0]} />
              <Bar dataKey="Real VGH" fill={VGH_COLOR} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* KRI summary table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Período</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">CRECI</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">CREs</th>
              <th className="text-center py-2 px-2 font-medium text-muted-foreground">VGH</th>
            </tr>
          </thead>
          <tbody>
            {quarters.map((q, i) => {
              const pC = q.targetCreci != null && q.actualCreci != null ? Math.min(Math.round((q.actualCreci / q.targetCreci) * 100), 100) : null;
              const pCr = q.targetCres != null && q.actualCres != null ? Math.min(Math.round((q.actualCres / q.targetCres) * 100), 100) : null;
              const pV = q.targetVgh != null && q.actualVgh != null ? Math.min(Math.round((q.actualVgh / q.targetVgh) * 100), 100) : null;
              return (
                <tr key={q.quarterDate} className={`border-b last:border-0 ${i === 3 ? "bg-primary/5" : ""}`}>
                  <td className="py-2 pr-3">
                    <span className={`font-semibold ${i === 3 ? "text-primary" : ""}`}>{q.quarterLabel}</span>
                    <span className="text-muted-foreground ml-1">({q.description})</span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    {q.targetCreci != null ? (
                      <div>
                        <span className="font-medium">{q.targetCreci}</span>
                        {q.actualCreci != null && <span className="text-muted-foreground"> / {q.actualCreci}</span>}
                        <div><PctBadge val={pC} /></div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {q.targetCres != null ? (
                      <div>
                        <span className="font-medium">{q.targetCres}</span>
                        {q.actualCres != null && <span className="text-muted-foreground"> / {q.actualCres}</span>}
                        <div><PctBadge val={pCr} /></div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {q.targetVgh != null ? (
                      <div>
                        <span className="font-medium">{fmtVgh(q.targetVgh)}</span>
                        {q.actualVgh != null && <span className="text-muted-foreground"> / {fmtVgh(q.actualVgh)}</span>}
                        <div><PctBadge val={pV} /></div>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Planner Section Chart ────────────────────────────────────────────────────

const CATEGORY_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4",
];

function PlannerSectionChart({
  category, indicators, months, metas,
}: {
  category: string;
  indicators: Indicator[];
  months: PlannerMonth[];
  metas: Record<string, number | null>;
}) {
  const catIndicators = indicators.filter(i => i.category === category);
  const data = months.map(m => {
    const row: Record<string, any> = { name: m.monthLabel };
    for (const ind of catIndicators) row[ind.label] = m.totals[ind.key] ?? 0;
    return row;
  });

  const hasData = data.some(row => catIndicators.some(i => (row[i.label] ?? 0) > 0));
  if (!hasData) return (
    <div className="text-center py-8 text-muted-foreground text-xs">
      Sem dados de planner para este período.
    </div>
  );

  const isMoney = category === "vendas";

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
        <YAxis
          tick={{ fontSize: 10 }}
          tickFormatter={v => isMoney ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip
          formatter={(v: any, name: string) => [
            isMoney ? fmtVgh(v) : v,
            name,
          ]}
        />
        <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
        {catIndicators.map((ind, i) => (
          <Line
            key={ind.key}
            type="monotone"
            dataKey={ind.label}
            stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Check-in Chart ───────────────────────────────────────────────────────────

function CheckinChart({ data }: { data: CheckinMonth[] }) {
  if (data.length === 0) return (
    <div className="text-center py-8 text-muted-foreground text-sm">
      Nenhum check-in registrado neste período.
    </div>
  );
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
        <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(v: any) => [`${v} check-ins`, "Check-ins"]} />
        <Bar dataKey="count" name="Check-ins" radius={[3,3,0,0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.count >= 15 ? "#22c55e" : d.count >= 8 ? "#f59e0b" : "#ef4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Goal Progress ────────────────────────────────────────────────────────────

function GoalProgressSection({ dims }: { dims: DimProgress[] }) {
  const hasDims = dims.some(d => d.goalsCount > 0);
  if (!hasDims) return (
    <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma meta registrada.</div>
  );
  return (
    <div className="space-y-4">
      {dims.filter(d => d.goalsCount > 0).map(d => (
        <div key={d.dimensionId}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">{d.dimensionName}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{d.goalsCount} metas</span>
              <PctBadge val={d.progressPercentage} />
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max(d.progressPercentage ?? 0, 2)}%`,
                backgroundColor: progressColorHex(d.progressPercentage ?? 0),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const SECTION_LABELS: Record<string, string> = {
  recrutamento: "Recrutamento",
  operacao: "Operação",
  vendas: "Vendas",
};

export default function RegionalFranchise() {
  const [, params] = useRoute("/regional/franchise/:id");
  const franchiseId = parseInt(params?.id ?? "0");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [activeTab, setActiveTab] = useState<"kri" | "planner" | "checkins" | "goals">("kri");

  const { data, isLoading, isError } = useFranchiseHistory(franchiseId, year);

  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.indicators.map(i => i.category)));
  }, [data]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>Não foi possível carregar os dados desta franquia.</p>
        <Link href="/regional">
          <Button variant="outline" className="mt-4">Voltar ao Regional</Button>
        </Link>
      </div>
    );
  }

  const TABS = [
    { key: "kri" as const, label: "KRIs", icon: TrendingUp },
    { key: "planner" as const, label: "Planner", icon: BarChart2 },
    { key: "checkins" as const, label: "Check-ins", icon: CalendarDays },
    { key: "goals" as const, label: "Metas", icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <Link href="/regional">
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard Regional
          </Button>
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{data.franchise.name}</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Histórico e indicadores da franquia</p>
          </div>
          {/* Year selector */}
          <div className="flex items-center gap-1 border rounded-lg px-1 py-0.5">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setYear(y => y - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-semibold text-sm w-12 text-center">{year}</span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setYear(y => y + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Summary pills ── */}
      {data.goalProgressByDimension.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {data.goalProgressByDimension.filter(d => d.goalsCount > 0).map(d => (
            <div key={d.dimensionId} className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
              <span className="text-xs text-muted-foreground">{d.dimensionName}</span>
              <span
                className="text-sm font-bold"
                style={{ color: progressColorHex(d.progressPercentage ?? 0) }}
              >
                {d.progressPercentage != null ? `${d.progressPercentage}%` : "—"}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
            <span className="text-xs text-muted-foreground">Check-ins {year}</span>
            <span className="text-sm font-bold text-foreground">
              {data.checkinsByMonth.reduce((s, c) => s + c.count, 0)}
            </span>
          </div>
        </div>
      )}

      {/* ── Tab nav ── */}
      <div className="flex gap-1 border-b">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── KRIs Tab ── */}
      {activeTab === "kri" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              KRIs Trimestrais — {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <KriChart quarters={data.kriQuarters} />
          </CardContent>
        </Card>
      )}

      {/* ── Planner Tab ── */}
      {activeTab === "planner" && (
        <div className="space-y-4">
          {data.plannerMonths.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              Nenhum dado de planner registrado em {year}.
            </div>
          ) : (
            categories.map(cat => (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    {SECTION_LABELS[cat] ?? cat}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <PlannerSectionChart
                    category={cat}
                    indicators={data.indicators}
                    months={data.plannerMonths}
                    metas={data.metas}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Check-ins Tab ── */}
      {activeTab === "checkins" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              Frequência de Check-ins — {year}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Total de check-ins por mês. Verde ≥ 15, Amarelo ≥ 8, Vermelho &lt; 8.
            </p>
          </CardHeader>
          <CardContent>
            <CheckinChart data={data.checkinsByMonth} />
            {data.checkinsByMonth.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.checkinsByMonth.reduce((s, c) => s + c.count, 0)}</p>
                  <p className="text-xs text-muted-foreground">Total no ano</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{data.checkinsByMonth.length}</p>
                  <p className="text-xs text-muted-foreground">Meses ativos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {Math.round(data.checkinsByMonth.reduce((s, c) => s + c.count, 0) / Math.max(data.checkinsByMonth.length, 1))}
                  </p>
                  <p className="text-xs text-muted-foreground">Média/mês</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Goals Tab ── */}
      {activeTab === "goals" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Progresso das Metas por Dimensão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GoalProgressSection dims={data.goalProgressByDimension} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
