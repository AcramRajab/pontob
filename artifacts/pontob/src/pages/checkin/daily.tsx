import { useListGoals, useCreateDailyCheckin, getListDailyCheckinsQueryKey, getListGoalsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
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

export default function DailyCheckin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: goals = [] } = useListGoals(
    goalParams,
    { query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );

  const create = useCreateDailyCheckin();

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<DailyForm>({
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

  const executedToday = watch("executedToday");

  const onSubmit = async (data: DailyForm) => {
    if (!franchiseId) return;
    const today = new Date().toISOString().split("T")[0];
    try {
      await create.mutateAsync({
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
      toast({ title: "Check-in registrado", description: "Seu progresso de hoje foi salvo." });
    } catch {
      toast({ title: "Erro ao registrar", description: "Tente novamente.", variant: "destructive" });
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold">Check-in registrado!</h2>
        <p className="text-muted-foreground max-w-xs">Seu progresso de hoje foi salvo. Continue amanhã.</p>
        <Button variant="outline" onClick={() => setSubmitted(false)} data-testid="button-new-checkin">Novo check-in</Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check-in Diário</h1>
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
        <AdminEmptyState message="Selecione uma franquia acima para registrar o check-in." />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-goal">
                      <SelectValue placeholder="Selecione uma meta" />
                    </SelectTrigger>
                    <SelectContent>
                      {goals.map((g: any) => (
                        <SelectItem key={g.id} value={String(g.id)}>{g.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.goalId && <p className="text-xs text-destructive mt-1">Selecione uma meta</p>}
            </CardContent>
          </Card>

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
            disabled={create.isPending}
            data-testid="button-submit-checkin"
          >
            {create.isPending ? "Registrando..." : "Registrar Check-in"}
          </Button>
        </form>
      )}
    </div>
  );
}
