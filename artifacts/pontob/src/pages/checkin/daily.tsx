import { useListGoals, useCreateDailyCheckin, useUpdateDailyCheckin, useListDailyCheckins, useListGoalKpis, useUpdateKpi, getListDailyCheckinsQueryKey, getListGoalsQueryKey, getListGoalKpisQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Target, Pencil, Clock, HelpingHand, History, BarChart2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";

interface DailyForm {
  goalId: string;
  executedToday: "sim" | "parcialmente" | "nao";
  progressToday: number;
  blocker: string;
  nextStep: string;
  timeSpent: string;
  needsHelp: boolean;
  notes: string;
}

const executedLabel: Record<string, string> = {
  sim: "Executou",
  parcialmente: "Parcialmente",
  nao: "Não executou",
};

const executedColor: Record<string, string> = {
  sim: "bg-green-50 text-green-700 border-green-200",
  parcialmente: "bg-yellow-50 text-yellow-700 border-yellow-200",
  nao: "bg-red-50 text-red-600 border-red-200",
};

function DailyCheckinSummary({
  checkin,
  goalTitle,
  onEdit,
}: {
  checkin: any;
  goalTitle: string | undefined;
  onEdit: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 className="h-5 w-5" />
          <span className="font-semibold">Check-in de hoje concluído</span>
        </div>
        <Badge
          variant="outline"
          className={executedColor[checkin.executedToday] ?? ""}
        >
          {executedLabel[checkin.executedToday] ?? checkin.executedToday}
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-5 space-y-3">
          {goalTitle && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Meta</p>
              <p className="font-medium">{goalTitle}</p>
            </div>
          )}

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Progresso de hoje</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${checkin.progressToday ?? 0}%` }}
                />
              </div>
              <span className="text-sm font-mono font-medium w-10 text-right">{checkin.progressToday ?? 0}%</span>
            </div>
          </div>

          {checkin.blocker && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Bloqueio</p>
              <p className="text-sm">{checkin.blocker}</p>
            </div>
          )}
          {checkin.nextStep && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Próximo passo</p>
              <p className="text-sm">{checkin.nextStep}</p>
            </div>
          )}
          {checkin.timeSpent && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{checkin.timeSpent}</span>
            </div>
          )}
          {checkin.needsHelp && (
            <div className="flex items-center gap-1.5 text-sm text-amber-700">
              <HelpingHand className="h-3.5 w-3.5" />
              <span>Solicitou apoio da regional</span>
            </div>
          )}
          {checkin.notes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Notas</p>
              <p className="text-sm">{checkin.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={onEdit} data-testid="button-edit-checkin">
          <Pencil className="h-4 w-4 mr-1.5" />
          Editar check-in
        </Button>
        <Link href="/history">
          <Button variant="outline" className="flex-1">
            <History className="h-4 w-4 mr-1.5" />
            Ver histórico
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function DailyCheckin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { franchiseId, isAdmin, isSocio, franchises, adminFranchiseId, setAdminFranchiseId, socioFranchiseId, setSocioFranchiseId } = useFranchiseContext();

  const today = new Date().toISOString().split("T")[0];

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: goals = [] } = useListGoals(
    goalParams,
    { query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );
  const dailyGoals = (goals as any[]).filter(g => g.frequency === "diario");

  const [kpiValues, setKpiValues] = useState<Record<number, string>>({});

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<DailyForm>({
    defaultValues: {
      executedToday: "sim",
      progressToday: 0,
      blocker: "",
      nextStep: "",
      timeSpent: "",
      needsHelp: false,
      notes: "",
    },
  });

  const selectedGoalId = watch("goalId");
  const selectedGoalIdNum = selectedGoalId ? parseInt(selectedGoalId) : 0;

  const { data: allGoalKpis = [] } = useListGoalKpis(
    selectedGoalIdNum,
    { query: { enabled: !!selectedGoalIdNum, queryKey: getListGoalKpisQueryKey(selectedGoalIdNum) } }
  );
  const dailyKpis = (allGoalKpis as any[]).filter((k: any) => k.frequency === "diario" && !k.deletedAt);

  const updateKpiMutation = useUpdateKpi();

  const dailyParams = { franchiseId: franchiseId ?? undefined, date: today };
  const { data: todaysCheckins = [], isLoading: isLoadingCheckins } = useListDailyCheckins(
    dailyParams,
    { query: { enabled: !!franchiseId, queryKey: getListDailyCheckinsQueryKey(dailyParams) } }
  );

  const existingCheckin = todaysCheckins[0] ?? null;

  const create = useCreateDailyCheckin();
  const update = useUpdateDailyCheckin();

  useEffect(() => {
    if (existingCheckin) {
      reset({
        goalId: String(existingCheckin.goalId),
        executedToday: existingCheckin.executedToday as "sim" | "parcialmente" | "nao",
        progressToday: existingCheckin.progressToday ?? 0,
        blocker: existingCheckin.blocker ?? "",
        nextStep: existingCheckin.nextStep ?? "",
        timeSpent: existingCheckin.timeSpent ?? "",
        needsHelp: existingCheckin.needsHelp ?? false,
        notes: existingCheckin.notes ?? "",
      });
    }
  }, [existingCheckin?.id]);

  const executedToday = watch("executedToday");

  const saveKpiValues = async () => {
    await Promise.all(
      dailyKpis
        .filter((k: any) => kpiValues[k.id] !== undefined && kpiValues[k.id] !== "")
        .map((k: any) =>
          updateKpiMutation.mutateAsync({
            id: k.id,
            data: { currentValue: parseFloat(kpiValues[k.id]) },
          })
        )
    );
    if (selectedGoalIdNum) {
      qc.invalidateQueries({ queryKey: getListGoalKpisQueryKey(selectedGoalIdNum) });
    }
  };

  const onSubmit = async (data: DailyForm) => {
    if (!franchiseId) return;
    try {
      await saveKpiValues();
      if (existingCheckin) {
        await update.mutateAsync({
          id: existingCheckin.id,
          data: {
            executedToday: data.executedToday,
            progressToday: data.progressToday,
            blocker: data.blocker || undefined,
            nextStep: data.nextStep || undefined,
            timeSpent: data.timeSpent || undefined,
            needsHelp: data.needsHelp,
            notes: data.notes || undefined,
          },
        });
        qc.invalidateQueries({ queryKey: getListDailyCheckinsQueryKey({}) });
        setIsEditing(false);
        setSubmitted(true);
        toast({ title: "Check-in atualizado", description: "Suas alterações foram salvas." });
      } else {
        const result = await create.mutateAsync({
          data: {
            goalId: parseInt(data.goalId),
            franchiseId,
            date: today,
            executedToday: data.executedToday,
            progressToday: data.progressToday,
            blocker: data.blocker || undefined,
            nextStep: data.nextStep || undefined,
            timeSpent: data.timeSpent || undefined,
            needsHelp: data.needsHelp,
            notes: data.notes || undefined,
          },
        });
        qc.invalidateQueries({ queryKey: getListDailyCheckinsQueryKey({}) });
        setSubmitted(true);
        if ((result as any).conflict) {
          toast({ title: "Check-in já registrado", description: "Você já fez o check-in de hoje. O registro anterior foi mantido." });
        } else {
          toast({ title: "Check-in registrado", description: "Seu progresso de hoje foi salvo." });
        }
      }
    } catch {
      toast({ title: "Erro ao salvar", description: "Tente novamente.", variant: "destructive" });
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold">{existingCheckin ? "Check-in atualizado!" : "Check-in registrado!"}</h2>
        <p className="text-muted-foreground max-w-xs">Seu progresso de hoje foi salvo. Continue amanhã.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setSubmitted(false)} data-testid="button-new-checkin">
            Ver resumo
          </Button>
          <Link href="/history">
            <Button variant="outline">
              <History className="h-4 w-4 mr-1.5" />
              Ver histórico
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check-in Diário</h1>
        <p className="text-muted-foreground mt-1">Dois minutos para não perder a semana.</p>
      </div>

      {(isAdmin || isSocio) && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {(isAdmin || isSocio) && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para registrar o check-in." />
      ) : isLoadingCheckins ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      ) : existingCheckin && !isEditing ? (
        <DailyCheckinSummary
          checkin={existingCheckin}
          goalTitle={(goals as any[]).find((g: any) => g.id === existingCheckin.goalId)?.title}
          onEdit={() => setIsEditing(true)}
        />
      ) : dailyGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Target className="h-7 w-7 text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Nenhuma meta diária cadastrada</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">O check-in diário requer uma meta com frequência <strong>Diária</strong>. Crie ou edite uma meta para continuar.</p>
          </div>
          <Link href="/goals/new">
            <Button className="mt-1">+ Nova Meta</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {existingCheckin && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 shrink-0" />
                <span>Editando o check-in de hoje.</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-amber-800 hover:text-amber-900 hover:bg-amber-100 h-auto py-0.5 px-2"
                onClick={() => setIsEditing(false)}
              >
                Cancelar
              </Button>
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Meta</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="goalId"
                control={control}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!existingCheckin}>
                    <SelectTrigger data-testid="select-goal">
                      <SelectValue placeholder="Selecione uma meta" />
                    </SelectTrigger>
                    <SelectContent>
                      {dailyGoals.map((g: any) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.goalId && <p className="text-xs text-destructive mt-1">Selecione uma meta</p>}
            </CardContent>
          </Card>

          {dailyKpis.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  KPIs do dia
                </CardTitle>
                <CardDescription>Insira o valor de hoje para cada indicador diário.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dailyKpis.map((k: any) => (
                  <div key={k.id} className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <Label htmlFor={`kpi-${k.id}`} className="text-sm font-medium">{k.name}</Label>
                      {k.targetValue != null && (
                        <span className="text-xs text-muted-foreground">
                          Meta: {k.targetValue}{k.unit ? ` ${k.unit}` : ""} &nbsp;|&nbsp; Atual: {k.currentValue ?? 0}{k.unit ? ` ${k.unit}` : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`kpi-${k.id}`}
                        type="number"
                        step="any"
                        placeholder={String(k.currentValue ?? 0)}
                        value={kpiValues[k.id] ?? ""}
                        onChange={e => setKpiValues(prev => ({ ...prev, [k.id]: e.target.value }))}
                        className="w-36"
                      />
                      {k.unit && <span className="text-sm text-muted-foreground">{k.unit}</span>}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Executou hoje?</CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                name="executedToday"
                control={control}
                render={({ field }) => (
                  <div className="flex gap-2">
                    {(["sim", "parcialmente", "nao"] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        data-testid={`button-executed-${v}`}
                        onClick={() => field.onChange(v)}
                        className={`flex-1 py-2.5 rounded-md text-sm font-medium border transition-colors ${
                          field.value === v
                            ? v === "sim" ? "bg-green-600 text-white border-green-600"
                              : v === "parcialmente" ? "bg-yellow-500 text-white border-yellow-500"
                              : "bg-destructive text-white border-destructive"
                            : "bg-background border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {v === "sim" ? "Sim" : v === "parcialmente" ? "Parcialmente" : "Não"}
                      </button>
                    ))}
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Progresso de hoje (%)</CardTitle>
              <CardDescription>Quanto avançou nessa iniciativa hoje?</CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                name="progressToday"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <Slider
                      min={0} max={100} step={5}
                      value={[field.value]}
                      onValueChange={([v]) => field.onChange(v)}
                      data-testid="slider-progress"
                    />
                    <div className="text-right text-sm font-mono font-medium">{field.value}%</div>
                  </div>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="space-y-1.5">
                <Label htmlFor="blocker">Bloqueio ou dificuldade</Label>
                <Textarea
                  id="blocker"
                  placeholder="O que impediu ou dificultou a execução?"
                  data-testid="textarea-blocker"
                  {...register("blocker")}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nextStep">Próximo passo</Label>
                <Textarea
                  id="nextStep"
                  placeholder="O que você vai fazer amanhã?"
                  data-testid="textarea-next-step"
                  {...register("nextStep")}
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="timeSpent">Tempo dedicado</Label>
                <input
                  id="timeSpent"
                  type="text"
                  placeholder="Ex: 1h30"
                  data-testid="input-time-spent"
                  {...register("timeSpent")}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Controller
                  name="needsHelp"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="needsHelp"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-needs-help"
                    />
                  )}
                />
                <Label htmlFor="needsHelp" className="cursor-pointer">Preciso de apoio da regional</Label>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full"
            disabled={create.isPending || update.isPending}
            data-testid="button-submit-checkin"
          >
            {create.isPending || update.isPending
              ? "Salvando..."
              : existingCheckin
              ? "Salvar alterações"
              : "Registrar Check-in"}
          </Button>
        </form>
      )}
    </div>
  );
}
