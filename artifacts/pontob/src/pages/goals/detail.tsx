import { useParams, Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetGoal, getGetGoalQueryKey, useCreateKpi, useDeleteKpi, useUpdateGoalInitiative } from "@workspace/api-client-react";
import { Loader2, ArrowLeft, Plus, Trash2, TrendingUp, Target, BarChart2, CheckCircle2, PauseCircle, XCircle, Pencil, CheckCheck, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const statusLabel: Record<string, string> = {
  ativa: "Ativa",
  concluida: "Concluída",
  pausada: "Pausada",
  cancelada: "Cancelada",
};

const statusColor: Record<string, string> = {
  ativa: "bg-primary/10 text-primary border-primary/30",
  concluida: "bg-green-50 text-green-700 border-green-200",
  pausada: "bg-yellow-50 text-yellow-700 border-yellow-200",
  cancelada: "bg-red-50 text-red-600 border-red-200",
};

const riskLabel: Record<string, string> = {
  no_prazo: "No prazo",
  atrasado: "Atrasado",
  adiantado: "Adiantado",
};

interface KpiForm {
  name: string;
  currentValue: string;
  targetValue: string;
  unit: string;
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
  const [kpiOpen, setKpiOpen] = useState(false);
  const [actualResultEditId, setActualResultEditId] = useState<number | null>(null);
  const [actualResultValue, setActualResultValue] = useState("");

  const canWrite = user?.role !== "responsavel_interno";

  const qKey = getGetGoalQueryKey(id);
  const { data: goal, isLoading } = useGetGoal(
    id,
    { query: { enabled: !!id, queryKey: qKey } }
  );

  const createKpi = useCreateKpi();
  const deleteKpi = useDeleteKpi();
  const updateInitiative = useUpdateGoalInitiative();

  const { register, handleSubmit, reset, control } = useForm<KpiForm>({
    defaultValues: { indicatorType: "resultado", desiredDirection: "higher" },
  });

  const onCreateKpi = async (data: KpiForm) => {
    try {
      await createKpi.mutateAsync({
        id,
        data: {
          name: data.name,
          currentValue: data.currentValue ? parseFloat(data.currentValue) : 0,
          targetValue: data.targetValue ? parseFloat(data.targetValue) : 0,
          unit: data.unit || undefined,
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/goals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
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
            <div className="text-3xl font-bold">{goal.progressPercentage}%</div>
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

      {/* Progress card */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso do KRI</CardTitle>
          {goal.kriDescription && (
            <CardDescription>{goal.kriDescription}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Atual: <strong>{goal.currentValue} {goal.unit}</strong></span>
            <span className="font-bold">{goal.progressPercentage}%</span>
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

      {/* KPIs section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-primary" />
              KPIs
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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo KPI</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onCreateKpi)} className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label>Nome do KPI *</Label>
                    <Input {...register("name", { required: true })} placeholder="Ex: Taxa de conversão de leads" />
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo</Label>
                      <Controller
                        name="indicatorType"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="resultado">Resultado</SelectItem>
                              <SelectItem value="processo">Processo</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Direção Desejada</Label>
                      <Controller
                        name="desiredDirection"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="higher">Maior é melhor</SelectItem>
                              <SelectItem value="lower">Menor é melhor</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
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
                const progress = kpi.targetValue > 0
                  ? Math.min(100, Math.round((kpi.currentValue / kpi.targetValue) * 100))
                  : 0;
                return (
                  <div key={kpi.id} className="p-4 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{kpi.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {kpi.currentValue} / {kpi.targetValue} {kpi.unit}
                          {kpi.indicatorType && <span className="ml-2 capitalize">({kpi.indicatorType})</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-mono font-semibold">{progress}%</span>
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteKpi(kpi.id)}
                            disabled={deleteKpi.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <Progress value={progress} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Initiatives section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Iniciativas
            </CardTitle>
            <CardDescription>
              {activeInitiatives}/3 iniciativas ativas — conclua uma antes de adicionar mais
            </CardDescription>
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
                        <p className="font-medium text-sm leading-tight truncate">
                          {initiative.initiativeName || "Iniciativa"}
                        </p>
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
                      <Badge variant="outline" className={`text-xs ${statusColor[initiative.status] || ""}`}>
                        {statusLabel[initiative.status] || initiative.status}
                      </Badge>
                      {canWrite && (
                        <Select
                          value={initiative.status}
                          onValueChange={v => onUpdateInitiativeStatus(initiative.id, v)}
                        >
                          <SelectTrigger className="h-7 text-xs w-32">
                            <SelectValue />
                          </SelectTrigger>
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
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progresso</span>
                      <span className="font-mono">{initiative.progressPercentage ?? 0}%</span>
                    </div>
                    <Progress value={initiative.progressPercentage ?? 0} className="h-1.5" />
                  </div>

                  {/* Resultado Esperado vs Realizado */}
                  {(initiative.desiredResult || initiative.actualResult || canWrite) && (
                    <div className="border-t pt-3 space-y-2">
                      {initiative.desiredResult && (
                        <div className="flex gap-2">
                          <div className="flex items-start gap-1.5 min-w-0 flex-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resultado Esperado</p>
                              <p className="text-xs text-muted-foreground mt-0.5 italic">{initiative.desiredResult}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 items-start">
                        <div className="flex items-start gap-1.5 min-w-0 flex-1">
                          <CheckCheck className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${initiative.actualResult ? "text-green-600" : "text-muted-foreground/40"}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resultado Realizado</p>
                            {actualResultEditId === initiative.id ? (
                              <div className="mt-1 space-y-2">
                                <Textarea
                                  rows={2}
                                  className="text-xs"
                                  value={actualResultValue}
                                  onChange={e => setActualResultValue(e.target.value)}
                                  placeholder="Descreva o resultado que foi de fato alcançado..."
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => onSaveActualResult(initiative.id)}
                                    disabled={updateInitiative.isPending}
                                  >
                                    Salvar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs"
                                    onClick={() => { setActualResultEditId(null); setActualResultValue(""); }}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              </div>
                            ) : initiative.actualResult ? (
                              <div className="flex items-start gap-2 mt-0.5">
                                <p className="text-xs text-green-700 italic flex-1">{initiative.actualResult}</p>
                                {canWrite && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 shrink-0"
                                    onClick={() => { setActualResultEditId(initiative.id); setActualResultValue(initiative.actualResult || ""); }}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            ) : canWrite ? (
                              <button
                                className="text-xs text-muted-foreground/60 hover:text-primary mt-0.5 italic transition-colors"
                                onClick={() => { setActualResultEditId(initiative.id); setActualResultValue(""); }}
                              >
                                + Registrar resultado realizado
                              </button>
                            ) : (
                              <p className="text-xs text-muted-foreground/50 mt-0.5 italic">Não registrado ainda</p>
                            )}
                          </div>
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
    </div>
  );
}
