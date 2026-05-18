import { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, CheckCircle2, Send, AlertCircle, Users, Building2, TrendingUp, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const SECTIONS = [
  {
    key: "recrutamento",
    label: "Recrutamento",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-500",
    bar: "bg-blue-400",
    indicators: [
      { key: "reunioes_agendadas", label: "Reuniões agendadas" },
      { key: "reunioes_realizadas", label: "Reuniões realizadas" },
      { key: "corretores_entraram", label: "Corretores entraram" },
      { key: "estagiarios_entraram", label: "Estagiários entraram" },
      { key: "corretores_sairam", label: "Corretores saíram" },
      { key: "estagiarios_sairam", label: "Estagiários saíram" },
    ],
  },
  {
    key: "operacao",
    label: "Operação",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
    bar: "bg-violet-400",
    indicators: [
      { key: "novos_contratos_representacao", label: "Novos contratos de representação" },
      { key: "contratos_cancelados", label: "Contratos cancelados" },
      { key: "contratos_vendidos", label: "Contratos vendidos" },
    ],
  },
  {
    key: "vendas",
    label: "Vendas",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
    bar: "bg-emerald-400",
    indicators: [
      { key: "venda_assinada", label: "Venda assinada (R$)" },
      { key: "venda_realizada", label: "Venda realizada (R$)" },
    ],
  },
];

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatWeekRange(start: string, end: string) {
  const [sy, sm, sd] = start.split("-");
  const [, em, ed] = end.split("-");
  if (sm === em) return `${sd} a ${ed}/${em}/${sy}`;
  return `${sd}/${sm} a ${ed}/${em}/${sy}`;
}

async function saveEntry(body: object) {
  const res = await fetch("/api/planner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save entry");
  return res.json();
}

async function saveWeek(body: object) {
  const res = await fetch("/api/planner/week", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save week");
  return res.json();
}

async function submitWeek(body: object) {
  const res = await fetch("/api/planner/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to submit week");
  return res.json();
}

// Single editable cell
function Cell({
  defaultValue, onChange, disabled, isZero,
}: {
  defaultValue: string; onChange: (v: string) => void; disabled: boolean; isZero: boolean;
}) {
  return (
    <Input
      type="number"
      min={0}
      step="any"
      defaultValue={defaultValue}
      disabled={disabled}
      className={cn(
        "h-8 w-full text-center text-sm font-medium px-1 border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-primary/5",
        "disabled:opacity-40",
        isZero && !disabled ? "text-muted-foreground/40" : ""
      )}
      onChange={e => onChange(e.target.value)}
    />
  );
}

export default function Planner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const weekStartStr = formatDate(weekStart);
  const weekEnd = addDays(weekStart, 6);
  const weekEndStr = formatDate(weekEnd);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const weekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [localGaps, setLocalGaps] = useState<Record<string, string>>({});
  const [localActions, setLocalActions] = useState<Record<string, string>>({});

  const franchiseId = user?.franchiseId;
  const weekKey = `${franchiseId}-${weekStartStr}`;
  const currentYear = new Date().getFullYear();

  const { data: ytdData } = useQuery({
    queryKey: ["planner-ytd", franchiseId, currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/planner/ytd?franchiseId=${franchiseId}&year=${currentYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<{
        year: number;
        ytd: { corretores: number; contratos: number; vendas: number };
        targets: { corretores: number | null; contratos: number | null; vendas: number | null };
      }>;
    },
    enabled: !!franchiseId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["planner", franchiseId, weekStartStr],
    queryFn: async () => {
      const res = await fetch(`/api/planner?franchiseId=${franchiseId}&weekStartDate=${weekStartStr}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!franchiseId,
  });

  const mutation = useMutation({
    mutationFn: saveEntry,
    onError: () => toast({ title: "Erro ao salvar", variant: "destructive" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planner", franchiseId, weekStartStr] }),
  });

  const weekMutation = useMutation({
    mutationFn: saveWeek,
    onError: () => toast({ title: "Erro ao salvar texto", variant: "destructive" }),
  });

  const submitMutation = useMutation({
    mutationFn: submitWeek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", franchiseId, weekStartStr] });
      toast({ title: "Semana finalizada!", description: "Resumo enviado por e-mail para a equipe regional." });
    },
    onError: () => toast({ title: "Erro ao finalizar semana", variant: "destructive" }),
  });

  // Sync local state when data loads
  useEffect(() => {
    if (data?.week) {
      setLocalGaps(p => weekKey in p ? p : { ...p, [weekKey]: data.week.gapsText ?? "" });
      setLocalActions(p => weekKey in p ? p : { ...p, [weekKey]: data.week.actionsText ?? "" });
    }
  }, [data, weekKey]);

  const gapsValue = localGaps[weekKey] ?? "";
  const actionsValue = localActions[weekKey] ?? "";
  const isSubmitted = !!data?.week?.submittedAt;
  const canWrite = user?.role !== "responsavel_interno";

  const getEntry = useCallback((indicatorKey: string, dayOfWeek: number) => {
    if (!data?.entries) return { value: "", meta: "" };
    const e = data.entries.find((e: any) => e.indicatorKey === indicatorKey && e.dayOfWeek === dayOfWeek);
    if (!e) return { value: "", meta: "" };
    return { value: e.value != null ? String(e.value) : "", meta: e.meta != null ? String(e.meta) : "" };
  }, [data]);

  const handleCellChange = useCallback((indicatorKey: string, dayOfWeek: number, field: "value" | "meta", raw: string) => {
    if (!franchiseId) return;
    const key = `${indicatorKey}__${dayOfWeek}__${field}`;
    clearTimeout(debounceRef.current[key]);
    debounceRef.current[key] = setTimeout(() => {
      const parsed = raw === "" ? null : parseFloat(raw);
      const existing = getEntry(indicatorKey, dayOfWeek);
      mutation.mutate({
        franchiseId, weekStartDate: weekStartStr, indicatorKey, dayOfWeek,
        value: field === "value" ? parsed : (existing.value === "" ? null : parseFloat(existing.value)),
        meta: field === "meta" ? parsed : (existing.meta === "" ? null : parseFloat(existing.meta)),
      });
    }, 600);
  }, [franchiseId, weekStartStr, getEntry, mutation]);

  const handleWeekTextChange = useCallback((field: "gaps" | "actions", value: string) => {
    if (!franchiseId) return;
    if (field === "gaps") setLocalGaps(p => ({ ...p, [weekKey]: value }));
    else setLocalActions(p => ({ ...p, [weekKey]: value }));
    if (weekDebounceRef.current) clearTimeout(weekDebounceRef.current);
    weekDebounceRef.current = setTimeout(() => {
      weekMutation.mutate({
        franchiseId, weekStartDate: weekStartStr,
        gapsText: field === "gaps" ? value : undefined,
        actionsText: field === "actions" ? value : undefined,
      });
    }, 800);
  }, [franchiseId, weekStartStr, weekKey, weekMutation]);

  const handleSubmit = () => {
    if (!franchiseId) return;
    submitMutation.mutate({ franchiseId, weekStartDate: weekStartStr, gapsText: gapsValue || null, actionsText: actionsValue || null });
    setConfirmSubmit(false);
  };

  function weekTotal(indicatorKey: string): number {
    if (!data?.entries) return 0;
    return data.entries.filter((e: any) => e.indicatorKey === indicatorKey).reduce((s: number, e: any) => s + (e.value ?? 0), 0);
  }

  function metaForIndicator(indicatorKey: string): number | null {
    if (!data?.entries) return null;
    const metas = data.entries.filter((e: any) => e.indicatorKey === indicatorKey && e.meta != null).map((e: any) => e.meta);
    return metas.length ? metas[metas.length - 1] : null;
  }

  const isVgh = (key: string) => key.includes("venda");
  const fmtNum = (n: number, key: string) =>
    isVgh(key) ? "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : String(n);

  const today = new Date();
  const isCurrentWeek = formatDate(getMondayOfWeek(today)) === weekStartStr;
  const todayDayIdx = (() => { const d = today.getDay(); return d === 0 ? 6 : d - 1; })();

  const submittedAtLabel = data?.week?.submittedAt
    ? new Date(data.week.submittedAt).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
      })
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Planner Semanal</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Indicadores diários — KRIs e KPIs</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Week navigator */}
          <div className="flex items-center gap-1 bg-muted/60 rounded-lg p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(d => addDays(d, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 min-w-[160px] text-center">
              <div className={cn("text-sm font-semibold", isCurrentWeek ? "text-primary" : "text-foreground")}>
                {formatWeekRange(weekStartStr, weekEndStr)}
              </div>
              {isCurrentWeek && <div className="text-xs text-primary/60 font-medium">Semana atual</div>}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setWeekStart(d => addDays(d, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {!isCurrentWeek && (
            <Button variant="outline" size="sm" onClick={() => setWeekStart(getMondayOfWeek(new Date()))}>
              Semana atual
            </Button>
          )}

          {canWrite && franchiseId && !isLoading && (
            isSubmitted ? (
              <Badge className="bg-green-600 hover:bg-green-600 text-white gap-1.5 px-3 py-1.5 text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Enviado {submittedAtLabel}
              </Badge>
            ) : (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                onClick={() => setConfirmSubmit(true)}
                disabled={submitMutation.isPending}
              >
                <Send className="h-3.5 w-3.5" />
                Finalizar semana
              </Button>
            )
          )}
        </div>
      </div>

      {/* ── YTD KRI Progress ── */}
      {franchiseId && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Progresso no Ano — {currentYear}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">acumulado das entradas do planner vs meta anual (Q4)</span>
            </div>
            <Link href="/visao" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
              <ExternalLink className="h-3 w-3" />
              <span>Definir metas</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
            {[
              {
                icon: Users,
                label: "Corretores novos",
                sublabel: "corretores_entraram",
                ytd: ytdData?.ytd.corretores ?? 0,
                target: ytdData?.targets.corretores ?? null,
                color: "text-blue-600",
                bar: "bg-blue-500",
                fmt: (v: number) => String(v),
              },
              {
                icon: Building2,
                label: "Novos contratos CRE",
                sublabel: "novos_contratos_representacao",
                ytd: ytdData?.ytd.contratos ?? 0,
                target: ytdData?.targets.contratos ?? null,
                color: "text-violet-600",
                bar: "bg-violet-500",
                fmt: (v: number) => String(v),
              },
              {
                icon: TrendingUp,
                label: "Vendas assinadas",
                sublabel: "venda_assinada",
                ytd: ytdData?.ytd.vendas ?? 0,
                target: ytdData?.targets.vendas ?? null,
                color: "text-emerald-600",
                bar: "bg-emerald-500",
                fmt: (v: number) =>
                  v >= 1_000_000
                    ? `R$ ${(v / 1_000_000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`
                    : v >= 1_000
                    ? `R$ ${(v / 1_000).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}k`
                    : `R$ ${v.toLocaleString("pt-BR")}`,
              },
            ].map(({ icon: Icon, label, ytd, target, color, bar, fmt }) => {
              const pct = target && target > 0 ? Math.min(Math.round((ytd / target) * 100), 100) : null;
              const isGood = pct != null && pct >= 100;
              const hasData = ytd > 0;
              return (
                <div key={label} className="px-5 py-4 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Icon className={cn("h-3.5 w-3.5", color)} />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                  </div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="flex items-baseline gap-1.5">
                      <span className={cn("text-2xl font-bold tabular-nums leading-none", hasData ? (isGood ? "text-green-600" : "text-foreground") : "text-muted-foreground/40")}>
                        {fmt(ytd)}
                      </span>
                      {pct != null && (
                        <span className={cn("text-xs font-semibold", isGood ? "text-green-500" : "text-orange-500")}>
                          {pct}%
                        </span>
                      )}
                    </div>
                    {target != null ? (
                      <span className="text-xs text-muted-foreground shrink-0">meta: <strong>{fmt(target)}</strong></span>
                    ) : (
                      <Link href="/visao" className={cn("text-xs shrink-0 hover:underline", color)}>
                        + definir meta
                      </Link>
                    )}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", isGood ? "bg-green-500" : bar)}
                      style={{ width: `${pct ?? 0}%` }}
                    />
                  </div>
                  {!hasData && (
                    <p className="text-[10px] text-muted-foreground/50 italic">
                      Insira dados semanais para ver a evolução
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!franchiseId && (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Selecione uma franquia para visualizar o planner.
        </div>
      )}

      {franchiseId && isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-muted/30 animate-pulse" />)}
        </div>
      )}

      {franchiseId && !isLoading && (
        <div className="space-y-4">
          {SECTIONS.map(section => (
            <div key={section.key} className={cn("rounded-xl border-2 overflow-hidden", section.border)}>
              {/* Section header */}
              <div className={cn("px-4 py-2.5 flex items-center gap-2", section.bg)}>
                <div className={cn("w-2.5 h-2.5 rounded-full", section.dot)} />
                <span className={cn("font-semibold text-sm", section.color)}>{section.label}</span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border/60">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs sticky left-0 bg-muted/30 min-w-[180px] max-w-[200px]">
                        Indicador
                      </th>
                      {DAYS.map((d, i) => (
                        <th
                          key={d}
                          className={cn(
                            "text-center px-2 py-2 font-medium text-xs min-w-[72px]",
                            isCurrentWeek && i === todayDayIdx
                              ? "text-primary bg-primary/5 font-bold"
                              : "text-muted-foreground"
                          )}
                        >
                          <div>{d}</div>
                          {isCurrentWeek && i === todayDayIdx && (
                            <div className="w-1 h-1 rounded-full bg-primary mx-auto mt-0.5" />
                          )}
                        </th>
                      ))}
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground text-xs min-w-[80px] border-l border-border/60">
                        Total
                      </th>
                      <th className="text-center px-2 py-2 font-medium text-muted-foreground text-xs min-w-[80px]">
                        Meta
                      </th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs min-w-[120px]">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.indicators.map((ind, rowIdx) => {
                      const total = weekTotal(ind.key);
                      const meta = metaForIndicator(ind.key);
                      const isOver = meta !== null && total >= meta && meta > 0;
                      const p = meta && meta > 0 ? Math.min(Math.round((total / meta) * 100), 100) : null;
                      const isValueKey = isVgh(ind.key);

                      return (
                        <tr
                          key={ind.key}
                          className={cn(
                            "border-b border-border/30 last:border-0",
                            rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10"
                          )}
                        >
                          <td className={cn(
                            "px-4 py-1 font-medium text-xs text-foreground/80 sticky left-0",
                            rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10"
                          )}>
                            {ind.label}
                          </td>

                          {DAYS.map((_, dayIdx) => {
                            const entry = getEntry(ind.key, dayIdx);
                            const v = entry.value;
                            return (
                              <td
                                key={dayIdx}
                                className={cn(
                                  "p-0 text-center border-l border-border/20 first:border-0",
                                  isCurrentWeek && dayIdx === todayDayIdx ? "bg-primary/5" : ""
                                )}
                              >
                                <Cell
                                  defaultValue={v}
                                  onChange={val => handleCellChange(ind.key, dayIdx, "value", val)}
                                  disabled={!canWrite || isSubmitted}
                                  isZero={v === "" || v === "0"}
                                />
                              </td>
                            );
                          })}

                          {/* Total */}
                          <td className="px-3 py-1 text-center border-l border-border/60">
                            <span className={cn(
                              "text-sm font-bold tabular-nums",
                              total > 0 ? (isOver ? "text-green-600" : "text-foreground") : "text-muted-foreground/40"
                            )}>
                              {total > 0 ? fmtNum(total, ind.key) : "—"}
                            </span>
                          </td>

                          {/* Meta input */}
                          <td className="p-0 text-center">
                            <Input
                              type="number"
                              min={0}
                              step={isValueKey ? 1000 : 1}
                              defaultValue={meta ?? ""}
                              key={`${ind.key}-meta-${weekStartStr}`}
                              disabled={!canWrite || isSubmitted}
                              placeholder="—"
                              className="h-8 w-full text-center text-xs font-medium border-0 bg-transparent rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:bg-primary/5 disabled:opacity-40"
                              onChange={e => handleCellChange(ind.key, 0, "meta", e.target.value)}
                            />
                          </td>

                          {/* Status */}
                          <td className="px-3 py-1">
                            {meta && total > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[60px]">
                                  <div
                                    className={cn("h-full rounded-full", isOver ? "bg-green-500" : section.bar)}
                                    style={{ width: `${p ?? 0}%` }}
                                  />
                                </div>
                                <span className={cn("text-xs font-semibold tabular-nums", isOver ? "text-green-600" : "text-orange-500")}>
                                  {p}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Gaps & Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="rounded-xl border-2 border-red-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-red-50 flex items-center gap-2 border-b border-red-200">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Gaps identificados</span>
              </div>
              <div className="p-3">
                <textarea
                  className="w-full text-sm p-2 min-h-[90px] bg-background border border-border/60 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/50"
                  placeholder="O que não foi como esperado esta semana?"
                  disabled={!canWrite || isSubmitted}
                  value={gapsValue}
                  onChange={e => handleWeekTextChange("gaps", e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-xl border-2 border-emerald-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-emerald-50 flex items-center gap-2 border-b border-emerald-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">Ações para a próxima semana</span>
              </div>
              <div className="p-3">
                <textarea
                  className="w-full text-sm p-2 min-h-[90px] bg-background border border-border/60 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-muted-foreground/50"
                  placeholder="O que será feito diferente na semana que vem?"
                  disabled={!canWrite || isSubmitted}
                  value={actionsValue}
                  onChange={e => handleWeekTextChange("actions", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Footer row */}
          {canWrite && (
            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <p className="text-xs text-muted-foreground italic">
                Dados salvos automaticamente · Finalize para enviar resumo ao time regional
              </p>
              {isSubmitted ? (
                <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Semana finalizada e enviada
                </div>
              ) : (
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={() => setConfirmSubmit(true)}
                  disabled={submitMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                  {submitMutation.isPending ? "Enviando..." : "Finalizar semana"}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirm submit dialog */}
      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar semana?</AlertDialogTitle>
            <AlertDialogDescription>
              A semana <strong>{formatWeekRange(weekStartStr, weekEndStr)}</strong> será marcada como concluída e um
              resumo será enviado por e-mail para a equipe regional. Os campos ficarão bloqueados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-green-600 text-white hover:bg-green-700" onClick={handleSubmit}>
              Sim, finalizar e enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
