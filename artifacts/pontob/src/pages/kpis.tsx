import { useAuth } from "@/lib/auth";
import {
  useListGoals, getListGoalsQueryKey,
  useCreateKpi, useUpdateKpi, useDeleteKpi,
} from "@workspace/api-client-react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, BarChart2, Target, TrendingUp, TrendingDown, Minus,
  ArrowRight, Search, X, Plus, Pencil, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { progressColorClass, progressBarClass } from "@/lib/progress-color";
import { ProgressLegend } from "@/components/progress-legend";
import { useMemo, useState, useEffect } from "react";

const FREQ_LABEL: Record<string, string> = {
  diario: "dia",
  semanal: "semana",
  mensal: "mês",
  trimestral: "trimestre",
  semestral: "semestre",
  anual: "ano",
};

const KPI_PRESETS: Record<string, Record<string, number>> = {
  "reuniões realizadas": { diario: 1, semanal: 5, mensal: 22 },
  "reuniões agendadas":  { diario: 2, semanal: 10, mensal: 44 },
};

function kpiPct(kpi: any): number {
  const cur: number = kpi.currentValue ?? 0;
  const tgt: number = kpi.targetValue ?? 0;
  return tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
}

function DirectionIcon({ direction }: { direction?: string }) {
  if (direction === "diminuir") return <TrendingDown className="h-3 w-3 text-muted-foreground/60" />;
  if (direction === "manter") return <Minus className="h-3 w-3 text-muted-foreground/60" />;
  return <TrendingUp className="h-3 w-3 text-muted-foreground/60" />;
}

function IndicatorBadge({ type }: { type?: string }) {
  const label = type === "processo" ? "Processo" : type === "resultado" ? "Resultado" : (type ?? "");
  const cls =
    type === "processo"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : "bg-blue-50 text-blue-700 border-blue-200";
  if (!label) return null;
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", cls)}>
      {label}
    </span>
  );
}

interface KpiForm {
  name: string;
  currentValue: string;
  targetValue: string;
  unit: string;
  frequency: string;
  indicatorType: string;
  desiredDirection: string;
}

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
      <div className="space-y-1.5">
        <Label className="text-xs">Período da Meta</Label>
        <Controller name="frequency" control={control} render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="diario">Diário — meta por dia útil</SelectItem>
              <SelectItem value="semanal">Semanal — meta por semana</SelectItem>
              <SelectItem value="mensal">Mensal — meta por mês</SelectItem>
              <SelectItem value="trimestral">Trimestral</SelectItem>
              <SelectItem value="semestral">Semestral</SelectItem>
              <SelectItem value="anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        )} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo</Label>
          <Controller name="indicatorType" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={"resultado"}>Resultado</SelectItem>
                <SelectItem value={"processo"}>Processo</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Direção desejada</Label>
          <Controller name="desiredDirection" control={control} render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={"higher"}>Aumentar ↑</SelectItem>
                <SelectItem value={"lower"}>Diminuir ↓</SelectItem>
                <SelectItem value={"manter"}>Manter →</SelectItem>
              </SelectContent>
            </Select>
          )} />
        </div>
      </div>
    </>
  );
}

export default function KpisPage() {
  const { user } = useAuth();
  const {
    franchiseId,
    isAdmin,
    isSocio,
    franchises,
    adminFranchiseId,
    setAdminFranchiseId,
    socioFranchiseId,
    setSocioFranchiseId,
  } = useFranchiseContext();

  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  // Edit dialog
  const [editKpi, setEditKpi] = useState<{ kpi: any; goalId: number } | null>(null);
  // Delete dialog
  const [deleteKpi, setDeleteKpi] = useState<{ id: number; name: string; goalId: number } | null>(null);
  // Add dialog
  const [addKpiGoal, setAddKpiGoal] = useState<{ id: number; title: string } | null>(null);

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const listQueryKey = getListGoalsQueryKey(goalParams);
  const { data: goals, isLoading } = useListGoals(goalParams, {
    query: { enabled: !!franchiseId, queryKey: listQueryKey },
  });

  const canWrite = user?.role !== "responsavel_interno";

  // Mutations
  const createKpi = useCreateKpi();
  const updateKpi = useUpdateKpi();
  const deleteKpiMutation = useDeleteKpi();

  // Create form
  const { register: regCreate, handleSubmit: hsCreate, reset: resetCreate, control: ctrlCreate, watch: watchCreate, setValue: setValCreate } = useForm<KpiForm>({
    defaultValues: { indicatorType: "resultado", desiredDirection: "higher", frequency: "mensal" },
  });

  // Edit form
  const { register: regEdit, handleSubmit: hsEdit, reset: resetEdit, control: ctrlEdit, watch: watchEdit, setValue: setValEdit } = useForm<KpiForm>({
    defaultValues: { indicatorType: "resultado", desiredDirection: "higher", frequency: "mensal" },
  });

  const openEdit = (kpi: any, goalId: number) => {
    setEditKpi({ kpi, goalId });
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

  const onSaveEdit = async (data: KpiForm) => {
    if (!editKpi) return;
    try {
      await updateKpi.mutateAsync({
        id: editKpi.kpi.id,
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
      qc.invalidateQueries({ queryKey: listQueryKey });
      toast({ title: "KPI atualizado" });
      setEditKpi(null);
    } catch (err: any) {
      toast({ title: err?.message || "Erro ao salvar KPI", variant: "destructive" });
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteKpi) return;
    try {
      await deleteKpiMutation.mutateAsync({ id: deleteKpi.id });
      qc.invalidateQueries({ queryKey: listQueryKey });
      toast({ title: "KPI removido" });
      setDeleteKpi(null);
    } catch {
      toast({ title: "Erro ao remover KPI", variant: "destructive" });
    }
  };

  const onCreateKpi = async (data: KpiForm) => {
    if (!addKpiGoal) return;
    try {
      await createKpi.mutateAsync({
        id: addKpiGoal.id,
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
      qc.invalidateQueries({ queryKey: listQueryKey });
      toast({ title: "KPI adicionado" });
      resetCreate({ indicatorType: "resultado", desiredDirection: "higher", frequency: "mensal" });
      setAddKpiGoal(null);
    } catch (err: any) {
      toast({ title: err?.message || "Erro ao adicionar KPI", variant: "destructive" });
    }
  };

  const goalsWithKpis = useMemo(() => {
    if (!goals) return [];
    return goals.map((g: any) => ({ goal: g, kpis: (g.kpis ?? []) as any[] }));
  }, [goals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return goalsWithKpis.filter(({ kpis }) => kpis.length > 0);
    return goalsWithKpis
      .map(({ goal, kpis }) => ({
        goal,
        kpis: kpis.filter(
          (k: any) =>
            k.name?.toLowerCase().includes(q) ||
            goal.title?.toLowerCase().includes(q) ||
            goal.keyProcessName?.toLowerCase().includes(q),
        ),
      }))
      .filter(({ kpis }) => kpis.length > 0);
  }, [goalsWithKpis, search]);

  const totalKpis = useMemo(
    () => goalsWithKpis.reduce((s, { kpis }) => s + kpis.length, 0),
    [goalsWithKpis],
  );

  // Goals where we can still add a KPI (< 3 KPIs)
  const goalsCanAdd = useMemo(
    () => goalsWithKpis.filter(({ kpis }) => kpis.length < 3),
    [goalsWithKpis],
  );

  const pickerSection = (isAdmin || isSocio) && (
    <>
      {isAdmin && (
        <FranchisePicker franchises={franchises} value={adminFranchiseId} onChange={setAdminFranchiseId} />
      )}
      {isSocio && (
        <FranchisePicker franchises={franchises} value={socioFranchiseId} onChange={setSocioFranchiseId} />
      )}
    </>
  );

  if ((isAdmin || isSocio) && !franchiseId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KPIs</h1>
          <p className="text-muted-foreground mt-1">Indicadores de performance de todas as metas</p>
        </div>
        {pickerSection}
        <AdminEmptyState message="Selecione uma franquia para ver os KPIs." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KPIs</h1>
          <p className="text-muted-foreground mt-1">Indicadores de performance de todas as metas</p>
        </div>
      </div>

      {pickerSection}

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && (
        <>
          {/* Summary + legend */}
          {totalKpis > 0 && (
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BarChart2 className="h-4 w-4" />
                <span>
                  <strong className="text-foreground">{totalKpis}</strong> KPI{totalKpis !== 1 ? "s" : ""} em{" "}
                  <strong className="text-foreground">{goalsWithKpis.filter(g => g.kpis.length > 0).length}</strong> meta{goalsWithKpis.filter(g => g.kpis.length > 0).length !== 1 ? "s" : ""}
                </span>
              </div>
              <ProgressLegend />
            </div>
          )}

          {/* Search */}
          {totalKpis > 0 && (
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                placeholder="Buscar KPI ou meta..."
                className="pl-9 h-8 text-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {totalKpis === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <BarChart2 className="mx-auto h-10 w-10 mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium text-muted-foreground">Nenhum KPI cadastrado ainda.</p>
                <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                  Adicione KPIs nas suas metas para monitorar o progresso.
                </p>
                {canWrite && goals && goals.length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setAddKpiGoal({ id: (goals[0] as any).id, title: (goals[0] as any).title })}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Adicionar KPI
                  </Button>
                )}
                {(!goals || goals.length === 0) && canWrite && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/goals">
                      <Target className="h-3.5 w-3.5 mr-1.5" />
                      Criar uma Meta primeiro
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* No search results */}
          {totalKpis > 0 && filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-sm">Nenhum KPI encontrado para "{search}".</p>
            </div>
          )}

          {/* Goals that have KPIs (or can add KPIs if canWrite and no filter) */}
          {(() => {
            // When searching, show filtered. Otherwise show all goals with KPIs,
            // plus goals with 0 KPIs if canWrite (so they can add).
            const toShow = search
              ? filtered
              : canWrite
                ? goalsWithKpis
                : goalsWithKpis.filter(({ kpis }) => kpis.length > 0);

            return toShow.map(({ goal, kpis }) => (
              <div key={goal.id} className="space-y-2">
                {/* Goal row */}
                <div className="flex items-center gap-2 px-1">
                  <Target className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
                    {goal.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 shrink-0 hidden sm:inline">
                    {goal.dimensionName} · {goal.keyProcessName}
                  </span>
                  <div className="ml-auto flex items-center gap-1.5 shrink-0">
                    {canWrite && kpis.length < 3 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => {
                          resetCreate({ indicatorType: "resultado", desiredDirection: "higher", frequency: "mensal" });
                          setAddKpiGoal({ id: goal.id, title: goal.title });
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" /> KPI
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-[11px] text-muted-foreground"
                      asChild
                    >
                      <Link href={`/goals/${goal.id}`}>
                        Ver meta <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* KPI cards */}
                {kpis.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {kpis.map((kpi: any) => {
                      const pct = kpiPct(kpi);
                      const freqLabel = kpi.frequency ? (FREQ_LABEL[kpi.frequency] ?? kpi.frequency) : null;
                      return (
                        <Card
                          key={kpi.id}
                          className="transition-colors group"
                        >
                          <CardContent className="pt-4 pb-4 space-y-2.5">
                            {/* Name + % + actions */}
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium leading-tight line-clamp-2 flex-1">{kpi.name}</p>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className={cn("text-base font-bold tabular-nums", progressColorClass(pct))}>
                                  {pct}%
                                </span>
                                {canWrite && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition-opacity"
                                      onClick={() => openEdit(kpi, goal.id)}
                                      title="Editar KPI"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                                      onClick={() => setDeleteKpi({ id: kpi.id, name: kpi.name, goalId: goal.id })}
                                      title="Excluir KPI"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Progress bar */}
                            <Progress value={Math.min(100, pct)} className={cn("h-1.5", progressBarClass(pct))} />

                            {/* Values + metadata */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                <strong className="text-foreground tabular-nums">
                                  {(kpi.currentValue ?? 0).toLocaleString("pt-BR")}
                                </strong>
                                {kpi.targetValue != null && (
                                  <span className="text-muted-foreground/70">
                                    {" "}/ {kpi.targetValue.toLocaleString("pt-BR")}{kpi.unit ? ` ${kpi.unit}` : ""}
                                  </span>
                                )}
                                {freqLabel && (
                                  <span className="text-muted-foreground/50"> por {freqLabel}</span>
                                )}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <DirectionIcon direction={kpi.desiredDirection} />
                                <IndicatorBadge type={kpi.indicatorType} />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  /* Goal with 0 KPIs — shown only for canWrite */
                  <div
                    className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground/60 cursor-pointer hover:border-primary/40 hover:text-muted-foreground transition-colors flex items-center gap-2"
                    onClick={() => {
                      resetCreate({ indicatorType: "resultado", desiredDirection: "higher", frequency: "mensal" });
                      setAddKpiGoal({ id: goal.id, title: goal.title });
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar primeiro KPI para esta meta
                  </div>
                )}
              </div>
            ));
          })()}
        </>
      )}

      {/* ── Edit KPI dialog ── */}
      <Dialog open={!!editKpi} onOpenChange={v => { if (!v) setEditKpi(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar KPI</DialogTitle>
          </DialogHeader>
          <form onSubmit={hsEdit(onSaveEdit)} className="space-y-4 mt-2">
            <KpiFormFields register={regEdit} control={ctrlEdit} watch={watchEdit} setValue={setValEdit} />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" type="button" onClick={() => setEditKpi(null)}>Cancelar</Button>
              <Button type="submit" disabled={updateKpi.isPending}>
                {updateKpi.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add KPI dialog ── */}
      <Dialog open={!!addKpiGoal} onOpenChange={v => { if (!v) setAddKpiGoal(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo KPI</DialogTitle>
            {addKpiGoal && (
              <p className="text-sm text-muted-foreground mt-0.5">{addKpiGoal.title}</p>
            )}
          </DialogHeader>
          <form onSubmit={hsCreate(onCreateKpi)} className="space-y-4 mt-2">
            <KpiFormFields register={regCreate} control={ctrlCreate} watch={watchCreate} setValue={setValCreate} />
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" type="button" onClick={() => setAddKpiGoal(null)}>Cancelar</Button>
              <Button type="submit" disabled={createKpi.isPending}>
                {createKpi.isPending ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete KPI confirmation ── */}
      <AlertDialog open={!!deleteKpi} onOpenChange={v => { if (!v) setDeleteKpi(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir KPI?</AlertDialogTitle>
            <AlertDialogDescription>
              O KPI <strong>"{deleteKpi?.name}"</strong> será excluído permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={onConfirmDelete}
              disabled={deleteKpiMutation.isPending}
            >
              {deleteKpiMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
