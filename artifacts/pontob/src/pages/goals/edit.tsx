import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useGetGoal, getGetGoalQueryKey,
  useUpdateGoal,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Users, FileSignature, DollarSign } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface GoalForm {
  title: string;
  kriDescription: string;
  currentValue: string;
  targetValue: string;
  startDate: string;
  endDate: string;
  frequency: string;
  status: string;
}

const KRI_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  corretores: { label: "Corretores (CRECI)", icon: Users, color: "text-blue-600" },
  cres:       { label: "CREs", icon: FileSignature, color: "text-purple-600" },
  vgh:        { label: "VGH", icon: DollarSign, color: "text-green-600" },
};

function inferKriType(unit?: string | null): string | null {
  if (!unit) return null;
  if (unit === "corretores") return "corretores";
  if (unit === "contratos") return "cres";
  if (unit === "R$") return "vgh";
  return null;
}

export default function GoalEdit() {
  const { id } = useParams<{ id: string }>();
  const goalId = parseInt(id);
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const queryKey = getGetGoalQueryKey(goalId);
  const { data: goal, isLoading } = useGetGoal(goalId, { query: { queryKey } });

  const updateGoal = useUpdateGoal();

  const { register, handleSubmit, control, reset, formState: { errors, isDirty } } = useForm<GoalForm>({
    defaultValues: {
      title: "",
      kriDescription: "",
      currentValue: "",
      targetValue: "",
      startDate: "",
      endDate: "",
      frequency: "mensal",
      status: "em_andamento",
    },
  });

  useEffect(() => {
    if (goal) {
      reset({
        title: goal.title ?? "",
        kriDescription: goal.kriDescription ?? "",
        currentValue: goal.currentValue != null ? String(goal.currentValue) : "",
        targetValue: goal.targetValue != null ? String(goal.targetValue) : "",
        startDate: goal.startDate ? goal.startDate.substring(0, 10) : "",
        endDate: goal.endDate ? goal.endDate.substring(0, 10) : "",
        frequency: goal.frequency ?? "mensal",
        status: goal.status ?? "em_andamento",
      });
    }
  }, [goal, reset]);

  async function onSubmit(form: GoalForm) {
    try {
      await updateGoal.mutateAsync({
        id: goalId,
        data: {
          title: form.title,
          kriDescription: form.kriDescription || undefined,
          currentValue: form.currentValue !== "" ? parseFloat(form.currentValue) : undefined,
          targetValue: form.targetValue !== "" ? parseFloat(form.targetValue) : undefined,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          frequency: form.frequency,
          status: form.status as any,
        },
      });
      qc.invalidateQueries({ queryKey: getGetGoalQueryKey(goalId) });
      qc.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Meta atualizada com sucesso!" });
      navigate(`/goals/${goalId}`);
    } catch {
      toast({ title: "Erro ao salvar meta", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-muted-foreground">
        Meta não encontrada.
      </div>
    );
  }

  const kriType = inferKriType(goal.unit);
  const kri = kriType ? KRI_META[kriType] : null;
  const KriIcon = kri?.icon;

  const canEdit =
    user?.role === "master_admin" ||
    user?.role === "staff_regional" ||
    user?.franchiseId === goal.franchiseId;

  if (!canEdit) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-muted-foreground">
        Você não tem permissão para editar esta meta.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/goals/${goalId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Editar Meta</h1>
          <p className="text-sm text-muted-foreground">
            {goal.dimensionName} • {goal.keyProcessName}
          </p>
        </div>
      </div>

      {kri && KriIcon && (
        <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted text-sm font-medium", kri.color)}>
          <KriIcon className="h-4 w-4" />
          KRI: {kri.label} — unidade: <span className="font-bold">{goal.unit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-1.5">
          <Label>Título da Meta *</Label>
          <Input
            {...register("title", { required: "Obrigatório" })}
            placeholder="Ex: Meta de Corretores 2026"
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Descrição / O que será medido</Label>
          <Input {...register("kriDescription")} placeholder="Descreva o indicador..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Valor Atual</Label>
            <Input type="number" step="any" min={0} placeholder="0" {...register("currentValue")} />
          </div>
          <div className="space-y-1.5">
            <Label>Meta (valor alvo) *</Label>
            <Input
              type="number"
              step="any"
              min={0}
              placeholder="Ex: 30"
              {...register("targetValue", { required: "Obrigatório" })}
            />
            {errors.targetValue && <p className="text-xs text-destructive">{errors.targetValue.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Data de Início</Label>
            <Input type="date" {...register("startDate")} />
          </div>
          <div className="space-y-1.5">
            <Label>Data de Término</Label>
            <Input type="date" {...register("endDate")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Frequência de Acompanhamento</Label>
            <Controller
              name="frequency"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diario">Diário</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao_iniciada">Não iniciada</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="em_atencao">Em atenção</SelectItem>
                    <SelectItem value="atrasada">Atrasada</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="pausada">Pausada</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <Card className="bg-muted/40 border-dashed">
          <CardContent className="pt-4 pb-3 text-sm text-muted-foreground space-y-0.5">
            <p><span className="font-medium text-foreground">Dimensão:</span> {goal.dimensionName}</p>
            <p><span className="font-medium text-foreground">Processo-Chave:</span> {goal.keyProcessName}</p>
            <p className="text-xs mt-1 italic">Dimensão e processo-chave não podem ser alterados após a criação da meta.</p>
          </CardContent>
        </Card>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" asChild className="flex-1">
            <Link href={`/goals/${goalId}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={updateGoal.isPending || !isDirty} className="flex-1">
            {updateGoal.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
