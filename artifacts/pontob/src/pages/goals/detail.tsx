import { useParams, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { progressColorClass } from "@/lib/progress-color";
import {
  useGetGoal, getGetGoalQueryKey,
  useCreateKpi, useDeleteKpi, useUpdateKpi,
  useUpdateGoalInitiative, useDeleteGoalInitiative,
} from "@workspace/api-client-react";
import {
  Loader2, ArrowLeft, Plus, Trash2, TrendingUp, Target, BarChart2,
  CheckCircle2, PauseCircle, XCircle, Pencil, CheckCheck, Clock, Zap,
} from "lucide-react";
import { PLANNER_SECTIONS, templatesBySection } from "@/lib/kpi-templates";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

const statusLabel: Record<string, string> = {
  ativa: "Ativa", concluida: "Concluída", pausada: "Pausada", cancelada: "Cancelada",
};
const statusColor: Record<string, string> = {
  ativa: "bg-primary/10 text-primary border-primary/30",
  concluida: "bg-green-50 text-green-700 border-green-200",
  pausada: "bg-yellow-50 text-yellow-700 border-yellow-200",
  cancelada: "bg-red-50 text-red-600 border-red-200",
};
const riskLabel: Record<string, string> = {
  no_prazo: "No prazo", atrasado: "Atrasado", adiantado: "Adiantado",
};

interface KpiForm {
  name: string;
  currentValue: string;
  targetValue: string;
  unit: string;
  frequency: string;
  indicatorType: string;
  desiredDirection: string;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "concluida") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "pausada") return <PauseCircle className="h-4 w-4 text-yellow-600" />;
  if (status === "cancelada") return <XCircle className="h-4 w-4 text-red-500" />;
  return <TrendingUp className="h-4 w-4 text-primary" />;
}

export default function GoalDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  // KPI create dialog
  const [kpiOpen, setKpiOpen] = useState(false);
  // KPI edit dialog — stores the kpi being edited
  const [editKpi, setEditKpi] = useState<any | null>(null);
  // Initiative inline state
  const [actualResultEditId, setActualResultEditId] = useState<number | null>(null);
  const [actualResultValue, setActualResultValue] = useState("");
  const [progressEditId, setProgressEditId] = useState<number | null>(null);
  const [progressEditValue, setProgressEditValue] = useState("");

  const canWrite = user?.role !== "responsavel_interno";

  const qKey = getGetGoalQueryKey(id);
  const { data: goal, isLoading } = useGetGoal(id, { query: { enabled: !!id, queryKey: qKey } });

  const createKpi = useCreateKpi();
  const deleteKpi = useDeleteKpi();
  const updateKpi = useUpdateKpi();
  const updateInitiative = useUpdateGoalInitiative();
  const deleteInitiative = useDeleteGoalInitiative();
  const [confirmDeleteInitiativeId, setConfirmDeleteInitiativeId] = useState<number | null>(null);
  const [confirmDeleteInitiativeName, setConfirmDeleteInitiativeName] = useState("");

  const onDeleteInitiative = async () => {
    if (!confirmDeleteInitiativeId) return;
    try {
      await deleteInitiative.mutateAsync({ id: confirmDeleteInitiativeId });
      qc.invalidateQueries({ queryKey: qKey });
      toast({ title: "Iniciativa excluída" });
    } catch {
      toast({ title: "Erro ao excluir iniciativa", variant: "destructive" });
    } finally {
      setConfirmDeleteInitiativeId(null);
    }
  };

  // ── CREATE KPI form ──
  const { register, handleSubmit, reset, control, setValue: setKpiValue, watch: watchKpi } = useForm<KpiForm>({
    defaultValues: { indicatorType: "resultado", desiredDirection: "higher", frequency: "mensal" },
  });

  // ── EDIT KPI form ──
  const {
    register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, control: controlEdit,
    setValue: setKpiEditValue, watch: watchKpiEdit,
  } = useForm<KpiForm>({ defaultValues: { indicatorType: "resultado", desiredDirection: "higher", frequency: "mensal" } });

  const onCreateKpi = async (data: KpiForm) => {
    try {
      await createKpi.mutateAsync({
        id,
        data: {
          name: data.name,
          currentValue: data.currentValue ? parseFloat(data.currentValue) : 0,
          targetValue: data.targetValue ? parseFloat(data.targetValue) : 0,
          unit: data.unit || undefined,
          frequency: (data.frequency || undefined) as any,
          indicatorType: data.indicatorType as any,
          desiredDirection: data.desiredDirection as any,
        },
      });
      qc.invalidateQueries({ queryKey: qKey });
      toast({ title: "KPI adicionado" });
      reset();
      setKpiOpen(false);
    } catch (err: any) {
      toast({ title: err?.message || "Erro ao adicionar KPI", variant: "destructive" });
    }
  };

  const openEditKpi = (kpi: any) => {
    setEditKpi(kpi);
    resetEdit({
      name: kpi.name ?? "",
      currentValue: kpi.currentValue != null ? String(kpi.currentValue) : "",
      targetValue: kpi.targetValue != null ? String(kpi.targetValue) : "",
      unit: kpi.unit ?? "",
      frequency: kpi.frequency ?? "mensal",
      indicatorType: kpi.indicatorType ?? "resultado",
      desiredDirection: kpi.desiredDirection ?? "higher",
    });
  };

  const onSaveKpi = async (data: KpiForm) => {
    if (!editKpi) return;
    try {
      await updateKpi.mutateAsync({
        id: editKpi.id,
        data: {
          name: data.name,
          currentValue: data.currentValue !== "" ? parseFloat(data.currentValue) : undefined,
          targetValue: data.targetValue !== "" ? parseFloat(data.targetValue) : undefined,
          unit: data.unit || undefined,
          frequency: data.frequency || undefined,
          indicatorType: data.indicatorType as any,
          desiredDirection: data.desiredDirection as any,
        },
      });
      qc.invalidateQueries({ queryKey: qKey });
      toast({ title: "KPI atualizado" });
      setEditKpi(null);
    } catch {
      toast({ title: "Erro ao salvar KPI", variant: "destructive" });
    }
  };

  const onDeleteKpi = async (kpiId: number) => {
    try {
      await deleteKpi.mutateAsync({ id: kpiId });
      qc.invalidateQueries({ queryKey: qKey });
      toast({ title: "KPI removido" });
    } catch {
      toast({ title: "Erro ao remover KPI", variant: "destructive" });
    }
  };

  const onUpdateInitiativeStatus = async (initiativeId: number, status: string) => {
    try {
      await updateInitiative.mutateAsync({ id: initiativeId, data: { status: status as any } });
      qc.invalidateQueries({ queryKey: qKey });
      toast({ title: "Status atualizado" });
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const onSaveActualResult = async (initiativeId: number) => {
    try {
      await updateInitiative.mutateAsync({ id: initiativeId, data: { actualResult: actualResultValue } as any });
      qc.invalidateQueries({ queryKey: qKey });
      toast({ title: "Resultado realizado salvo" });
      setActualResultEditId(null);
      setActualResultValue("");
    } catch {
      toast({ title: "Erro ao salvar resultado", variant: "destructive" });
    }
  };

  const onSaveProgress = async (initiativeId: number) => {
    const val = parseInt(progressEditValue);
    if (isNaN(val) || val < 0 || val > 100) {
      toast({ title: "Informe um valor entre 0 e 100", variant: "destructive" });
      return;
    }
    try {
      const update: any = { progressPercentage: val };
      if (val === 100) update.status = "concluida";
      await updateInitiative.mutateAsync({ id: initiativeId, data: update });
      qc.invalidateQueries({ queryKey: qKey });
      toast({
        title: val === 100 ? "Iniciativa concluída automaticamente! 🎉" : "Progresso atualizado",
      });
      setProgressEditId(null);
      setProgressEditValue("");
    } catch {
      toast({ title: "Erro ao salvar progresso", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!goal) return <div>Meta não encontrada.</div>;

  const kpis = (goal as any).kpis ?? [];
  const initiatives = (goal as any).initiatives ?? [];
  const activeInitiatives = initiatives.filter((i: any) => i.status === "ativa").length;
  const canAddInitiative = canWrite && activeInitiatives < 3;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/goals"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight truncate">{goal.title}</h1>
          <p className="text-muted-foreground mt-1">{goal.dimensionName} • {goal.keyProcessName}</p>
        </div>
        {canWrite && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/goals/${id}/edit`}>Editar Meta</Link>
          </Button>
        )}
      </div>

      {/* Info cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Score</div>
            <div className="text-3xl font-bold text-primary">{goal.score}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Progresso</div>
            <div className={`text-3xl font-bold ${progressColorClass(goal.progressPercentage)}`}>{goal.progressPercentage}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</div>
            <Badge variant={goal.riskStatus === "atrasado" ? "destructive" : "secondary"} className="mt-1">
              {riskLabel[goal.riskStatus ?? "no_prazo"] ?? goal.riskStatus}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Iniciativas Ativas</div>
            <div className="text-3xl font-bold">{activeInitiatives}<span className="text-lg text-muted-foreground">/3</span></div>
          </CardContent>
        </Card>
      </div>

      {/* KRI progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do KRI</CardTitle>
          {goal.kriDescription && <CardDescription>{goal.kriDescription}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Atual: <strong>{goal.currentValue} {goal.unit}</strong></span>
            <span className={`font-bold ${progressColorClass(goal.progressPercentage)}`}>{goal.progressPercentage}%</span>
            <span className="text-muted-foreground">Meta: <strong>{goal.targetValue} {goal.unit}</strong></span>
          </div>
          <Progress value={goal.progressPercentage} className="h-3" />
          {(goal.startDate || goal.endDate) && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{goal.startDate ?? "—"}</span>
              <span>{goal.endDate ?? "—"}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── KPIs ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />KPIs
            </CardTitle>
            <CardDescription>Indicadores de performance — máx. 3 por meta</CardDescription>
          </div>
          {canWrite && kpis.length < 3 && (
            <Dialog open={kpiOpen} onOpenChange={v => { setKpiOpen(v); if (!v) reset(); }}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar KPI
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Novo KPI</DialogTitle></DialogHeader>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2.5">
                  <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Sugestões do Planner Semanal
                  </p>
                  {PLANNER_SECTIONS.map(sec => (
                    <div key={sec.key}>
                      <p className={`text-xs font-semibold mb-1 ${sec.color}`}>{sec.key}</p>
                      <div className="flex flex-wrap gap-1">
                        {templatesBySection(sec.key).map(t => (
                          <button key={t.name} type="button"
                            onClick={() => { setKpiValue("name", t.name); setKpiValue("unit", t.unit); }}
                            className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${sec.bg} ${sec.color} ${sec.border} hover:opacity-80`}>
                            {t.name}{t.desiredDirection === "diminuir" ? " ↓" : ""}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSubmit(onCreateKpi)} className="space-y-4 mt-2">
                  <KpiFormFields register={register} control={control} watch={watchKpi} setValue={setKpiValue} />
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" type="button" onClick={() => setKpiOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={createKpi.isPending}>
                      {createKpi.isPending ? "Adicionando..." : "Adicionar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {kpis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart2 className="mx-auto h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhum KPI cadastrado ainda.</p>
              {canWrite && <p className="text-xs mt-1">Adicione até 3 KPIs para monitorar o progresso desta meta.</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {kpis.map((kpi: any) => {
                const { pct, barPct, rhythmPct, rhythmBarPct, expectedByNow, isPeriodic, freqLabel } = kpiPeriodProgress(kpi);
                const pctColor = progressColorClass(pct);
                const rhythmColor = progressColorClass(rhythmPct);
                return (
                  <div
                    key={kpi.id}
                    className="p-4 border rounded-lg space-y-2 cursor-pointer hover:border-primary/40 hover:bg-accent/30 transition-colors group"
                    onClick={() => canWrite && openEditKpi(kpi)}
                    title={canWrite ? "Clique para editar" : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{kpi.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
                          {isPeriodic && <span className="ml-1.5 text-muted-foreground/60">por {freqLabel}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* % da meta total do período */}
                        <div className="text-right">
                          <span className={`text-sm font-mono font-semibold ${pctColor}`}>{pct}%</span>
                          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">da meta</p>
                        </div>
                        {/* ritmo: atual vs esperado até hoje */}
                        {isPeriodic && (
                          <div className="text-right border-l pl-2">
                            <span className={`text-sm font-mono font-semibold ${rhythmColor}`}>{rhythmPct}%</span>
                            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                              ritmo · esp. {expectedByNow} {kpi.unit}
                            </p>
                          </div>
                        )}
                        {canWrite && (
                          <>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                              onClick={e => { e.stopPropagation(); openEditKpi(kpi); }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                              onClick={e => { e.stopPropagation(); onDeleteKpi(kpi.id); }}
                              disabled={deleteKpi.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {/* Barra dupla: meta total + ritmo até hoje */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground w-14 shrink-0">Meta total</span>
                        <Progress value={barPct} className="h-1.5 flex-1" />
                      </div>
                      {isPeriodic && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-14 shrink-0">Ritmo hoje</span>
                          <Progress value={rhythmBarPct} className="h-1.5 flex-1" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI edit dialog */}
      <Dialog open={!!editKpi} onOpenChange={v => { if (!v) setEditKpi(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar KPI</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onSaveKpi)} className="space-y-4 mt-2">
            <KpiFormFields register={regEdit} control={controlEdit} watch={watchKpiEdit} setValue={setKpiEditValue} />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" type="button" onClick={() => setEditKpi(null)}>Cancelar</Button>
              <Button type="submit" disabled={updateKpi.isPending}>
                {updateKpi.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Initiatives ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />Iniciativas
            </CardTitle>
            <CardDescription>{activeInitiatives}/3 iniciativas ativas — conclua uma antes de adicionar mais</CardDescription>
          </div>
          {canAddInitiative && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/goals/${id}/initiatives/new`}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Iniciativa
              </Link>
            </Button>
          )}
          {canWrite && !canAddInitiative && activeInitiatives >= 3 && (
            <span className="text-xs text-muted-foreground">Limite de 3 ativas atingido</span>
          )}
        </CardHeader>
        <CardContent>
          {initiatives.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="mx-auto h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">Nenhuma iniciativa vinculada a esta meta.</p>
              {canWrite && (
                <Button size="sm" variant="outline" className="mt-3" asChild>
                  <Link href={`/goals/${id}/initiatives/new`}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> Adicionar Iniciativa
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {initiatives.map((initiative: any) => (
                <div key={initiative.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <StatusIcon status={initiative.status} />
                      <div className="min-w-0">
                        <Link
                          href={`/goals/${id}/initiatives/${initiative.id}/edit`}
                          className="font-medium text-sm leading-tight truncate hover:text-primary hover:underline cursor-pointer"
                        >
                          {initiative.initiativeName || "Iniciativa"}
                        </Link>
                        {initiative.keyProcessName && (
                          <p className="text-xs text-muted-foreground mt-0.5">{initiative.keyProcessName}</p>
                        )}
                        {initiative.ownerName && (
                          <p className="text-xs text-muted-foreground">Responsável: {initiative.ownerName}</p>
                        )}
                        {(initiative.startDate || initiative.endDate) && (
                          <p className="text-xs text-muted-foreground">
                            {initiative.startDate} — {initiative.endDate || "em aberto"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-xs ${statusColor[initiative.status] || ""}`}>
                          {statusLabel[initiative.status] || initiative.status}
                        </Badge>
                        {canWrite && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={e => { e.stopPropagation(); setConfirmDeleteInitiativeName(initiative.initiativeName || "esta iniciativa"); setConfirmDeleteInitiativeId(initiative.id); }}
                            title="Excluir iniciativa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {canWrite && (
                        <Select value={initiative.status} onValueChange={v => onUpdateInitiativeStatus(initiative.id, v)}>
                          <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativa">Ativa</SelectItem>
                            <SelectItem value="concluida">Concluída</SelectItem>
                            <SelectItem value="pausada">Pausada</SelectItem>
                            <SelectItem value="cancelada">Cancelada</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>

                  {/* Progress — click to edit */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground items-center">
                      <span>Progresso</span>
                      {canWrite && progressEditId === initiative.id ? (
                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <Input
                            type="number" min={0} max={100}
                            className="h-6 w-16 text-xs text-center px-1"
                            value={progressEditValue}
                            onChange={e => setProgressEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === "Enter") onSaveProgress(initiative.id);
                              if (e.key === "Escape") { setProgressEditId(null); setProgressEditValue(""); }
                            }}
                            autoFocus
                          />
                          <span className="text-xs">%</span>
                          <Button size="sm" className="h-6 text-xs px-2" onClick={() => onSaveProgress(initiative.id)}>OK</Button>
                          <Button size="sm" variant="ghost" className="h-6 text-xs px-1" onClick={() => { setProgressEditId(null); setProgressEditValue(""); }}>✕</Button>
                        </div>
                      ) : (
                        <span
                          className={`font-mono ${canWrite ? "cursor-pointer hover:text-primary hover:underline" : ""} flex items-center gap-1`}
                          title={canWrite ? "Clique para editar o progresso" : undefined}
                          onClick={() => {
                            if (!canWrite) return;
                            setProgressEditId(initiative.id);
                            setProgressEditValue(String(initiative.progressPercentage ?? 0));
                          }}
                        >
                          <span className={progressColorClass(initiative.progressPercentage ?? 0)}>{initiative.progressPercentage ?? 0}%</span>
                          {canWrite && <Pencil className="h-2.5 w-2.5 opacity-50" />}
                        </span>
                      )}
                    </div>
                    <Progress value={initiative.progressPercentage ?? 0} className="h-1.5" />
                  </div>

                  {/* Resultado Esperado / Realizado */}
                  {(initiative.desiredResult || initiative.actualResult || canWrite) && (
                    <div className="border-t pt-3 space-y-2">
                      {initiative.desiredResult && (
                        <div className="flex items-start gap-1.5 min-w-0">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resultado Esperado</p>
                            <p className="text-xs text-muted-foreground mt-0.5 italic">{initiative.desiredResult}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                        <CheckCheck className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${initiative.actualResult ? "text-green-600" : "text-muted-foreground/40"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resultado Realizado</p>
                          {actualResultEditId === initiative.id ? (
                            <div className="mt-1 space-y-2">
                              <Textarea
                                rows={2} className="text-xs"
                                value={actualResultValue}
                                onChange={e => setActualResultValue(e.target.value)}
                                placeholder="Descreva o resultado que foi de fato alcançado..."
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button size="sm" className="h-7 text-xs" onClick={() => onSaveActualResult(initiative.id)}>
                                  {updateInitiative.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Salvar"}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setActualResultEditId(null); setActualResultValue(""); }}>Cancelar</Button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`mt-0.5 text-xs min-h-[1.5rem] ${canWrite ? "cursor-pointer hover:text-primary rounded px-1 -mx-1 hover:bg-primary/5" : ""} ${initiative.actualResult ? "text-foreground" : "text-muted-foreground/60 italic"}`}
                              onClick={() => {
                                if (!canWrite) return;
                                setActualResultEditId(initiative.id);
                                setActualResultValue(initiative.actualResult ?? "");
                              }}
                              title={canWrite ? "Clique para registrar o resultado" : undefined}
                            >
                              {initiative.actualResult || (canWrite ? "» Clique para registrar resultado realizado" : "Sem resultado registrado")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm delete initiative */}
      <AlertDialog open={!!confirmDeleteInitiativeId} onOpenChange={open => { if (!open) setConfirmDeleteInitiativeId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir iniciativa?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá excluir permanentemente <strong>"{confirmDeleteInitiativeName}"</strong>. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={onDeleteInitiative}
              disabled={deleteInitiative.isPending}
            >
              {deleteInitiative.isPending ? "Excluindo..." : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Reusable KPI form fields ──
// ── KPI period-aware progress helpers ──────────────────────────────────────

function countWorkdays(start: Date, end: Date): number {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(23, 59, 59, 999);
  while (cur <= endD && count <= 400) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return Math.max(1, count);
}

const FREQ_LABEL: Record<string, string> = {
  diario: "dia", semanal: "sem", mensal: "mês",
  trimestral: "tri", semestral: "sem.", anual: "ano",
};

interface KpiProgress {
  pct: number;          // atual ÷ meta total (pode passar de 100)
  barPct: number;       // capped 0-100 para a barra
  rhythmPct: number;    // atual ÷ esperado até hoje no período (pode passar de 100)
  rhythmBarPct: number; // capped 0-100
  expectedByNow: number;// quanto deveria ter sido feito até hoje
  isPeriodic: boolean;
  freqLabel: string;
}

function kpiPeriodProgress(kpi: any): KpiProgress {
  const cur: number = kpi.currentValue ?? 0;
  const tgt: number = kpi.targetValue ?? 0;
  const freq: string | undefined = kpi.frequency;

  // ── pct: progresso total (atual ÷ meta) ──────────────────────────────────
  const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;

  // ── rhythmPct: atual vs esperado até hoje dentro do período ───────────────
  let expectedByNow = tgt; // sem período = meta cheia
  if (freq && tgt > 0) {
    const now = new Date();
    let elapsed = 1, total = 1;

    if (freq === "diario") {
      // dia útil: 1 dia útil de 1 dia útil → sempre 100% do esperado
      elapsed = 1; total = 1;
    } else if (freq === "semanal") {
      // semana Seg–Dom: dia da semana 1(seg)–7(dom), hoje = elapsed
      const dow = now.getDay(); // 0=dom, 1=seg...
      elapsed = dow === 0 ? 7 : dow;
      total = 7;
    } else if (freq === "mensal") {
      elapsed = now.getDate();
      total = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    } else if (freq === "trimestral") {
      const mo = now.getMonth(); // 0-11
      const qStart = Math.floor(mo / 3) * 3;
      const qEnd = qStart + 2;
      const startOfQ = new Date(now.getFullYear(), qStart, 1);
      const endOfQ = new Date(now.getFullYear(), qEnd + 1, 0);
      elapsed = Math.round((now.getTime() - startOfQ.getTime()) / 86400000) + 1;
      total = Math.round((endOfQ.getTime() - startOfQ.getTime()) / 86400000) + 1;
    } else if (freq === "semestral") {
      const mo = now.getMonth();
      const hStart = mo < 6 ? 0 : 6;
      const startOfH = new Date(now.getFullYear(), hStart, 1);
      const endOfH = new Date(now.getFullYear(), hStart + 6, 0);
      elapsed = Math.round((now.getTime() - startOfH.getTime()) / 86400000) + 1;
      total = Math.round((endOfH.getTime() - startOfH.getTime()) / 86400000) + 1;
    } else if (freq === "anual") {
      const startOfY = new Date(now.getFullYear(), 0, 1);
      const endOfY = new Date(now.getFullYear(), 11, 31);
      elapsed = Math.round((now.getTime() - startOfY.getTime()) / 86400000) + 1;
      total = Math.round((endOfY.getTime() - startOfY.getTime()) / 86400000) + 1;
    }

    expectedByNow = Math.round((tgt * Math.min(elapsed, total)) / total * 10) / 10;
  }

  const rhythmPct = expectedByNow > 0 ? Math.round((cur / expectedByNow) * 100) : (cur > 0 ? 100 : 0);

  return {
    pct,
    barPct: Math.min(100, pct),
    rhythmPct,
    rhythmBarPct: Math.min(100, rhythmPct),
    expectedByNow,
    isPeriodic: !!freq,
    freqLabel: freq ? (FREQ_LABEL[freq] ?? freq) : "",
  };
}

// ──────────────────────────────────────────────────────────────────────────

// Metas automáticas por nome e período
const KPI_PRESETS: Record<string, Record<string, number>> = {
  "reuniões realizadas": { diario: 1, semanal: 5, mensal: 22 },
  "reuniões agendadas":  { diario: 2, semanal: 10, mensal: 44 },
};

function KpiFormFields({ register, control, watch, setValue }: {
  register: any; control: any; watch?: any; setValue?: any;
}) {
  const name: string = watch ? (watch("name") ?? "") : "";
  const frequency: string = watch ? (watch("frequency") ?? "") : "";

  useEffect(() => {
    if (!watch || !setValue || !frequency) return;
    const key = name.trim().toLowerCase();
    const preset = KPI_PRESETS[key];
    if (preset && preset[frequency] !== undefined) {
      setValue("targetValue", String(preset[frequency]));
      setValue("unit", "reuniões");
    }
  }, [name, frequency]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="space-y-1.5">
        <Label>Nome do KPI *</Label>
        <Input {...register("name", { required: true })} placeholder="Ex: Reuniões agendadas" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Valor Atual</Label>
          <Input type="number" step="any" {...register("currentValue")} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Meta</Label>
          <Input type="number" step="any" {...register("targetValue")} placeholder="100" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Unidade</Label>
          <Input {...register("unit")} placeholder="%, R$, un" />
        </div>
      </div>

      {/* Period */}
      <div className="space-y-1.5">
        <Label className="text-xs">Período da Meta</Label>
        <Controller name="frequency" control={control} render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diário — meta por dia útil</SelectItem>
              <SelectItem value="semanal">Semanal — meta por semana</SelectItem>
              <SelectItem value="mensal">Mensal — meta por mês</SelectItem>
            </SelectContent>
          </Select>
        )} />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Ex: "Reuniões agendadas" — 2/dia, 10/semana ou 44/mês são valores diferentes para o mesmo KPI. Defina o período da meta que você quer acompanhar.
        </p>
      </div>

    </>
  );
}
