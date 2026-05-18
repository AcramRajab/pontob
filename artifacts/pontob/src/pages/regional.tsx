import {
  useGetRegionalDashboard, getGetRegionalDashboardQueryKey,
  useGetRegionalVision, getGetRegionalVisionQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Building2, TrendingUp, CheckCircle2, AlertTriangle, LifeBuoy,
  Users, FileSignature, DollarSign, ChevronLeft, ChevronRight,
  Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { progressColorHex } from "@/lib/progress-color";

const getProgressColor = progressColorHex;

function formatVgh(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency", currency: "BRL", maximumFractionDigits: 0,
  }).format(v);
}

function formatNum(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR");
}

function pct(actual: number | null | undefined, target: number | null | undefined) {
  if (actual == null || target == null || target === 0) return null;
  return Math.min(Math.round((actual / target) * 100), 100);
}

function PctBadge({ val }: { val: number | null }) {
  if (val == null) return null;
  const cls = val >= 80 ? "bg-green-50 text-green-700 border-green-200"
    : val >= 50 ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-600 border-red-200";
  return <Badge variant="outline" className={`text-xs ${cls}`}>{val}%</Badge>;
}

function KriCell({ actual, target, isVgh = false }: { actual: number | null | undefined; target: number | null | undefined; isVgh?: boolean }) {
  const p = pct(actual, target);
  return (
    <div className="text-center space-y-0.5">
      <div className="text-base font-bold">
        {isVgh ? formatVgh(target) : formatNum(target)}
      </div>
      {actual != null && (
        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <span>Atual: {isVgh ? formatVgh(actual) : formatNum(actual)}</span>
          <PctBadge val={p} />
        </div>
      )}
      {actual == null && target != null && (
        <div className="text-xs text-muted-foreground">Sem dados</div>
      )}
      {target == null && (
        <div className="text-xs text-muted-foreground italic">—</div>
      )}
      {target != null && actual != null && (
        <div className="h-1 bg-muted rounded-full overflow-hidden mt-1 mx-auto max-w-[60px]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(pct(actual, target) ?? 0, 100)}%`,
              backgroundColor: (p ?? 0) >= 80 ? "#22c55e" : (p ?? 0) >= 50 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function Regional() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [showAllFranchises, setShowAllFranchises] = useState(false);

  const { data: dash, isLoading } = useGetRegionalDashboard(
    { query: { enabled: true, queryKey: getGetRegionalDashboardQueryKey() } }
  );

  const visionParams = { year };
  const { data: vision, isLoading: visionLoading } = useGetRegionalVision(
    visionParams,
    { query: { enabled: true, queryKey: getGetRegionalVisionQueryKey(visionParams) } }
  );

  const stats = [
    { label: "Franquias Ativas", value: dash?.activeFranchises ?? 0, icon: Building2, color: "text-primary" },
    { label: "Score Médio", value: dash?.avgScore ?? 0, icon: TrendingUp, color: "text-green-600" },
    { label: "Check-in Hoje", value: dash?.franchisesWithCheckinToday ?? 0, icon: CheckCircle2, color: "text-green-600" },
    { label: "Em Risco", value: dash?.franchisesAtRisk ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  const franchisesToShow = useMemo(() => {
    if (!vision?.franchises) return [];
    const sorted = [...vision.franchises].sort((a, b) => {
      if (a.hasVision && !b.hasVision) return -1;
      if (!a.hasVision && b.hasVision) return 1;
      return a.franchiseName.localeCompare(b.franchiseName);
    });
    return showAllFranchises ? sorted : sorted.filter(f => f.hasVision);
  }, [vision?.franchises, showAllFranchises]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const QUARTERS = [
    { label: "1ºTRI", date: `${year}-03-31`, description: "Jan – Mar" },
    { label: "2ºTRI", date: `${year}-06-30`, description: "Abr – Jun" },
    { label: "3ºTRI", date: `${year}-09-30`, description: "Jul – Set" },
    { label: "4ºTRI", date: `${year}-12-31`, description: "Out – Dez" },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Regional</h1>
        <p className="text-muted-foreground mt-1">Visão consolidada de todas as franquias RE/MAX SC.</p>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Visão Regional Consolidada ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Visão Regional Consolidada — {year}
              </CardTitle>
              <CardDescription>
                Soma das metas e realizações de todas as franquias com visão cadastrada.
                {vision && (
                  <span className="ml-1">
                    {vision.franchisesWithVision} de {vision.totalFranchises} franquias com visão registrada.
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setYear(y => y - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm w-12 text-center">{year}</span>
              <Button variant="ghost" size="sm" onClick={() => setYear(y => y + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {visionLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : !vision || vision.franchisesWithVision === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma franquia registrou visão para {year} ainda.
            </div>
          ) : (
            <>
              {/* Regional total table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground text-xs w-32">PERÍODO</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3.5 w-3.5" /> CRECI
                        </div>
                        <div className="text-[10px] font-normal">Corretores</div>
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">
                        <div className="flex items-center justify-center gap-1">
                          <FileSignature className="h-3.5 w-3.5" /> CREs
                        </div>
                        <div className="text-[10px] font-normal">Representações</div>
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">
                        <div className="flex items-center justify-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" /> VGH
                        </div>
                        <div className="text-[10px] font-normal">Honorários</div>
                      </th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">Cobertura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vision.regionalQuarters.map((q, i) => {
                      const isFinal = i === 3;
                      const pCreci = pct(q.actualCreci, q.targetCreci);
                      const pCres = pct(q.actualCres, q.targetCres);
                      const pVgh = pct(q.actualVgh ?? undefined, q.targetVgh ?? undefined);
                      return (
                        <tr key={q.quarterDate} className={`border-b last:border-0 ${isFinal ? "bg-primary/5" : ""}`}>
                          <td className="py-3 pr-4">
                            <div className={`font-semibold text-xs ${isFinal ? "text-primary" : ""}`}>
                              {q.quarterLabel}
                            </div>
                            <div className="text-[10px] text-muted-foreground">{QUARTERS[i].description}</div>
                            {isFinal && (
                              <Badge className="mt-0.5 text-[10px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20" variant="outline">
                                META FINAL
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <KriCell actual={q.actualCreci} target={q.targetCreci} />
                          </td>
                          <td className="py-3 px-3">
                            <KriCell actual={q.actualCres} target={q.targetCres} />
                          </td>
                          <td className="py-3 px-3">
                            <KriCell actual={q.actualVgh ?? undefined} target={q.targetVgh ?? undefined} isVgh />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="text-xs font-medium">{q.franchisesWithTarget}</div>
                            <div className="text-[10px] text-muted-foreground">franquias</div>
                            {(q.franchisesWithActual ?? 0) > 0 && (
                              <div className="text-[10px] text-green-600">{q.franchisesWithActual} c/ dados</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Per-franchise breakdown */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Por Franquia</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setShowAllFranchises(v => !v)}
                  >
                    {showAllFranchises ? (
                      <><EyeOff className="h-3 w-3 mr-1" /> Mostrar só com visão</>
                    ) : (
                      <><Eye className="h-3 w-3 mr-1" /> Mostrar todas ({vision.totalFranchises})</>
                    )}
                  </Button>
                </div>

                <div className="space-y-3">
                  {franchisesToShow.map(f => {
                    const quarters = f.quarters ?? [];
                    const finalQ = quarters[3];
                    return (
                      <div key={f.franchiseId} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-sm">{f.franchiseName}</div>
                            {f.statement && (
                              <p className="text-xs text-muted-foreground italic mt-0.5 leading-relaxed line-clamp-2">
                                "{f.statement}"
                              </p>
                            )}
                            {!f.statement && (
                              <p className="text-xs text-muted-foreground italic mt-0.5">Sem declaração de visão registrada.</p>
                            )}
                          </div>
                          {!f.hasVision && (
                            <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">Sem visão</Badge>
                          )}
                        </div>

                        {f.hasVision && (
                          <div className="grid grid-cols-4 gap-2 pt-1">
                            {quarters.map((q, qi) => {
                              const isFinal = qi === 3;
                              const hasSomeTarget = q.targetCreci != null || q.targetCres != null || q.targetVgh != null;
                              if (!hasSomeTarget) return (
                                <div key={q.quarterDate} className="text-center">
                                  <div className={`text-[10px] font-medium mb-1 ${isFinal ? "text-primary" : "text-muted-foreground"}`}>{q.quarterLabel}</div>
                                  <div className="text-[10px] text-muted-foreground">—</div>
                                </div>
                              );
                              const pC = pct(q.actualCreci, q.targetCreci);
                              const pCr = pct(q.actualCres, q.targetCres);
                              const pV = pct(q.actualVgh ?? undefined, q.targetVgh ?? undefined);
                              const avgPct = [pC, pCr, pV].filter(p => p != null).length > 0
                                ? Math.round([pC, pCr, pV].filter((p): p is number => p != null).reduce((s, p) => s + p, 0) / [pC, pCr, pV].filter(p => p != null).length)
                                : null;
                              return (
                                <div key={q.quarterDate} className={`text-center rounded px-1 py-1 ${isFinal ? "bg-primary/5 border border-primary/20" : "bg-muted/40"}`}>
                                  <div className={`text-[10px] font-semibold mb-1 ${isFinal ? "text-primary" : "text-muted-foreground"}`}>{q.quarterLabel}</div>
                                  <div className="space-y-0.5">
                                    {q.targetCreci != null && (
                                      <div className="text-[10px]">
                                        <span className="text-muted-foreground">CRECI </span>
                                        <span className="font-medium">{q.targetCreci}</span>
                                        {q.actualCreci != null && <span className="text-muted-foreground"> ({q.actualCreci})</span>}
                                      </div>
                                    )}
                                    {q.targetCres != null && (
                                      <div className="text-[10px]">
                                        <span className="text-muted-foreground">CREs </span>
                                        <span className="font-medium">{q.targetCres}</span>
                                        {q.actualCres != null && <span className="text-muted-foreground"> ({q.actualCres})</span>}
                                      </div>
                                    )}
                                    {q.targetVgh != null && (
                                      <div className="text-[10px]">
                                        <span className="text-muted-foreground">VGH </span>
                                        <span className="font-medium">{formatVgh(q.targetVgh)}</span>
                                        {q.actualVgh != null && <span className="text-muted-foreground"> ({formatVgh(q.actualVgh)})</span>}
                                      </div>
                                    )}
                                    {avgPct != null && (
                                      <PctBadge val={avgPct} />
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Per-Franchise Progress Breakdown ── */}
      {(dash as any)?.franchiseProgress?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Progresso das Metas por Franquia
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Progresso calculado a partir de KPIs e iniciativas registradas. Total = média regional.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-2 px-4 font-medium text-muted-foreground text-xs">FRANQUIA</th>
                    {((dash as any).franchiseProgress[0]?.progressByDimension ?? []).map((d: any) => (
                      <th key={d.dimensionId} className="text-center py-2 px-3 font-medium text-muted-foreground text-xs whitespace-nowrap">
                        {d.dimensionName}
                      </th>
                    ))}
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">MÉDIA</th>
                    <th className="text-center py-2 px-3 font-medium text-muted-foreground text-xs">METAS</th>
                  </tr>
                </thead>
                <tbody>
                  {((dash as any).franchiseProgress as any[]).map((f: any) => (
                    <tr key={f.franchiseId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="py-2.5 px-4">
                        <span className="font-medium text-sm">{f.franchiseName}</span>
                      </td>
                      {f.progressByDimension.map((d: any) => (
                        <td key={d.dimensionId} className="py-2.5 px-3 text-center">
                          {d.progressPercentage == null ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-xs font-semibold" style={{ color: getProgressColor(d.progressPercentage) }}>
                                {d.progressPercentage}%
                              </span>
                              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${Math.max(d.progressPercentage, 4)}%`, backgroundColor: getProgressColor(d.progressPercentage) }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                      ))}
                      <td className="py-2.5 px-3 text-center">
                        {f.avgProgress == null ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <Badge variant="outline" className={`text-xs ${f.avgProgress >= 80 ? "bg-green-50 text-green-700 border-green-200" : f.avgProgress >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                            {f.avgProgress}%
                          </Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                        {f.goalsCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/5 border-t-2 border-primary/20">
                    <td className="py-2.5 px-4 font-bold text-sm text-primary">TOTAL REGIONAL</td>
                    {((dash as any)?.progressByDimension ?? []).map((d: any) => (
                      <td key={d.dimensionId} className="py-2.5 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-bold text-primary">{d.progressPercentage}%</span>
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.max(d.progressPercentage, 4)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center">
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20" variant="outline">
                        {(dash as any)?.avgScore ?? 0}%
                      </Badge>
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs font-bold text-primary">
                      {((dash as any).franchiseProgress as any[]).reduce((s: number, f: any) => s + f.goalsCount, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Execution + Blockers ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Progresso por Dimensão</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(dash?.progressByDimension ?? []).map((dim: any) => (
              <div key={dim.dimensionId}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">{dim.dimensionName}</span>
                  <span className="text-sm font-mono">{dim.progressPercentage}%</span>
                </div>
                <Progress value={dim.progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">{dim.goalsCount} metas</p>
              </div>
            ))}
            {(!dash?.progressByDimension || dash.progressByDimension.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Sem dados disponíveis</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sem Check-in nos Últimos 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-destructive">{dash?.franchisesWithoutCheckin7Days ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">franquias sem registro de execução</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Pedidos de Ajuda em Aberto</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-600">{dash?.openHelpRequests ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">aguardando atendimento regional</p>
            </CardContent>
          </Card>

          {dash?.topBlockers && dash.topBlockers.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bloqueios Mais Citados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {dash.topBlockers.map((b: string, i: number) => (
                  <p key={i} className="text-sm text-muted-foreground leading-relaxed">
                    <span className="text-foreground font-medium">{i + 1}.</span> {b}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
