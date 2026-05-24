import { useAuth } from "@/lib/auth";
import {
  useGetFranchiseDashboard, getGetFranchiseDashboardQueryKey,
  useListFranchiseKris, getListFranchiseKrisQueryKey,
  useUpsertFranchiseKri,
  useGetGoalProgress, getGetGoalProgressQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, LayoutDashboard, Target, CheckCircle2, Clock, Pencil, Users, FileSignature, DollarSign, TrendingUp, BookOpen, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, Cell } from "recharts";
import { useForm } from "react-hook-form";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { progressColorHex } from "@/lib/progress-color";

interface InitiativeScoreData {
  totalCatalog: number;
  totalCompleted: number;
  overallPct: number;
  dimensions: { dimensionId: number; dimensionName: string; total: number; completed: number; pct: number }[];
}

async function fetchInitiativeScore(franchiseId: number): Promise<InitiativeScoreData> {
  const res = await fetch(`/api/dashboard/initiative-score?franchiseId=${franchiseId}`, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch initiative score");
  return res.json();
}

function InitiativeScorePanel({ franchiseId }: { franchiseId: number }) {
  const { data, isLoading } = useQuery<InitiativeScoreData>({
    queryKey: ["initiative-score", franchiseId],
    queryFn: () => fetchInitiativeScore(franchiseId),
    staleTime: 60_000,
  });

  if (isLoading) return (
    <Card>
      <CardContent className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );

  const pct = data?.overallPct ?? 0;
  const pctColor = pct >= 70 ? "#16a34a" : pct >= 40 ? "#d97706" : "#dc2626";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-violet-500" />
            Execução do Cardápio
          </CardTitle>
          <CardDescription>
            Iniciativas do catálogo concluídas com resultado documentado
          </CardDescription>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold" style={{ color: pctColor }}>{pct}%</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {data?.totalCompleted ?? 0} de {data?.totalCatalog ?? 0} iniciativas
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {(data?.dimensions ?? []).map(dim => (
          <div key={dim.dimensionId} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{dim.dimensionName}</span>
              <span className="font-medium" style={{ color: dim.pct >= 70 ? "#16a34a" : dim.pct >= 40 ? "#d97706" : "#dc2626" }}>
                {dim.completed}/{dim.total} · {dim.pct}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${dim.pct}%`,
                  backgroundColor: dim.pct >= 70 ? "#16a34a" : dim.pct >= 40 ? "#d97706" : "#dc2626",
                }}
              />
            </div>
          </div>
        ))}
        {(data?.totalCompleted ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            Conclua iniciativas com resultado documentado para subir sua pontuação neste painel.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

interface RankingRow {
  strategicInitiativeId: number | null;
  initiativeName: string;
  kri: string | null;
  dimensionName: string;
  completions: number;
  avgResult: number;
  totalResult: number;
  unit: string | null;
}

async function fetchInitiativeRanking(): Promise<RankingRow[]> {
  const res = await fetch("/api/dashboard/initiative-ranking", { credentials: "include" });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

function InitiativeRankingPanel() {
  const { data, isLoading } = useQuery<RankingRow[]>({
    queryKey: ["initiative-ranking"],
    queryFn: fetchInitiativeRanking,
    staleTime: 120_000,
  });

  if (isLoading) return (
    <Card>
      <CardContent className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CardContent>
    </Card>
  );

  if (!data || data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Ranking de Iniciativas — Resultados na Rede
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Iniciativas do cardápio ordenadas pelo resultado médio registrado pelas franquias ao concluí-las.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {data.map((row, i) => (
            <div key={row.strategicInitiativeId ?? i} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
              <span className={`text-sm font-bold w-6 shrink-0 text-center ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700" : "text-muted-foreground/50"}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug truncate">{row.initiativeName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs py-0 h-4">{row.dimensionName}</Badge>
                  <span className="text-xs text-muted-foreground">{row.completions} execuç{row.completions === 1 ? "ão" : "ões"} na rede</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-green-700">{row.avgResult}</p>
                {row.unit && <p className="text-xs text-muted-foreground leading-tight max-w-[120px] text-right">{row.unit}</p>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const MONTH_NAMES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

const RISK_COLOR: Record<string, string> = {
  atrasado: "text-destructive",
  adiantado: "text-green-600",
  no_prazo: "text-amber-600",
};

const RISK_LABEL: Record<string, string> = {
  atrasado: "Atrasada",
  adiantado: "Adiantada",
  no_prazo: "No prazo",
};

const PERIOD_PRESETS = [
  { label: "1º Tri", startDate: (y: number) => `${y}-01-01`, endDate: (y: number) => `${y}-03-31` },
  { label: "2º Tri", startDate: (y: number) => `${y}-04-01`, endDate: (y: number) => `${y}-06-30` },
  { label: "3º Tri", startDate: (y: number) => `${y}-07-01`, endDate: (y: number) => `${y}-09-30` },
  { label: "4º Tri", startDate: (y: number) => `${y}-10-01`, endDate: (y: number) => `${y}-12-31` },
  { label: "1º Sem", startDate: (y: number) => `${y}-01-01`, endDate: (y: number) => `${y}-06-30` },
  { label: "2º Sem", startDate: (y: number) => `${y}-07-01`, endDate: (y: number) => `${y}-12-31` },
  { label: "Ano todo", startDate: (y: number) => `${y}-01-01`, endDate: (y: number) => `${y}-12-31` },
];

const getProgressColor = progressColorHex;

interface KriForm {
  creci: string;
  cres: string;
  vgh: string;
  notes: string;
}

function formatVgh(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { franchiseId, isAdmin, isSocio, franchises, adminFranchiseId, setAdminFranchiseId, socioFranchiseId, setSocioFranchiseId } = useFranchiseContext();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [kriOpen, setKriOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(6); // default: Ano todo

  const periodYear = currentYear;
  const periodStart = PERIOD_PRESETS[selectedPreset].startDate(periodYear);
  const periodEnd = PERIOD_PRESETS[selectedPreset].endDate(periodYear);

  const goalProgressParams = { franchiseId: franchiseId ?? undefined, startDate: periodStart, endDate: periodEnd };
  const { data: goalProgressData = [], isLoading: goalProgressLoading } = useGetGoalProgress(
    goalProgressParams,
    { query: { enabled: !!franchiseId, queryKey: getGetGoalProgressQueryKey(goalProgressParams) } }
  );

  const goalChartData = useMemo(
    () => goalProgressData.map(g => ({
      name: g.title.length > 28 ? g.title.slice(0, 28) + "…" : g.title,
      fullName: g.title,
      progress: g.progressPercentage,
      dimensionName: g.dimensionName ?? "—",
      status: g.status,
      riskStatus: g.riskStatus ?? "no_prazo",
      score: g.score,
      kpis: g.kpis ?? [],
    })),
    [goalProgressData]
  );

  const avgProgress = goalChartData.length > 0
    ? Math.round(goalChartData.reduce((s, g) => s + g.progress, 0) / goalChartData.length)
    : 0;

  const onTrackCount = goalChartData.filter(g => g.riskStatus !== "atrasado").length;
  const delayedCount = goalChartData.filter(g => g.riskStatus === "atrasado").length;

  const dashParams = { franchiseId: franchiseId! };
  const { data, isLoading } = useGetFranchiseDashboard(
    dashParams,
    { query: { enabled: !!franchiseId, queryKey: getGetFranchiseDashboardQueryKey(dashParams) } }
  );

  const kriParams = { franchiseId: franchiseId ?? undefined, year: currentYear };
  const kriQueryKey = getListFranchiseKrisQueryKey(kriParams);
  const { data: krisData = [] } = useListFranchiseKris(
    kriParams,
    { query: { enabled: !!franchiseId, queryKey: kriQueryKey } }
  );

  const { data: ytdData } = useQuery<{
    ytd: { corretores: number; contratos: number; vendas: number };
    targets: { corretores: number | null; contratos: number | null; vendas: number | null };
  } | null>({
    queryKey: ["planner-ytd-dashboard", franchiseId, currentYear],
    queryFn: async () => {
      const r = await fetch(`/api/planner/ytd?franchiseId=${franchiseId}&year=${currentYear}`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!franchiseId,
  });

  const currentKri = krisData.find(k => k.year === currentYear && k.month === currentMonth);
  const upsert = useUpsertFranchiseKri();

  const { register, handleSubmit, reset } = useForm<KriForm>({
    values: {
      creci: currentKri?.creci != null ? String(currentKri.creci) : "",
      cres: currentKri?.cres != null ? String(currentKri.cres) : "",
      vgh: currentKri?.vgh != null ? String(currentKri.vgh) : "",
      notes: currentKri?.notes ?? "",
    },
  });

  const onKriSubmit = async (form: KriForm) => {
    if (!franchiseId) return;
    try {
      await upsert.mutateAsync({
        data: {
          franchiseId,
          year: currentYear,
          month: currentMonth,
          creci: form.creci ? parseInt(form.creci) : null,
          cres: form.cres ? parseInt(form.cres) : null,
          vgh: form.vgh ? parseFloat(form.vgh) : null,
          notes: form.notes || null,
        },
      });
      toast({ title: `KRIs de ${MONTH_NAMES_FULL[currentMonth - 1]} atualizados` });
      qc.invalidateQueries({ queryKey: kriQueryKey });
      setKriOpen(false);
    } catch {
      toast({ title: "Erro ao salvar KRIs", variant: "destructive" });
    }
  };

  const kriChartData = krisData
    .slice(-6)
    .map(k => ({
      name: MONTH_NAMES[k.month - 1],
      CRECI: k.creci ?? 0,
      CREs: k.cres ?? 0,
    }));

  const canEdit = user?.role !== "responsavel_interno";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Bata o olho e saiba onde avançar.</p>
      </div>

      {(isAdmin || isSocio) && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {(isAdmin || isSocio) && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar o dashboard." />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pontuação</CardTitle>
                <LayoutDashboard className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.score || 0}</div>
                <p className="text-xs text-muted-foreground">{data?.scoreLabel || "Sem dados"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Metas Ativas</CardTitle>
                <Target className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.activeGoals || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Execução da Semana</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.weekExecution || 0}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Metas Atrasadas</CardTitle>
                <Clock className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{data?.delayedGoals || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* ── Visão Anual KRI Progress ── */}
          <div className="rounded-2xl border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Visão Anual {currentYear} — Progresso até agora</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">meta Q4 (31/Dez)</span>
              </div>
              <a href="/visao" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Trophy className="h-3 w-3" />
                {(ytdData?.targets.corretores || ytdData?.targets.contratos || ytdData?.targets.vendas) ? "Editar metas" : "Definir metas anuais →"}
              </a>
            </div>
            {(!ytdData?.targets.corretores && !ytdData?.targets.contratos && !ytdData?.targets.vendas) ? (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma meta anual definida ainda.</p>
                <a href="/visao" className="text-xs text-primary hover:underline mt-1 inline-block">
                  Definir metas de Corretores, CREs e VGH para {currentYear} →
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {[
                  {
                    icon: Users,
                    label: "Corretores novos",
                    ytd: ytdData?.ytd.corretores ?? 0,
                    target: ytdData?.targets.corretores ?? null,
                    accentColor: "text-blue-600",
                    bar: "bg-blue-500",
                    fmt: (v: number) => String(v),
                  },
                  {
                    icon: FileSignature,
                    label: "Novos contratos CRE",
                    ytd: ytdData?.ytd.contratos ?? 0,
                    target: ytdData?.targets.contratos ?? null,
                    accentColor: "text-violet-600",
                    bar: "bg-violet-500",
                    fmt: (v: number) => String(v),
                  },
                  {
                    icon: DollarSign,
                    label: "VGH acumulado",
                    ytd: ytdData?.ytd.vendas ?? 0,
                    target: ytdData?.targets.vendas ?? null,
                    accentColor: "text-emerald-600",
                    bar: "bg-emerald-500",
                    fmt: (v: number) =>
                      v >= 1_000_000
                        ? `R$${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
                        : v >= 1_000
                        ? `R$${(v / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}k`
                        : `R$${v.toLocaleString("pt-BR")}`,
                  },
                ].map(({ icon: Icon, label, ytd, target, accentColor, bar, fmt }) => {
                  const p = target && target > 0 ? Math.min(Math.round((ytd / target) * 100), 100) : null;
                  return (
                    <div key={label} className="px-5 py-4">
                      <div className="flex items-center gap-1.5 mb-3">
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${accentColor}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-2xl font-bold tabular-nums">{fmt(ytd)}</span>
                        {target != null && (
                          <span className="text-sm text-muted-foreground">/ {fmt(target)}</span>
                        )}
                        {p != null && (
                          <span className={`text-xs font-semibold ml-auto ${p >= 100 ? "text-green-600" : p >= 75 ? "text-amber-500" : "text-muted-foreground"}`}>{p}%</span>
                        )}
                      </div>
                      {target != null && (
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${bar}`} style={{ width: `${p ?? 0}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>KRIs do Mês — {MONTH_NAMES_FULL[currentMonth - 1]} {currentYear}</CardTitle>
                <CardDescription>CRECI · CREs · VGH — os 3 indicadores-chave da franquia</CardDescription>
              </div>
              {canEdit && (
                <Dialog open={kriOpen} onOpenChange={v => { setKriOpen(v); if (!v) reset(); }}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Pencil className="h-3.5 w-3.5 mr-1.5" />
                      Lançar KRIs
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>KRIs de {MONTH_NAMES_FULL[currentMonth - 1]} {currentYear}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onKriSubmit)} className="space-y-4 mt-2">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" /> CRECI — Corretores com registro ativo
                        </Label>
                        <Input type="number" min={0} placeholder="Ex: 18" {...register("creci")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          <FileSignature className="h-3.5 w-3.5" /> CREs — Contratos de Representação Exclusiva
                        </Label>
                        <Input type="number" min={0} placeholder="Ex: 24" {...register("cres")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5" /> VGH — Valor Geral de Honorários (R$)
                        </Label>
                        <Input type="number" min={0} step="0.01" placeholder="Ex: 85000" {...register("vgh")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Observações</Label>
                        <Input placeholder="Opcional" {...register("notes")} />
                      </div>
                      <div className="flex gap-2 justify-end pt-2">
                        <Button variant="outline" type="button" onClick={() => setKriOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={upsert.isPending}>
                          {upsert.isPending ? "Salvando..." : "Salvar KRIs"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                    <Users className="h-3.5 w-3.5" /> CRECI
                  </div>
                  <div className="text-3xl font-bold">
                    {currentKri?.creci != null ? currentKri.creci : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">corretores ativos</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                    <FileSignature className="h-3.5 w-3.5" /> CREs
                  </div>
                  <div className="text-3xl font-bold">
                    {currentKri?.cres != null ? currentKri.cres : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">contratos exclusivos</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
                    <DollarSign className="h-3.5 w-3.5" /> VGH
                  </div>
                  <div className="text-3xl font-bold text-green-600">
                    {formatVgh(currentKri?.vgh)}
                  </div>
                  <div className="text-xs text-muted-foreground">honorários do mês</div>
                </div>
              </div>
              {!currentKri && canEdit && (
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Nenhum KRI lançado para este mês ainda. Clique em <strong>Lançar KRIs</strong> para registrar.
                </p>
              )}
              {kriChartData.length > 1 && (
                <div className="mt-6 h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kriChartData} barGap={4}>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                      <YAxis hide />
                      <Tooltip />
                      <Bar dataKey="CRECI" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="CREs" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <InitiativeScorePanel franchiseId={franchiseId!} />

          <InitiativeRankingPanel />

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Progresso por Dimensão</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {data?.progressByDimension?.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.progressByDimension} layout="vertical" margin={{ left: 40, right: 40 }}>
                      <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="dimensionName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => [`${v}%`, "Progresso"]} />
                      <Bar dataKey="progressPercentage" radius={[0, 4, 4, 0]} minPointSize={4}>
                        {data.progressByDimension.map((d: any, i: number) => (
                          <Cell key={i} fill={getProgressColor(d.progressPercentage)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados de dimensão</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Bloqueios</CardTitle>
                <CardDescription>O que não é registrado não pode ser resolvido.</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.topBlockers?.length ? (
                  <ul className="space-y-2">
                    {data.topBlockers.map((blocker, i) => (
                      <li key={i} className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                        <span className="text-sm">{blocker}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum bloqueio registrado.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Goal Progress Section ── */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Progresso das Metas
                  </CardTitle>
                  <CardDescription>
                    Acompanhe onde a franquia está em relação a cada meta no período selecionado.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PERIOD_PRESETS.map((p, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant={selectedPreset === i ? "default" : "outline"}
                      className="text-xs h-7 px-2.5"
                      onClick={() => setSelectedPreset(i)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>

              {goalChartData.length > 0 && (
                <div className="flex gap-6 pt-2">
                  <div className="text-center">
                    <div className="text-2xl font-bold" style={{ color: getProgressColor(avgProgress) }}>{avgProgress}%</div>
                    <div className="text-xs text-muted-foreground">progresso médio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{onTrackCount}</div>
                    <div className="text-xs text-muted-foreground">no prazo</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-destructive">{delayedCount}</div>
                    <div className="text-xs text-muted-foreground">atrasadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{goalChartData.length}</div>
                    <div className="text-xs text-muted-foreground">metas no período</div>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {goalProgressLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : goalChartData.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  Nenhuma meta encontrada para o período selecionado.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Horizontal bar chart */}
                  <div className="h-[max(240px,calc(theme(spacing.10)*var(--goal-count)))]" style={{"--goal-count": goalChartData.length} as React.CSSProperties}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={goalChartData} layout="vertical" margin={{ left: 4, right: 32, top: 4, bottom: 4 }}>
                        <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" width={140} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <Tooltip
                          formatter={(value: number) => [`${value}%`, "Progresso"]}
                          labelFormatter={(label: string) => {
                            const g = goalChartData.find(x => x.name === label);
                            return g?.fullName ?? label;
                          }}
                        />
                        <Bar dataKey="progress" radius={[0, 4, 4, 0]} minPointSize={2}>
                          {goalChartData.map((entry, index) => (
                            <Cell key={index} fill={getProgressColor(entry.progress)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Goal cards */}
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {goalChartData.map((g, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-medium leading-tight">{g.fullName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{g.dimensionName}</div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs shrink-0 ${RISK_COLOR[g.riskStatus] ?? ""}`}
                          >
                            {RISK_LABEL[g.riskStatus] ?? g.riskStatus}
                          </Badge>
                        </div>
                        {/* Progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progresso</span>
                            <span className="font-semibold" style={{ color: getProgressColor(g.progress) }}>
                              {g.progress}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(g.progress, 100)}%`, backgroundColor: getProgressColor(g.progress) }}
                            />
                          </div>
                        </div>
                        {/* KPIs */}
                        {g.kpis.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {g.kpis.map((kpi) => (
                              <div key={kpi.id} className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1">
                                <span className="text-muted-foreground">{kpi.name}:</span>
                                <span className="font-medium">
                                  {kpi.currentValue ?? 0}
                                  {kpi.targetValue != null ? ` / ${kpi.targetValue}` : ""}
                                  {kpi.unit ? ` ${kpi.unit}` : ""}
                                </span>
                                {kpi.progressPct != null && (
                                  <span style={{ color: getProgressColor(kpi.progressPct) }}>
                                    ({kpi.progressPct}%)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
