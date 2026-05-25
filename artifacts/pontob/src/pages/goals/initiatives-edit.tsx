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
import { useEffect, useState } from "react";
import {
  ArrowLeft, Loader2, CheckCircle2, Circle, ChevronDown, ChevronUp,
  ClipboardList, Target, BarChart2, TrendingUp, Lightbulb,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface InitiativeForm {
  desiredResult: string;
  actualResult: string;
  notes: string;
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
  const [show5W2H, setShow5W2H] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const { data: initiative, isLoading } = useGetGoalInitiative(initiativeId, {
    query: { queryKey: getGetGoalInitiativeQueryKey(initiativeId), enabled: !!initiativeId },
  });

  const { data: users = [] } = useListUsers({}, {
    query: { enabled: !!user?.franchiseId, queryKey: getListUsersQueryKey({}) },
  });
  const franchiseUsers = (users as any[]).filter((u: any) => u.franchiseId === user?.franchiseId);

  const update = useUpdateGoalInitiative();

  const { register, handleSubmit, control, reset, watch, setValue } = useForm<InitiativeForm>({
    defaultValues: { frequency: "diario", status: "ativa" },
  });

  const statusValue = watch("status");

  useEffect(() => {
    if (!initiative) return;
    const ini = initiative as any;
    reset({
      desiredResult: ini.desiredResult ?? "",
      actualResult: ini.actualResult ?? "",
      notes: ini.notes ?? "",
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
          notes: data.notes || undefined,
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

  const isConcluida = statusValue === "concluida";
  const isAtiva = statusValue === "ativa";

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-64">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/goals/${goalId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Registrar Execução</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {ini?.initiativeName || ini?.customName || "Iniciativa"}
          </p>
        </div>
      </div>

      {/* Catalog guide card */}
      {(ini?.kri || ini?.kpi) && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-4 space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <div className="rounded-md bg-primary/10 p-1.5">
              <BarChart2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Indicadores do catálogo</span>
          </div>
          {ini.kri && (
            <div className="flex items-start gap-2.5">
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <Target className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">KRI</span>
              </div>
              <p className="text-sm text-foreground leading-snug">{ini.kri}</p>
            </div>
          )}
          {ini.kpi && (
            <div className="flex items-start gap-2.5">
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/60" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">KPI</span>
              </div>
              <p className="text-sm text-foreground leading-snug">{ini.kpi}</p>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ── 1. EXECUÇÃO — primary section ──────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Execução
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Iniciado / Concluído toggle buttons */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status da execução</Label>
              <div className="grid grid-cols-2 gap-2">
                {/* Iniciado */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isAtiva && !isConcluida) {
                      setValue("status", "ativa");
                    } else if (isConcluida) {
                      setValue("status", "ativa");
                      setValue("progressPercentage", "50");
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all text-left",
                    isAtiva || isConcluida
                      ? "border-primary/40 bg-primary/[0.05] text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.02]"
                  )}
                >
                  {isAtiva || isConcluida
                    ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                    : <Circle className="h-4 w-4 shrink-0" />
                  }
                  Iniciada
                </button>

                {/* Concluída */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isConcluida) {
                      setValue("status", "concluida");
                      setValue("progressPercentage", "100");
                    } else {
                      setValue("status", "ativa");
                      setValue("progressPercentage", String(ini?.progressPercentage ?? 50));
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all text-left",
                    isConcluida
                      ? "border-green-400 bg-green-50 text-green-700"
                      : "border-border text-muted-foreground hover:border-green-300 hover:bg-green-50/40"
                  )}
                >
                  {isConcluida
                    ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                    : <Circle className="h-4 w-4 shrink-0" />
                  }
                  Concluída
                </button>
              </div>

              {/* Other status options (pausada/cancelada) — compact */}
              {!isAtiva && !isConcluida && (
                <p className="text-xs text-muted-foreground">
                  Status atual: <strong>{statusValue === "pausada" ? "Pausada" : statusValue === "cancelada" ? "Cancelada" : statusValue}</strong>
                </p>
              )}
              <div className="flex gap-2 pt-0.5">
                {(["pausada", "cancelada"] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setValue("status", s)}
                    className={cn(
                      "text-xs px-2.5 py-1 rounded-full border transition-colors",
                      statusValue === s
                        ? s === "pausada"
                          ? "border-yellow-300 bg-yellow-50 text-yellow-700"
                          : "border-red-200 bg-red-50 text-red-600"
                        : "border-border text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    {s === "pausada" ? "Pausada" : "Cancelada"}
                  </button>
                ))}
              </div>
            </div>

            {/* Progress (only visible when not concluída) */}
            {!isConcluida && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Progresso (%)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number" min={0} max={100}
                    className="w-24 text-center"
                    {...register("progressPercentage")}
                  />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, parseInt(watch("progressPercentage") || "0") || 0)}%` }}
                    />
                  </div>
                  <span className="text-sm font-mono text-muted-foreground w-8 text-right">
                    {Math.min(100, parseInt(watch("progressPercentage") || "0") || 0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Resultado realizado */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                Resultado realizado
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Descreva o resultado concreto obtido com esta iniciativa..."
                {...register("actualResult")}
              />
            </div>

            {/* Ponto de melhoria */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                Ponto de melhoria
                <span className="text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="O que pode ser feito melhor na próxima execução? Aprendizados, ajustes, observações..."
                {...register("notes")}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── 2. 5W2H — secondary, collapsible ──────────────────── */}
        <button
          type="button"
          onClick={() => setShow5W2H(v => !v)}
          className="w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <ClipboardList className="h-4 w-4" />
            5W2H — Planejamento da execução
            <span className="text-xs font-normal">(opcional)</span>
          </span>
          {show5W2H ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {show5W2H && (
          <Card>
            <CardContent className="pt-4 space-y-4">
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
            </CardContent>
          </Card>
        )}

        {/* ── 3. Agendamento — secondary, collapsible ────────────── */}
        <button
          type="button"
          onClick={() => setShowSchedule(v => !v)}
          className="w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium hover:bg-muted/40 transition-colors"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            Agendamento e responsável
            <span className="text-xs font-normal">(opcional)</span>
          </span>
          {showSchedule ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {showSchedule && (
          <Card>
            <CardContent className="pt-4 grid grid-cols-2 gap-3">
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
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" type="button" onClick={() => navigate(`/goals/${goalId}`)} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" disabled={update.isPending}>
            {update.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando…</> : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
