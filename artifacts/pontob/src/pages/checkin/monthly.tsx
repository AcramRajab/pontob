import { useListGoals, useCreateMonthlyCheckin, useUpdateMonthlyCheckin, useListMonthlyCheckins, getListMonthlyCheckinsQueryKey, getListGoalsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Pencil } from "lucide-react";
import { useState, useEffect } from "react";
import { useFranchiseContext } from "@/hooks/use-franchise-context";
import { FranchisePicker, AdminEmptyState } from "@/components/franchise-picker";

interface MonthlyForm {
  goalId: string;
  kriProgress: string;
  improvedKpis: string;
  worsenedKpis: string;
  initiativesThatWorked: string;
  initiativesThatDidNotWork: string;
  continueDoing: string;
  stopDoing: string;
  startDoing: string;
  nextMonthFocus: string;
}

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export default function MonthlyCheckin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [submitted, setSubmitted] = useState(false);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const { franchiseId, isAdmin, franchises, adminFranchiseId, setAdminFranchiseId } = useFranchiseContext();

  const goalParams = { franchiseId: franchiseId ?? undefined };
  const { data: goals = [] } = useListGoals(
    goalParams,
    { query: { enabled: !!franchiseId, queryKey: getListGoalsQueryKey(goalParams) } }
  );

  const monthlyParams = { franchiseId: franchiseId ?? undefined };
  const { data: monthlyCheckins = [] } = useListMonthlyCheckins(
    monthlyParams,
    { query: { enabled: !!franchiseId, queryKey: getListMonthlyCheckinsQueryKey(monthlyParams) } }
  );

  const existingCheckin = (monthlyCheckins as any[]).find(
    (c: any) => c.month === currentMonth && c.year === currentYear
  ) ?? null;

  const create = useCreateMonthlyCheckin();
  const update = useUpdateMonthlyCheckin();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<MonthlyForm>();

  useEffect(() => {
    if (existingCheckin) {
      reset({
        goalId: String(existingCheckin.goalId),
        kriProgress: existingCheckin.kriProgress ?? "",
        improvedKpis: existingCheckin.improvedKpis ?? "",
        worsenedKpis: existingCheckin.worsenedKpis ?? "",
        initiativesThatWorked: existingCheckin.initiativesThatWorked ?? "",
        initiativesThatDidNotWork: existingCheckin.initiativesThatDidNotWork ?? "",
        continueDoing: existingCheckin.continueDoing ?? "",
        stopDoing: existingCheckin.stopDoing ?? "",
        startDoing: existingCheckin.startDoing ?? "",
        nextMonthFocus: existingCheckin.nextMonthFocus ?? "",
      });
    }
  }, [existingCheckin?.id]);

  const onSubmit = async (data: MonthlyForm) => {
    if (!franchiseId) return;
    try {
      if (existingCheckin) {
        await update.mutateAsync({
          id: existingCheckin.id,
          data: {
            kriProgress: data.kriProgress || undefined,
            improvedKpis: data.improvedKpis || undefined,
            worsenedKpis: data.worsenedKpis || undefined,
            initiativesThatWorked: data.initiativesThatWorked || undefined,
            initiativesThatDidNotWork: data.initiativesThatDidNotWork || undefined,
            continueDoing: data.continueDoing || undefined,
            stopDoing: data.stopDoing || undefined,
            startDoing: data.startDoing || undefined,
            nextMonthFocus: data.nextMonthFocus || undefined,
          },
        });
        qc.invalidateQueries({ queryKey: getListMonthlyCheckinsQueryKey({}) });
        setSubmitted(true);
        toast({ title: "Check-in mensal atualizado", description: "Suas alterações foram salvas." });
      } else {
        const result = await create.mutateAsync({
          data: {
            goalId: parseInt(data.goalId),
            franchiseId,
            month: currentMonth,
            year: currentYear,
            kriProgress: data.kriProgress || undefined,
            improvedKpis: data.improvedKpis || undefined,
            worsenedKpis: data.worsenedKpis || undefined,
            initiativesThatWorked: data.initiativesThatWorked || undefined,
            initiativesThatDidNotWork: data.initiativesThatDidNotWork || undefined,
            continueDoing: data.continueDoing || undefined,
            stopDoing: data.stopDoing || undefined,
            startDoing: data.startDoing || undefined,
            nextMonthFocus: data.nextMonthFocus || undefined,
          },
        });
        qc.invalidateQueries({ queryKey: getListMonthlyCheckinsQueryKey({}) });
        setSubmitted(true);
        if ((result as any).conflict) {
          toast({ title: "Check-in já registrado", description: "Você já fez o check-in deste mês. O registro anterior foi mantido." });
        } else {
          toast({ title: "Check-in mensal registrado" });
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
          {existingCheckin ? "Check-in mensal atualizado!" : "Check-in mensal registrado!"}
        </h2>
        <Button variant="outline" onClick={() => setSubmitted(false)}>
          {existingCheckin ? "Editar novamente" : "Novo check-in"}
        </Button>
      </div>
    );
  }

  const questions = [
    { field: "kriProgress" as const, label: "Como o KRI (indicador-chave de resultado) evoluiu este mês?", placeholder: "Descreva o progresso em relação ao resultado esperado" },
    { field: "improvedKpis" as const, label: "Quais KPIs melhoraram este mês?", placeholder: "Liste os indicadores que avançaram" },
    { field: "worsenedKpis" as const, label: "Quais KPIs pioraram ou ficaram estagnados?", placeholder: "Liste os indicadores que regrediu ou não moveu" },
    { field: "initiativesThatWorked" as const, label: "Quais iniciativas funcionaram bem?", placeholder: "O que gerou resultado real?" },
    { field: "initiativesThatDidNotWork" as const, label: "Quais iniciativas não funcionaram?", placeholder: "O que não trouxe o resultado esperado?" },
    { field: "continueDoing" as const, label: "O que continuar fazendo no próximo mês?", placeholder: "Práticas que valem manter" },
    { field: "stopDoing" as const, label: "O que parar de fazer?", placeholder: "O que está consumindo energia sem resultado" },
    { field: "startDoing" as const, label: "O que começar a fazer?", placeholder: "Novas ações para o próximo mês" },
    { field: "nextMonthFocus" as const, label: "Qual o foco principal do próximo mês?", placeholder: "A prioridade absoluta do próximo período" },
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Check-in Mensal</h1>
        <p className="text-muted-foreground mt-1">{MONTHS[now.getMonth()]} {currentYear}</p>
      </div>

      {isAdmin && (
        <FranchisePicker
          franchises={franchises}
          value={adminFranchiseId}
          onChange={setAdminFranchiseId}
        />
      )}

      {isAdmin && !franchiseId ? (
        <AdminEmptyState message="Selecione uma franquia acima para registrar o check-in mensal." />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {existingCheckin && (
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Pencil className="h-4 w-4 shrink-0" />
              <span>Você já fez o check-in deste mês. Edite abaixo para atualizar.</span>
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

          {questions.map((q, i) => (
            <Card key={q.field}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>{q.label}
                </CardTitle>
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

          <Button type="submit" className="w-full" disabled={create.isPending || update.isPending} data-testid="button-submit">
            {create.isPending || update.isPending
              ? "Salvando..."
              : existingCheckin
              ? "Salvar alterações"
              : "Registrar Check-in Mensal"}
          </Button>
        </form>
      )}
    </div>
  );
}
