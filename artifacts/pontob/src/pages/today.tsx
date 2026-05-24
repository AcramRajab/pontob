import { useAuth } from "@/lib/auth";
import { useGetTodayOverview, getGetTodayOverviewQueryKey, useListGoals, getListGoalsQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Loader2, CheckCircle2, AlertTriangle, CalendarDays, MessageCircle,
  ChevronRight, Plus, X, ArrowRightCircle, Check, Target, Zap,
  TrendingUp, Bell, Sparkles,
} from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { Link } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

function whatsappUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits.startsWith("55") ? digits : `55${digits}`}`;
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
function todayLabel() {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });
}

function statusBadge(status: string) {
  if (status === "atrasada") return { label: "Atrasada", cls: "text-red-600 bg-red-50 border-red-200" };
  if (status === "em_andamento") return { label: "Em andamento", cls: "text-blue-600 bg-blue-50 border-blue-200" };
  if (status === "adiantada") return { label: "Adiantado", cls: "text-green-700 bg-green-50 border-green-200" };
  return null;
}

function progressColor(status: string, pct: number) {
  if (status === "atrasada") return "from-red-400 to-red-500";
  if (pct >= 80) return "from-green-400 to-green-500";
  if (pct >= 50) return "from-blue-400 to-blue-500";
  return "from-primary to-primary/80";
}

export default function Today() {
  const { franchiseId, isAdmin, isSocio, franchises, adminFranchiseId, setAdminFranchiseId, socioFranchiseId, setSocioFranchiseId } = useFranchiseContext();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toggling, setToggling] = useState<Set<number>>(new Set());
  const alertsGeneratedRef = useRef(false);

  const today = new Date().toISOString().split("T")[0];

  // Fire-and-forget: generate/refresh alerts once per page load when franchiseId is known
  useEffect(() => {
    if (!franchiseId || alertsGeneratedRef.current) return;
    alertsGeneratedRef.current = true;
    fetch("/api/alerts/generate", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ franchiseId }),
    }).then(() => {
      qc.invalidateQueries({ queryKey: getGetTodayOverviewQueryKey(params) });
    }).catch(() => {});
  }, [franchiseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const params = { franchiseId: franchiseId ?? undefined };
  const { data: overview, isLoading } = useGetTodayOverview(
    params,
    { query: { enabled: !!franchiseId, queryKey: getGetTodayOverviewQueryKey(params) } }
  );

  const currentYear = new Date().getFullYear();
  const { data: ytdData } = useQuery<{
    ytd: { corretores: number; contratos: number; vendas: number };
    targets: { corretores: number | null; contratos: number | null; vendas: number | null };
  } | null>({
    queryKey: ["planner-ytd", franchiseId, currentYear],
    queryFn: async () => {
      const r = await fetch(`/api/planner/ytd?franchiseId=${franchiseId}&year=${currentYear}`, { credentials: "include" });
      if (!r.ok) return null;
      return r.json();
    },
    enabled: !!franchiseId,
  });

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: allGoals = [] } = useListGoals(
    goalParams,
    { query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );

  const { data: allInitiatives = [], isLoading: loadingPicker } = useQuery({
    queryKey: ["all-active-initiatives", franchiseId],
    queryFn: async () => {
      const r = await fetch(`/api/goal-initiatives?franchiseId=${franchiseId}&status=ativa`, { credentials: "include" });
      if (!r.ok) return [];
      return r.json() as Promise<any[]>;
    },
    enabled: !!franchiseId && pickerOpen,
  });

  const top3Goals = [...allGoals]
    .filter((g: any) => !["concluida", "cancelada"].includes(g.status))
    .sort((a: any, b: any) => (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0))
    .slice(0, 3);

  const { data: allCandidatos = [] } = useQuery({
    queryKey: ["candidatos-for-today", franchiseId],
    queryFn: async () => {
      const url = franchiseId ? `/api/recruiting/candidatos?franchiseId=${franchiseId}` : `/api/recruiting/candidatos`;
      const r = await fetch(url, { credentials: "include" });
      if (!r.ok) return [];
      return r.json() as Promise<any[]>;
    },
    enabled: !!franchiseId && !!user,
  });

  const now = Date.now();
  const in48h = now + 48 * 60 * 60 * 1000;
  const upcomingInterviews = allCandidatos
    .filter((c) => c.interviewAt)
    .filter((c) => { const t = new Date(c.interviewAt).getTime(); return t >= now - 60 * 60 * 1000 && t <= in48h; })
    .sort((a, b) => new Date(a.interviewAt).getTime() - new Date(b.interviewAt).getTime());

  const pinnedIds = new Set<number>((overview?.initiativesForToday ?? []).map((i: any) => i.id));
  const pinnedList = (overview?.initiativesForToday ?? []) as any[];
  const alertList = (overview?.pendingAlerts ?? []) as any[];

  async function toggleToday(id: number) {
    setToggling(prev => new Set(prev).add(id));
    try {
      await fetch(`/api/goal-initiatives/${id}/toggle-today`, { method: "POST", credentials: "include" });
      await qc.invalidateQueries({ queryKey: getGetTodayOverviewQueryKey(params) });
      await qc.invalidateQueries({ queryKey: ["all-active-initiatives", franchiseId] });
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  const initiativesByGoal = allInitiatives.reduce((acc: Record<string, any[]>, ini: any) => {
    const key = ini.goalTitle || `Meta #${ini.goalId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ini);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pb-8">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Hoje</p>
          <h1 className="text-2xl font-bold tracking-tight capitalize leading-tight">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </h1>
        </div>
        {!isLoading && !!franchiseId && (
          <div className="flex items-center gap-1.5 shrink-0 mt-1">
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
            <span className="text-xs text-muted-foreground">
              {user?.name?.split(" ")[0]}, bom dia!
            </span>
          </div>
        )}
      </div>

      {(isAdmin || isSocio) && (
        <FranchisePicker franchises={franchises} value={isSocio ? socioFranchiseId : adminFranchiseId} onChange={isSocio ? setSocioFranchiseId : setAdminFranchiseId} />
      )}

      {(isAdmin || isSocio) && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar o painel de hoje." />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* ── Stats pills ─────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                icon: Target, label: "Metas ativas", value: overview?.activeGoals ?? 0,
                iconCls: "text-primary", bgCls: "bg-primary/8", borderCls: "border-primary/15",
              },
              {
                icon: Bell, label: "Alertas", value: alertList.length,
                iconCls: alertList.length > 0 ? "text-destructive" : "text-muted-foreground",
                bgCls: alertList.length > 0 ? "bg-destructive/5" : "bg-muted/40",
                borderCls: alertList.length > 0 ? "border-destructive/20" : "border-border",
                valueCls: alertList.length > 0 ? "text-destructive" : undefined,
              },
              {
                icon: TrendingUp, label: "Score semana", value: overview?.weekScore ?? 0,
                iconCls: "text-emerald-600", bgCls: "bg-emerald-50", borderCls: "border-emerald-100",
                valueCls: "text-emerald-700",
              },
            ].map(({ icon: Icon, label, value, iconCls, bgCls, borderCls, valueCls }) => (
              <div key={label} className={cn("rounded-xl border px-4 py-3.5 flex flex-col gap-1.5", bgCls, borderCls)}>
                <div className="flex items-center gap-1.5">
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", iconCls)} strokeWidth={2} />
                  <span className="text-[11px] font-medium text-muted-foreground leading-none">{label}</span>
                </div>
                <p className={cn("text-2xl font-black tabular-nums leading-none", valueCls ?? "text-foreground")}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Visão Anual KRI strip ───────────────────────────── */}
          {ytdData && (ytdData.targets.corretores || ytdData.targets.contratos || ytdData.targets.vendas) && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  Visão {new Date().getFullYear()} — meta Q4
                </span>
                <a href="/visao" className="text-[10px] text-primary/70 hover:text-primary transition-colors">editar →</a>
              </div>
              <div className="grid grid-cols-3 divide-x divide-border">
                {[
                  {
                    label: "Corretores",
                    ytd: ytdData.ytd.corretores,
                    target: ytdData.targets.corretores,
                    color: "bg-blue-500",
                    fmt: (v: number) => String(v),
                  },
                  {
                    label: "CREs",
                    ytd: ytdData.ytd.contratos,
                    target: ytdData.targets.contratos,
                    color: "bg-violet-500",
                    fmt: (v: number) => String(v),
                  },
                  {
                    label: "VGH",
                    ytd: ytdData.ytd.vendas,
                    target: ytdData.targets.vendas,
                    color: "bg-emerald-500",
                    fmt: (v: number) =>
                      v >= 1_000_000
                        ? `R$${(v / 1_000_000).toFixed(1)}M`
                        : v >= 1_000
                        ? `R$${Math.round(v / 1_000)}k`
                        : `R$${v}`,
                  },
                ].map(({ label, ytd, target, color, fmt }) => {
                  const p = target && target > 0 ? Math.min(Math.round((ytd / target) * 100), 100) : null;
                  return (
                    <div key={label} className="px-3 py-2.5">
                      <p className="text-[10px] font-medium text-muted-foreground mb-1">{label}</p>
                      <div className="flex items-baseline gap-1 mb-1.5">
                        <span className="text-base font-bold tabular-nums">{fmt(ytd)}</span>
                        {target != null && <span className="text-[10px] text-muted-foreground">/{fmt(target)}</span>}
                      </div>
                      {p != null && (
                        <div className="h-1 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${p}%` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {ytdData && !ytdData.targets.corretores && !ytdData.targets.contratos && !ytdData.targets.vendas && (
            <a href="/visao" className="flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/3 px-4 py-3 text-sm text-primary/80 hover:bg-primary/5 transition-colors">
              <Target className="h-4 w-4 shrink-0" />
              <span><strong>Defina sua Visão Anual</strong> — registre as metas de Corretores, CREs e VGH para {new Date().getFullYear()}</span>
              <ChevronRight className="h-4 w-4 ml-auto shrink-0" />
            </a>
          )}

          {/* ── Priorities ──────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-sm text-foreground/80 uppercase tracking-wide">
                Suas prioridades
              </h2>
              <Link href="/goals" className="text-xs text-primary/70 hover:text-primary font-medium flex items-center gap-1">
                Ver todas <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {top3Goals.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <Target className="mx-auto h-8 w-8 text-muted-foreground/20 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma meta ativa.</p>
                <Link href="/goals" className="text-xs text-primary hover:underline mt-1 block">+ Criar meta</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {top3Goals.map((goal: any, idx: number) => {
                  const pct = Math.round(goal.progressPercentage ?? 0);
                  const st = statusBadge(goal.status);
                  const gradientCls = progressColor(goal.status, pct);
                  const rankColors = ["text-amber-500", "text-slate-400", "text-orange-400"];
                  return (
                    <Link key={goal.id} href={`/goals/${goal.id}`}>
                      <div className="group rounded-xl border bg-card hover:border-primary/20 hover:shadow-sm transition-all cursor-pointer overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3">
                          {/* rank */}
                          <span className={cn("shrink-0 text-sm font-black w-5 text-center select-none", rankColors[idx] ?? "text-muted-foreground/40")}>
                            {idx + 1}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <span className="font-semibold text-sm leading-tight">{goal.title}</span>
                              {st && (
                                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border shrink-0", st.cls)}>
                                  {st.label}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground/70 truncate">
                              {goal.dimensionName}{goal.keyProcessName ? ` · ${goal.keyProcessName}` : ""}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-black tabular-nums text-foreground/70">{pct}%</span>
                            {goal.currentValue != null && goal.targetValue != null && (
                              <span className="text-[11px] text-muted-foreground/50 hidden sm:block">
                                {goal.currentValue}/{goal.targetValue}{goal.unit ? ` ${goal.unit}` : ""}
                              </span>
                            )}
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                          </div>
                        </div>

                        {/* Progress bar — full width at bottom */}
                        <div className="h-1 bg-muted/60">
                          <div
                            className={cn("h-full bg-gradient-to-r transition-all", gradientCls)}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Upcoming interviews ─────────────────────────────── */}
          {upcomingInterviews.length > 0 && (
            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white overflow-hidden">
              <div className="px-4 py-3 border-b border-purple-100 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-sm text-purple-800">Entrevistas próximas</span>
                <span className="ml-auto text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-semibold">
                  {upcomingInterviews.length}
                </span>
              </div>
              <div className="p-3 space-y-2">
                {upcomingInterviews.map((c) => {
                  const isToday2 = new Date(c.interviewAt).toDateString() === new Date().toDateString();
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-lg border border-purple-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-bold px-1.5 py-0.5 rounded", isToday2 ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700")}>
                            {isToday2 ? formatTime(c.interviewAt) : `${formatDate(c.interviewAt)} ${formatTime(c.interviewAt)}`}
                          </span>
                          <span className="text-sm font-medium truncate">{c.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.vagaTitle}</p>
                      </div>
                      {c.phone && (
                        <a href={whatsappUrl(c.phone)} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="h-7 px-2 gap-1 shrink-0 text-green-600 border-green-200 hover:bg-green-50">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span className="text-xs">WhatsApp</span>
                          </Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Initiatives + Alerts ────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-2">

            {/* Iniciativas de Hoje */}
            <div className="rounded-xl border overflow-hidden">
              <div className="px-4 py-3 border-b bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">Foco de Hoje</p>
                    {pinnedList.length > 0 && (
                      <p className="text-[10px] text-muted-foreground">{pinnedList.length} iniciativa{pinnedList.length !== 1 ? "s" : ""} selecionada{pinnedList.length !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPickerOpen(true)}
                  className="flex items-center gap-1 text-xs text-primary font-medium hover:bg-primary/5 px-2 py-1 rounded-md transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Selecionar
                </button>
              </div>

              <div className="p-3">
                {pinnedList.length > 0 ? (
                  <div className="space-y-2">
                    {pinnedList.map((init: any) => {
                      const isToggling = toggling.has(init.id);
                      return (
                        <div key={init.id} className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-primary/15 bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <ArrowRightCircle className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight truncate">{init.initiativeName || init.customName || "Iniciativa"}</p>
                            {(init.goalTitle || init.keyProcessName) && (
                              <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                                {init.goalTitle ?? init.keyProcessName}
                              </p>
                            )}
                          </div>
                          <button
                            disabled={isToggling}
                            onClick={() => toggleToday(init.id)}
                            className="h-6 w-6 rounded-full flex items-center justify-center text-muted-foreground/30 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                            title="Remover do foco de hoje"
                          >
                            {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-primary/20 py-5 px-4 flex flex-col items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-primary/40" />
                    </div>
                    <p className="text-xs text-muted-foreground/70 font-medium text-center">Nenhuma iniciativa selecionada</p>
                    <div className="flex flex-col gap-1.5 w-full">
                      <Button size="sm" className="w-full gap-2 text-xs" onClick={() => setPickerOpen(true)}>
                        <Check className="h-3.5 w-3.5" />
                        Selecionar iniciativas
                      </Button>
                      <div className="flex gap-1.5">
                        <Link href="/goals/new" className="flex-1">
                          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                            <Plus className="h-3.5 w-3.5" />
                            Nova Meta
                          </Button>
                        </Link>
                        <Link href="/goals" className="flex-1">
                          <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs">
                            <ArrowRightCircle className="h-3.5 w-3.5" />
                            Nova Iniciativa
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Alertas Recentes */}
            <div className="rounded-xl border overflow-hidden">
              <div className={cn(
                "px-4 py-3 border-b flex items-center gap-2",
                alertList.length > 0 ? "bg-gradient-to-r from-destructive/5 to-transparent" : "bg-muted/20"
              )}>
                <div className={cn(
                  "h-6 w-6 rounded-md flex items-center justify-center",
                  alertList.length > 0 ? "bg-destructive/10" : "bg-muted"
                )}>
                  <AlertTriangle className={cn("h-3.5 w-3.5", alertList.length > 0 ? "text-destructive" : "text-muted-foreground/50")} />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Alertas</p>
                  {alertList.length > 0 && (
                    <p className="text-[10px] text-destructive font-medium">{alertList.length} pendente{alertList.length !== 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>

              <div className="p-3">
                {alertList.length > 0 ? (
                  <div className="space-y-2">
                    {alertList.map((alert: any) => (
                      <div key={alert.id} className="flex items-start gap-3 px-3 py-2.5 border rounded-lg border-destructive/20 bg-destructive/[0.03]">
                        <div className="h-5 w-5 rounded-full bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                          <AlertTriangle className="h-3 w-3 text-destructive" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-destructive/90 truncate">{alert.type}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground/70">Nenhum alerta pendente</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Sheet: Selecionar Iniciativas ───────────────────────── */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm flex flex-col gap-0 p-0">

          {/* Sheet header com gradiente */}
          <div className="bg-gradient-to-br from-primary to-primary/80 px-5 py-5 shrink-0">
            <SheetHeader className="space-y-1">
              <div className="flex items-center justify-between">
                <SheetTitle className="text-white text-base font-bold">Foco de hoje</SheetTitle>
                <button
                  onClick={() => setPickerOpen(false)}
                  className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
              <p className="text-white/70 text-xs leading-relaxed">
                Marque as iniciativas que vai executar hoje.
              </p>
            </SheetHeader>

            {/* Pinned count pill */}
            {pinnedIds.size > 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-white/15 rounded-full px-3 py-1">
                <Check className="h-3 w-3 text-white" />
                <span className="text-xs text-white font-medium">{pinnedIds.size} selecionada{pinnedIds.size !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loadingPicker ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : allInitiatives.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
                <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <ArrowRightCircle className="h-7 w-7 text-muted-foreground/30" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground/70">Nenhuma iniciativa ativa</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Crie iniciativas em suas metas para gerenciar aqui.</p>
                </div>
                <div className="flex flex-col gap-2 w-full px-4 mt-1">
                  <Link href="/goals/new" onClick={() => setPickerOpen(false)}>
                    <Button className="w-full gap-2" size="sm">
                      <Plus className="h-4 w-4" />
                      Nova Meta
                    </Button>
                  </Link>
                  <Link href="/goals" onClick={() => setPickerOpen(false)}>
                    <Button variant="outline" className="w-full gap-2" size="sm">
                      <ArrowRightCircle className="h-4 w-4" />
                      Adicionar iniciativa em Meta existente
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-5">
                {Object.entries(initiativesByGoal).map(([goalTitle, inis]) => (
                  <div key={goalTitle}>
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide truncate">
                        {goalTitle}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      {(inis as any[]).map((ini: any) => {
                        const isPinned = pinnedIds.has(ini.id) || ini.pinnedDate === today;
                        const isToggling = toggling.has(ini.id);
                        return (
                          <button
                            key={ini.id}
                            disabled={isToggling}
                            onClick={() => toggleToday(ini.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all",
                              isPinned
                                ? "bg-primary/5 border-primary/25 shadow-sm"
                                : "bg-background border-border hover:border-primary/15 hover:bg-muted/30"
                            )}
                          >
                            {/* Checkbox visual */}
                            <div className={cn(
                              "h-5 w-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-all",
                              isPinned ? "bg-primary border-primary" : "border-muted-foreground/25"
                            )}>
                              {isToggling
                                ? <Loader2 className="h-3 w-3 animate-spin text-white" />
                                : isPinned ? <Check className="h-3 w-3 text-white" strokeWidth={3} /> : null
                              }
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className={cn("text-sm font-medium truncate leading-tight", isPinned ? "text-foreground" : "text-foreground/75")}>
                                {ini.initiativeName || ini.customName || "Iniciativa"}
                              </p>
                              {ini.keyProcessName && (
                                <p className="text-[11px] text-muted-foreground/60 truncate mt-0.5">{ini.keyProcessName}</p>
                              )}
                            </div>

                            {isPinned && (
                              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Zap className="h-3 w-3 text-primary" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t bg-muted/20 shrink-0">
            <Button
              className="w-full gap-2 font-semibold"
              onClick={() => setPickerOpen(false)}
            >
              <Check className="h-4 w-4" />
              Confirmar {pinnedIds.size > 0 ? `(${pinnedIds.size})` : ""}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
