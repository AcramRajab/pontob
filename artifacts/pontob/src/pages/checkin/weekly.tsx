import { useListGoals, useCreateWeeklyCheckin, useUpdateWeeklyCheckin, useListWeeklyCheckins, getListWeeklyCheckinsQueryKey, getListGoalsQueryKey, WeeklyCheckinInputInitiativeDecision } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Target, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";

interface WeeklyForm {
  goalId: string;
  planned: string;
  executed: string;
  progressSummary: string;
  blockers: string;
  adjustments: string;
  nextWeekPriority: string;
  needsRegionalSupport: boolean;
  initiativeDecision: string;
}

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().split("T")[0],
    end: sunday.toISOString().split("T")[0],
  };
}

export default function WeeklyCheckin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const week = getWeekDates();
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: goals = [] } = useListGoals(
    goalParams,
    { query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );

  const weeklyParams = { franchiseId: franchiseId ?? undefined };
  const { data: weeklyCheckins = [] } = useListWeeklyCheckins(
    weeklyParams,
    { query: { enabled: !!franchiseId, queryKey: getListWeeklyCheckinsQueryKey(weeklyParams) } }
  );

  const existingCheckin = (weeklyCheckins as any[]).find((c: any) => c.weekStartDate === week.start) ?? null;

  const create = useCreateWeeklyCheckin();
  const update = useUpdateWeeklyCheckin();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<WeeklyForm>({
    defaultValues: {
      needsRegionalSupport: false,
    },
  });

  useEffect(() => {
    if (existingCheckin) {
      reset({
        goalId: String(existingCheckin.goalId),
        planned: existingCheckin.planned ?? "",
        executed: existingCheckin.executed ?? "",
        progressSummary: existingCheckin.progressSummary ?? "",
        blockers: existingCheckin.blockers ?? "",
        adjustments: existingCheckin.adjustments ?? "",
        nextWeekPriority: existingCheckin.nextWeekPriority ?? "",
        needsRegionalSupport: existingCheckin.needsRegionalSupport ?? false,
        initiativeDecision: existingCheckin.initiativeDecision ?? "",
      });
    }
  }, [existingCheckin?.id]);

  const onSubmit = async (data: WeeklyForm) => {
    if (!franchiseId) return;
    try {
      if (existingCheckin) {
        await update.mutateAsync({
          id: existingCheckin.id,
          data: {
            planned: data.planned || undefined,
            executed: data.executed || undefined,
            progressSummary: data.progressSummary || undefined,
            blockers: data.blockers || undefined,
            adjustments: data.adjustments || undefined,
            nextWeekPriority: data.nextWeekPriority || undefined,
            needsRegionalSupport: data.needsRegionalSupport,
            initiativeDecision: (data.initiativeDecision || undefined) as typeof WeeklyCheckinInputInitiativeDecision[keyof typeof WeeklyCheckinInputInitiativeDecision] | undefined,
          },
        });
        qc.invalidateQueries({ queryKey: getListWeeklyCheckinsQueryKey({}) });
        setSubmitted(true);
        toast({ title: "Check-in semanal atualizado", description: "Suas alterações foram salvas." });
      } else {
        const result = await create.mutateAsync({
          data: {
            goalId: parseInt(data.goalId),
            franchiseId,
            weekStartDate: week.start,
            weekEndDate: week.end,
            planned: data.planned || undefined,
            executed: data.executed || undefined,
            progressSummary: data.progressSummary || undefined,
            blockers: data.blockers || undefined,
            adjustments: data.adjustments || undefined,
            nextWeekPriority: data.nextWeekPriority || undefined,
            needsRegionalSupport: data.needsRegionalSupport,
            initiativeDecision: (data.initiativeDecision || undefined) as typeof WeeklyCheckinInputInitiativeDecision[keyof typeof WeeklyCheckinInputInitiativeDecision] | undefined,
          },
        });
        qc.invalidateQueries({ queryKey: getListWeeklyCheckinsQueryKey({}) });
        setSubmitted(true);
        if ((result as any).conflict) {
          toast({ title: "Check-in já registrado", description: "Você já fez o check-in desta semana. O registro anterior foi mantido." });
        } else {
          toast({ title: "Check-in semanal registrado" });
        }
      }
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-bold">
          {existingCheckin ? "Check-in semanal atualizado!" : "Check-in semanal registrado!"}
        </h2>
        <Button variant="outline" onClick={() => setSubmitted(false)}>
          {existingCheckin ? "Editar novamente" : "Novo check-in"}
        </Button>
      </div>
    );
  }

  const questions = [
    { field: "planned" as const, label: "O que foi planejado para essa semana?", placeholder: "Descreva as iniciativas e ações planejadas" },
    { field: "executed" as const, label: "O que foi efetivamente executado?", placeholder: "O que realmente aconteceu?" },
    { field: "progressSummary" as const, label: "Resumo do progresso desta semana", placeholder: "Como avançou em relação ao objetivo?" },
    { field: "blockers" as const, label: "Quais foram os principais bloqueios?", placeholder: "O que impediu a execução plena?" },
    { field: "adjustments" as const, label: "Que ajustes são necessários?", placeholder: "O que deve mudar na próxima semana?" },
    { field: "nextWeekPriority" as const, label: "Qual é a prioridade para a próxima semana?", placeholder: "O que mais importa executar?" },
    { field: "initiativeDecision" as const, label: "Há alguma decisão sobre iniciativas? (continuar, pausar, cancelar)", placeholder: "Descreva qualquer decisão sobre suas iniciativas ativas" },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check-in Semanal</h1>
        <p className="text-muted-foreground mt-1">Semana {week.start} — {week.end}</p>
      </div>

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para registrar o check-in semanal." />
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
            <Target className="h-7 w-7 text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Nenhuma meta cadastrada</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-xs">Crie uma meta antes de fazer check-in semanal.</p>
          </div>
          <Link href="/metas/nova">
            <Button className="mt-1">+ Nova Meta</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {existingCheckin && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Pencil className="h-4 w-4 shrink-0" />
              <span>Você já fez o check-in desta semana. Edite abaixo para atualizar.</span>
            </div>
          )}

          <Card>
            <CardContent className="pt-5">
              <Controller
                name="goalId"
                control={control}
                rules={{ required: !existingCheckin }}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={!!existingCheckin}>
                    <SelectTrigger data-testid="select-goal">
                      <SelectValue placeholder="Selecione a meta" />
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

          {questions.map(q => (
            <Card key={q.field}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{q.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder={q.placeholder}
                  data-testid={`textarea-${q.field}`}
                  {...register(q.field)}
                  rows={3}
                />
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2">
                <Controller
                  name="needsRegionalSupport"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      id="needsRegionalSupport"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-regional-support"
                    />
                  )}
                />
                <Label htmlFor="needsRegionalSupport" className="cursor-pointer">Preciso de suporte da equipe regional</Label>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={create.isPending || update.isPending} data-testid="button-submit">
            {create.isPending || update.isPending
              ? "Salvando..."
              : existingCheckin
              ? "Salvar alterações"
              : "Registrar Check-in Semanal"}
          </Button>
        </form>
      )}
    </div>
  );
}
