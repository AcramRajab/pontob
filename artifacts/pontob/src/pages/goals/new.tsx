import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useListDimensions, getListDimensionsQueryKey,
  useListKeyProcesses, getListKeyProcessesQueryKey,
  useCreateGoal,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, FileSignature, DollarSign, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

type KriType = "corretores" | "cres" | "vgh";

const KRI_OPTIONS: { type: KriType; label: string; subtitle: string; unit: string; icon: React.ElementType; color: string }[] = [
  {
    type: "corretores",
    label: "Corretores (CRECI)",
    subtitle: "Número de corretores com registro CRECI ativo na franquia",
    unit: "corretores",
    icon: Users,
    color: "text-blue-600",
  },
  {
    type: "cres",
    label: "CREs",
    subtitle: "Contratos de Representação Exclusiva assinados no período",
    unit: "contratos",
    icon: FileSignature,
    color: "text-purple-600",
  },
  {
    type: "vgh",
    label: "VGH",
    subtitle: "Valor Geral de Honorários e Comissões gerados no período (R$)",
    unit: "R$",
    icon: DollarSign,
    color: "text-green-600",
  },
];

interface GoalForm {
  title: string;
  kriDescription: string;
  currentValue: string;
  targetValue: string;
  startDate: string;
  endDate: string;
  dimensionId: string;
  keyProcessId: string;
  frequency: string;
}

export default function GoalNew() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [kriType, setKriType] = useState<KriType | null>(null);

  const dimKey = getListDimensionsQueryKey();
  const { data: dimensions = [] } = useListDimensions({ query: { queryKey: dimKey } });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<GoalForm>({
    defaultValues: { frequency: "mensal" },
  });

  const dimensionId = watch("dimensionId");
  const kpKey = getListKeyProcessesQueryKey({ dimensionId: dimensionId ? parseInt(dimensionId) : undefined });
  const { data: keyProcesses = [] } = useListKeyProcesses(
    { dimensionId: dimensionId ? parseInt(dimensionId) : undefined },
    { query: { enabled: !!dimensionId, queryKey: kpKey } }
  );

  const createGoal = useCreateGoal();

  function handleKriSelect(type: KriType) {
    setKriType(type);
    const found = KRI_OPTIONS.find(k => k.type === type)!;
    const year = new Date().getFullYear();
    setValue("title", `Meta de ${found.label} ${year}`);
    setValue("kriDescription", found.subtitle);
    setStep(2);
  }

  async function onSubmit(form: GoalForm) {
    if (!user?.franchiseId || !kriType) return;
    const found = KRI_OPTIONS.find(k => k.type === kriType)!;
    try {
      const goal = await createGoal.mutateAsync({
        data: {
          franchiseId: user.franchiseId,
          dimensionId: parseInt(form.dimensionId),
          keyProcessId: parseInt(form.keyProcessId),
          title: form.title,
          kriDescription: form.kriDescription || found.subtitle,
          currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined,
          targetValue: form.targetValue ? parseFloat(form.targetValue) : undefined,
          unit: found.unit,
          startDate: form.startDate || undefined,
          endDate: form.endDate || undefined,
          frequency: form.frequency as "diario" | "semanal" | "mensal" | "trimestral" | "semestral" | "anual",
        },
      });
      toast({ title: "Meta criada com sucesso!" });
      qc.invalidateQueries({ queryKey: ["goals"] });
      navigate(`/goals/${goal.id}`);
    } catch {
      toast({ title: "Erro ao criar meta", variant: "destructive" });
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/goals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nova Meta</h1>
          <p className="text-sm text-muted-foreground">
            {step === 1 ? "Qual indicador-chave você quer monitorar?" : "Preencha os detalhes da meta"}
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-3 text-sm">
        <div className={cn("flex items-center gap-2 font-medium", step >= 1 ? "text-primary" : "text-muted-foreground")}>
          {step > 1 ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <span className="h-6 w-6 rounded-full border-2 border-primary flex items-center justify-center text-xs font-bold">1</span>}
          Escolher KRI
        </div>
        <div className="flex-1 h-px bg-border" />
        <div className={cn("flex items-center gap-2 font-medium", step >= 2 ? "text-primary" : "text-muted-foreground")}>
          <span className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold", step >= 2 ? "border-primary" : "border-muted-foreground")}>2</span>
          Detalhar
        </div>
      </div>

      {/* Step 1: KRI selection */}
      {step === 1 && (
        <div className="grid gap-4">
          {KRI_OPTIONS.map(({ type, label, subtitle, icon: Icon, color }) => (
            <button
              key={type}
              onClick={() => handleKriSelect(type)}
              className="text-left w-full"
            >
              <Card className="hover:border-primary hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="flex items-center gap-5 p-6">
                  <div className={cn("p-3 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors", color)}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base mb-1">{label}</CardTitle>
                    <CardDescription>{subtitle}</CardDescription>
                  </div>
                  <ArrowLeft className="h-5 w-5 text-muted-foreground rotate-180 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Goal details */}
      {step === 2 && kriType && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* KRI badge */}
          {(() => {
            const found = KRI_OPTIONS.find(k => k.type === kriType)!;
            const Icon = found.icon;
            return (
              <div className={cn("flex items-center gap-3 p-3 rounded-lg bg-muted text-sm font-medium", found.color)}>
                <Icon className="h-4 w-4" />
                KRI: {found.label} — unidade: <span className="font-bold">{found.unit}</span>
                <button type="button" className="ml-auto text-xs text-muted-foreground underline" onClick={() => setStep(1)}>
                  Trocar
                </button>
              </div>
            );
          })()}

          <div className="space-y-1.5">
            <Label>Título da Meta *</Label>
            <Input {...register("title", { required: "Obrigatório" })} placeholder="Ex: Meta de Corretores 2026" />
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
              <Input type="number" step="any" min={0} placeholder="Ex: 30" {...register("targetValue", { required: "Obrigatório" })} />
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

          <div className="space-y-1.5">
            <Label>Dimensão *</Label>
            <Select onValueChange={v => { setValue("dimensionId", v); setValue("keyProcessId", ""); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a dimensão" />
              </SelectTrigger>
              <SelectContent>
                {dimensions.map(d => (
                  <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register("dimensionId", { required: true })} />
            {errors.dimensionId && <p className="text-xs text-destructive">Obrigatório</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Processo-Chave *</Label>
            <Select disabled={!dimensionId} onValueChange={v => setValue("keyProcessId", v)}>
              <SelectTrigger>
                <SelectValue placeholder={dimensionId ? "Selecione o processo" : "Selecione a dimensão primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {keyProcesses.map(kp => (
                  <SelectItem key={kp.id} value={String(kp.id)}>{kp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" {...register("keyProcessId", { required: true })} />
            {errors.keyProcessId && <p className="text-xs text-destructive">Obrigatório</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Frequência de Acompanhamento</Label>
            <Select defaultValue="mensal" onValueChange={v => setValue("frequency", v)}>
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
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              Voltar
            </Button>
            <Button type="submit" disabled={createGoal.isPending} className="flex-1">
              {createGoal.isPending ? "Criando..." : "Criar Meta"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
