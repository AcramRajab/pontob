import { useRoute, useLocation } from "wouter";
import { useCreateKpi, getListGoalKpisQueryKey, KpiInputFrequency, KpiInputIndicatorType, KpiInputDesiredDirection, useGetGoal, getGetGoalQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ChevronDown, Zap } from "lucide-react";
import { PLANNER_SECTIONS, templatesBySection, relevantSectionsForGoal, type KpiTemplate } from "@/lib/kpi-templates";

interface KpiForm {
  name: string;
  initialValue: string;
  currentValue: string;
  targetValue: string;
  unit: string;
  frequency: string;
  indicatorType: string;
  desiredDirection: string;
  notes: string;
}

export default function NewKpi() {
  const [, params] = useRoute("/goals/:id/kpis/new");
  const goalId = parseInt(params?.id ?? "0");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const create = useCreateKpi();
  const [showAllSections, setShowAllSections] = useState(false);

  const { data: goal } = useGetGoal(goalId, {
    query: { enabled: !!goalId, queryKey: getGetGoalQueryKey(goalId) },
  });

  const relevantKeys = relevantSectionsForGoal(goal?.keyProcessName, goal?.dimensionName);
  const isFiltered = relevantKeys.length < PLANNER_SECTIONS.length;
  const visibleSections = showAllSections || !isFiltered
    ? PLANNER_SECTIONS
    : PLANNER_SECTIONS.filter(s => relevantKeys.includes(s.key));

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<KpiForm>({
    defaultValues: {
      frequency: "semanal",
      indicatorType: "numero_absoluto",
      desiredDirection: "aumentar",
    },
  });

  const currentName = watch("name");

  function applyTemplate(t: KpiTemplate) {
    setValue("name", t.name);
    setValue("unit", t.unit);
    setValue("frequency", t.frequency);
    setValue("indicatorType", t.indicatorType);
    setValue("desiredDirection", t.desiredDirection);
  }

  const onSubmit = async (data: KpiForm) => {
    try {
      await create.mutateAsync({
        id: goalId,
        data: {
          name: data.name,
          initialValue: data.initialValue ? parseFloat(data.initialValue) : undefined,
          currentValue: data.currentValue ? parseFloat(data.currentValue) : undefined,
          targetValue: data.targetValue ? parseFloat(data.targetValue) : undefined,
          unit: data.unit || undefined,
          frequency: (data.frequency || undefined) as typeof KpiInputFrequency[keyof typeof KpiInputFrequency] | undefined,
          indicatorType: data.indicatorType as typeof KpiInputIndicatorType[keyof typeof KpiInputIndicatorType],
          desiredDirection: data.desiredDirection as typeof KpiInputDesiredDirection[keyof typeof KpiInputDesiredDirection],
          notes: data.notes || undefined,
        },
      });
      qc.invalidateQueries({ queryKey: getListGoalKpisQueryKey(goalId) });
      toast({ title: "KPI adicionado" });
      navigate(`/goals/${goalId}`);
    } catch {
      toast({ title: "Erro ao adicionar KPI", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/goals/${goalId}`)} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Novo KPI</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Indicador de performance chave</p>
        </div>
      </div>

      {/* Planner Suggestions */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-sm flex items-center gap-2 text-primary">
                <Zap className="h-4 w-4" />
                Sugestões para este KRI
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Clique em um KPI para pré-preencher o formulário
              </p>
            </div>
            {isFiltered && (
              <button
                type="button"
                onClick={() => setShowAllSections(v => !v)}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 shrink-0 mt-0.5"
              >
                {showAllSections ? "Menos" : "Ver todos"}
                <ChevronDown className={`h-3 w-3 transition-transform ${showAllSections ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          {visibleSections.map(sec => (
            <div key={sec.key}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-1.5 ${sec.color}`}>{sec.key}</p>
              <div className="flex flex-wrap gap-1.5">
                {templatesBySection(sec.key).map(t => {
                  const isActive = currentName === t.name;
                  return (
                    <button
                      key={t.name}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                        isActive
                          ? `${sec.bg} ${sec.color} ${sec.border} font-semibold ring-1 ring-offset-1 ${sec.border}`
                          : `bg-background hover:${sec.bg} ${sec.border} border-muted-foreground/20 hover:${sec.color} text-muted-foreground`
                      }`}
                    >
                      {t.name}
                      {t.desiredDirection === "diminuir" && (
                        <span className="ml-1 opacity-60">↓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Card>
          <CardContent className="space-y-4 pt-5">
            <div className="space-y-1.5">
              <Label>Nome do KPI *</Label>
              <Input
                placeholder="Ex: Taxa de captação semanal"
                {...register("name", { required: true })}
                data-testid="input-name"
              />
              {errors.name && <p className="text-xs text-destructive">Nome obrigatório</p>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Inicial</Label>
                <Input type="number" step="any" {...register("initialValue")} data-testid="input-initial-value" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Atual</Label>
                <Input type="number" step="any" {...register("currentValue")} data-testid="input-current-value" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Meta</Label>
                <Input type="number" step="any" {...register("targetValue")} data-testid="input-target-value" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Unidade</Label>
                <Input placeholder="Ex: %, R$, unidades" {...register("unit")} data-testid="input-unit" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frequência</Label>
                <Controller name="frequency" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-frequency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Indicador</Label>
                <Controller name="indicatorType" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-indicator-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="numero_absoluto">Número absoluto</SelectItem>
                      <SelectItem value="percentual">Percentual</SelectItem>
                      <SelectItem value="razao">Razão</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Direção Desejada</Label>
                <Controller name="desiredDirection" control={control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger data-testid="select-desired-direction"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aumentar">Aumentar</SelectItem>
                      <SelectItem value="diminuir">Diminuir</SelectItem>
                      <SelectItem value="manter">Manter</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} {...register("notes")} data-testid="textarea-notes" />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={create.isPending} data-testid="button-submit">
          {create.isPending ? "Adicionando..." : "Adicionar KPI"}
        </Button>
      </form>
    </div>
  );
}
