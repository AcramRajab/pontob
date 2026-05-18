import { useRoute, useLocation } from "wouter";
import {
  useGetGoalInitiative, useUpdateGoalInitiative,
  getGetGoalInitiativeQueryKey, getGetGoalQueryKey, getListGoalInitiativesQueryKey,
  useListUsers, getListUsersQueryKey,
  GoalInitiativeInputFrequency,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface InitiativeForm {
  desiredResult: string;
  actualResult: string;
  ownerUserId: string;
  startDate: string;
  endDate: string;
  frequency: string;
  executionTime: string;
  estimatedTime: string;
  whatWillBeDone: string;
  whyItMatters: string;
  whoIsResponsible: string;
  whereItWillBeDone: string;
  howItWillBeDone: string;
  investmentOrEffort: string;
  progressPercentage: string;
  status: string;
}

export default function InitiativeEdit() {
  const [, params] = useRoute("/goals/:goalId/initiatives/:initiativeId/edit");
  const goalId = parseInt(params?.goalId ?? "0");
  const initiativeId = parseInt(params?.initiativeId ?? "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: initiative, isLoading } = useGetGoalInitiative(initiativeId, {
    query: { queryKey: getGetGoalInitiativeQueryKey(initiativeId), enabled: !!initiativeId },
  });

  const { data: users = [] } = useListUsers({}, {
    query: { enabled: !!user?.franchiseId, queryKey: getListUsersQueryKey({}) },
  });
  const franchiseUsers = (users as any[]).filter((u: any) => u.franchiseId === user?.franchiseId);

  const update = useUpdateGoalInitiative();

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<InitiativeForm>({
    defaultValues: { frequency: "diario", status: "ativa" },
  });

  useEffect(() => {
    if (!initiative) return;
    const ini = initiative as any;
    reset({
      desiredResult: ini.desiredResult ?? "",
      actualResult: ini.actualResult ?? "",
      ownerUserId: ini.ownerUserId ? String(ini.ownerUserId) : "",
      startDate: ini.startDate ?? "",
      endDate: ini.endDate ?? "",
      frequency: ini.frequency ?? "diario",
      executionTime: ini.executionTime ?? "",
      estimatedTime: ini.estimatedTime ?? "",
      whatWillBeDone: ini.whatWillBeDone ?? "",
      whyItMatters: ini.whyItMatters ?? "",
      whoIsResponsible: ini.whoIsResponsible ?? "",
      whereItWillBeDone: ini.whereItWillBeDone ?? "",
      howItWillBeDone: ini.howItWillBeDone ?? "",
      investmentOrEffort: ini.investmentOrEffort ?? "",
      progressPercentage: String(ini.progressPercentage ?? 0),
      status: ini.status ?? "ativa",
    });
  }, [initiative, reset]);

  const onSubmit = async (data: InitiativeForm) => {
    try {
      await update.mutateAsync({
        id: initiativeId,
        data: {
          desiredResult: data.desiredResult || undefined,
          actualResult: data.actualResult || undefined,
          ownerUserId: data.ownerUserId ? parseInt(data.ownerUserId) : undefined,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          frequency: (data.frequency || undefined) as typeof GoalInitiativeInputFrequency[keyof typeof GoalInitiativeInputFrequency] | undefined,
          executionTime: data.executionTime || undefined,
          estimatedTime: data.estimatedTime || undefined,
          whatWillBeDone: data.whatWillBeDone || undefined,
          whyItMatters: data.whyItMatters || undefined,
          whoIsResponsible: data.whoIsResponsible || undefined,
          whereItWillBeDone: data.whereItWillBeDone || undefined,
          howItWillBeDone: data.howItWillBeDone || undefined,
          investmentOrEffort: data.investmentOrEffort || undefined,
          progressPercentage: data.progressPercentage ? parseInt(data.progressPercentage) : undefined,
          status: data.status as any,
        } as any,
      });
      qc.invalidateQueries({ queryKey: getGetGoalInitiativeQueryKey(initiativeId) });
      qc.invalidateQueries({ queryKey: getListGoalInitiativesQueryKey(goalId) });
      qc.invalidateQueries({ queryKey: getGetGoalQueryKey(goalId) });
      toast({ title: "Iniciativa atualizada" });
      navigate(`/goals/${goalId}`);
    } catch (err: any) {
      toast({ title: err?.message || "Erro ao salvar", variant: "destructive" });
    }
  };

  const ini = initiative as any;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-64">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/goals/${goalId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Iniciativa</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {ini?.initiativeName || ini?.customName || "Iniciativa"}
          </p>
        </div>
      </div>

      {ini?.kri && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KRI</p>
            <p className="text-sm mt-0.5">{ini.kri}</p>
            {ini?.kpi && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">KPI</p>
                <p className="text-sm mt-0.5">{ini.kpi}</p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Status + Progress */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Status e Progresso</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="concluida">Concluída</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Progresso (%)</Label>
              <Input type="number" min={0} max={100} {...register("progressPercentage")} />
            </div>
          </CardContent>
        </Card>

        {/* 5W2H */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">5W2H — Planejamento da Execução</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { field: "whatWillBeDone" as const, label: "O que será feito? (What)", placeholder: "Descreva a ação concreta" },
              { field: "whyItMatters" as const, label: "Por que é importante? (Why)", placeholder: "Qual o propósito desta iniciativa?" },
              { field: "whoIsResponsible" as const, label: "Quem é responsável? (Who)", placeholder: "Nome do responsável" },
              { field: "whereItWillBeDone" as const, label: "Onde será executado? (Where)", placeholder: "Local ou contexto de execução" },
              { field: "howItWillBeDone" as const, label: "Como será feito? (How)", placeholder: "Método de execução" },
              { field: "investmentOrEffort" as const, label: "Quanto custa / tempo envolvido? (How much)", placeholder: "Investimento, horas, recursos" },
              { field: "desiredResult" as const, label: "Resultado esperado", placeholder: "O que você quer alcançar com esta iniciativa?" },
            ].map(q => (
              <div key={q.field} className="space-y-1.5">
                <Label className="text-xs font-medium">{q.label}</Label>
                <Textarea rows={2} placeholder={q.placeholder} {...register(q.field)} />
              </div>
            ))}

            <div className="space-y-1.5 border-t pt-4">
              <Label className="text-xs font-medium text-green-700">Resultado realizado</Label>
              <Textarea
                rows={2}
                placeholder="Descreva o resultado de fato obtido..."
                {...register("actualResult")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Agendamento */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Agendamento</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Início</Label>
              <Input type="date" {...register("startDate")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Término</Label>
              <Input type="date" {...register("endDate")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário de execução</Label>
              <Input type="time" {...register("executionTime")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tempo estimado</Label>
              <Input placeholder="Ex: 30min" {...register("estimatedTime")} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Responsável</Label>
              <Controller
                name="ownerUserId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || "none"} onValueChange={v => field.onChange(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Selecionar responsável" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem responsável</SelectItem>
                      {franchiseUsers.map((u: any) => (
                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => navigate(`/goals/${goalId}`)} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={update.isPending}>
            {update.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…</> : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
