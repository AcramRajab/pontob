import { useAuth } from "@/lib/auth";
import { useGetTodayOverview, getGetTodayOverviewQueryKey, useListGoals, getListGoalsQueryKey } from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, CheckCircle2, AlertTriangle, CalendarDays, MessageCircle,
  ChevronRight, Plus, X, ArrowRightCircle, Check,
} from "lucide-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { Link } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";

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

function statusLabel(status: string) {
  if (status === "atrasada") return { label: "Atrasada", cls: "text-red-600 bg-red-50 border-red-200" };
  if (status === "em_andamento") return { label: "Em andamento", cls: "text-blue-600 bg-blue-50 border-blue-200" };
  if (status === "adiantada") return { label: "Adiantado", cls: "text-green-700 bg-green-50 border-green-200" };
  return null;
}

export default function Today() {
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toggling, setToggling] = useState<Set<number>>(new Set());

  const today = new Date().toISOString().split("T")[0];

  const params = { franchiseId: franchiseId ?? undefined };
  const { data: overview, isLoading } = useGetTodayOverview(
    params,
    { query: { enabled: !!franchiseId, queryKey: getGetTodayOverviewQueryKey(params) } }
  );

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: allGoals = [] } = useListGoals(
    goalParams,
    { query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );

  // All active initiatives for the picker
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
      const url = franchiseId
        ? `/api/recruiting/candidatos?franchiseId=${franchiseId}`
        : `/api/recruiting/candidatos`;
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
    .filter((c) => {
      const t = new Date(c.interviewAt).getTime();
      return t >= now - 60 * 60 * 1000 && t <= in48h;
    })
    .sort((a, b) => new Date(a.interviewAt).getTime() - new Date(b.interviewAt).getTime());

  const pinnedIds = new Set<number>((overview?.initiativesForToday ?? []).map((i: any) => i.id));

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

  // Group picker initiatives by goal
  const initiativesByGoal = allInitiatives.reduce((acc: Record<string, any[]>, ini: any) => {
    const key = ini.goalTitle || `Meta #${ini.goalId}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ini);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hoje</h1>
        <p className="text-muted-foreground mt-1">Dois minutos para não perder a semana.</p>
      </div>

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para visualizar o painel de hoje." />
      ) : isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Top 3 priorities */}
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-semibold text-base">
                {top3Goals.length > 0 ? "Suas prioridades" : "Metas"}
              </h2>
              <Link href="/goals" className="text-xs text-muted-foreground hover:text-foreground">
                Ver todas →
              </Link>
            </div>

            {top3Goals.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhuma meta ativa.{" "}
                <Link href="/goals" className="underline underline-offset-2 hover:text-foreground">
                  Criar meta
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {top3Goals.map((goal: any, idx: number) => {
                  const pct = Math.round(goal.progressPercentage ?? 0);
                  const st = statusLabel(goal.status);
                  return (
                    <Link key={goal.id} href={`/goals/${goal.id}`}>
                      <div className="group flex items-center gap-4 rounded-lg border bg-background px-4 py-3 hover:border-primary/30 hover:bg-primary/[0.02] transition-all cursor-pointer">
                        <span className="shrink-0 text-xs font-bold text-muted-foreground/50 w-4 text-center select-none">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm leading-tight truncate">{goal.title}</span>
                            {st && (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${st.cls}`}>
                                {st.label}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {goal.dimensionName}{goal.keyProcessName ? ` · ${goal.keyProcessName}` : ""}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  goal.status === "atrasada" ? "bg-red-400" : pct >= 80 ? "bg-green-500" : "bg-primary"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold tabular-nums shrink-0 text-muted-foreground">
                              {pct}%
                            </span>
                            {goal.currentValue != null && goal.targetValue != null && (
                              <span className="text-xs text-muted-foreground/60 shrink-0 hidden sm:block">
                                {goal.currentValue} / {goal.targetValue}{goal.unit ? ` ${goal.unit}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 group-hover:text-muted-foreground transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stats row */}
          <div className="grid gap-3 grid-cols-3">
            <Card className="border-0 bg-muted/40">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Metas ativas</p>
                <p className="text-2xl font-bold mt-0.5">{overview?.activeGoals || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-muted/40">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Alertas</p>
                <p className={`text-2xl font-bold mt-0.5 ${(overview?.pendingAlerts?.length ?? 0) > 0 ? "text-destructive" : ""}`}>
                  {overview?.pendingAlerts?.length || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-muted/40">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Score semana</p>
                <p className="text-2xl font-bold mt-0.5">{overview?.weekScore || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming interviews */}
          {upcomingInterviews.length > 0 && (
            <Card className="border-purple-200 bg-purple-50/40">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                  <CardTitle className="text-base text-purple-800">Entrevistas próximas</CardTitle>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                    {upcomingInterviews.length}
                  </span>
                </div>
                <CardDescription>Candidatos com entrevista agendada nas próximas 48h.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingInterviews.map((c) => {
                  const isToday = new Date(c.interviewAt).toDateString() === new Date().toDateString();
                  return (
                    <div key={c.id} className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-lg border border-purple-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isToday ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700"}`}>
                            {isToday ? formatTime(c.interviewAt) : `${formatDate(c.interviewAt)} ${formatTime(c.interviewAt)}`}
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
              </CardContent>
            </Card>
          )}

          {/* Initiatives + Alerts */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* ── Iniciativas de Hoje ───────────────────────────── */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Iniciativas de Hoje</CardTitle>
                    <CardDescription className="text-xs mt-0.5">O que precisa ser executado agora.</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs shrink-0"
                    onClick={() => setPickerOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Selecionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {(overview?.initiativesForToday?.length ?? 0) > 0 ? (
                  <div className="space-y-2">
                    {(overview!.initiativesForToday as any[]).map((init: any) => {
                      const isToggling = toggling.has(init.id);
                      return (
                        <div key={init.id} className="flex items-center gap-3 px-3 py-2.5 border rounded-lg bg-primary/[0.02] border-primary/20">
                          <ArrowRightCircle className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{init.initiativeName || init.customName || "Iniciativa"}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {init.goalTitle || init.dimensionName || ""}
                              {init.keyProcessName ? ` · ${init.keyProcessName}` : ""}
                            </p>
                          </div>
                          <button
                            className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors shrink-0"
                            title="Remover de hoje"
                            disabled={isToggling}
                            onClick={() => toggleToday(init.id)}
                          >
                            {isToggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle2 className="mx-auto h-7 w-7 mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma iniciativa selecionada para hoje.</p>
                    <button
                      className="mt-2 text-xs text-primary hover:underline underline-offset-2"
                      onClick={() => setPickerOpen(true)}
                    >
                      + Selecionar iniciativas
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Alertas Recentes ──────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Alertas Recentes</CardTitle>
                <CardDescription className="text-xs">O que não é registrado não pode ser resolvido.</CardDescription>
              </CardHeader>
              <CardContent>
                {overview?.pendingAlerts?.length ? (
                  <div className="space-y-2">
                    {overview.pendingAlerts.map(alert => (
                      <div key={alert.id} className="flex items-start gap-3 px-3 py-2.5 border rounded-lg border-destructive/20 bg-destructive/5">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-destructive truncate">{alert.type}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="mx-auto h-7 w-7 mb-2 opacity-40 text-green-500" />
                    <p className="text-sm">Nenhum alerta pendente.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* ── Sheet: Selecionar Iniciativas para Hoje ───────────── */}
      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 py-4 border-b shrink-0">
            <SheetTitle className="text-base">Selecionar iniciativas para hoje</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Marque as iniciativas que você vai executar hoje. Elas ficam no seu painel de foco.
            </p>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {loadingPicker ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : allInitiatives.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ArrowRightCircle className="mx-auto h-8 w-8 mb-3 opacity-20" />
                <p className="text-sm">Nenhuma iniciativa ativa encontrada.</p>
                <Link href="/goals" className="text-xs text-primary hover:underline underline-offset-2 mt-1 block" onClick={() => setPickerOpen(false)}>
                  Criar em Metas →
                </Link>
              </div>
            ) : (
              Object.entries(initiativesByGoal).map(([goalTitle, inis]) => (
                <div key={goalTitle}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                    {goalTitle}
                  </p>
                  <div className="space-y-1.5">
                    {(inis as any[]).map((ini: any) => {
                      const isPinned = pinnedIds.has(ini.id) || ini.pinnedDate === today;
                      const isToggling = toggling.has(ini.id);
                      return (
                        <button
                          key={ini.id}
                          disabled={isToggling}
                          onClick={() => toggleToday(ini.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                            isPinned
                              ? "bg-primary/5 border-primary/30"
                              : "bg-background border-border hover:border-primary/20 hover:bg-muted/30"
                          }`}
                        >
                          <div className={`h-5 w-5 rounded flex items-center justify-center shrink-0 border-2 transition-colors ${
                            isPinned ? "bg-primary border-primary" : "border-muted-foreground/30"
                          }`}>
                            {isToggling
                              ? <Loader2 className="h-3 w-3 animate-spin text-white" />
                              : isPinned
                                ? <Check className="h-3 w-3 text-white" />
                                : null
                            }
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-medium truncate ${isPinned ? "text-foreground" : "text-foreground/80"}`}>
                              {ini.initiativeName || ini.customName || "Iniciativa"}
                            </p>
                            {(ini.dimensionName || ini.keyProcessName) && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {ini.dimensionName}{ini.keyProcessName ? ` · ${ini.keyProcessName}` : ""}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-5 py-3 border-t shrink-0">
            <Button className="w-full" onClick={() => setPickerOpen(false)}>
              Pronto ({pinnedIds.size} selecionada{pinnedIds.size !== 1 ? "s" : ""})
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
