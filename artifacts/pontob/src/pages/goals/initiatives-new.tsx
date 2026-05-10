import { useRoute, useLocation } from "wouter";
import { useListDimensions, useListKeyProcesses, useListStrategicInitiatives, useCreateGoalInitiative, getListGoalInitiativesQueryKey, useListUsers, getListKeyProcessesQueryKey, getListStrategicInitiativesQueryKey, getListUsersQueryKey, GoalInitiativeInputFrequency, getGetGoalQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ChevronRight, BookOpen, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface InitiativeForm {
  customName: string;
  desiredResult: string;
  ownerUserId: string;
  startDate: string;
  endDate: string;
  frequency: string;
  executionDay: string;
  executionTime: string;
  estimatedTime: string;
  whatWillBeDone: string;
  whyItMatters: string;
  whoIsResponsible: string;
  whereItWillBeDone: string;
  howItWillBeDone: string;
  investmentOrEffort: string;
  actualResult: string;
}

type Mode = "choose" | "catalog-select" | "catalog-configure" | "custom-configure";

export default function NewGoalInitiative() {
  const [, params] = useRoute("/goals/:id/initiatives/new");
  const goalId = parseInt(params?.id ?? "0");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>("choose");
  const [selectedInitiative, setSelectedInitiative] = useState<any>(null);
  const [dimensionId, setDimensionId] = useState<string>("");
  const [keyProcessId, setKeyProcessId] = useState<string>("");

  const { data: dimensions = [] } = useListDimensions();
  const kpParams = { dimensionId: dimensionId ? parseInt(dimensionId) : undefined };
  const { data: keyProcesses = [] } = useListKeyProcesses(
    kpParams,
    { query: { enabled: true, queryKey: getListKeyProcessesQueryKey(kpParams) } }
  );
  const initParams = { dimensionId: dimensionId ? parseInt(dimensionId) : undefined, keyProcessId: keyProcessId ? parseInt(keyProcessId) : undefined };
  const { data: initiatives = [] } = useListStrategicInitiatives(
    initParams,
    { query: { enabled: mode === "catalog-select", queryKey: getListStrategicInitiativesQueryKey(initParams) } }
  );
  const { data: users = [] } = useListUsers({}, { query: { enabled: !!user?.franchiseId, queryKey: getListUsersQueryKey({}) } });
  const franchiseUsers = users.filter((u: any) => u.franchiseId === user?.franchiseId);

  const create = useCreateGoalInitiative();
  const { register, handleSubmit, control, formState: { errors } } = useForm<InitiativeForm>({
    defaultValues: { frequency: "diario" },
  });

  const onSubmit = async (data: InitiativeForm) => {
    try {
      const isCustom = mode === "custom-configure";
      await create.mutateAsync({
        id: goalId,
        data: {
          strategicInitiativeId: isCustom ? undefined : selectedInitiative?.id,
          customName: isCustom ? data.customName : undefined,
          desiredResult: data.desiredResult || undefined,
          actualResult: data.actualResult || undefined,
          ownerUserId: data.ownerUserId ? parseInt(data.ownerUserId) : undefined,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          frequency: (data.frequency || undefined) as typeof GoalInitiativeInputFrequency[keyof typeof GoalInitiativeInputFrequency] | undefined,
          executionDay: data.executionDay || undefined,
          executionTime: data.executionTime || undefined,
          estimatedTime: data.estimatedTime || undefined,
          whatWillBeDone: data.whatWillBeDone || undefined,
          whyItMatters: data.whyItMatters || undefined,
          whoIsResponsible: data.whoIsResponsible || undefined,
          whereItWillBeDone: data.whereItWillBeDone || undefined,
          howItWillBeDone: data.howItWillBeDone || undefined,
          investmentOrEffort: data.investmentOrEffort || undefined,
        } as any,
      });
      qc.invalidateQueries({ queryKey: getListGoalInitiativesQueryKey(goalId) });
      qc.invalidateQueries({ queryKey: getGetGoalQueryKey(goalId) });
      toast({ title: "Iniciativa adicionada" });
      navigate(`/goals/${goalId}`);
    } catch (err: any) {
      toast({ title: err?.message || "Erro ao adicionar iniciativa", variant: "destructive" });
    }
  };

  const ConfigureForm = ({ isCustom }: { isCustom: boolean }) => (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setMode(isCustom ? "choose" : "catalog-select")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isCustom ? "Iniciativa Personalizada" : "Configurar Iniciativa"}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {isCustom ? "Registre uma ação que já executa ou quer iniciar" : selectedInitiative?.name}
          </p>
        </div>
      </div>

      {!isCustom && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">KRI</p>
            <p className="text-sm mt-0.5">{selectedInitiative?.kri}</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2">KPI</p>
            <p className="text-sm mt-0.5">{selectedInitiative?.kpi}</p>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {isCustom && (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nome da Iniciativa *</Label>
                <Input
                  placeholder="Ex: Programa de indicações de corretores, Reunião semanal de vendas..."
                  {...register("customName", { required: isCustom })}
                  data-testid="input-custom-name"
                />
                {errors.customName && <p className="text-xs text-destructive">Nome é obrigatório</p>}
              </div>
            </CardContent>
          </Card>
        )}

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
                <Textarea rows={2} placeholder={q.placeholder} {...register(q.field)} data-testid={`textarea-${q.field}`} />
              </div>
            ))}

            {isCustom && (
              <div className="space-y-1.5 border-t pt-4">
                <Label className="text-xs font-medium text-green-700">Resultado já realizado (opcional)</Label>
                <Textarea
                  rows={2}
                  placeholder="Se já executou esta iniciativa antes, descreva o resultado obtido..."
                  {...register("actualResult")}
                  data-testid="textarea-actual-result"
                />
                <p className="text-xs text-muted-foreground">Preencha se já tem histórico de resultado com esta ação.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Agendamento</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Início</Label>
              <Input type="date" {...register("startDate")} data-testid="input-start-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Término</Label>
              <Input type="date" {...register("endDate")} data-testid="input-end-date" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Horário de execução</Label>
              <Input type="time" {...register("executionTime")} data-testid="input-execution-time" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tempo estimado</Label>
              <Input placeholder="Ex: 30min" {...register("estimatedTime")} data-testid="input-estimated-time" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" type="button" onClick={() => setMode(isCustom ? "choose" : "catalog-select")} className="flex-1">
            Voltar
          </Button>
          <Button type="submit" className="flex-1" disabled={create.isPending} data-testid="button-submit">
            {create.isPending ? "Adicionando..." : "Adicionar Iniciativa"}
          </Button>
        </div>
      </form>
    </div>
  );

  if (mode === "choose") {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/goals/${goalId}`)} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Adicionar Iniciativa</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Escolha como quer registrar esta iniciativa</p>
          </div>
        </div>

        <div className="grid gap-4">
          <button
            className="text-left rounded-xl border-2 p-5 hover:border-primary/50 hover:bg-primary/[0.02] transition-all group"
            onClick={() => setMode("catalog-select")}
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-primary/10 p-2.5 group-hover:bg-primary/15 transition-colors">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">Do Catálogo Estratégico</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha uma das 54 iniciativas já mapeadas pela RE/MAX SC com KRI, KPI e boas práticas definidas.
                </p>
              </div>
            </div>
          </button>

          <button
            className="text-left rounded-xl border-2 p-5 hover:border-primary/50 hover:bg-primary/[0.02] transition-all group"
            onClick={() => setMode("custom-configure")}
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-muted p-2.5 group-hover:bg-muted/80 transition-colors">
                <Pencil className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold">Iniciativa Personalizada</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Registre uma ação que já executa ou que não está no catálogo. Você pode inclusive registrar o resultado que já obteve.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "catalog-select") {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setMode("choose")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Selecionar Iniciativa</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Escolha uma iniciativa estratégica do catálogo</p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Select
            value={dimensionId || "all"}
            onValueChange={v => { setDimensionId(v === "all" ? "" : v); setKeyProcessId(""); }}
          >
            <SelectTrigger className="w-44" data-testid="select-dimension">
              <SelectValue placeholder="Dimensão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {dimensions.map((d: any) => (
                <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={keyProcessId || "all"}
            onValueChange={v => setKeyProcessId(v === "all" ? "" : v)}
            disabled={!dimensionId}
          >
            <SelectTrigger className="w-56" data-testid="select-key-process">
              <SelectValue placeholder="Processo-chave" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {keyProcesses.map((kp: any) => (
                <SelectItem key={kp.id} value={String(kp.id)}>{kp.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          {initiatives.map((ini: any) => (
            <Card
              key={ini.id}
              data-testid={`card-initiative-${ini.id}`}
              className="cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
              onClick={() => { setSelectedInitiative(ini); setMode("catalog-configure"); }}
            >
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{ini.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ini.dimensionName} — {ini.keyProcessName}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
          {initiatives.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma iniciativa encontrada para os filtros selecionados.</p>
          )}
        </div>
      </div>
    );
  }

  return <ConfigureForm isCustom={mode === "custom-configure"} />;
}
