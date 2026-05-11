import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, TableIcon, CheckCircle2, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const CATEGORIES = [
  { key: "recrutamento", label: "1. Recrutamento" },
  { key: "operacao", label: "2. Operação" },
  { key: "vendas", label: "3. Vendas" },
];

const INDICATORS = [
  { key: "reunioes_agendadas", label: "Reuniões agendadas", category: "recrutamento" },
  { key: "reunioes_realizadas", label: "Reuniões realizadas", category: "recrutamento" },
  { key: "corretores_entraram", label: "Corretores entraram", category: "recrutamento" },
  { key: "estagiarios_entraram", label: "Estagiários entraram", category: "recrutamento" },
  { key: "corretores_sairam", label: "Corretores saíram", category: "recrutamento" },
  { key: "estagiarios_sairam", label: "Estagiários saíram", category: "recrutamento" },
  { key: "novos_contratos_representacao", label: "Novos contratos de representação", category: "operacao" },
  { key: "contratos_cancelados", label: "Contratos cancelados", category: "operacao" },
  { key: "contratos_vendidos", label: "Contratos vendidos", category: "operacao" },
  { key: "venda_assinada", label: "Venda assinada (R$)", category: "vendas" },
  { key: "venda_realizada", label: "Venda realizada (R$)", category: "vendas" },
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

function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

async function fetchPlanner(franchiseId: number, weekStartDate: string) {
  const res = await fetch(`/api/planner?franchiseId=${franchiseId}&weekStartDate=${weekStartDate}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch planner");
  return res.json();
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

export default function Planner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));
  const weekStartStr = formatDate(weekStart);
  const weekEnd = addDays(weekStart, 6);
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const weekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [localGaps, setLocalGaps] = useState<Record<string, string>>({});
  const [localActions, setLocalActions] = useState<Record<string, string>>({});

  const franchiseId = user?.franchiseId;

  const { data, isLoading } = useQuery({
    queryKey: ["planner", franchiseId, weekStartStr],
    queryFn: () => fetchPlanner(franchiseId!, weekStartStr),
    enabled: !!franchiseId,
  });

  const mutation = useMutation({
    mutationFn: saveEntry,
    onError: () => { toast({ title: "Erro ao salvar", variant: "destructive" }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["planner", franchiseId, weekStartStr] }); },
  });

  const weekMutation = useMutation({
    mutationFn: saveWeek,
    onError: () => { toast({ title: "Erro ao salvar texto", variant: "destructive" }); },
  });

  const submitMutation = useMutation({
    mutationFn: submitWeek,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", franchiseId, weekStartStr] });
      toast({ title: "Semana finalizada!", description: "Resumo enviado por e-mail para a equipe regional." });
    },
    onError: () => { toast({ title: "Erro ao finalizar semana", variant: "destructive" }); },
  });

  const weekKey = `${franchiseId}-${weekStartStr}`;
  const gapsValue = localGaps[weekKey] ?? data?.week?.gapsText ?? "";
  const actionsValue = localActions[weekKey] ?? data?.week?.actionsText ?? "";
  const isSubmitted = !!data?.week?.submittedAt;

  const getEntry = useCallback((indicatorKey: string, dayOfWeek: number) => {
    if (!data?.entries) return { value: "", meta: "" };
    const e = data.entries.find(
      (e: any) => e.indicatorKey === indicatorKey && e.dayOfWeek === dayOfWeek
    );
    if (!e) return { value: "", meta: "" };
    return {
      value: e.value != null ? String(e.value) : "",
      meta: e.meta != null ? String(e.meta) : "",
    };
  }, [data]);

  const handleCellChange = useCallback((indicatorKey: string, dayOfWeek: number, field: "value" | "meta", raw: string) => {
    if (!franchiseId) return;
    const debounceKey = `${indicatorKey}__${dayOfWeek}__${field}`;
    clearTimeout(debounceRef.current[debounceKey]);
    debounceRef.current[debounceKey] = setTimeout(() => {
      const parsed = raw === "" ? null : parseFloat(raw);
      const existing = getEntry(indicatorKey, dayOfWeek);
      mutation.mutate({
        franchiseId,
        weekStartDate: weekStartStr,
        indicatorKey,
        dayOfWeek,
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
        franchiseId,
        weekStartDate: weekStartStr,
        gapsText: field === "gaps" ? value : undefined,
        actionsText: field === "actions" ? value : undefined,
      });
    }, 800);
  }, [franchiseId, weekStartStr, weekKey, weekMutation]);

  const handleSubmit = () => {
    if (!franchiseId) return;
    submitMutation.mutate({
      franchiseId,
      weekStartDate: weekStartStr,
      gapsText: gapsValue || null,
      actionsText: actionsValue || null,
    });
    setConfirmSubmit(false);
  };

  function weekTotal(indicatorKey: string): number {
    if (!data?.entries) return 0;
    return data.entries
      .filter((e: any) => e.indicatorKey === indicatorKey)
      .reduce((sum: number, e: any) => sum + (e.value ?? 0), 0);
  }

  function metaForIndicator(indicatorKey: string): string {
    if (!data?.entries) return "";
    const metas = data.entries
      .filter((e: any) => e.indicatorKey === indicatorKey && e.meta != null)
      .map((e: any) => e.meta);
    if (!metas.length) return "";
    return String(metas[metas.length - 1]);
  }

  const canWrite = user?.role !== "responsavel_interno";

  const submittedAtLabel = data?.week?.submittedAt
    ? new Date(data.week.submittedAt).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
      })
    : null;

  return (
    <div className="p-6 max-w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TableIcon className="h-6 w-6 text-primary" />
            Planner Semanal de Indicadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhamento diário e consolidação semanal — KRIs e KPIs
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => addDays(d, -7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium px-2 min-w-[180px] text-center">
            {formatDateBR(weekStartStr)} – {formatDateBR(formatDate(weekEnd))}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(d => addDays(d, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekStart(getMondayOfWeek(new Date()))}>
            Semana atual
          </Button>
          {canWrite && franchiseId && !isLoading && (
            isSubmitted ? (
              <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-600 px-3 py-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Enviado {submittedAtLabel}
              </Badge>
            ) : (
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => setConfirmSubmit(true)}
                disabled={submitMutation.isPending}
              >
                <Send className="h-4 w-4 mr-1.5" />
                Finalizar semana
              </Button>
            )
          )}
        </div>
      </div>

      {!franchiseId && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Selecione uma franquia para visualizar o planner.
          </CardContent>
        </Card>
      )}

      {franchiseId && isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">Carregando...</CardContent>
        </Card>
      )}

      {franchiseId && !isLoading && CATEGORIES.map(cat => {
        const indicators = INDICATORS.filter(i => i.category === cat.key);
        return (
          <Card key={cat.key} className="overflow-hidden">
            <CardHeader className="pb-0 px-0">
              <div className="px-4 py-3 bg-primary/5 border-b">
                <CardTitle className="text-base font-semibold text-primary">{cat.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground min-w-[200px]">Indicador</th>
                    {DAYS.map(d => (
                      <th key={d} className="text-center px-2 py-2 font-medium text-muted-foreground min-w-[80px]">{d}</th>
                    ))}
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground min-w-[80px]">Total</th>
                    <th className="text-center px-2 py-2 font-medium text-muted-foreground min-w-[80px]">Meta</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground min-w-[120px]">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {indicators.map((ind, idx) => {
                    const total = weekTotal(ind.key);
                    const meta = metaForIndicator(ind.key);
                    const metaNum = meta ? parseFloat(meta) : null;
                    const isOverMeta = metaNum !== null && total >= metaNum && metaNum > 0;
                    return (
                      <tr key={ind.key} className={`border-b last:border-0 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}>
                        <td className="px-4 py-2 font-medium text-foreground/80">{ind.label}</td>
                        {DAYS.map((_, dayIdx) => {
                          const entry = getEntry(ind.key, dayIdx);
                          return (
                            <td key={dayIdx} className="px-1 py-1 text-center">
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                defaultValue={entry.value}
                                key={`${ind.key}-${dayIdx}-${weekStartStr}-val`}
                                disabled={!canWrite || isSubmitted}
                                className="w-16 h-7 text-center text-xs px-1"
                                onChange={e => handleCellChange(ind.key, dayIdx, "value", e.target.value)}
                              />
                            </td>
                          );
                        })}
                        <td className="px-2 py-2 text-center">
                          <Badge
                            variant={isOverMeta ? "default" : "secondary"}
                            className="tabular-nums"
                          >
                            {total > 0 ? (ind.key.includes("venda") ? total.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : total) : "—"}
                          </Badge>
                        </td>
                        <td className="px-1 py-1 text-center">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            defaultValue={meta}
                            key={`${ind.key}-meta-${weekStartStr}`}
                            disabled={!canWrite || isSubmitted}
                            placeholder="Meta"
                            className="w-16 h-7 text-center text-xs px-1"
                            onChange={e => handleCellChange(ind.key, 0, "meta", e.target.value)}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <span className="text-xs text-muted-foreground">
                            {isOverMeta && metaNum ? (
                              <span className="text-green-600 font-medium">Meta atingida ✓</span>
                            ) : metaNum && total > 0 ? (
                              <span className="text-orange-500">{Math.round((total / metaNum) * 100)}% da meta</span>
                            ) : null}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}

      {/* Gaps & Actions section */}
      {franchiseId && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Principais Gaps Identificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full text-sm border rounded-md p-2 min-h-[90px] bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Descreva os principais gaps desta semana..."
                disabled={!canWrite || isSubmitted}
                value={gapsValue}
                onChange={e => handleWeekTextChange("gaps", e.target.value)}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Ações Corretivas da Próxima Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full text-sm border rounded-md p-2 min-h-[90px] bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="Liste as ações corretivas planejadas..."
                disabled={!canWrite || isSubmitted}
                value={actionsValue}
                onChange={e => handleWeekTextChange("actions", e.target.value)}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submit row */}
      {franchiseId && !isLoading && canWrite && (
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
          <p className="text-xs text-muted-foreground italic">
            "O que é medido, melhora." — Método Ponto B
          </p>
          {isSubmitted ? (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Semana finalizada e enviada ao time regional
            </div>
          ) : (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => setConfirmSubmit(true)}
              disabled={submitMutation.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {submitMutation.isPending ? "Enviando..." : "Finalizar semana"}
            </Button>
          )}
        </div>
      )}

      {/* Confirm submit dialog */}
      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar semana?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá marcar a semana <strong>{formatDateBR(weekStartStr)} – {formatDateBR(formatDate(weekEnd))}</strong> como concluída
              e enviar um resumo por e-mail para a equipe regional. Os campos ficarão bloqueados após a finalização.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={handleSubmit}
            >
              Sim, finalizar e enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
