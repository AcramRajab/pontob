import { useState, useMemo } from "react";
import { useAuth } from "@/lib/auth";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Minus, ChevronLeft, ChevronRight, Trash2,
  Users, Building2, TrendingUp, Clock, TableIcon,
  DollarSign, X, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventEntry = {
  id: number;
  userId: number;
  userName: string;
  indicatorKey: string;
  delta: number;
  note: string | null;
  eventDate: string;
  dayOfWeek: number;
  createdAt: string;
};

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
    activeBg: "bg-blue-600",
    activeHover: "hover:bg-blue-700",
    indicators: [
      { key: "reunioes_agendadas",           label: "Reuniões agendadas",               isMonetary: false, isNegative: false },
      { key: "reunioes_realizadas",           label: "Reuniões realizadas",              isMonetary: false, isNegative: false },
      { key: "corretores_entraram",           label: "Corretores entraram",              isMonetary: false, isNegative: false },
      { key: "estagiarios_entraram",          label: "Estagiários entraram",             isMonetary: false, isNegative: false },
      { key: "corretores_sairam",             label: "Corretores saíram",                isMonetary: false, isNegative: true  },
      { key: "estagiarios_sairam",            label: "Estagiários saíram",               isMonetary: false, isNegative: true  },
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
    activeBg: "bg-violet-600",
    activeHover: "hover:bg-violet-700",
    indicators: [
      { key: "novos_contratos_representacao", label: "Novos contratos de representação", isMonetary: false, isNegative: false },
      { key: "contratos_cancelados",          label: "Contratos cancelados",             isMonetary: false, isNegative: true  },
      { key: "contratos_vendidos",            label: "Contratos vendidos",               isMonetary: false, isNegative: false },
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
    activeBg: "bg-emerald-600",
    activeHover: "hover:bg-emerald-700",
    indicators: [
      { key: "venda_assinada",  label: "VGV",                        isMonetary: true,  isNegative: false },
      { key: "venda_realizada", label: "VGC Recebido e reportado",   isMonetary: true,  isNegative: false },
    ],
  },
];

const ALL_INDICATORS = SECTIONS.flatMap(s => s.indicators.map(i => ({ ...i, section: s })));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getMondayOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(m.getDate() + diff);
  return m;
}

function fmtBRL(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (Math.abs(v) >= 1_000) return `R$${Math.round(v / 1_000)}k`;
  return `R$${v.toLocaleString("pt-BR")}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  });
}

function fmtDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo",
  });
}

// ─── Monetary quick-entry form ─────────────────────────────────────────────────

function MonetaryForm({
  indicatorKey,
  label,
  onSubmit,
  onCancel,
  loading,
}: {
  indicatorKey: string;
  label: string;
  onSubmit: (delta: number, note: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [raw, setRaw] = useState("");
  const [note, setNote] = useState("");

  const parsed = parseFloat(raw.replace(/\./g, "").replace(",", "."));
  const valid = !isNaN(parsed) && parsed > 0;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{label}</p>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}><X className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="space-y-2">
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Valor em R$ (ex: 150000)"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            className="pl-8 font-mono"
            autoFocus
          />
        </div>
        <Input
          placeholder="Observação (opcional: imóvel, cliente...)"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">Cancelar</Button>
        <Button
          size="sm"
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          disabled={!valid || loading}
          onClick={() => valid && onSubmit(parsed, note)}
        >
          {loading ? "Salvando..." : `Lançar ${valid ? fmtBRL(parsed) : ""}`}
        </Button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PlannerRegistro() {
  const { user } = useAuth();
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [monetaryOpen, setMonetaryOpen] = useState<string | null>(null);
  const [confirmReopen, setConfirmReopen] = useState(false);
  const canWrite = user?.role !== "responsavel_interno";

  const today = new Date();
  const todayStr = formatDate(today);
  const selectedStr = formatDate(selectedDate);
  const weekStartDate = formatDate(getMondayOfWeek(selectedDate));
  const isToday = selectedStr === todayStr;

  // Events for the current week
  const { data: eventsData, isLoading: eventsLoading } = useQuery<{ events: EventEntry[] }>({
    queryKey: ["planner-events", franchiseId, weekStartDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/planner/events?franchiseId=${franchiseId}&weekStartDate=${weekStartDate}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!franchiseId,
    refetchInterval: 30_000,
  });

  // Planner entries for the week (for today's totals)
  const { data: plannerData } = useQuery({
    queryKey: ["planner", franchiseId, weekStartDate],
    queryFn: async () => {
      const res = await fetch(
        `/api/planner?franchiseId=${franchiseId}&weekStartDate=${weekStartDate}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!franchiseId,
  });

  // Compute today's totals from entries
  const todayDayOfWeek = useMemo(() => {
    const d = selectedDate;
    const js = d.getDay();
    return js === 0 ? 6 : js - 1;
  }, [selectedDate]);

  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    if (!plannerData?.entries) return totals;
    for (const e of plannerData.entries) {
      if (e.dayOfWeek === todayDayOfWeek && e.value != null) {
        totals[e.indicatorKey] = (totals[e.indicatorKey] ?? 0) + e.value;
      }
    }
    return totals;
  }, [plannerData, todayDayOfWeek]);

  // Events for selected date only (for the feed)
  const selectedDayEvents = useMemo(() => {
    return (eventsData?.events ?? []).filter(e => e.eventDate === selectedStr);
  }, [eventsData, selectedStr]);

  // Helper: check response for 401 and handle session expiry
  function handleFetchError(status: number, fallbackMsg: string) {
    if (status === 401) {
      toast({ title: "Sessão expirada. Faça login novamente.", variant: "destructive" });
      setLocation("/login");
      return;
    }
    toast({ title: fallbackMsg, variant: "destructive" });
  }

  // Log event mutation
  const logMutation = useMutation({
    mutationFn: async ({ indicatorKey, delta, note }: { indicatorKey: string; delta: number; note?: string }) => {
      const res = await fetch("/api/planner/events", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franchiseId, indicatorKey, delta, note: note || null, eventDate: selectedStr }),
      });
      if (!res.ok) {
        const err = Object.assign(new Error("Failed"), { status: res.status });
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-events", franchiseId, weekStartDate] });
      queryClient.invalidateQueries({ queryKey: ["planner", franchiseId, weekStartDate] });
    },
    onError: (err: Error & { status?: number }) =>
      handleFetchError(err.status ?? 0, "Erro ao registrar evento"),
  });

  // Reopen week mutation
  const reopenMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/planner/reopen", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ franchiseId, weekStartDate }),
      });
      if (!res.ok) {
        const err = Object.assign(new Error("Failed"), { status: res.status });
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", franchiseId, weekStartDate] });
      toast({ title: "Semana reaberta", description: "Agora você pode registrar novos eventos. A equipe regional foi notificada." });
    },
    onError: (err: Error & { status?: number }) =>
      handleFetchError(err.status ?? 0, "Erro ao reabrir semana"),
  });

  // Delete event mutation
  const deleteMutation = useMutation({
    mutationFn: async (eventId: number) => {
      const res = await fetch(`/api/planner/events/${eventId}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) {
        const err = Object.assign(new Error("Failed"), { status: res.status });
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner-events", franchiseId, weekStartDate] });
      queryClient.invalidateQueries({ queryKey: ["planner", franchiseId, weekStartDate] });
      toast({ title: "Evento removido" });
    },
    onError: (err: Error & { status?: number }) =>
      handleFetchError(err.status ?? 0, "Erro ao remover evento"),
  });

  function requireSession() {
    if (!franchiseId) {
      toast({ title: "Sessão expirada. Faça login novamente.", variant: "destructive" });
      setLocation("/login");
      return false;
    }
    return true;
  }

  function handleIncrement(indicatorKey: string) {
    if (!requireSession()) return;
    logMutation.mutate({ indicatorKey, delta: 1 });
  }

  function handleDecrement(indicatorKey: string) {
    if (!requireSession()) return;
    const current = dayTotals[indicatorKey] ?? 0;
    if (current <= 0) return;
    logMutation.mutate({ indicatorKey, delta: -1 });
  }

  function handleMonetary(indicatorKey: string, delta: number, note: string) {
    if (!requireSession()) return;
    logMutation.mutate({ indicatorKey, delta, note }, {
      onSuccess: () => setMonetaryOpen(null),
    });
  }

  // Group events by indicator for the feed display
  function getIndicatorMeta(key: string) {
    return ALL_INDICATORS.find(i => i.key === key);
  }

  const isSubmitted = !!plannerData?.week?.submittedAt;

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Planner Semanal</p>
          <h1 className="text-2xl font-bold tracking-tight">Registro de Eventos</h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">{dayLabel(selectedDate)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isSubmitted && (
            <Badge className="bg-green-600 text-white text-xs">Semana finalizada</Badge>
          )}
          {/* Day navigator */}
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-2 min-w-[80px] text-center">
              <div className={cn("text-sm font-semibold", isToday ? "text-primary" : "text-foreground")}>
                {fmtDateBR(selectedStr)}
              </div>
              {isToday && <div className="text-[10px] text-primary/60 font-medium">Hoje</div>}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => setSelectedDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>Hoje</Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/planner">
              <TableIcon className="h-3.5 w-3.5 mr-1.5" />
              Grade semanal
            </Link>
          </Button>
        </div>
      </div>

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para registrar eventos." />
      ) : null}

      {(!isAdmin || franchiseId) && isSubmitted && canWrite && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-amber-700">
            Esta semana foi finalizada. Para registrar novos eventos, reabra a semana primeiro.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-amber-600 border-amber-300 hover:bg-amber-100 hover:text-amber-700 gap-1.5 shrink-0"
            onClick={() => setConfirmReopen(true)}
            disabled={reopenMutation.isPending}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {reopenMutation.isPending ? "Reabrindo..." : "Reabrir para edição"}
          </Button>
        </div>
      )}

      {/* Monetary form overlay */}
      {monetaryOpen && (
        <MonetaryForm
          indicatorKey={monetaryOpen}
          label={ALL_INDICATORS.find(i => i.key === monetaryOpen)?.label ?? monetaryOpen}
          onSubmit={(delta, note) => handleMonetary(monetaryOpen, delta, note)}
          onCancel={() => setMonetaryOpen(null)}
          loading={logMutation.isPending}
        />
      )}

      {/* Indicator cards — only when franchiseId is known */}
      <div className="space-y-6" style={{ display: (!isAdmin || franchiseId) ? undefined : "none" }}>
        {SECTIONS.map(section => {
          const SectionIcon = section.icon;
          return (
            <div key={section.key}>
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("w-2 h-2 rounded-full", section.dot)} />
                <SectionIcon className={cn("h-4 w-4", section.color)} />
                <span className={cn("font-bold text-sm", section.color)}>{section.label}</span>
                <div className="h-px flex-1 bg-border ml-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {section.indicators.map(ind => {
                  const count = dayTotals[ind.key] ?? 0;
                  const isPending = logMutation.isPending && (logMutation.variables as any)?.indicatorKey === ind.key;

                  if (ind.isMonetary) {
                    return (
                      <div
                        key={ind.key}
                        className={cn(
                          "rounded-xl border p-4 flex items-center justify-between gap-3",
                          section.border, section.bg,
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground/70 leading-tight">{ind.label}</p>
                          <p className={cn("text-xl font-black tabular-nums mt-1", section.color)}>
                            {count > 0 ? fmtBRL(count) : "R$0"}
                          </p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">acumulado hoje</p>
                        </div>
                        <Button
                          size="sm"
                          className={cn("gap-1.5 text-white shrink-0", section.activeBg, section.activeHover)}
                          onClick={() => setMonetaryOpen(ind.key)}
                          disabled={!canWrite || isSubmitted}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Lançar
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={ind.key}
                      className={cn(
                        "rounded-xl border p-4 flex items-center gap-3",
                        section.border, section.bg,
                        ind.isNegative ? "opacity-90" : "",
                      )}
                    >
                      {/* Count */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground/70 leading-tight truncate">{ind.label}</p>
                        <p className={cn("text-3xl font-black tabular-nums leading-none mt-1.5", section.color,
                          ind.isNegative && count > 0 ? "text-red-500" : ""
                        )}>
                          {Math.max(0, Math.round(count))}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">hoje</p>
                      </div>

                      {/* Controls */}
                      {canWrite && !isSubmitted && (
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <Button
                            size="icon"
                            className={cn("h-9 w-9 rounded-lg text-white", section.activeBg, section.activeHover)}
                            onClick={() => handleIncrement(ind.key)}
                            disabled={isPending}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-9 rounded-lg border-2"
                            onClick={() => handleDecrement(ind.key)}
                            disabled={isPending || count <= 0}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Activity feed */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">
              {isToday ? "Eventos de hoje" : `Eventos — ${fmtDateBR(selectedStr)}`}
            </span>
            {selectedDayEvents.length > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">{selectedDayEvents.length}</Badge>
            )}
          </div>
          {eventsLoading && (
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          )}
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="px-5 py-10 text-center text-muted-foreground text-sm">
            {isToday
              ? "Nenhum evento registrado hoje. Use os botões acima para lançar eventos conforme ocorrem."
              : "Nenhum evento registrado neste dia."}
          </div>
        ) : (
          <div className="divide-y">
            {selectedDayEvents.map(event => {
              const meta = getIndicatorMeta(event.indicatorKey);
              const section = meta?.section;
              const isPositive = event.delta > 0;
              const canDelete = canWrite && !isSubmitted && event.userId === user?.id;

              return (
                <div key={event.id} className="px-5 py-3 flex items-center gap-3 group hover:bg-muted/20 transition-colors">
                  {/* Delta badge */}
                  <div className={cn(
                    "shrink-0 rounded-full h-8 w-8 flex items-center justify-center text-xs font-bold",
                    isPositive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                  )}>
                    {isPositive ? "+" : ""}{meta?.isMonetary
                      ? (event.delta >= 1000 ? `${Math.round(event.delta / 1000)}k` : event.delta)
                      : event.delta}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">
                      <span className={cn("font-semibold", section?.color)}>{meta?.label ?? event.indicatorKey}</span>
                      {meta?.isMonetary && (
                        <span className="text-muted-foreground font-normal"> · {fmtBRL(Math.abs(event.delta))}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {event.note && <span className="text-foreground/60">{event.note} · </span>}
                      {event.userName} · {fmtTime(event.createdAt)}
                    </p>
                  </div>

                  {/* Delete */}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                      onClick={() => deleteMutation.mutate(event.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Week summary below feed */}
        {(eventsData?.events ?? []).length > 0 && selectedDayEvents.length < (eventsData?.events ?? []).length && (
          <div className="px-5 py-3 border-t bg-muted/20 text-xs text-muted-foreground text-center">
            {(eventsData?.events ?? []).length - selectedDayEvents.length} eventos em outros dias desta semana ·{" "}
            <Link href="/planner" className="underline underline-offset-2 hover:text-foreground">
              Ver grade semanal
            </Link>
          </div>
        )}
      </div>

      {/* Reopen confirmation dialog */}
      <AlertDialog open={confirmReopen} onOpenChange={setConfirmReopen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-amber-500" />
              Reabrir semana para novos registros?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>A semana voltará ao estado editável e você poderá registrar novos eventos.</p>
                <p>A equipe regional será notificada por e-mail. Finalize a semana novamente quando terminar.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 text-white hover:bg-amber-600"
              onClick={() => { setConfirmReopen(false); reopenMutation.mutate(); }}
            >
              Sim, reabrir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
